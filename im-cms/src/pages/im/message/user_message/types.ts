// 用户消息接口
export interface UserMessageItem {
  chatLog: {
    serverMsgID: string;
    clientMsgID: string;
    sendID: string;
    recvID: string;
    groupID: string;
    recvNickname: string;
    senderPlatformID: number;
    senderNickname: string;
    senderFaceURL: string;
    groupName: string;
    sessionType: number;
    msgFrom: number;
    contentType: number;
    content: string;
    status: number;
    sendTime: number;
    createTime: number;
    ex: string;
    groupFaceURL: string;
    groupMemberCount: number;
    seq: number;
    groupOwner: string;
    groupType: number;
  };
  isRevoked: boolean;
}

// 会话类型枚举
export const SESSION_TYPES = {
  1: '单聊',
  2: '群聊',
} as const;

// 消息类型枚举 - 基于 OpenIM 标准
export const MESSAGE_TYPES = {
  0: '全部消息',
  101: '文本消息',
  102: '图片消息',
  103: '语音消息',
  104: '视频消息',
  105: '文件消息',
  106: '位置消息',
  107: '自定义消息',
  108: '引用消息',
  109: '表情消息',
  110: '名片消息',
  111: '合并转发消息',
  112: '链接消息',
  113: '系统消息',
  114: '撤回消息',
  115: '群公告消息',
  116: '群成员变更消息',
  117: '群名称变更消息',
  118: '群头像变更消息',
  119: '群禁言消息',
  120: '群解禁消息',
  1201: '好友申请消息',
  1202: '好友申请通过消息',
  1203: '好友申请拒绝消息',
  1204: '好友删除消息',
  1205: '好友申请撤回消息',
  1206: '好友申请过期消息',
  1701: '音视频通话消息',
} as const;