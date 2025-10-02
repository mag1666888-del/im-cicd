import React, { useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Avatar, Tag, Space, Button, Popconfirm, message } from 'antd';
import { UnlockOutlined } from '@ant-design/icons';
import { searchBlockedUsers, unblockUser } from '@/services/ant-design-pro/api';

interface BlockedUserItem {
  userID: string;
  account: string;
  phoneNumber: string;
  areaCode: string;
  email: string;
  nickname: string;
  faceURL: string;
  gender: number;
  reason: string;
  opUserID: string;
  createTime: number;
}

const BlockList: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取封禁用户列表数据
  const fetchBlockedUsers = async (params: any) => {
    try {
      const response = await searchBlockedUsers({
        current: params.current || 1,
        pageSize: params.pageSize || 10,
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      });

      if (response.errCode === 0) {
        return {
          data: response.data.users || [],
          success: true,
          total: response.data.total || 0,
        };
      }
      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error) {
      console.error('获取封禁用户列表失败:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 性别显示
  const getGenderText = (gender: number) => {
    switch (gender) {
      case 0:
        return <Tag color="blue">女</Tag>;
      case 1:
        return <Tag color="green">男</Tag>;
      case 2:
        return <Tag color="default">女</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 解禁用户
      const handleUnblock = async (record: BlockedUserItem) => {
        try {
          const response = await unblockUser({
            userIDs: [record.userID],
          });

          if (response.errCode === 0) {
            message.success('解禁成功');
            setRefreshKey(prev => prev + 1);
          } else {
            message.error(response.errMsg || '解禁失败');
          }
        } catch (error) {
          console.error('解禁失败:', error);
          message.error('解禁失败，请重试');
        }
      };

  const columns: ProColumns<BlockedUserItem>[] = [
    {
      title: '用户头像',
      dataIndex: 'faceURL',
      key: 'faceURL',
      width: 80,
      render: (_, record) => {
        // 获取昵称的首字母或首字
        const getInitial = (nickname: string) => {
          if (!nickname) return 'U';
          // 如果是中文字符，取第一个字符
          if (/[\u4e00-\u9fa5]/.test(nickname)) {
            return nickname.charAt(0);
          }
          // 如果是英文字符，取第一个字母并转大写
          return nickname.charAt(0).toUpperCase();
        };

        return (
          <Avatar
            src={record.faceURL || undefined}
            size={25}
            style={{ backgroundColor: record.faceURL ? undefined : '#ff4d4f',fontSize: 16 }}
          >
            {getInitial(record.nickname)}
          </Avatar>
        );
      },
    },
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (_, record) => record.nickname || '-',
    },
    {
      title: '用户ID',
      dataIndex: 'userID',
      key: 'userID',
      width: 120,
      copyable: true,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (_, record) => getGenderText(record.gender),
    },
        {
          title: '手机号',
          dataIndex: 'phoneNumber',
          key: 'phoneNumber',
          width: 140,
          render: (_, record) =>
            record.phoneNumber ? `${record.areaCode || '+86'} ${record.phoneNumber}` : '-',
        },
        {
          title: '禁用原因',
          dataIndex: 'reason',
          key: 'reason',
          width: 200,
          render: (_, record) => record.reason || '-',
        },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定要解禁此用户吗？"
            description="解禁后用户将可以正常登录系统"
            onConfirm={() => handleUnblock(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              icon={<UnlockOutlined />}
            >
              解禁
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '封禁列表',
        breadcrumb: {
          items: [
            { title: '业务系统' },
            { title: '用户管理' },
            { title: '封禁列表' },
          ],
        },
      }}
    >
      <ProTable<BlockedUserItem>
        key={refreshKey}
        columns={columns}
        rowKey="userID"
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
        request={fetchBlockedUsers}
        options={{
          reload: true,
          density: true,
          fullScreen: true,
        }}
        scroll={{ x: 800 }}
      />
    </PageContainer>
  );
};

export default BlockList;
