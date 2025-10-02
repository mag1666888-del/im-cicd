// 群组信息接口
export interface GroupItem {
  groupInfo: {
    groupID: string;
    groupName: string;
    notification: string;
    introduction: string;
    faceURL: string;
    ownerUserID: string;
    createTime: number;
    memberCount: number;
    ex: string;
    status: number;
    creatorUserID: string;
    groupType: number;
    needVerification: number;
    lookMemberInfo: number;
    applyMemberFriend: number;
    notificationUpdateTime: number;
    notificationUserID: string;
  };
  groupOwnerUserName: string;
  groupOwnerUserID: string;
}

// 群组成员信息接口
export interface GroupMemberItem {
  groupID: string;
  userID: string;
  roleLevel: number;
  joinTime: number;
  nickname: string;
  faceURL: string;
  appMangerLevel: number;
  joinSource: number;
  operatorUserID: string;
  ex: string;
  muteEndTime: number;
  inviterUserID: string;
}

// IM用户信息接口
export interface IMUserItem {
  userID: string;
  nickname: string;
  faceURL: string;
  ex: string;
  createTime: number;
  appMangerLevel: number;
  globalRecvMsgOpt: number;
}

// 创建群组表单数据接口
export interface CreateGroupFormData {
  groupName: string;
  ownerUserID: string;
  adminUserIDs: string[];
  memberUserIDs: string[];
  needVerification: number;
  lookMemberInfo: number;
  applyMemberFriend: number;
  introduction: string;
  notification: string;
  faceURL: string;
}
