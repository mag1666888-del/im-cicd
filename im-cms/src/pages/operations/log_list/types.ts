// 客户端日志接口
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

// 平台类型枚举
export const PLATFORM_TYPES = {
  Android: 'Android',
  iOS: 'iOS',
  Windows: 'Windows',
  macOS: 'macOS',
  Web: 'Web',
} as const;
