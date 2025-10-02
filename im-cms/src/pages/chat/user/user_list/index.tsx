import React, { useState } from 'react';
import CryptoJS from 'crypto-js';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Avatar, 
  Tag, 
  Space, 
  Button, 
  Popconfirm, 
  message, 
  Drawer, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Upload,
  Row,
  Col,
  Modal
} from 'antd';
import { EditOutlined, KeyOutlined, StopOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { searchUsers, updateUser, blockUser, resetUserPassword, createUser } from '@/services/ant-design-pro/api';
import { uploadAvatar } from '@/utils/fileUpload';
import dayjs from 'dayjs';

interface UserItem {
  userID: string;
  password?: string;
  account?: string;
  phoneNumber?: string;
  areaCode?: string;
  email?: string;
  nickname: string;
  faceURL: string;
  gender: number;
  level?: number;
  birth?: number;
  allowAddFriend?: number;
  allowBeep?: number;
  allowVibration?: number;
  globalRecvMsgOpt?: number;
  registerType?: number;
  createTime?: number;
}

const UserList: React.FC = () => {
  const [form] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 禁用弹窗相关状态
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [blockingUser, setBlockingUser] = useState<UserItem | null>(null);
  const [blockForm] = Form.useForm();
  
  // 重置密码弹窗相关状态
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserItem | null>(null);
  const [resetPasswordForm] = Form.useForm();
  
  // 创建用户Drawer相关状态
  const [createUserDrawerVisible, setCreateUserDrawerVisible] = useState(false);
  const [createUserForm] = Form.useForm();
  
  // 头像上传相关状态
  const [editingAvatarUrl, setEditingAvatarUrl] = useState<string>('');
  const [creatingAvatarUrl, setCreatingAvatarUrl] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 获取用户列表数据
  const fetchUserList = async (params: any) => {
    try {
      const response = await searchUsers({
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
        keyword: params.keyword || '',
      });

      if (response.errCode === 0) {
        return {
          data: response.data.users || [],
          success: true,
          total: response.data.total || 0,
        };
      }
      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 性别显示
  const getGenderText = (gender: number) => {
    switch (gender) {
      case 0:
        return <Tag color="blue">女</Tag>;
      case 1:
        return <Tag color="green">男</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 在线状态显示（这里暂时显示为未知，因为接口没有在线状态字段）
  const getOnlineStatus = () => {
    return <Tag color="orange">未知</Tag>;
  };

  // 编辑用户
  const handleEdit = (record: UserItem) => {
    setEditingUser(record);
    setEditingAvatarUrl(record.faceURL || '');
    form.setFieldsValue({
      nickname: record.nickname,
      gender: record.gender,
      birth: record.birth ? dayjs(record.birth) : null,
    });
    setDrawerVisible(true);
  };

  // 保存用户信息
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      if (!editingUser) {
        message.error('用户信息不存在');
        return;
      }

      // 准备请求数据
      const updateData = {
        userID: editingUser.userID,
        nickname: values.nickname,
        faceURL: editingAvatarUrl || editingUser.faceURL, // 使用上传的头像或原头像
        birth: values.birth ? values.birth.valueOf() : 0, // 转换为时间戳
        gender: values.gender,
      };

      console.log('更新用户信息:', updateData);
      
      // 调用更新用户信息的API
      const response = await updateUser(updateData);
      
      if (response.errCode === 0) {
        message.success('用户信息更新成功');
        setDrawerVisible(false);
        form.resetFields();
        setEditingAvatarUrl('');
        // 刷新表格数据
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '更新失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 关闭Drawer
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setEditingUser(null);
    setEditingAvatarUrl('');
    form.resetFields();
  };

  // 重置密码
  const handleResetPassword = (record: UserItem) => {
    setResettingUser(record);
    setResetPasswordModalVisible(true);
    resetPasswordForm.resetFields();
  };

  // 确认重置密码
  const handleConfirmResetPassword = async () => {
    try {
      const values = await resetPasswordForm.validateFields();
      if (!resettingUser) return;

      // 对密码进行MD5加密
      const encryptedPassword = CryptoJS.MD5(values.newPassword).toString();

      const response = await resetUserPassword({
        userID: resettingUser.userID,
        newPassword: encryptedPassword,
      });

      if (response.errCode === 0) {
        message.success('密码重置成功');
        setResetPasswordModalVisible(false);
        setResettingUser(null);
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '密码重置失败');
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      message.error('密码重置失败，请重试');
    }
  };

  // 取消重置密码
  const handleCancelResetPassword = () => {
    setResetPasswordModalVisible(false);
    setResettingUser(null);
    resetPasswordForm.resetFields();
  };

  // 创建用户
  const handleCreateUser = () => {
    setCreateUserDrawerVisible(true);
    setCreatingAvatarUrl('');
    createUserForm.resetFields();
  };

  // 确认创建用户
  const handleConfirmCreateUser = async () => {
    try {
      const values = await createUserForm.validateFields();
      
      // 对密码进行MD5加密
      const encryptedPassword = CryptoJS.MD5(values.password).toString();

      const response = await createUser({
        users: [{
          userID: '', // 系统会自动生成
          nickname: values.nickname,
          faceURL: creatingAvatarUrl || '',
          gender: values.gender,
          areaCode: values.areaCode || '+86',
          phoneNumber: values.phoneNumber,
          password: encryptedPassword,
          email: '', // 暂时为空
        }]
      });

      if (response.errCode === 0) {
        message.success('用户创建成功');
        setCreateUserDrawerVisible(false);
        setCreatingAvatarUrl('');
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '用户创建失败');
      }
    } catch (error) {
      console.error('用户创建失败:', error);
      message.error('用户创建失败，请重试');
    }
  };

  // 关闭创建用户Drawer
  const handleCloseCreateUserDrawer = () => {
    setCreateUserDrawerVisible(false);
    setCreatingAvatarUrl('');
    createUserForm.resetFields();
  };

  // 处理编辑用户头像上传
  const handleEditAvatarUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    if (!editingUser) {
      onError(new Error('用户信息不存在'));
      return;
    }

    setAvatarUploading(true);
    try {
      const result = await uploadAvatar(file, editingUser.userID);
      if (result.success) {
        setEditingAvatarUrl(result.url);
        onSuccess({ url: result.url });
        message.success('头像上传成功');
      } else {
        onError(new Error(result.error || '上传失败'));
      }
    } catch (error: any) {
      console.error('头像上传失败:', error);
      onError(error);
    } finally {
      setAvatarUploading(false);
    }
  };

  // 处理创建用户头像上传
  const handleCreateAvatarUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    setAvatarUploading(true);
    try {
      // 为创建用户生成临时用户ID
      const tempUserID = `temp_${Date.now()}`;
      const result = await uploadAvatar(file, tempUserID);
      if (result.success) {
        setCreatingAvatarUrl(result.url);
        onSuccess({ url: result.url });
        message.success('头像上传成功');
      } else {
        onError(new Error(result.error || '上传失败'));
      }
    } catch (error: any) {
      console.error('头像上传失败:', error);
      onError(error);
    } finally {
      setAvatarUploading(false);
    }
  };

  // 禁用用户
  const handleDisable = (record: UserItem) => {
    setBlockingUser(record);
    setBlockModalVisible(true);
    blockForm.resetFields();
  };

  // 确认禁用用户
  const handleConfirmBlock = async () => {
    try {
      const values = await blockForm.validateFields();
      if (!blockingUser) return;

      const response = await blockUser({
        userID: blockingUser.userID,
        reason: values.reason || '',
      });

      if (response.errCode === 0) {
        message.success('禁用成功');
        setBlockModalVisible(false);
        setBlockingUser(null);
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '禁用失败');
      }
    } catch (error) {
      console.error('禁用失败:', error);
      message.error('禁用失败，请重试');
    }
  };

  // 取消禁用
  const handleCancelBlock = () => {
    setBlockModalVisible(false);
    setBlockingUser(null);
    blockForm.resetFields();
  };

  const columns: ProColumns<UserItem>[] = [
    {
      title: '用户ID/手机号',
      dataIndex: 'keyword',
      key: 'keyword',
      hideInTable: true,
      renderFormItem: () => <Input placeholder="请输入用户ID或手机号" />,
    },
    {
      title: '用户头像',
      dataIndex: 'faceURL',
      key: 'faceURL',
      width: 80,
      hideInSearch: true,
      render: (_, record) => {
        // 获取昵称的首字母或首字
        const getInitial = (nickname: string) => {
          if (!nickname) return 'U';
          // 如果是中文字符，取第一个字符
          if (/[\u4e00-\u9fa5]/.test(nickname)) {
            return nickname.charAt(0);
          }
          // 如果是英文字符，取第一个字母并转大写
          return nickname.charAt(0).toUpperCase();
        };

        return (
            <Avatar
              src={record.faceURL || undefined}
              size={25}
              style={{ backgroundColor: record.faceURL ? undefined : '#1890ff', fontSize: 16 }}
            >
              {getInitial(record.nickname)}
            </Avatar>
        );
      },
    },
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (_, record) => record.nickname || '-',
      hideInSearch: true,
    },
    {
      title: '用户ID',
      dataIndex: 'userID',
      key: 'userID',
      width: 120,
      copyable: true,
      hideInSearch: true,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (_, record) => getGenderText(record.gender),
      hideInSearch: true,
    },
    {
      title: '手机号',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 140,
      render: (_, record) => 
        record.phoneNumber ? `${record.areaCode || '+86'} ${record.phoneNumber}` : '-',
      hideInSearch: true,
    },
    {
      title: '用户邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      render: (_, record) => record.email || '-',
      hideInSearch: true,
    },
    {
      title: '在线状态',
      key: 'onlineStatus',
      width: 100,
      render: () => getOnlineStatus(),
      hideInSearch: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 251,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            重置密码
          </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleDisable(record)}
            >
              禁用
            </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '用户列表',
        breadcrumb: {
          items: [
            { title: '业务系统' },
            { title: '用户管理' },
            { title: '用户列表' },
          ],
        },
      }}
    >
        <ProTable<UserItem>
          key={refreshKey}
          columns={columns}
          rowKey="userID"
          search={{
            labelWidth: 'auto',
            defaultCollapsed: false,
            searchText: '搜索',
            resetText: '重置',
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
          request={fetchUserList}
          options={{
            reload: true,
            density: true,
            fullScreen: true,
          }}
          scroll={{ x: 1000 }}
          toolBarRender={() => [
            <Button
              type="primary"
              key="create"
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
            >
              创建用户
            </Button>,
          ]}
          form={{
            ignoreRules: false,
          }}
        />
      
      {/* 编辑用户Drawer */}
      <Drawer
        title="编辑用户信息"
        width={400}
        open={drawerVisible}
        onClose={handleCloseDrawer}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleCloseDrawer} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" loading={loading} onClick={handleSave}>
              保存
            </Button>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            nickname: '',
            gender: 1,
            birth: null,
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="用户头像" name="avatar">
                <div style={{ textAlign: 'center' }}>
                  <Avatar
                    size={80}
                    src={editingAvatarUrl || editingUser?.faceURL}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {editingUser?.nickname?.charAt(0) || 'U'}
                  </Avatar>
                  <div style={{ marginTop: 8 }}>
                    <Upload
                      name="avatar"
                      listType="text"
                      showUploadList={false}
                      customRequest={handleEditAvatarUpload}
                      accept="image/*"
                      beforeUpload={(file) => {
                        const isImage = file.type.startsWith('image/');
                        if (!isImage) {
                          message.error('只能上传图片文件');
                          return false;
                        }
                        const isLt2M = file.size / 1024 / 1024 < 2;
                        if (!isLt2M) {
                          message.error('图片大小不能超过 2MB');
                          return false;
                        }
                        return true;
                      }}
                    >
                      <Button 
                        icon={<UploadOutlined />} 
                        size="small" 
                        loading={avatarUploading}
                        disabled={avatarUploading}
                      >
                        {avatarUploading ? '上传中...' : '更换头像'}
                      </Button>
                    </Upload>
                  </div>
                </div>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="用户昵称"
                name="nickname"
                rules={[
                  { required: true, message: '请输入用户昵称' },
                  { max: 20, message: '昵称长度不能超过20个字符' },
                ]}
              >
                <Input placeholder="请输入用户昵称" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: '请选择性别' }]}
              >
                <Select placeholder="请选择性别">
                  <Select.Option value={1}>男</Select.Option>
                  <Select.Option value={0}>女</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="生日"
                name="birth"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择生日"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>
          </Form>
        </Drawer>

        {/* 禁用用户弹窗 */}
        <Modal
          title="禁用用户"
          open={blockModalVisible}
          onOk={handleConfirmBlock}
          onCancel={handleCancelBlock}
          okText="确定禁用"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Form
            form={blockForm}
            layout="vertical"
            initialValues={{
              reason: '',
            }}
          >
            <Form.Item label="用户信息">
              <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px' }}>
                <div><strong>用户ID:</strong> {blockingUser?.userID}</div>
                <div><strong>用户昵称:</strong> {blockingUser?.nickname || '-'}</div>
                <div><strong>手机号:</strong> {blockingUser?.phoneNumber ? `${blockingUser.areaCode || '+86'} ${blockingUser.phoneNumber}` : '-'}</div>
              </div>
            </Form.Item>
            
            <Form.Item
              label="禁用原因"
              name="reason"
              rules={[
                { max: 200, message: '禁用原因不能超过200个字符' }
              ]}
            >
              <Input.TextArea
                placeholder="请输入禁用原因（可选）"
                rows={4}
                maxLength={200}
                showCount
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 重置密码弹窗 */}
        <Modal
          title="重置密码"
          open={resetPasswordModalVisible}
          onOk={handleConfirmResetPassword}
          onCancel={handleCancelResetPassword}
          okText="确定重置"
          cancelText="取消"
        >
          <Form
            form={resetPasswordForm}
            layout="vertical"
            initialValues={{
              newPassword: '',
              confirmPassword: '',
            }}
          >
            <Form.Item label="用户信息">
              <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px' }}>
                <div><strong>用户ID:</strong> {resettingUser?.userID}</div>
                <div><strong>用户昵称:</strong> {resettingUser?.nickname || '-'}</div>
                <div><strong>手机号:</strong> {resettingUser?.phoneNumber ? `${resettingUser.areaCode || '+86'} ${resettingUser.phoneNumber}` : '-'}</div>
              </div>
            </Form.Item>
            
            <Form.Item
              label="新密码"
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度不能少于6位' },
                { max: 20, message: '密码长度不能超过20位' },
                { pattern: /^[a-zA-Z0-9]+$/, message: '密码只能包含字母和数字' }
              ]}
            >
              <Input.Password
                placeholder="请输入新密码（6-20位字母数字组合）"
                maxLength={20}
              />
            </Form.Item>

            <Form.Item
              label="确认新密码"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="请再次输入新密码"
                maxLength={20}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 创建用户Drawer */}
        <Drawer
          title="创建用户"
          width={400}
          open={createUserDrawerVisible}
          onClose={handleCloseCreateUserDrawer}
          footer={
            <div style={{ textAlign: 'right' }}>
              <Button onClick={handleCloseCreateUserDrawer} style={{ marginRight: 8 }}>
                取消
              </Button>
              <Button type="primary" loading={loading} onClick={handleConfirmCreateUser}>
                创建
              </Button>
            </div>
          }
        >
          <Form
            form={createUserForm}
            layout="horizontal"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            initialValues={{
              nickname: '',
              faceURL: '',
              gender: 1,
              birth: null,
              areaCode: '+86',
              phoneNumber: '',
              password: '',
            }}
          >
            <Form.Item label="用户头像" name="avatar" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <Avatar
                  size={80}
                  src={creatingAvatarUrl}
                  style={{ backgroundColor: '#1890ff' }}
                >
                  {creatingAvatarUrl ? '' : 'U'}
                </Avatar>
                <div style={{ marginTop: 8 }}>
                  <Upload
                    name="avatar"
                    listType="text"
                    showUploadList={false}
                    customRequest={handleCreateAvatarUpload}
                    accept="image/*"
                    beforeUpload={(file) => {
                      const isImage = file.type.startsWith('image/');
                      if (!isImage) {
                        message.error('只能上传图片文件');
                        return false;
                      }
                      const isLt2M = file.size / 1024 / 1024 < 2;
                      if (!isLt2M) {
                        message.error('图片大小不能超过 2MB');
                        return false;
                      }
                      return true;
                    }}
                  >
                    <Button 
                      icon={<UploadOutlined />} 
                      size="small"
                      loading={avatarUploading}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? '上传中...' : '上传头像'}
                    </Button>
                  </Upload>
                </div>
              </div>
            </Form.Item>

            <Form.Item
              label="用户昵称"
              name="nickname"
              rules={[
                { required: true, message: '请输入用户昵称' },
                { max: 20, message: '昵称长度不能超过20个字符' },
              ]}
            >
              <Input placeholder="请输入用户昵称" />
            </Form.Item>

            <Form.Item
              label="性别"
              name="gender"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Select placeholder="请选择性别">
                <Select.Option value={1}>男</Select.Option>
                <Select.Option value={0}>女</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="生日"
              name="birth"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="请选择生日"
                format="YYYY-MM-DD"
              />
            </Form.Item>

            <Form.Item
              label="手机号"
              name="phoneNumber"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式' }
              ]}
            >
              <Row gutter={10}>
                <Col span={14}>
                  <Input placeholder="请输入手机号" />
                </Col>
                <Col span={10}>
                  <Select placeholder="请选择区号">
                    <Select.Option value="+86">+86</Select.Option>
                    <Select.Option value="+1">+1</Select.Option>
                    <Select.Option value="+852">+852</Select.Option>
                    <Select.Option value="+853">+853</Select.Option>
                    <Select.Option value="+886">+886</Select.Option>
                  </Select>
                </Col>
              </Row>
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码长度不能少于6位' },
                { max: 20, message: '密码长度不能超过20位' },
                { pattern: /^[a-zA-Z0-9]+$/, message: '密码只能包含字母和数字' }
              ]}
            >
              <Input.Password
                placeholder="请输入密码（6-20位字母数字组合）"
                maxLength={20}
              />
            </Form.Item>
          </Form>
        </Drawer>
      </PageContainer>
    );
  };

  export default UserList;
