import React, { useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Avatar, 
  Space, 
  Button, 
  Popconfirm, 
  message, 
  Modal,
  Table,
  Tag,
  Drawer,
  Checkbox,
  Typography,
  Input
} from 'antd';
import { LogoutOutlined, TeamOutlined } from '@ant-design/icons';
import { getIMUsers, forceUserLogout, getFriendList, deleteFriend, getUsersOnlineStatus } from '@/services/ant-design-pro/api';

interface IMUserItem {
  userID: string;
  nickname: string;
  faceURL: string;
  ex: string;
  createTime: number;
  appMangerLevel: number;
  globalRecvMsgOpt: number;
  onlineStatus?: {
    status: number;
    platforms: number[];
  };
}

interface FriendItem {
  ownerUserID: string;
  remark: string;
  createTime: number;
  friendUser: {
    userID: string;
    nickname: string;
    faceURL: string;
    ex: string;
    createTime: number;
    appMangerLevel: number;
    globalRecvMsgOpt: number;
  };
  addSource: number;
  operatorUserID: string;
  ex: string;
  isPinned: boolean;
}

const IMUserList: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<IMUserItem | null>(null);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [users, setUsers] = useState<IMUserItem[]>([]);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [friendsPagination, setFriendsPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [forceLogoutDrawerVisible, setForceLogoutDrawerVisible] = useState(false);
  const [currentLogoutUser, setCurrentLogoutUser] = useState<IMUserItem | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // 获取用户在线状态
  const fetchUsersOnlineStatus = async (userIDs: string[]) => {
    if (userIDs.length === 0) return {};

    try {
      const response = await getUsersOnlineStatus({
        userIDs: userIDs,
      });

      if (response.errCode === 0) {
        const statusMap: { [key: string]: { status: number; platforms: number[] } } = {};
        (response.data as any).forEach((item: any) => {
          const platforms = item.singlePlatformToken.map((token: any) => token.platformID);
          statusMap[item.userID] = {
            status: item.status,
            platforms: platforms,
          };
        });
        return statusMap;
      }
      return {};
    } catch (error) {
      console.error('获取用户在线状态失败:', error);
      return {};
    }
  };

  // 获取IM用户列表数据
  const fetchIMUsers = async (params: any) => {
    try {
      const response = await getIMUsers({
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
        userID: params.userID || undefined,
        nickname: params.nickname || undefined,
      });

      if (response.errCode === 0) {
        const users = response.data.users || [];
        setUsers(users);
        
        // 获取用户在线状态
        const userIDs = users.map(user => user.userID);
        const onlineStatusMap = await fetchUsersOnlineStatus(userIDs);
        
        // 合并在线状态到用户数据
        const usersWithStatus = users.map(user => ({
          ...user,
          onlineStatus: onlineStatusMap[user.userID] || { status: 0, platforms: [] },
        }));
        
        setUsers(usersWithStatus);
        
        return {
          data: usersWithStatus,
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
      console.error('获取IM用户列表失败:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 打开强制下线抽屉
  const handleOpenForceLogout = (record: IMUserItem) => {
    setCurrentLogoutUser(record);
    setSelectedPlatforms([]);
    setForceLogoutDrawerVisible(true);
  };

  // 确认强制下线
  const handleConfirmForceLogout = async () => {
    if (!currentLogoutUser || selectedPlatforms.length === 0) {
      message.warning('请选择要下线的平台');
      return;
    }

    setLogoutLoading(true);
    try {
      // 对每个选中的平台执行下线操作
      const promises = selectedPlatforms.map(platformID => 
        forceUserLogout({ 
          userID: currentLogoutUser.userID, 
          platformID: platformID 
        })
      );
      
      const responses = await Promise.all(promises);
      const successCount = responses.filter(res => res.errCode === 0).length;
      
      if (successCount === selectedPlatforms.length) {
        message.success(`成功强制下线 ${successCount} 个平台`);
        setForceLogoutDrawerVisible(false);
        setRefreshKey(prev => prev + 1);
      } else if (successCount > 0) {
        message.warning(`部分平台下线成功，成功 ${successCount} 个，失败 ${selectedPlatforms.length - successCount} 个`);
        setForceLogoutDrawerVisible(false);
        setRefreshKey(prev => prev + 1);
      } else {
        message.error('强制下线失败');
      }
    } catch (error) {
      console.error('强制下线失败:', error);
      message.error('强制下线失败，请重试');
    } finally {
      setLogoutLoading(false);
    }
  };

  // 关闭强制下线抽屉
  const handleCloseForceLogoutDrawer = () => {
    setForceLogoutDrawerVisible(false);
    setCurrentLogoutUser(null);
    setSelectedPlatforms([]);
  };

  // 查看关系链
  const handleViewFriends = async (record: IMUserItem) => {
    setCurrentUser(record);
    setFriendsModalVisible(true);
    setFriendsLoading(true);
    setFriendsPagination({ current: 1, pageSize: 10 });

    try {
      const response = await getFriendList({
        userID: record.userID,
        pagination: {
          pageNumber: 1,
          showNumber: 10,
        },
      });

      if (response.errCode === 0) {
        setFriends(response.data.friendsInfo as any || []);
        setFriendsTotal(response.data.total || 0);
      } else {
        message.error(response.errMsg || '获取关系链失败');
        setFriends([]);
        setFriendsTotal(0);
      }
    } catch (error) {
      console.error('获取关系链失败:', error);
      message.error('获取关系链失败，请重试');
      setFriends([]);
      setFriendsTotal(0);
    } finally {
      setFriendsLoading(false);
    }
  };

  // 删除好友
  const handleDeleteFriend = async (friendUserID: string) => {
    if (!currentUser) return;

    try {
      const response = await deleteFriend({
        ownerUserID: currentUser.userID,
        friendUserID: friendUserID,
      });

      if (response.errCode === 0) {
        message.success('删除好友成功');
        // 重新加载好友列表
        handleViewFriends(currentUser);
      } else {
        message.error(response.errMsg || '删除好友失败');
      }
    } catch (error) {
      console.error('删除好友失败:', error);
      message.error('删除好友失败，请重试');
    }
  };

  // 好友列表分页处理
  const handleFriendsTableChange = async (pagination: any) => {
    if (!currentUser) return;

    setFriendsPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
    });

    setFriendsLoading(true);
    try {
      const response = await getFriendList({
        userID: currentUser.userID,
        pagination: {
          pageNumber: pagination.current,
          showNumber: pagination.pageSize,
        },
      });

      if (response.errCode === 0) {
        setFriends(response.data.friendsInfo as any || []);
        setFriendsTotal(response.data.total || 0);
      } else {
        message.error(response.errMsg || '获取好友列表失败');
        setFriends([]);
        setFriendsTotal(0);
      }
    } catch (error) {
      console.error('获取好友列表失败:', error);
      message.error('获取好友列表失败，请重试');
      setFriends([]);
      setFriendsTotal(0);
    } finally {
      setFriendsLoading(false);
    }
  };

  // 关闭关系链弹窗
  const handleCloseFriendsModal = () => {
    setFriendsModalVisible(false);
    setCurrentUser(null);
    setFriends([]);
    setFriendsTotal(0);
    setFriendsPagination({ current: 1, pageSize: 10 });
  };

  const getInitial = (nickname: string) => {
    if (!nickname) return 'U';
    if (/[\u4e00-\u9fa5]/.test(nickname)) {
      return nickname.charAt(0);
    }
    return nickname.charAt(0).toUpperCase();
  };

  // 获取在线状态显示文本和颜色
  const getOnlineStatusDisplay = (record: IMUserItem) => {
    if (!record.onlineStatus) {
      return { text: '未知', color: 'default' };
    }

    const { status, platforms } = record.onlineStatus;
    
    if (status === 1 && platforms.length > 0) {
      // 在线且有平台信息
      const platformNames = platforms.map(platformID => {
        switch (platformID) {
          case 1: return 'iOS';
          case 2: return 'Android';
          case 3: return 'Windows';
          case 4: return 'macOS';
          case 5: return 'Web';
          default: return `平台${platformID}`;
        }
      });
      return { 
        text: `在线 (${platformNames.join(', ')})`, 
        color: 'green' 
      };
    } else if (status === 1) {
      // 在线但无平台信息
      return { text: '在线', color: 'green' };
    } else {
      // 离线
      return { text: '离线', color: 'default' };
    }
  };

  const columns: ProColumns<IMUserItem>[] = [
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      hideInTable: true,
      renderFormItem: () => <Input placeholder="请输入用户昵称" />,
    },
    {
      title: '用户ID',
      dataIndex: 'userID',
      key: 'userID',
      hideInTable: true,
      renderFormItem: () => <Input placeholder="请输入用户ID" />,
    },
    {
      title: '用户头像',
      dataIndex: 'faceURL',
      key: 'faceURL',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (
        <Avatar
          src={record.faceURL || undefined}
          size={32}
          style={{ backgroundColor: record.faceURL ? undefined : '#1890ff', fontSize: 16 }}
        >
          {getInitial(record.nickname)}
        </Avatar>
      ),
    },
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (_, record) => record.nickname || '-',
      hideInSearch: true,
    },
    {
      title: '用户ID',
      dataIndex: 'userID',
      key: 'userID',
      width: 120,
      copyable: true,
      hideInSearch: true,
    },
    {
      title: '在线状态',
      key: 'onlineStatus',
      width: 150,
      hideInSearch: true,
      render: (_, record) => {
        const { text, color } = getOnlineStatusDisplay(record);
        return (
          <Tag color={color}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 150,
      hideInSearch: true,
      render: (_, record) => {
        return new Date(record.createTime).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => {
        const isOnline = record.onlineStatus?.status === 1;
        return (
          <Space>
            <Button
              type="link"
              size="small"
              danger={isOnline}
              disabled={!isOnline}
              icon={<LogoutOutlined />}
              onClick={() => handleOpenForceLogout(record)}
              style={{
                color: isOnline ? undefined : '#d9d9d9',
                cursor: isOnline ? 'pointer' : 'not-allowed'
              }}
            >
              强制下线
            </Button>
            <Button
              type="link"
              size="small"
              icon={<TeamOutlined />}
              onClick={() => handleViewFriends(record)}
            >
              关系链
            </Button>
          </Space>
        );
      },
    },
  ];

  // 关系链表格列定义
  const friendsColumns = [
    {
      title: '用户头像',
      dataIndex: ['friendUser', 'faceURL'],
      key: 'faceURL',
      width: 80,
      render: (faceURL: string, record: FriendItem) => (
        <Avatar
          src={faceURL || undefined}
          size={30}
          style={{ backgroundColor: faceURL ? undefined : '#1890ff',fontSize: 16 }}
        >
          {getInitial(record.friendUser.nickname || 'U')}
        </Avatar>
      ),
    },
    {
      title: '用户昵称',
      dataIndex: ['friendUser', 'nickname'],
      key: 'nickname',
      width: 120,
      render: (nickname: string) => nickname || '未知用户',
    },
    {
      title: '用户ID',
      dataIndex: ['friendUser', 'userID'],
      key: 'userID',
      width: 120,
      render: (userID: string) => userID || '-',
      copyable: true,
    },
    {
      title: '添加时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 150,
      render: (createTime: number) => {
        if (!createTime) return '-';
        return new Date(createTime * 1000).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: FriendItem) => (
        <Space>
          <Popconfirm
            title="确定要删除此好友吗？"
            description="删除后将无法恢复"
            onConfirm={() => handleDeleteFriend(record.friendUser.userID)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '用户列表',
        breadcrumb: {
          items: [
            { title: 'IM 系统' },
            { title: '用户管理' },
            { title: '用户列表' },
          ],
        },
      }}
    >
      <ProTable<IMUserItem>
        key={refreshKey}
        columns={columns}
        rowKey="userID"
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          searchText: '搜索',
          resetText: '重置',
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
        request={fetchIMUsers}
        options={{
          reload: true,
          density: true,
          fullScreen: true,
        }}
        scroll={{ x: 1000 }}
        form={{
          ignoreRules: false,
        }}
      />

      {/* 关系链弹窗 */}
      <Modal
        title={`${currentUser?.nickname || '用户'} 的关系链`}
        open={friendsModalVisible}
        onCancel={handleCloseFriendsModal}
        footer={null}
        width={800}
      >
        <Table
          columns={friendsColumns}
          dataSource={friends}
          rowKey={(record) => record.friendUser.userID}
          loading={friendsLoading}
          pagination={{
            current: friendsPagination.current,
            pageSize: friendsPagination.pageSize,
            total: friendsTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
            onChange: handleFriendsTableChange,
            onShowSizeChange: handleFriendsTableChange,
          }}
          scroll={{ x: 700 }}
          size="small"
        />
      </Modal>

      {/* 强制下线抽屉 */}
      <Drawer
        title="强制用户下线"
        width={400}
        open={forceLogoutDrawerVisible}
        onClose={handleCloseForceLogoutDrawer}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleCloseForceLogoutDrawer} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button 
              type="primary" 
              danger
              loading={logoutLoading}
              onClick={handleConfirmForceLogout}
              disabled={selectedPlatforms.length === 0}
            >
              确认下线
            </Button>
          </div>
        }
      >
        {currentLogoutUser && (
          <div>
            {/* 用户信息 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar
                src={currentLogoutUser.faceURL || undefined}
                size={80}
                style={{ backgroundColor: currentLogoutUser.faceURL ? undefined : '#1890ff', fontSize: 32 }}
              >
                {getInitial(currentLogoutUser.nickname || 'U')}
              </Avatar>
              <div style={{ marginTop: 12 }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {currentLogoutUser.nickname || '未知用户'}
                </Typography.Title>
                <Typography.Text type="secondary">
                  ID: {currentLogoutUser.userID}
                </Typography.Text>
              </div>
            </div>

            {/* 在线平台选择 */}
            <div>
              <Typography.Title level={5}>选择要下线的平台：</Typography.Title>
              <Checkbox.Group
                value={selectedPlatforms}
                onChange={setSelectedPlatforms}
                style={{ width: '100%' }}
              >
                {currentLogoutUser.onlineStatus?.platforms.map(platformID => {
                  const platformName = (() => {
                    switch (platformID) {
                      case 1: return 'iOS';
                      case 2: return 'Android';
                      case 3: return 'Windows';
                      case 4: return 'macOS';
                      case 5: return 'Web';
                      default: return `平台${platformID}`;
                    }
                  })();
                  
                  return (
                    <div key={platformID} style={{ marginBottom: 8 }}>
                      <Checkbox value={platformID}>
                        {platformName}
                      </Checkbox>
                    </div>
                  );
                })}
              </Checkbox.Group>
              
              {(!currentLogoutUser.onlineStatus?.platforms || currentLogoutUser.onlineStatus.platforms.length === 0) && (
                <Typography.Text type="secondary">
                  该用户当前没有在线平台
                </Typography.Text>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default IMUserList;