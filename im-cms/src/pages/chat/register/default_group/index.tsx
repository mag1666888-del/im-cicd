import React, { useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Avatar, 
  Space, 
  Button, 
  Popconfirm, 
  message, 
  Input
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { searchDefaultGroups, addDefaultGroup, removeDefaultGroup } from '@/services/ant-design-pro/api';

interface DefaultGroupItem {
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

const DefaultGroups: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [groupID, setGroupID] = useState('');

  // 获取默认群组列表数据
  const fetchDefaultGroups = async (params: any) => {
    try {
      const response = await searchDefaultGroups({
        current: params.current || 1,
        pageSize: params.pageSize || 10,
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      });

      if (response.errCode === 0) {
        return {
          data: response.data.groups || [],
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
      console.error('获取默认群组列表失败:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 移除默认群组
  const handleRemove = async (record: DefaultGroupItem) => {
    try {
      const response = await removeDefaultGroup({
        groupIDs: [record.groupID],
      });

      if (response.errCode === 0) {
        message.success('移除成功');
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '移除失败');
      }
    } catch (error) {
      console.error('移除失败:', error);
      message.error('移除失败，请重试');
    }
  };

  // 添加默认群组
  const handleAdd = async () => {
    if (!groupID.trim()) {
      message.warning('请输入群组ID');
      return;
    }

    try {
      const response = await addDefaultGroup({
        groupIDs: [groupID.trim()],
      });

      if (response.errCode === 0) {
        message.success('添加成功');
        setGroupID('');
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '添加失败');
      }
    } catch (error) {
      console.error('添加失败:', error);
      message.error('添加失败，请重试');
    }
  };

  const getInitial = (groupName: string) => {
    if (!groupName) return 'G';
    if (/[\u4e00-\u9fa5]/.test(groupName)) {
      return groupName.charAt(0);
    }
    return groupName.charAt(0).toUpperCase();
  };

  const columns: ProColumns<DefaultGroupItem>[] = [
    {
      title: '群组头像',
      dataIndex: 'faceURL',
      key: 'faceURL',
      width: 80,
      render: (_, record) => (
        <Avatar
          src={record.faceURL || undefined}
          size={32}
          style={{ backgroundColor: record.faceURL ? undefined : '#1890ff', fontSize: 16 }}
        >
          {getInitial(record.groupName)}
        </Avatar>
      ),
    },
    {
      title: '群组ID',
      dataIndex: 'groupID',
      key: 'groupID',
      width: 120,
      copyable: true,
    },
    {
      title: '群组名称',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 120,
      render: (_, record) => record.groupName || '-',
    },
    {
      title: '群组介绍',
      dataIndex: 'introduction',
      key: 'introduction',
      width: 200,
      render: (_, record) => record.introduction || '-',
    },
    {
      title: '成员数量',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
      render: (_, record) => record.memberCount || 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定吗？"
            description="确定要移除该群组吗？"
            onConfirm={() => handleRemove(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '默认群组',
        breadcrumb: {
          items: [
            { title: '业务系统' },
            { title: '注册管理' },
            { title: '默认群组' },
          ],
        },
      }}
    >
      <ProTable<DefaultGroupItem>
        key={refreshKey}
        columns={columns}
        rowKey="groupID"
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
        request={fetchDefaultGroups}
        options={{
          reload: true,
          density: true,
          fullScreen: true,
        }}
        scroll={{ x: 800 }}
        toolBarRender={() => [
          <Input
            key="search"
            placeholder="输入群组ID"
            value={groupID}
            onChange={(e) => setGroupID(e.target.value)}
            style={{ width: 200, marginRight: 8 }}
            onPressEnter={handleAdd}
          />,
          <Button
            type="primary"
            key="add"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

export default DefaultGroups;