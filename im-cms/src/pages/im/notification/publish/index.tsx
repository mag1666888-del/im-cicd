import React, { useState, useRef, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  message, 
  Checkbox, 
  Space, 
  Divider,
  Row,
  Col,
  Avatar,
  Tooltip
} from 'antd';
import { 
  SendOutlined, 
  UploadOutlined, 
  UserOutlined,
  LinkOutlined,
  ClearOutlined
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { getNotificationAccounts, getIMUsers, sendNotification } from '@/services/ant-design-pro/api';
import { uploadGenericFile } from '@/utils/fileUpload';

const { Option } = Select;
const { TextArea } = Input;

interface NotificationAccount {
  userID: string;
  nickName: string;
  faceURL: string;
  appMangerLevel: number;
}

interface IMUser {
  userID: string;
  nickname: string;
  faceURL: string;
  createTime: string;
}

interface SendNotificationForm {
  senderAccount: string;
  messageContent: string;
  attachmentUrl?: string;
  linkUrl?: string;
  sendToAll: boolean;
}

const SendNotification: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationAccounts, setNotificationAccounts] = useState<NotificationAccount[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentInfo, setAttachmentInfo] = useState<{
    url: string;
    type: string;
    size: number;
    width: number;
    height: number;
  } | null>(null);
  const [userListData, setUserListData] = useState<IMUser[]>([]);
  const actionRef = useRef<ActionType>(null);

  // 获取通知账号列表
  const fetchNotificationAccounts = async () => {
    try {
      const response = await getNotificationAccounts({
        pagination: {
          pageNumber: 1,
          showNumber: 100,
        },
      });
      setNotificationAccounts(response.data?.notificationAccounts || []);
    } catch (error) {
      console.error('获取通知账号失败:', error);
      message.error('获取通知账号失败');
    }
  };

  // 获取IM用户列表
  const fetchIMUsers = async (params: any) => {
    try {
      const response = await getIMUsers({
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
        keyword: params.keyword || '',
      });
      
      const users = response.data?.users || [];
      setUserListData(users);
      
      return {
        data: users,
        success: true,
        total: response.data?.total || 0,
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setUserListData([]);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 表格列配置
  const columns: ProColumns<IMUser>[] = [
    {
      title: '选择',
      dataIndex: 'userID',
      width: 60,
      hideInSearch: true,
      render: (_, record) => (
        <Checkbox
          checked={selectedUsers.includes(record.userID)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers([...selectedUsers, record.userID]);
            } else {
              setSelectedUsers(selectedUsers.filter(id => id !== record.userID));
            }
          }}
          style={{ 
            transform: 'scale(1.2)',
            transition: 'all 0.3s ease'
          }}
        />
      ),
    },
    {
      title: '用户头像',
      dataIndex: 'faceURL',
      hideInSearch: true,
      width: 80,
      render: (_, record) => (
        <Tooltip title={record.nickname}>
          <Avatar
            size={40}
            src={record.faceURL}
            icon={<UserOutlined />}
            style={{ 
              cursor: 'pointer',
              border: selectedUsers.includes(record.userID) ? '2px solid #1890ff' : '2px solid transparent',
              transition: 'all 0.3s ease'
            }}
            onClick={() => {
              if (selectedUsers.includes(record.userID)) {
                setSelectedUsers(selectedUsers.filter(id => id !== record.userID));
              } else {
                setSelectedUsers([...selectedUsers, record.userID]);
              }
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '用户ID/手机号',
      dataIndex: 'userID',
      copyable: true,
      ellipsis: true,
      renderFormItem: () => <Input placeholder="请输入用户ID或手机号" />,
    },
  ];

  // 获取图片尺寸
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // 处理附件上传
  const handleAttachmentUpload = async (file: File) => {
    try {
      // 验证文件类型
      const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'text/', 'application/zip'];
      const isValidType = allowedTypes.some(type => file.type.startsWith(type));
      
      if (!isValidType) {
        message.error('不支持的文件类型');
        return false;
      }
      
      // 验证文件大小 (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        message.error('文件大小不能超过50MB');
        return false;
      }
      
      setUploading(true);
      const result = await uploadGenericFile(file, `notification/attachment/${file.name}`);
      
      if (result.success) {
        let dimensions = { width: 0, height: 0 };
        
        // 如果是图片，获取尺寸
        if (file.type.startsWith('image/')) {
          try {
            dimensions = await getImageDimensions(file);
          } catch (error) {
            console.warn('获取图片尺寸失败:', error);
          }
        }
        
        const attachmentData = {
          url: result.url,
          type: file.type,
          size: file.size,
          width: dimensions.width,
          height: dimensions.height,
        };
        
        setAttachmentUrl(result.url);
        setAttachmentInfo(attachmentData);
        form.setFieldValue('attachmentUrl', result.url);
        message.success('附件上传成功');
      } else {
        throw new Error(result.error || '上传失败');
      }
      
      return false; // 阻止默认上传行为
    } catch (error) {
      console.error('附件上传失败:', error);
      message.error(`附件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    } finally {
      setUploading(false);
    }
  };

  // 生成UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 处理发送通知
  const handleSendNotification = async (values: SendNotificationForm) => {
    try {
      if (!values.senderAccount) {
        message.error('请选择发送账号');
        return;
      }
      
      if (!values.messageContent.trim()) {
        message.error('请输入消息内容');
        return;
      }
      
      if (!values.sendToAll && selectedUsers.length === 0) {
        message.error('请选择接收用户或勾选"发送所有已注册用户"');
        return;
      }
      
      setLoading(true);
      
      // 获取发送账号信息
      const senderAccount = notificationAccounts.find(account => account.userID === values.senderAccount);
      if (!senderAccount) {
        message.error('发送账号信息不存在');
        return;
      }
      
      // 构建图片元素（如果有附件）
      let pictureElem = undefined;
      if (attachmentInfo && attachmentInfo.type.startsWith('image/')) {
        const uuid = generateUUID();
        pictureElem = {
          sourcePath: "",
          sourcePicture: {
            uuid,
            type: attachmentInfo.type,
            size: attachmentInfo.size,
            width: attachmentInfo.width,
            height: attachmentInfo.height,
            url: attachmentInfo.url
          },
          bigPicture: {
            uuid,
            type: attachmentInfo.type,
            size: attachmentInfo.size,
            width: attachmentInfo.width,
            height: attachmentInfo.height,
            url: attachmentInfo.url
          },
          snapshotPicture: {
            uuid,
            type: attachmentInfo.type,
            size: attachmentInfo.size,
            width: attachmentInfo.width,
            height: attachmentInfo.height,
            url: attachmentInfo.url
          }
        };
      }
      
      // 构建请求参数
      const requestData = {
        isSendAll: values.sendToAll,
        sendID: values.senderAccount,
        recvIDs: values.sendToAll ? [] : selectedUsers,
        groupID: "",
        senderNickname: senderAccount.nickName,
        senderFaceURL: senderAccount.faceURL,
        senderPlatformID: 5,
        content: {
          notificationName: senderAccount.nickName,
          notificationType: 1,
          text: values.messageContent,
          externalUrl: values.linkUrl || values.messageContent,
          mixType: attachmentInfo ? 1 : 0,
          pictureElem
        },
        contentType: 1400,
        sessionType: 4,
        isOnlineOnly: false,
        notOfflinePush: false,
        offlinePushInfo: {
          title: "System Notification",
          desc: values.messageContent,
          ex: "",
          iOSPushSound: "default",
          iOSBadgeCount: true
        }
      };
      
      // 调用发送通知API
      const response = await sendNotification(requestData);
      
      if (response.errCode === 0) {
        message.success(`通知发送成功，共发送给 ${response.data?.results?.length || 0} 个用户`);
        
        // 重置表单
        form.resetFields();
        setSelectedUsers([]);
        setAttachmentUrl('');
        setAttachmentInfo(null);
      } else {
        message.error(`发送失败: ${response.errMsg}`);
      }
      
    } catch (error) {
      console.error('发送通知失败:', error);
      message.error('发送通知失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 获取当前页面的所有用户ID
      const currentPageData = actionRef.current?.getDataSource() || [];
      const currentPageUserIds = currentPageData.map(user => user.userID);
      setSelectedUsers([...new Set([...selectedUsers, ...currentPageUserIds])]);
    } else {
      setSelectedUsers([]);
    }
  };

  // 获取当前页面的用户数据
  const getCurrentPageUsers = () => {
    return userListData;
  };

  // 检查当前页面是否全选
  const isCurrentPageAllSelected = () => {
    const currentPageUsers = getCurrentPageUsers();
    if (currentPageUsers.length === 0) return false;
    return currentPageUsers.every(user => selectedUsers.includes(user.userID));
  };

  // 检查当前页面是否部分选中
  const isCurrentPagePartiallySelected = () => {
    const currentPageUsers = getCurrentPageUsers();
    if (currentPageUsers.length === 0) return false;
    const selectedCount = currentPageUsers.filter(user => selectedUsers.includes(user.userID)).length;
    return selectedCount > 0 && selectedCount < currentPageUsers.length;
  };

  useEffect(() => {
    fetchNotificationAccounts();
  }, []);

  return (
    <PageContainer
      header={{
        title: '发送通知',
        breadcrumb: {
          items: [
            { title: 'IM 系统' },
            { title: '通知管理' },
            { title: '发送通知' },
          ],
        },
      }}
    >
      <Row gutter={24}>
        {/* 左侧发送配置 */}
        <Col span={10}>
          <Card title="发送配置" size="small">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSendNotification}
              initialValues={{
                sendToAll: false,
              }}
            >
              <Form.Item
                name="senderAccount"
                label="发送账号"
                rules={[{ required: true, message: '请选择发送账号' }]}
              >
                <Select
                  placeholder="请选择发送账号"
                  showSearch
                  filterOption={(input, option) => {
                    const account = notificationAccounts.find(acc => acc.userID === option?.value);
                    if (account) {
                      return account.nickName.toLowerCase().includes(input.toLowerCase()) ||
                             account.userID.toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                >
                  {notificationAccounts.map(account => (
                    <Option key={account.userID} value={account.userID}>
                      <Space>
                        <Avatar
                          size={24}
                          src={account.faceURL}
                          icon={<UserOutlined />}
                        />
                        <span>{account.nickName}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          ({account.userID})
                        </span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="messageContent"
                label="消息内容"
                rules={[{ required: true, message: '请输入消息内容' }]}
              >
                <TextArea
                  rows={6}
                  placeholder="请输入消息内容"
                  maxLength={1000}
                  showCount
                />
              </Form.Item>

              <Form.Item label="附件(选填)">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Upload
                    beforeUpload={handleAttachmentUpload}
                    showUploadList={false}
                    multiple={false}
                    maxCount={1}
                  >
                    <Button 
                      icon={<UploadOutlined />} 
                      loading={uploading}
                      block
                    >
                      上传附件
                    </Button>
                  </Upload>
                  {attachmentInfo && (
                    <div style={{ fontSize: 12, color: '#666' }}>
                      <div>已上传附件: {attachmentInfo.type}</div>
                      {attachmentInfo.type.startsWith('image/') && (
                        <div>尺寸: {attachmentInfo.width} x {attachmentInfo.height}</div>
                      )}
                      <div>大小: {(attachmentInfo.size / 1024).toFixed(1)} KB</div>
                    </div>
                  )}
                </Space>
              </Form.Item>

              <Form.Item
                name="linkUrl"
                label="地址链接(选填)"
              >
                <Input
                  placeholder="请输入地址链接"
                  prefix={<LinkOutlined />}
                />
              </Form.Item>

              <Form.Item
                name="sendToAll"
                valuePropName="checked"
              >
                <Checkbox>发送所有已注册的用户</Checkbox>
              </Form.Item>

              {/* 已选择用户预览 */}
              {selectedUsers.length > 0 && !form.getFieldValue('sendToAll') && (
                <Form.Item label="已选择用户">
                  <div style={{ 
                    maxHeight: 120, 
                    overflowY: 'auto', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: 6, 
                    padding: 8,
                    backgroundColor: '#fafafa'
                  }}>
                    <Space wrap>
                      {selectedUsers.map(userId => {
                        const user = userListData.find(u => u.userID === userId);
                        return user ? (
                          <Tooltip key={userId} title={`${user.nickname} (${user.userID})`}>
                            <Avatar
                              size={32}
                              src={user.faceURL}
                              icon={<UserOutlined />}
                              style={{ 
                                cursor: 'pointer',
                                border: '2px solid #1890ff'
                              }}
                              onClick={() => {
                                setSelectedUsers(selectedUsers.filter(id => id !== userId));
                              }}
                            />
                          </Tooltip>
                        ) : null;
                      })}
                    </Space>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      共选择 {selectedUsers.length} 个用户，点击头像可移除
                    </div>
                  </div>
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SendOutlined />}
                  block
                >
                  确定发送
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 右侧用户列表 */}
        <Col span={14}>
          <Card 
            title={
              <Space>
                <UserOutlined />
                用户列表
                <Checkbox
                  checked={isCurrentPageAllSelected()}
                  indeterminate={isCurrentPagePartiallySelected()}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  全选当前页
                </Checkbox>
                {selectedUsers.length > 0 && (
                  <Button
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={() => setSelectedUsers([])}
                    style={{ marginLeft: 8 }}
                  >
                    清除选择
                  </Button>
                )}
                <span style={{ fontSize: 12, color: '#666' }}>
                  已选择 {selectedUsers.length} 个用户
                </span>
              </Space>
            }
            size="small"
          >
            <ProTable<IMUser>
              actionRef={actionRef}
              rowKey="userID"
              search={{
                labelWidth: 'auto',
                defaultCollapsed: false,
              }}
              request={fetchIMUsers}
              columns={columns}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
              scroll={{ y: 400 }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default SendNotification;