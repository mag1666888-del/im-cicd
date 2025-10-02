/**
 * @name 代理配置
 * @description 配置开发环境下的API代理规则
 * @see 在生产环境代理无法生效，所以这里没有生产环境的配置
 * @doc https://umijs.org/docs/guides/proxy
 */

// 服务器地址配置
const SERVER_CONFIG = {
  // 统一服务器地址
  BASE_SERVER: 'http://127.0.0.1',
  // 管理后台服务 (端口 10009)
  ADMIN_SERVER: 'http://127.0.0.1:10009',
  // IM 服务 (端口 10002)
  IM_SERVER: 'http://127.0.0.1:10002',
  // 用户服务 (端口 10008)
  USER_SERVER: 'http://127.0.0.1:10008',
};

// 通用代理配置
const createProxyConfig = (target: string) => ({
  target,
  changeOrigin: true, // 支持跨域
  secure: false, // 如果是https接口，需要配置这个参数
  logLevel: 'debug', // 开发环境显示代理日志
});

export default {
  // 开发环境代理配置
  dev: {
    // ==================== IM 系统服务 (端口 10002) - /api/im ====================
    '/api/im': {
      ...createProxyConfig(SERVER_CONFIG.IM_SERVER),
      pathRewrite: { '^/api/im': '' },
    },

    // ==================== 用户服务 (端口 10008) - /api/user ====================
    '/api/user': {
      ...createProxyConfig(SERVER_CONFIG.USER_SERVER),
      pathRewrite: { '^/api/user': '' },
    },

    // ==================== 管理后台服务 (端口 10009) - /api/admin ====================
    '/api/admin': {
      ...createProxyConfig(SERVER_CONFIG.ADMIN_SERVER),
      pathRewrite: { '^/api/admin': '' },
    },
  },

  // 测试环境代理配置
  test: {
    '/api/': {
      target: SERVER_CONFIG.ADMIN_SERVER,
      changeOrigin: true,
      pathRewrite: { '^/api': '' }, // 移除 /api 前缀
    },
  },

  // 预发布环境代理配置
  pre: {
    '/api/': {
      target: SERVER_CONFIG.ADMIN_SERVER,
      changeOrigin: true,
      pathRewrite: { '^/api': '' }, // 移除 /api 前缀
    },
  },
};
