import {
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  Helmet,
  useModel,
} from '@umijs/max';
import { Alert, App } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import CryptoJS from 'crypto-js';

import { login } from '@/services/ant-design-pro/api';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      // 对密码进行MD5加密
      const encryptedPassword = CryptoJS.MD5(values.password || '').toString();
      
      // 登录
      const msg = await login({ 
        ...values, 
        password: encryptedPassword,
      });
      
      console.log('登录响应:', msg);
      
      // 检查登录是否成功 (errCode为0表示成功)
      if (msg.errCode === 0) {
        message.success('登录成功！');
        
        // 保存登录信息到localStorage
        if (msg.data) {
          localStorage.setItem('adminToken', msg.data.adminToken || '');
          localStorage.setItem('imToken', msg.data.imToken || '');
          localStorage.setItem('adminAccount', msg.data.adminAccount || '');
          localStorage.setItem('nickname', msg.data.nickname || '');
          localStorage.setItem('faceURL', msg.data.faceURL || '');
          localStorage.setItem('level', msg.data.level?.toString() || '');
          localStorage.setItem('adminUserID', msg.data.adminUserID || '');
          localStorage.setItem('imUserID', msg.data.imUserID || '');
        }
        
        await fetchUserInfo();
        const urlParams = new URL(window.location.href).searchParams;
        window.location.href = urlParams.get('redirect') || '/';
        return;
      }
      
      // 处理登录失败的情况
      if (msg.errCode && msg.errCode !== 0) {
        let errorMessage = '登录失败，请重试！';
        
        // 根据错误码显示不同的错误信息
        switch (msg.errCode) {
          case 20002:
            errorMessage = '账户不存在，请检查用户名是否正确！';
            break;
          default:
            errorMessage = msg.errMsg || '登录失败，请重试！';
            break;
        }
        
        message.error(errorMessage);
        return;
      }
      
      // 如果失败显示通用错误信息
      message.error('登录失败，请重试！');
    } catch (error) {
      console.log('登录异常:', error);
      message.error('登录失败，请重试！');
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          登录页
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title="MChat"
          subTitle="欢迎使用MChat"
          
          onFinish={async (values) => {
            await handleSubmit(values as API.LoginParams);
          }}
        >
          <ProFormText
            name="account"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined />,
            }}
            placeholder="用户名:"
            rules={[
              {
                required: true,
                message: '请输入用户名!',
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
            }}
            placeholder="密码:"
            rules={[
              {
                required: true,
                message: '请输入密码！',
              },
            ]}
          />

          <div
            style={{
              marginBottom: 24,
            }}
          >
            
            <a
              style={{
                float: 'right',
              }}
            >
              忘记密码
            </a>
          </div>
        </LoginForm>
      </div>
    </div>
  );
};

export default Login;