import React from 'react';
import { PageContainer } from '@ant-design/pro-components';

const ModifyPassword: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '修改密码',
        breadcrumb: {
          items: [
            { title: '账号设置' },
            { title: '修改密码' },
          ],
        },
      }}
    >
      <div>修改密码页面</div>
    </PageContainer>
  );
};

export default ModifyPassword;
