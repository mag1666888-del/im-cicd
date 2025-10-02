/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },
  {
    path: '/welcome',
    name: '首页',
    icon: 'smile',
    component: './Welcome',
  },
 
 
  // 业务系统
  {
    path: '/chat',
    name: '业务系统',
    icon: 'team',
    routes: [
      {
        path: '/chat/user',
        name: '用户管理',
        routes: [
          {
            path: '/chat/user/user_list',
            name: '用户列表',
            component: './chat/user/user_list',
          },
          {
            path: '/chat/user/block_list',
            name: '封禁列表',
            component: './chat/user/block_list',
          },
        ],
      },
      {
        path: '/chat/register',
        name: '注册管理',
        routes: [
          {
            path: '/chat/register/default_friends',
            name: '默认好友',
            component: './chat/register/default_friends',
          },
          {
            path: '/chat/register/default_group',
            name: '默认群组',
            component: './chat/register/default_group',
          },
        ],
      },
    ],
  },
  // IM 系统
  {
    path: '/im',
    name: 'IM 系统',
    icon: 'message',
    routes: [
      {
        path: '/im/user',
        name: '用户管理',
        routes: [
          {
            path: '/im/user/user_list',
            name: '用户列表',
            component: './im/user/user_list',
          },
        ],
      },
      {
        path: '/im/group',
        name: '群组管理',
        routes: [
          {
            path: '/im/group/group_list',
            name: '群组列表',
            component: './im/group/group_list',
          },
        ],
      },
      {
        path: '/im/message',
        name: '消息管理',
        routes: [
          {
            path: '/im/message/user_message',
            name: '用户消息',
            component: './im/message/user_message',
          },
          {
            path: '/im/message/group_message',
            name: '群组消息',
            component: './im/message/group_message',
          },
        ],
      },
      {
        path: '/im/notification',
        name: '通知管理',
        routes: [
          {
            path: '/im/notification/account_list',
            name: '通知账号',
            component: './im/notification/account_list',
          },
          {
            path: '/im/notification/publish',
            name: '发送通知',
            component: './im/notification/publish',
          },
        ],
      },
    ],
  },
  // 运维中心
  {
    path: '/operations',
    name: '运维中心',
    icon: 'tool',
    routes: [
      {
        path: '/operations/log_list',
        name: '客户端日志',
        component: './operations/log_list',
      },
    ],
  },
  // 账号设置
  {
    path: '/profile',
    name: '账号设置',
    icon: 'user',
    routes: [
      {
        path: '/profile/info',
        name: '个人信息',
        component: './profile/info',
      },
      {
        path: '/profile/password',
        name: '修改密码',
        component: './profile/password',
      },
    ],
  },
  {
    path: '/',
    redirect: '/welcome',
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
