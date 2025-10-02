// 通用响应结构
export interface BaseResponse<T = any> {
  errCode: number;
  errMsg: string;
  errDlt: string;
  data: T;
}

// 分页参数
export interface PaginationParams {
  pageNumber: number;
  showNumber: number;
}

// 分页响应
export interface PaginationResponse<T = any> {
  list: T[];
  total: number;
}

// 用户相关类型
export interface UserInfo {
  account: string;
  password: string;
  faceURL: string;
  nickname: string;
  userID: string;
  level: number;
  createTime: number;
}

export interface LoginParams {
  account: string;
  password: string;
}

export interface LoginResult {
  errCode: number;
  errMsg: string;
  errDlt: string;
  data: {
    adminToken: string;
    imToken: string;
    adminAccount: string;
    nickname: string;
    faceURL: string;
    level: number;
    adminUserID: string;
    imUserID: string;
  };
}

// 用户搜索相关
export interface SearchUsersParams {
  keyword: string;
  pagination: PaginationParams;
}

export interface SearchUsersResponse {
  users: Array<{
    userID: string;
    nickname: string;
    faceURL: string;
    gender: number;
    phoneNumber: string;
    email: string;
    createTime: number;
  }>;
  total: number;
}

// 用户更新相关
export interface UpdateUserParams {
  userID: string;
  faceURL?: string;
  nickname?: string;
  gender?: number;
  birth?: number;
}

// 封禁用户相关
export interface SearchBlockedUsersParams {
  pagination: PaginationParams;
}

export interface BlockedUser {
  userID: string;
  nickname: string;
  faceURL: string;
  gender: number;
  phoneNumber: string;
  createTime: number;
  blockTime: number;
  reason: string;
}

export interface SearchBlockedUsersResponse {
  users: BlockedUser[];
  total: number;
}

export interface UnblockUserParams {
  userIDs: string[];
}

export interface BlockUserParams {
  userID: string;
  reason: string;
}

// 密码重置相关
export interface ResetPasswordParams {
  userID: string;
  newPassword: string;
}

// 创建用户相关
export interface CreateUserParams {
  users: Array<{
    userID: string;
    nickname: string;
    faceURL: string;
    gender: number;
    phoneNumber: string;
    email: string;
    password: string;
    areaCode: string;
  }>;
}

// 默认好友相关
export interface SearchDefaultFriendsParams {
  pagination: PaginationParams;
  keyword?: string;
}

export interface DefaultFriend {
  userID: string;
  nickname: string;
  faceURL: string;
  createTime: number;
}

export interface SearchDefaultFriendsResponse {
  users: DefaultFriend[];
  total: number;
}

export interface AddDefaultFriendParams {
  userID: string;
}

export interface RemoveDefaultFriendParams {
  userID: string;
}

// 默认群组相关
export interface SearchDefaultGroupsParams {
  pagination: PaginationParams;
}

export interface DefaultGroup {
  groupID: string;
  groupName: string;
  faceURL: string;
  createTime: number;
}

export interface SearchDefaultGroupsResponse {
  groups: DefaultGroup[];
  total: number;
}

export interface AddDefaultGroupParams {
  groupID: string;
}

export interface RemoveDefaultGroupParams {
  groupID: string;
}

// IM 用户相关
export interface GetIMUsersParams {
  pagination: PaginationParams;
  userID?: string;
  nickname?: string;
}

export interface IMUser {
  userID: string;
  nickname: string;
  faceURL: string;
  ex: string;
  createTime: number;
  appMangerLevel: number;
  globalRecvMsgOpt: number;
}

export interface GetIMUsersResponse {
  users: IMUser[];
  total: number;
}

// 强制下线相关
export interface ForceLogoutParams {
  userID: string;
  platformID: number;
}

// 好友相关
export interface GetFriendListParams {
  userID: string;
  pagination: PaginationParams;
}

export interface FriendInfo {
  friendUser: {
    userID: string;
    nickname: string;
    faceURL: string;
  };
  createTime: number;
  addSource: number;
  remark: string;
  ex: string;
}

export interface GetFriendListResponse {
  friendsInfo: FriendInfo[];
  total: number;
}

export interface DeleteFriendParams {
  ownerUserID: string;
  friendUserID: string;
}

// 在线状态相关
export interface GetUsersOnlineStatusParams {
  userIDs: string[];
}

export interface OnlineStatus {
  status: number;
  singlePlatformToken: Array<{
    platformID: number;
    token: string;
  }>;
}

export interface GetUsersOnlineStatusResponse {
  [userID: string]: OnlineStatus;
}

// 群组相关
export interface GetGroupsParams {
  current: number;
  pageSize: number;
  groupID?: string;
  groupName?: string;
  pagination: PaginationParams;
}

export interface GroupInfo {
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
}

export interface GroupItem {
  groupInfo: GroupInfo;
  groupOwnerUserName: string;
  groupOwnerUserID: string;
}

export interface GetGroupsResponse {
  groups: GroupItem[];
  total: number;
}

export interface GetGroupMemberListParams {
  groupID: string;
  pagination: PaginationParams;
}

export interface GroupMember {
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

export interface GetGroupMemberListResponse {
  members: GroupMember[];
  total: number;
}

export interface CreateGroupParams {
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

export interface SetGroupInfoParams {
  groupID: string;
  groupName?: string;
  introduction?: string;
  notification?: string;
  faceURL?: string;
  needVerification?: number;
  lookMemberInfo?: number;
  applyMemberFriend?: number;
}

export interface MuteGroupParams {
  groupID: string;
}

export interface DismissGroupParams {
  groupID: string;
}

// 消息相关
export interface SearchUserMessagesParams {
  sessionType?: number;
  contentType?: number;
  recvID?: string;
  sendID?: string;
  content?: string;
  sendTime?: string;
  pagination: PaginationParams;
}

export interface ChatLog {
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
}

export interface UserMessageItem {
  chatLog: ChatLog;
  isRevoked: boolean;
}

export interface SearchUserMessagesResponse {
  chatLogs: UserMessageItem[];
  chatLogsNum: number;
}

export interface RevokeMessageParams {
  userID: string;
  conversationID: string;
  seq: number;
}

// 客户端日志相关
export interface SearchClientLogsParams {
  current: number;
  pageSize: number;
  pagination: PaginationParams;
  userID?: string;
  startTime?: number;
  endTime?: number;
}

export interface LogItem {
  userID: string;
  platform: string;
  url: string;
  createTime: number;
  nickname: string;
  logID: string;
  filename: string;
  systemType: string;
  ex: string;
  version: string;
}

export interface SearchClientLogsResponse {
  logsInfos: LogItem[];
  total: number;
}
