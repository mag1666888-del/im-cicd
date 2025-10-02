import React, { useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Avatar, 
  Space, 
  Button, 
  message, 
  Tag,
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  UndoOutlined, 
  MessageOutlined,
  UserOutlined
} from '@ant-design/icons';
import { searchUserMessages, revokeMessage } from '@/services/ant-design-pro/api';
import type { UserMessageItem } from './types';

const UserMessageList: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取用户头像首字母
  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // 获取消息内容显示
  const getMessageContent = (content: string, contentType: number) => {
    try {
      const parsed = JSON.parse(content);
      switch (contentType) {
        case 101: // 文本消息
          return parsed.content || '文本消息';
        case 103: // 语音消息
          return `[语音消息] 时长: ${parsed.duration || 0}秒`;
        case 1201: // 好友申请
          return '[好友申请]';
        case 1701: // 会话设置
          return '[会话设置]';
        default:
          return content;
      }
    } catch {
      return content;
    }
  };

  // 获取会话类型显示
  const getSessionTypeText = (sessionType: number) => {
    switch (sessionType) {
      case 1:
        return '单聊';
      case 2:
        return '群聊';
      default:
        return '未知';
    }
  };

  // 获取消息类型显示
  const getMessageTypeText = (contentType: number) => {
    switch (contentType) {
      case 101:
        return '文本';
      case 103:
        return '语音';
      case 1201:
        return '好友申请';
      case 1701:
        return '会话设置';
      default:
        return '其他';
    }
  };

  // 获取消息状态显示
  const getMessageStatus = (status: number, isRevoked: boolean) => {
    if (isRevoked) {
      return <Tag color="red">已撤回</Tag>;
    }
    switch (status) {
      case 0:
        return <Tag color="orange">发送中</Tag>;
      case 2:
        return <Tag color="green">已送达</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 处理撤回消息
  const handleRevokeMessage = async (record: UserMessageItem) => {
    try {
      console.log('撤回消息，serverMsgID:', record.chatLog.serverMsgID);
      
      const response = await revokeMessage({
        serverMsgID: record.chatLog.serverMsgID,
      });
      
      if (response.errCode === 0) {
        message.success('消息撤回成功');
        // 刷新消息列表
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '消息撤回失败');
      }
    } catch (error) {
      console.error('消息撤回失败:', error);
      message.error('消息撤回失败，请重试');
    }
  };

  // 处理查看对话
  const handleViewConversation = (record: UserMessageItem) => {
    message.info('查看对话功能待开发');
  };

  // 消息列表列定义
  const columns: ProColumns<UserMessageItem>[] = [
    {
      title: '消息内容',
      dataIndex: ['chatLog', 'content'],
      key: 'content',
      width: 300,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入消息内容',
      },
      render: (_, record: UserMessageItem) => {
        const content = getMessageContent(record.chatLog.content, record.chatLog.contentType);
        return (
          <Tooltip title={content}>
            <div style={{ 
              maxWidth: 280, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {content}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '发送者昵称',
      dataIndex: ['chatLog', 'senderNickname'],
      key: 'senderNickname',
      width: 120,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入发送者昵称',
      },
      render: (_, record: UserMessageItem) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            size={24}
            src={record.chatLog.senderFaceURL}
            style={{ marginRight: 8, backgroundColor: '#1890ff' }}
          >
            {getInitial(record.chatLog.senderNickname)}
          </Avatar>
          <span>{record.chatLog.senderNickname || '未知用户'}</span>
        </div>
      ),
    },
    {
      title: '发送者ID',
      dataIndex: ['chatLog', 'sendID'],
      key: 'sendID',
      width: 120,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入发送者ID',
      },
      copyable: true,
    },
    {
      title: '接收者ID',
      dataIndex: ['chatLog', 'recvID'],
      key: 'recvID',
      width: 120,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入接收者ID',
      },
      copyable: true,
    },
    {
      title: '会话类型',
      dataIndex: ['chatLog', 'sessionType'],
      key: 'sessionType',
      width: 100,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请选择会话类型',
      },
      valueType: 'select',
      valueEnum: {
        1: { text: '单聊' },
        2: { text: '群聊' },
      },
      render: (_, record: UserMessageItem) => (
        <Tag color={record.chatLog.sessionType === 1 ? 'blue' : 'green'}>
          {getSessionTypeText(record.chatLog.sessionType)}
        </Tag>
      ),
    },
    {
      title: '消息类型',
      dataIndex: ['chatLog', 'contentType'],
      key: 'contentType',
      width: 100,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请选择消息类型',
      },
      valueType: 'select',
      valueEnum: {
        101: { text: '文本' },
        103: { text: '语音' },
        1201: { text: '好友申请' },
        1701: { text: '会话设置' },
      },
      render: (_, record: UserMessageItem) => (
        <Tag color="purple">
          {getMessageTypeText(record.chatLog.contentType)}
        </Tag>
      ),
    },
    {
      title: '发送时间',
      dataIndex: ['chatLog', 'sendTime'],
      key: 'sendTime',
      width: 150,
      hideInSearch: true,
      render: (_, record: UserMessageItem) => new Date(record.chatLog.sendTime).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: ['isRevoked'],
      key: 'status',
      width: 100,
      hideInSearch: true,
      render: (_, record: UserMessageItem) => getMessageStatus(record.chatLog.status, record.isRevoked),
    },
    {
      title: '操作',
      key: 'action',
      hideInSearch: true,
      width: 150,
      render: (_, record: UserMessageItem) => (
        <Space size="small">
          {!record.isRevoked && (
            <Popconfirm
              title="确定要撤回此消息吗？"
              description="撤回后对方将无法看到此消息"
              onConfirm={() => handleRevokeMessage(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<UndoOutlined />}
                danger
              >
                撤回
              </Button>
            </Popconfirm>
          )}
          <Button
            type="link"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => handleViewConversation(record)}
          >
            对话
          </Button>
        </Space>
      ),
    },
  ];

  // 获取消息列表数据
  const fetchMessages = async (params: any) => {
    try {
      const response = await searchUserMessages({
        sessionType: params.sessionType || 0,
        contentType: params.contentType || 0,
        recvID: params.recvID || '',
        sendID: params.sendID || '',
        content: params.content || '',
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      });

      if (response.errCode === 0) {
        return {
          data: response.data.chatLogs || [],
          success: true,
          total: response.data.chatLogsNum || 0,
        };
      } else {
        message.error(response.errMsg || '获取消息列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取消息列表失败:', error);
      message.error('获取消息列表失败，请重试');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  return (
    <PageContainer>
      <ProTable<UserMessageItem>
        columns={columns}
        request={fetchMessages}
        rowKey={(record) => record.chatLog.serverMsgID}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          searchText: '搜索',
          resetText: '重置',
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        scroll={{ x: 1200 }}
        key={refreshKey}
      />
    </PageContainer>
  );
};

export default UserMessageList;