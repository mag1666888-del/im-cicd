import { HeartTwoTone, SmileTwoTone } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Card, Typography } from 'antd';
import React from 'react';

const Admin: React.FC = () => {
  return (
    <PageContainer
      content="此页面只有管理员可以查看"
    >
      <Card>
        <Alert
          message="更快更强的重型组件，已经发布。"
          type="success"
          showIcon
          banner
          style={{
            margin: -12,
            marginBottom: 48,
          }}
        />
        <Typography.Title level={2} style={{ textAlign: 'center' }}>
          <SmileTwoTone /> 欢迎使用MChat{' '}
          <HeartTwoTone twoToneColor="#eb2f96" /> 聊天管理系统
        </Typography.Title>
      </Card>
      <p style={{ textAlign: 'center', marginTop: 24 }}>
        想要添加更多页面？请参考{' '}
        <a
          href="https://pro.ant.design/docs/block-cn"
          target="_blank"
          rel="noopener noreferrer"
        >
          使用区块
        </a>
        。
      </p>
    </PageContainer>
  );
};

export default Admin;
