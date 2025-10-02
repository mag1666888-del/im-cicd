import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Avatar, Tag, Space, Button, Popconfirm, message, Modal, Typography } from 'antd';
import { revokeMessage, searchUserMessages } from '@/services/ant-design-pro/api';
import { GroupMessageItem, SESSION_TYPES, MESSAGE_TYPES } from './types';
import dayjs from 'dayjs';

const { Text } = Typography;

const GroupMessageList: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [conversationModalVisible, setConversationModalVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<GroupMessageItem | null>(null);
  const [conversationMessages, setConversationMessages] = useState<GroupMessageItem[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);

  // 获取群组消息列表
  const fetchGroupMessages = async (params: any) => {
    try {
      // 处理单日日期搜索
      let sendTime;
      if (params.sendTime) {
        // 单日选择，格式化为 YYYY-MM-DD
        sendTime = dayjs(params.sendTime).format('YYYY-MM-DD');
      } else {
        // 如果没有选择日期，使用默认的当天日期
        sendTime = dayjs().format('YYYY-MM-DD');
      }

      // 构建请求参数，只传递有值的参数
      const requestParams: any = {
        sessionType: 3, // 群组消息固定为 3
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      };

      // 只有当 groupID 有值且不为空字符串时才添加该参数
      if (params.groupID && params.groupID.trim() !== '') {
        requestParams.recvID = params.groupID;
      }

      // 只有当 sendID 有值且不为空字符串时才添加该参数
      if (params.sendID && params.sendID.trim() !== '') {
        requestParams.sendID = params.sendID;
      }

      // 只有当 contentType 不为 0 时才添加该参数
      if (params.contentType && params.contentType !== 0) {
        requestParams.contentType = params.contentType;
      }

      // 只有当 content 有值且不为空字符串时才添加该参数
      if (params.content && params.content.trim() !== '') {
        requestParams.content = params.content;
      }

      // 总是添加 sendTime 参数
      requestParams.sendTime = sendTime;

      // 添加调试信息
      console.log('搜索群组消息请求参数:', requestParams);
      console.log('原始 params.sendTime:', params.sendTime);
      console.log('处理后的 sendTime:', sendTime);
      
      const response = await searchUserMessages(requestParams);

      if (response.errCode === 0) {
        return {
          data: response.data.chatLogs || [],
          success: true,
          total: response.data.chatLogsNum || 0,
        };
      } else {
        message.error(response.errMsg || '获取群组消息列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取群组消息列表失败:', error);
      message.error('获取群组消息列表失败，请重试');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取头像首字母
  const getInitial = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // 解析消息内容
  const parseMessageContent = (content: string, contentType: number) => {
    try {
      const parsed = JSON.parse(content);
      switch (contentType) {
        case 101: // 文本消息
          return parsed.content || content;
        case 102: // 图片消息
          return `[图片] ${parsed.sourcePicture?.url ? '已发送图片' : '图片消息'}`;
        case 103: // 语音消息
          return `[语音] ${parsed.duration ? `时长: ${parsed.duration}秒` : '语音消息'}`;
        case 104: // 视频消息
          return `[视频] ${parsed.videoUrl ? '已发送视频' : '视频消息'}`;
        case 105: // 文件消息
          return `[文件] ${parsed.fileName || '文件消息'}`;
        case 106: // 位置消息
          return `[位置] ${parsed.description || '位置消息'}`;
        case 107: // 自定义消息
          return `[自定义] ${parsed.data || content}`;
        case 108: // 引用消息
          return `[引用] ${parsed.text || content}`;
        case 109: // 表情消息
          return `[表情] ${parsed.data || '表情消息'}`;
        case 110: // 名片消息
          return `[名片] ${parsed.nickname || '名片消息'}`;
        case 111: // 合并转发消息
          return `[合并转发] ${parsed.title || '合并转发消息'}`;
        case 112: // 链接消息
          return `[链接消息] ${parsed.title || parsed.url || '未知链接'}`;
        case 113: // 系统消息
          return `[系统消息] ${parsed.text || content}`;
        case 114: // 撤回消息
          return `[撤回消息]`;
        case 115: // 群公告消息
          return `[群公告] ${parsed.text || content}`;
        case 116: // 群成员变更消息
          return `[群成员变更] ${parsed.text || content}`;
        case 117: // 群名称变更消息
          return `[群名称变更] ${parsed.text || content}`;
        case 118: // 群头像变更消息
          return `[群头像变更]`;
        case 119: // 群禁言消息
          return `[群禁言] ${parsed.text || content}`;
        case 120: // 群解禁消息
          return `[群解禁] ${parsed.text || content}`;
        case 1201: // 好友申请消息
          return `[好友申请] ${parsed.reqMsg || '申请添加好友'}`;
        case 1202: // 好友申请通过消息
          return `[好友申请通过]`;
        case 1203: // 好友申请拒绝消息
          return `[好友申请拒绝]`;
        case 1204: // 好友删除消息
          return `[好友删除]`;
        case 1205: // 好友申请撤回消息
          return `[好友申请撤回]`;
        case 1206: // 好友申请过期消息
          return `[好友申请过期]`;
        case 1511: // 群组信息变更消息
          return `[群组信息变更] ${parsed.detail ? '群组信息已更新' : '群组信息变更'}`;
        case 1701: // 音视频通话消息
          return `[音视频通话] ${parsed.duration ? `时长: ${parsed.duration}秒` : ''}`;
        default:
          return content;
      }
    } catch {
      return content;
    }
  };

  // 撤回消息
  const handleRevokeMessage = async (record: GroupMessageItem) => {
    try {
      // 构建 conversationID
      const conversationID = `si_${record.chatLog.sendID}_${record.chatLog.recvID}`;
      
      const response = await revokeMessage({
        userID: record.chatLog.sendID,
        conversationID: conversationID,
        seq: record.chatLog.seq,
      });

      if (response.errCode === 0) {
        message.success('消息撤回成功');
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '撤回消息失败');
      }
    } catch (error) {
      console.error('撤回消息失败:', error);
      message.error('撤回消息失败，请重试');
    }
  };

  // 获取群组聊天记录
  const fetchGroupConversationMessages = async (groupID: string) => {
    setConversationLoading(true);
    try {
      // 获取群组的所有消息
      const response = await searchUserMessages({
        sessionType: 3,
        recvID: groupID,
        pagination: {
          pageNumber: 1,
          showNumber: 100, // 获取更多消息
        },
      });

      if (response.errCode === 0) {
        setConversationMessages(response.data.chatLogs || []);
      } else {
        message.error(response.errMsg || '获取群组聊天记录失败');
        setConversationMessages([]);
      }
    } catch (error) {
      console.error('获取群组聊天记录失败:', error);
      message.error('获取群组聊天记录失败，请重试');
      setConversationMessages([]);
    } finally {
      setConversationLoading(false);
    }
  };

  // 查看群组对话
  const handleViewConversation = (record: GroupMessageItem) => {
    setCurrentMessage(record);
    setConversationModalVisible(true);
    fetchGroupConversationMessages(record.chatLog.groupID);
  };

  // 关闭对话弹窗
  const handleCloseConversationModal = () => {
    setConversationModalVisible(false);
    setCurrentMessage(null);
    setConversationMessages([]);
  };

  const columns = [
    {
      title: '群组头像',
      dataIndex: ['chatLog', 'groupFaceURL'],
      key: 'groupFaceURL',
      width: 80,
      hideInSearch: true,
      render: (_: any, record: GroupMessageItem) => (
        <Avatar
          size={40}
          src={record.chatLog.groupFaceURL}
          style={{ backgroundColor: '#1890ff' }}
        >
          {getInitial(record.chatLog.groupName || '群')}
        </Avatar>
      ),
    },
    {
      title: '群组名称',
      dataIndex: ['chatLog', 'groupName'],
      key: 'groupName',
      width: 150,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入群组名称',
      },
      render: (_: any, record: GroupMessageItem) => record.chatLog.groupName || '未知群组',
    },
    {
      title: '消息内容',
      dataIndex: ['chatLog', 'content'],
      key: 'content',
      width: 300,
      hideInSearch: true,
      render: (_: any, record: GroupMessageItem) => (
        <div style={{ maxWidth: 280, wordBreak: 'break-word' }}>
          {record.isRevoked ? (
            <Text style={{ fontStyle: 'italic', color: '#999' }}>
              [此消息已被撤回]
            </Text>
          ) : (
            <Text>
              {parseMessageContent(record.chatLog.content, record.chatLog.contentType)}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '消息类型',
      dataIndex: ['chatLog', 'contentType'],
      key: 'contentType',
      width: 120,
      hideInSearch: false,
      valueType: 'select' as const,
      fieldProps: {
        placeholder: '请选择消息类型',
      },
      valueEnum: {
        0: { text: '全部消息' },
        101: { text: '文本消息' },
        102: { text: '图片消息' },
        103: { text: '语音消息' },
        104: { text: '视频消息' },
        105: { text: '文件消息' },
        106: { text: '位置消息' },
        107: { text: '自定义消息' },
        108: { text: '引用消息' },
        109: { text: '表情消息' },
        110: { text: '名片消息' },
        111: { text: '合并转发消息' },
        112: { text: '链接消息' },
        113: { text: '系统消息' },
        114: { text: '撤回消息' },
        115: { text: '群公告消息' },
        116: { text: '群成员变更消息' },
        117: { text: '群名称变更消息' },
        118: { text: '群头像变更消息' },
        119: { text: '群禁言消息' },
        120: { text: '群解禁消息' },
        1201: { text: '好友申请消息' },
        1202: { text: '好友申请通过消息' },
        1203: { text: '好友申请拒绝消息' },
        1204: { text: '好友删除消息' },
        1205: { text: '好友申请撤回消息' },
        1206: { text: '好友申请过期消息' },
        1511: { text: '群组信息变更消息' },
        1701: { text: '音视频通话消息' },
      },
      render: (_: any, record: GroupMessageItem) => (
        <Tag color="purple">
          {MESSAGE_TYPES[record.chatLog.contentType as keyof typeof MESSAGE_TYPES] || '未知类型'}
        </Tag>
      ),
    },
    {
      title: '群组ID',
      dataIndex: ['chatLog', 'groupID'],
      key: 'groupID',
      width: 120,
      copyable: true,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入群组ID',
      },
    },
    {
      title: '群人数',
      dataIndex: ['chatLog', 'groupMemberCount'],
      key: 'groupMemberCount',
      width: 80,
      hideInSearch: true,
      render: (_: any, record: GroupMessageItem) => (
        <Tag color="blue">{record.chatLog.groupMemberCount || 0}</Tag>
      ),
    },
    {
      title: '发送时间',
      dataIndex: ['chatLog', 'sendTime'],
      key: 'sendTime',
      width: 150,
      hideInSearch: false,
      valueType: 'date' as const,
      fieldProps: {
        placeholder: '请选择日期',
        defaultValue: dayjs(),
      },
      render: (_: any, record: GroupMessageItem) => (
        <span>{new Date(record.chatLog.sendTime).toLocaleString('zh-CN')}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      hideInSearch: true,
      render: (_: any, record: GroupMessageItem) => (
        <Space size="small">
          <Popconfirm
            title="确定要撤回这条消息吗？"
            onConfirm={() => handleRevokeMessage(record)}
            okText="确定"
            cancelText="取消"
            disabled={record.isRevoked}
          >
            <Button
              type="link"
              danger
              size="small"
              disabled={record.isRevoked}
              style={{ 
                color: record.isRevoked ? '#d9d9d9' : '#ff4d4f',
                cursor: record.isRevoked ? 'not-allowed' : 'pointer'
              }}
            >
              撤回
            </Button>
          </Popconfirm>
          <Button
            type="link"
            size="small"
            onClick={() => handleViewConversation(record)}
          >
            对话
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="群组消息管理"
      content="管理群组消息，支持搜索、撤回等操作"
    >
      <ProTable<GroupMessageItem>
        columns={columns}
        request={fetchGroupMessages}
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
        options={{
          reload: () => setRefreshKey(prev => prev + 1),
        }}
        refreshKey={refreshKey}
      />

      {/* 群组对话弹窗 */}
      <Modal
        title={`群组对话 - ${currentMessage?.chatLog.groupName || '未知群组'}`}
        open={conversationModalVisible}
        onCancel={handleCloseConversationModal}
        footer={null}
        width={900}
        style={{ height: '600px' }}
        bodyStyle={{ height: '500px', overflow: 'auto' }}
      >
        <div style={{ height: '100%' }}>
          {conversationLoading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Text>加载中...</Text>
            </div>
          ) : conversationMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Text>暂无聊天记录</Text>
            </div>
          ) : (
            <div style={{ padding: '0 16px' }}>
              {conversationMessages
                .sort((a, b) => a.chatLog.sendTime - b.chatLog.sendTime)
                .map((message, index) => {
                  const isRevoked = message.isRevoked;
                  
                  return (
                    <div
                      key={message.chatLog.serverMsgID}
                      style={{
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      {/* 发送者头像 */}
                      <Avatar
                        size={32}
                        src={message.chatLog.senderFaceURL}
                        style={{ 
                          margin: '0 8px 0 0',
                          backgroundColor: '#52c41a'
                        }}
                      >
                        {getInitial(message.chatLog.senderNickname)}
                      </Avatar>
                      
                      {/* 消息内容 */}
                      <div
                        style={{
                          maxWidth: '70%',
                          backgroundColor: '#f0f0f0',
                          color: '#000',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          position: 'relative',
                        }}
                      >
                        {/* 发送者信息 */}
                        <div style={{ 
                          fontSize: '12px', 
                          opacity: 0.8, 
                          marginBottom: '4px',
                          color: '#666'
                        }}>
                          {message.chatLog.senderNickname}
                          <span style={{ marginLeft: 8 }}>
                            {new Date(message.chatLog.sendTime).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        
                        {/* 消息内容 */}
                        <div style={{ wordBreak: 'break-word' }}>
                          {isRevoked ? (
                            <Text style={{ fontStyle: 'italic', opacity: 0.7 }}>
                              [此消息已被撤回]
                            </Text>
                          ) : (
                            <Text style={{ color: '#000' }}>
                              {parseMessageContent(message.chatLog.content, message.chatLog.contentType)}
                            </Text>
                          )}
                        </div>
                        
                        {/* 消息类型标签 */}
                        <div style={{ 
                          marginTop: '4px',
                          fontSize: '10px',
                          opacity: 0.7
                        }}>
                          <Tag 
                            color="default"
                            style={{ 
                              color: '#666',
                              backgroundColor: '#f0f0f0',
                              fontSize: '10px'
                            }}
                          >
                            {MESSAGE_TYPES[message.chatLog.contentType as keyof typeof MESSAGE_TYPES] || '未知类型'}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};

export default GroupMessageList;
