import React, { useState } from 'react';
import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Avatar, message, Popconfirm, Modal, Typography, DatePicker } from 'antd';
import { UndoOutlined, MessageOutlined, EyeOutlined } from '@ant-design/icons';
import { searchUserMessages, revokeMessage } from '@/services/ant-design-pro/api';
import { UserMessageItem, SESSION_TYPES, MESSAGE_TYPES } from './types';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const UserMessage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [conversationModalVisible, setConversationModalVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<UserMessageItem | null>(null);
  const [conversationMessages, setConversationMessages] = useState<UserMessageItem[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);

  // 获取消息列表数据
  const fetchMessages = async (params: any) => {
    try {
      // 处理单日日期搜索，只有选择了日期才传递
      let sendTime;
      if (params.sendTime) {
        // 单日选择，格式化为 YYYY-MM-DD
        sendTime = dayjs(params.sendTime).format('YYYY-MM-DD');
      }

      // 构建请求参数，只传递有值的参数
      const requestParams: any = {
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      };

      // 只有当 recvID 有值且不为空字符串时才添加该参数
      if (params.recvID && params.recvID.trim() !== '') {
        requestParams.recvID = params.recvID;
      }

      // 只有当 sendID 有值且不为空字符串时才添加该参数
      if (params.sendID && params.sendID.trim() !== '') {
        requestParams.sendID = params.sendID;
      }

      // 只有当 contentType 不为 0 时才添加该参数，确保转换为数字
      if (params.contentType !== undefined && params.contentType !== null && params.contentType !== '' && params.contentType !== 0) {
        requestParams.contentType = Number(params.contentType);
      }

      // 只有当 sessionType 有值时才添加该参数，确保转换为数字
      if (params.sessionType !== undefined && params.sessionType !== null && params.sessionType !== '') {
        requestParams.sessionType = Number(params.sessionType);
      }

      // 只有当 content 有值且不为空字符串时才添加该参数
      if (params.content && params.content.trim() !== '') {
        requestParams.content = params.content;
      }

      // 只有当 sendTime 有值时才添加该参数
      if (sendTime) {
        requestParams.sendTime = sendTime;
      }

      // 添加调试信息
      console.log('搜索消息请求参数:', requestParams);
      
      const response = await searchUserMessages(requestParams);

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
          return `[图片消息] ${parsed.sourceUrl ? '已上传' : '未上传'}`;
        case 103: // 语音消息
          return `[语音消息] 时长: ${parsed.duration || 0}秒`;
        case 104: // 视频消息
          return `[视频消息] 时长: ${parsed.duration || 0}秒`;
        case 105: // 文件消息
          return `[文件消息] ${parsed.fileName || '未知文件'}`;
        case 106: // 位置消息
          return `[位置消息] ${parsed.description || '未知位置'}`;
        case 107: // 自定义消息
          return `[自定义消息] ${parsed.data || content}`;
        case 108: // 引用消息
          return `[引用消息] ${parsed.text || content}`;
        case 109: // 表情消息
          return `[表情消息] ${parsed.emoji || '😀'}`;
        case 110: // 名片消息
          return `[名片消息] ${parsed.nickname || '未知用户'}`;
        case 111: // 合并转发消息
          return `[合并转发] ${parsed.title || '聊天记录'}`;
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
  const handleRevokeMessage = async (record: UserMessageItem) => {
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

  // 获取聊天记录
  const fetchConversationMessages = async (sendID: string, recvID: string) => {
    setConversationLoading(true);
    try {
      // 分别获取四个方向的消息，确保获取完整的对话记录
      const [response1, response2, response3, response4] = await Promise.all([
        // 获取 sendID -> recvID 的消息
        searchUserMessages({
          sendID: sendID,
          recvID: recvID,
          pagination: {
            pageNumber: 1,
            showNumber: 50,
          },
        }),
        // 获取 recvID -> sendID 的消息
        searchUserMessages({
          sendID: recvID,
          recvID: sendID,
          pagination: {
            pageNumber: 1,
            showNumber: 50,
          },
        }),
        // 再次获取 sendID -> recvID 的消息（互换参数）
        searchUserMessages({
          sendID: recvID,
          recvID: sendID,
          pagination: {
            pageNumber: 1,
            showNumber: 50,
          },
        }),
        // 再次获取 recvID -> sendID 的消息（互换参数）
        searchUserMessages({
          sendID: sendID,
          recvID: recvID,
          pagination: {
            pageNumber: 1,
            showNumber: 50,
          },
        })
      ]);

      // 检查所有请求是否成功
      const responses = [response1, response2, response3, response4];
      const hasError = responses.some(resp => resp.errCode !== 0);
      
      if (!hasError) {
        // 合并所有方向的消息
        const allMessages: UserMessageItem[] = [];
        responses.forEach(response => {
          if (response.data?.chatLogs) {
            allMessages.push(...response.data.chatLogs);
          }
        });
        
        // 去重处理（基于 serverMsgID）
        const uniqueMessages = allMessages.filter((message, index, self) => 
          index === self.findIndex(m => m.chatLog.serverMsgID === message.chatLog.serverMsgID)
        );
        
        // 按实际发送时间排序（sendTime 是时间戳）
        const conversationMessages = uniqueMessages.sort((a, b) => {
          const timeA = a.chatLog.sendTime;
          const timeB = b.chatLog.sendTime;
          return timeA - timeB; // 升序排列，最早的消息在前
        });
        
        console.log('获取到的对话消息数量:', conversationMessages.length);
        setConversationMessages(conversationMessages);
      } else {
        const errorMsg = responses.find(resp => resp.errCode !== 0)?.errMsg || '获取聊天记录失败';
        message.error(errorMsg);
        setConversationMessages([]);
      }
    } catch (error) {
      console.error('获取聊天记录失败:', error);
      message.error('获取聊天记录失败，请重试');
      setConversationMessages([]);
    } finally {
      setConversationLoading(false);
    }
  };

  // 查看对话
  const handleViewConversation = (record: UserMessageItem) => {
    setCurrentMessage(record);
    setConversationModalVisible(true);
    // 获取双方的聊天记录
    fetchConversationMessages(record.chatLog.sendID, record.chatLog.recvID);
  };

  // 列定义
  const columns: ProColumns<UserMessageItem>[] = [
    {
      title: '消息内容',
      dataIndex: ['chatLog', 'content'],
      key: 'content',
      width: 300,
      hideInSearch: true,
      render: (_, record: UserMessageItem) => {
        const content = parseMessageContent(record.chatLog.content, record.chatLog.contentType);
        return (
          <div style={{ maxWidth: 280, wordBreak: 'break-word' }}>
            <Text ellipsis={{ tooltip: content }}>
              {content}
            </Text>
            {record.isRevoked && (
              <Tag color="red" style={{ marginLeft: 8 }}>
                已撤回
              </Tag>
            )}
          </div>
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
      copyable: true,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入发送者ID',
      },
    },
    {
      title: '接收者ID',
      dataIndex: ['chatLog', 'recvID'],
      key: 'recvID',
      width: 120,
      copyable: true,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入接收者ID',
      },
    },
    {
      title: '会话类型',
      dataIndex: ['chatLog', 'sessionType'],
      key: 'sessionType',
      width: 100,
      hideInSearch: false,
      valueType: 'select',
      valueEnum: {
        1: { text: '单聊' },
        2: { text: '群聊' },
      },
      fieldProps: {
        placeholder: '请选择会话类型',
      },
      render: (_, record: UserMessageItem) => (
        <Tag color={record.chatLog.sessionType === 1 ? 'blue' : 'green'}>
          {SESSION_TYPES[record.chatLog.sessionType as keyof typeof SESSION_TYPES] || '未知'}
        </Tag>
      ),
    },
    {
      title: '消息类型',
      dataIndex: ['chatLog', 'contentType'],
      key: 'contentType',
      width: 120,
      hideInSearch: false,
      valueType: 'select',
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
        1701: { text: '音视频通话消息' },
      },
      render: (_, record: UserMessageItem) => (
        <Tag color="purple">
          {MESSAGE_TYPES[record.chatLog.contentType as keyof typeof MESSAGE_TYPES] || '未知类型'}
        </Tag>
      ),
    },
    {
      title: '发送时间',
      dataIndex: ['chatLog', 'sendTime'],
      key: 'sendTime',
      width: 150,
      hideInSearch: false,
      valueType: 'date',
      fieldProps: {
        placeholder: '请选择日期',
      },
      render: (_, record: UserMessageItem) => (
        <span>{new Date(record.chatLog.sendTime).toLocaleString('zh-CN')}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      hideInSearch: true,
      render: (_, record: UserMessageItem) => (
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
              size="small"
              icon={<UndoOutlined />}
              disabled={record.isRevoked}
              danger
            >
              撤回
            </Button>
          </Popconfirm>
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

  return (
    <PageContainer
      header={{
        title: '用户消息',
        breadcrumb: {
          items: [
            { title: 'IM 系统' },
            { title: '消息管理' },
            { title: '用户消息' },
          ],
        },
      }}
    >
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

      {/* 聊天记录弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageOutlined style={{ color: '#1890ff' }} />
            <span>聊天记录</span>
            {currentMessage && (
              <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                - {currentMessage.chatLog.senderNickname} & {currentMessage.chatLog.recvNickname}
              </span>
            )}
          </div>
        }
        open={conversationModalVisible}
        onCancel={() => {
          setConversationModalVisible(false);
          setConversationMessages([]);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setConversationModalVisible(false);
            setConversationMessages([]);
          }}>
            关闭
          </Button>,
        ]}
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ 
          height: '600px', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#fafafa'
        }}>
          {conversationLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '50px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid #f0f0f0',
                borderTop: '3px solid #1890ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <Text style={{ color: '#666' }}>加载聊天记录中...</Text>
            </div>
          ) : conversationMessages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '50px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <MessageOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <Text style={{ color: '#666' }}>暂无聊天记录</Text>
            </div>
          ) : (
            <div style={{ 
              flex: 1,
              overflow: 'auto',
              padding: '16px',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            }}>
              {conversationMessages.map((message, index) => {
                // 获取当前登录用户的ID
                const currentUserID = localStorage.getItem('imUserID') || localStorage.getItem('adminUserID') || '';
                const isFromMe = message.chatLog.sendID === currentUserID;
                const isRevoked = message.isRevoked;
                
                // 获取发送者和接收者信息
                const senderInfo = {
                  nickname: message.chatLog.senderNickname || '未知用户',
                  faceURL: message.chatLog.senderFaceURL,
                  userID: message.chatLog.sendID
                };
                
                const receiverInfo = {
                  nickname: message.chatLog.recvNickname || '未知用户',
                  faceURL: message.chatLog.recvFaceURL,
                  userID: message.chatLog.recvID
                };
                
                // 确定显示的用户信息
                const displayUser = isFromMe ? senderInfo : receiverInfo;
                const otherUser = isFromMe ? receiverInfo : senderInfo;
                
                return (
                  <div
                    key={message.chatLog.serverMsgID}
                    style={{
                      marginBottom: '20px',
                      display: 'flex',
                      flexDirection: isFromMe ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    {/* 头像 */}
                    <div style={{ position: 'relative' }}>
                      <Avatar
                        size={40}
                        src={displayUser.faceURL}
                        style={{ 
                          backgroundColor: isFromMe ? '#1890ff' : '#52c41a',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: '2px solid #fff'
                        }}
                      >
                        {getInitial(displayUser.nickname)}
                      </Avatar>
                      {isFromMe && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#52c41a',
                          borderRadius: '50%',
                          border: '2px solid #fff'
                        }} />
                      )}
                    </div>
                    
                    {/* 消息内容区域 */}
                    <div style={{ 
                      maxWidth: '70%',
                      minWidth: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isFromMe ? 'flex-end' : 'flex-start'
                    }}>
                      {/* 用户信息 */}
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        marginBottom: '4px',
                        padding: '0 8px'
                      }}>
                        <span style={{ fontWeight: '500' }}>
                          {isFromMe ? '我' : displayUser.nickname}
                        </span>
                        <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                          {new Date(message.chatLog.sendTime).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {/* 消息气泡 */}
                      <div
                        style={{
                          backgroundColor: isFromMe ? '#1890ff' : '#fff',
                          color: isFromMe ? '#fff' : '#333',
                          padding: '12px 16px',
                          borderRadius: isFromMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          position: 'relative',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: isFromMe ? 'none' : '1px solid #e8e8e8',
                          wordBreak: 'break-word',
                          lineHeight: '1.4'
                        }}
                      >
                        {/* 消息内容 */}
                        <div>
                          {isRevoked ? (
                            <div style={{ 
                              fontStyle: 'italic', 
                              opacity: 0.7,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <UndoOutlined />
                              <span>此消息已被撤回</span>
                            </div>
                          ) : (
                            <div style={{ 
                              color: isFromMe ? '#fff' : '#333',
                              fontSize: '14px'
                            }}>
                              {parseMessageContent(message.chatLog.content, message.chatLog.contentType)}
                            </div>
                          )}
                        </div>
                        
                        {/* 消息类型标签 */}
                        {!isRevoked && (
                          <div style={{ 
                            marginTop: '8px',
                            display: 'flex',
                            justifyContent: isFromMe ? 'flex-end' : 'flex-start'
                          }}>
                            <Tag 
                              size="small"
                              style={{ 
                                color: isFromMe ? '#1890ff' : '#666',
                                backgroundColor: isFromMe ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                                border: 'none',
                                fontSize: '10px',
                                borderRadius: '10px'
                              }}
                            >
                              {MESSAGE_TYPES[message.chatLog.contentType as keyof typeof MESSAGE_TYPES] || '未知类型'}
                            </Tag>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Modal>
    </PageContainer>
  );
};

export default UserMessage;
