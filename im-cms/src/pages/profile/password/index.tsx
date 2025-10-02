import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, message, Space, Typography } from 'antd';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { changePassword } from '@/services/ant-design-pro/api';
import { useModel, history } from '@umijs/max';
import CryptoJS from 'crypto-js';

const { Title, Text } = Typography;

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { initialState } = useModel('@@initialState');

  // 提交表单
  const handleSubmit = async (values: PasswordFormData) => {
    setLoading(true);
    try {
      const currentUser = initialState?.currentUser;
      if (!currentUser) {
        message.error('用户信息不存在，请重新登录');
        return;
      }

      // 验证新密码和确认密码是否一致
      if (values.newPassword !== values.confirmPassword) {
        message.error('新密码和确认密码不一致');
        setLoading(false);
        return;
      }

      // 验证新密码不能与当前密码相同
      if (values.currentPassword === values.newPassword) {
        message.error('新密码不能与当前密码相同');
        setLoading(false);
        return;
      }

      // 使用MD5加密密码
      const currentPasswordMD5 = CryptoJS.MD5(values.currentPassword).toString();
      const newPasswordMD5 = CryptoJS.MD5(values.newPassword).toString();

      console.log('修改密码请求参数:', {
        userID: (currentUser as any)?.adminUserID || 'imAdmin',
        currentPassword: currentPasswordMD5,
        newPassword: newPasswordMD5,
      });

      const response = await changePassword({
        userID: (currentUser as any)?.adminUserID || 'imAdmin',
        currentPassword: currentPasswordMD5,
        newPassword: newPasswordMD5,
      });

      console.log('修改密码响应:', response);

      if (response.errCode === 0) {
        message.success('密码修改成功，请重新登录');
        
        // 清空本地缓存
        localStorage.removeItem('adminToken');
        localStorage.removeItem('imToken');
        localStorage.removeItem('adminAccount');
        localStorage.removeItem('nickname');
        localStorage.removeItem('faceURL');
        localStorage.removeItem('level');
        localStorage.removeItem('adminUserID');
        localStorage.removeItem('imUserID');
        
        // 跳转到登录页面
        setTimeout(() => {
          history.push('/user/login');
        }, 1500);
      } else {
        message.error(`密码修改失败: ${response.errMsg}`);
      }
    } catch (error: any) {
      console.error('密码修改失败:', error);
      message.error(`密码修改失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="修改密码"
      content="修改您的登录密码，修改成功后需要重新登录"
    >
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 400 }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>
                <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                修改密码
              </Title>
              <Text type="secondary">
                为了您的账户安全，请定期修改密码。修改成功后需要重新登录。
              </Text>
            </div>

            <Form.Item
              name="currentPassword"
              label="当前密码"
              rules={[
                { required: true, message: '请输入当前密码' },
                { min: 6, message: '密码长度不能少于6位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入当前密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度不能少于6位' },
                { max: 20, message: '密码长度不能超过20位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
              >
                修改密码
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default ChangePassword;
