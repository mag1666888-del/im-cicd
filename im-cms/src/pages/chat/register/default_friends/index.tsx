import React, { useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Avatar, 
  Space, 
  Button, 
  Popconfirm, 
  message, 
  Modal,
  Form,
  Input,
  Select,
  Table,
  Checkbox,
  Row,
  Col,
  List,
  Typography
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { searchDefaultFriends, addDefaultFriend, removeDefaultFriend, searchUsers } from '@/services/ant-design-pro/api';

interface DefaultFriendItem {
  userID: string;
  nickname: string;
  faceURL: string;
}

interface UserItem {
  userID: string;
  nickname: string;
  faceURL: string;
  phoneNumber: string;
  areaCode: string;
  email: string;
  gender: number;
  level: number;
  birth: number;
  allowAddFriend: number;
  allowBeep: number;
  allowVibration: number;
  globalRecvMsgOpt: number;
  registerType: number;
}

const DefaultFriends: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<Array<{label: string, value: string}>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // 新增状态
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 获取默认好友列表数据
  const fetchDefaultFriends = async (params: any) => {
    try {
      const response = await searchDefaultFriends({
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
      console.error('获取默认好友列表失败:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取用户列表（用于添加默认好友）
  const fetchUserList = async (searchText: string = '') => {
    setSearchLoading(true);
    try {
      const response = await searchUsers({
        pagination: {
          pageNumber: 1,
          showNumber: 100,
        },
        keyword: searchText,
      });

      if (response.errCode === 0) {
        const users = response.data.users || [];
        setAllUsers(users as any);
        setFilteredUsers(users as any);
      } else {
        setAllUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setAllUsers([]);
      setFilteredUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 搜索用户
  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchUserList(value);
  };

  // 表格行选择
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[], selectedRows: UserItem[]) => {
      setSelectedRowKeys(selectedRowKeys);
      setSelectedUsers(selectedRows);
    },
  };

  // 移除已选择的用户
  const removeSelectedUser = (userID: string) => {
    const newSelectedUsers = selectedUsers.filter(user => user.userID !== userID);
    const newSelectedKeys = selectedRowKeys.filter(key => key !== userID);
    setSelectedUsers(newSelectedUsers);
    setSelectedRowKeys(newSelectedKeys);
  };

  // 移除默认好友
  const handleRemove = async (record: DefaultFriendItem) => {
    try {
      const response = await removeDefaultFriend({
        userID: record.userID,
      });

      if (response.errCode === 0) {
        message.success('移除成功');
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '移除失败');
      }
    } catch (error) {
      console.error('移除失败:', error);
      message.error('移除失败，请重试');
    }
  };

  // 添加默认好友
  const handleAdd = () => {
    setAddModalVisible(true);
    setSelectedUsers([]);
    setSelectedRowKeys([]);
    setSearchText('');
    // 打开弹窗时加载用户列表
    fetchUserList();
  };

  // 确认添加默认好友
  const handleConfirmAdd = async () => {
    if (selectedUsers.length === 0) {
      message.warning('请选择要添加的用户');
      return;
    }

    try {
      const response = await addDefaultFriend({
        userID: selectedUsers[0].userID, // 暂时只添加第一个用户
      });

      if (response.errCode === 0) {
        message.success('添加成功');
        setAddModalVisible(false);
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '添加失败');
      }
    } catch (error) {
      console.error('添加失败:', error);
      message.error('添加失败，请重试');
    }
  };

  // 取消添加
  const handleCancelAdd = () => {
    setAddModalVisible(false);
    setSelectedUsers([]);
    setSelectedRowKeys([]);
    setSearchText('');
  };

  const getInitial = (nickname: string) => {
    if (!nickname) return 'U';
    if (/[\u4e00-\u9fa5]/.test(nickname)) {
      return nickname.charAt(0);
    }
    return nickname.charAt(0).toUpperCase();
  };

  // 用户表格列定义
  const userColumns = [
    {
      title: '头像',
      dataIndex: 'faceURL',
      key: 'faceURL',
      width: 60,
      render: (_: any, record: UserItem) => (
        <Avatar
          src={record.faceURL || undefined}
          size={32}
          style={{ backgroundColor: record.faceURL ? undefined : '#1890ff', fontSize: 16 }}
        >
          {getInitial(record.nickname)}
        </Avatar>
      ),
    },
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (_: any, record: UserItem) => record.nickname || '-',
    },
    {
      title: '用户ID',
      dataIndex: 'userID',
      key: 'userID',
      width: 120,
      copyable: true,
    },
  ];

  const columns: ProColumns<DefaultFriendItem>[] = [
    {
      title: '用户ID',
      dataIndex: 'keyword',
      key: 'keyword',
      hideInTable: true,
      renderFormItem: () => <Input placeholder="请输入用户ID" />,
    },
    {
      title: '用户头像',
      dataIndex: 'faceURL',
      key: 'faceURL',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (
        <Avatar
          src={record.faceURL || undefined}
          size={32}
          style={{ backgroundColor: record.faceURL ? undefined : '#1890ff', fontSize: 16 }}
        >
          {getInitial(record.nickname)}
        </Avatar>
      ),
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
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (_, record) => record.nickname || '-',
      hideInSearch: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定吗？"
            description="确定要移除该用户吗？"
            onConfirm={() => handleRemove(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '默认好友',
        breadcrumb: {
          items: [
            { title: '业务系统' },
            { title: '注册管理' },
            { title: '默认好友' },
          ],
        },
      }}
    >
      <ProTable<DefaultFriendItem>
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
        request={fetchDefaultFriends}
        options={{
          reload: true,
          density: true,
          fullScreen: true,
        }}
        scroll={{ x: 600 }}
        form={{
          ignoreRules: false,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="add"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加
          </Button>,
        ]}
      />

      {/* 添加默认好友弹窗 */}
      <Modal
        title="添加默认好友"
        open={addModalVisible}
        onOk={handleConfirmAdd}
        onCancel={handleCancelAdd}
        okText="确定添加"
        cancelText="取消"
        confirmLoading={loading}
        width={1000}
        okButtonProps={{ disabled: selectedUsers.length === 0 }}
      >
        <Row gutter={16} style={{ height: '500px' }}>
          {/* 左侧：用户选择表格 */}
          <Col span={14}>
            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="搜索用户昵称或用户ID"
                onSearch={handleSearch}
                onPressEnter={(e) => handleSearch(e.currentTarget.value)}
                loading={searchLoading}
                allowClear
                enterButton="搜索"
              />
            </div>
            <Table
              columns={userColumns}
              dataSource={filteredUsers}
              rowKey="userID"
              rowSelection={rowSelection}
              pagination={{
                pageSize: 8,
                showSizeChanger: false,
                showQuickJumper: false,
                showTotal: (total) => `共 ${total} 条`,
              }}
              scroll={{ y: 400 }}
              size="small"
            />
          </Col>
          
          {/* 右侧：已选择的用户 */}
          <Col span={10}>
            <Typography.Title level={5}>已选择的用户 ({selectedUsers.length})</Typography.Title>
            <div style={{ height: '400px', overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '8px' }}>
              {selectedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  暂无选择的用户
                </div>
              ) : (
                <List
                  dataSource={selectedUsers}
                  renderItem={(user) => (
                    <List.Item
                      style={{ padding: '8px 0' }}
                      actions={[
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => removeSelectedUser(user.userID)}
                        >
                          移除
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            src={user.faceURL || undefined}
                            size={32}
                            style={{ backgroundColor: user.faceURL ? undefined : '#1890ff', fontSize: 16 }}
                          >
                            {getInitial(user.nickname)}
                          </Avatar>
                        }
                        title={user.nickname || '未知用户'}
                        description={user.userID}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Col>
        </Row>
      </Modal>
    </PageContainer>
  );
};

export default DefaultFriends;