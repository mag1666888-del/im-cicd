import React, { useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Avatar, 
  Space, 
  Button, 
  message, 
  Tag,
  Form,
  Popconfirm
} from 'antd';
import { 
  TeamOutlined, 
  SettingOutlined, 
  StopOutlined, 
  DeleteOutlined
} from '@ant-design/icons';
import { getGroups, getGroupMemberList, getIMUsers, createGroup, setGroupInfo, muteGroup, cancelMuteGroup, dismissGroup } from '@/services/ant-design-pro/api';
import GroupMembersModal from './GroupMembersModal';
import CreateGroupDrawer from './CreateGroupDrawer';
import GroupSettingsDrawer from './GroupSettingsDrawer';
import type { GroupItem, GroupMemberItem, IMUserItem } from './types';

const GroupList: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<GroupItem | null>(null);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPagination, setMembersPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [createGroupDrawerVisible, setCreateGroupDrawerVisible] = useState(false);
  const [createGroupForm] = Form.useForm();
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [imUsers, setImUsers] = useState<IMUserItem[]>([]);
  const [imUsersLoading, setImUsersLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupSettingsDrawerVisible, setGroupSettingsDrawerVisible] = useState(false);
  const [groupSettingsForm] = Form.useForm();
  const [groupSettingsLoading, setGroupSettingsLoading] = useState(false);

  // 获取群组列表数据
  const fetchGroups = async (params: any) => {
    try {
      const response = await getGroups({
        current: params.current || 1,
        pageSize: params.pageSize || 10,
        groupID: params.groupID || '',
        groupName: params.groupName || '',
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      });

      if (response.errCode === 0) {
        // 检查群组禁言状态（这里可以根据实际API响应调整）
        // 目前我们使用本地状态来跟踪禁言状态
        return {
          data: response.data.groups || [],
          success: true,
          total: response.data.total || 0,
        };
      } else {
        message.error(response.errMsg || '获取群组列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取群组列表失败:', error);
      message.error('获取群组列表失败，请重试');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取群组成员列表
  const fetchGroupMembers = async (groupID: string) => {
    try {
      console.log('开始获取群成员列表，群组ID:', groupID);
      setMembersLoading(true);
      const response = await getGroupMemberList({
        groupID,
        pagination: {
          pageNumber: membersPagination.current,
          showNumber: membersPagination.pageSize,
        },
      });
      console.log('群成员列表响应:', response);

      if (response.errCode === 0) {
        console.log('群成员列表获取成功:', response.data);
        setMembers(response.data.members || []);
        setMembersTotal(response.data.total || 0);
      } else {
        console.error('群成员列表获取失败:', response.errMsg);
        message.error(response.errMsg || '获取群成员列表失败');
        setMembers([]);
        setMembersTotal(0);
      }
    } catch (error) {
      console.error('获取群成员列表失败:', error);
      message.error('获取群成员列表失败，请重试');
      setMembers([]);
      setMembersTotal(0);
    } finally {
      setMembersLoading(false);
    }
  };

  // 获取IM用户列表
  const fetchIMUsers = async (keyword?: string) => {
    try {
      setImUsersLoading(true);
      const response = await getIMUsers({
        current: 1,
        pageSize: 100,
        pagination: {
          pageNumber: 1,
          showNumber: 100,
        },
      });

      if (response.errCode === 0) {
        setImUsers(response.data.users || []);
      } else {
        message.error(response.errMsg || '获取用户列表失败');
        setImUsers([]);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败，请重试');
      setImUsers([]);
    } finally {
      setImUsersLoading(false);
    }
  };

  // 获取用户头像首字母
  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'G';
  };

  // 判断群组是否被禁言
  const isGroupMuted = (record: GroupItem) => {
    return record.groupInfo.status === 3;
  };

  // 处理群成员操作
  const handleGroupMembers = (record: GroupItem) => {
    console.log('点击群成员按钮，群组信息:', record);
    setCurrentGroup(record);
    setMembersModalVisible(true);
    fetchGroupMembers(record.groupInfo.groupID);
  };

  // 处理群聊设置
  const handleGroupSettings = (record: GroupItem) => {
    console.log('点击群聊设置按钮，群组信息:', record);
    setCurrentGroup(record);
    setGroupSettingsDrawerVisible(true);
    // 设置表单初始值
    groupSettingsForm.setFieldsValue({
      groupName: record.groupInfo.groupName,
      groupID: record.groupInfo.groupID,
      introduction: record.groupInfo.introduction,
      notification: record.groupInfo.notification,
      faceURL: record.groupInfo.faceURL,
      needVerification: record.groupInfo.needVerification,
      lookMemberInfo: record.groupInfo.lookMemberInfo,
      applyMemberFriend: record.groupInfo.applyMemberFriend,
    });
  };

  // 处理全体禁言
  const handleGroupMute = async (record: GroupItem) => {
    try {
      console.log('执行全体禁言，群组ID:', record.groupInfo.groupID);
      
      const response = await muteGroup({
        groupID: record.groupInfo.groupID,
      });
      
      if (response.errCode === 0) {
        message.success('全体禁言成功');
        // 刷新群组列表以获取最新的status状态
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '全体禁言失败');
      }
    } catch (error) {
      console.error('全体禁言失败:', error);
      message.error('全体禁言失败，请重试');
    }
  };

  // 处理取消全体禁言
  const handleCancelGroupMute = async (record: GroupItem) => {
    try {
      console.log('取消全体禁言，群组ID:', record.groupInfo.groupID);
      
      const response = await cancelMuteGroup({
        groupID: record.groupInfo.groupID,
      });
      
      if (response.errCode === 0) {
        message.success('取消全体禁言成功');
        // 刷新群组列表以获取最新的status状态
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '取消全体禁言失败');
      }
    } catch (error) {
      console.error('取消全体禁言失败:', error);
      message.error('取消全体禁言失败，请重试');
    }
  };

  // 处理解散群组
  const handleDissolveGroup = async (record: GroupItem) => {
    try {
      console.log('解散群组，群组ID:', record.groupInfo.groupID);
      
      const response = await dismissGroup({
        groupID: record.groupInfo.groupID,
      });
      
      if (response.errCode === 0) {
        message.success('群组解散成功');
        // 刷新群组列表
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '解散群组失败');
      }
    } catch (error) {
      console.error('解散群组失败:', error);
      message.error('解散群组失败，请重试');
    }
  };

  // 处理群成员表格变化
  const handleMembersTableChange = (pagination: any) => {
    setMembersPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
    if (currentGroup) {
      fetchGroupMembers(currentGroup.groupInfo.groupID);
    }
  };

  // 关闭群成员弹窗
  const handleCloseMembersModal = () => {
    setMembersModalVisible(false);
    setCurrentGroup(null);
    setMembers([]);
    setMembersTotal(0);
    setMembersPagination({
      current: 1,
      pageSize: 10,
    });
  };

  // 处理群主选择变化
  const handleOwnerChange = (value: string) => {
    setSelectedOwner(value);
    // 清空管理员和群成员选择
    setSelectedAdmins([]);
    setSelectedMembers([]);
    createGroupForm.setFieldsValue({
      adminUserIDs: [],
      memberUserIDs: []
    });
    // 重新获取用户列表
    fetchIMUsers();
  };

  // 处理管理员选择变化
  const handleAdminChange = (value: string[]) => {
    setSelectedAdmins(value);
    // 从群成员中移除已选择的管理员
    const filteredMembers = selectedMembers.filter((id: string) => 
      !value.includes(id) && id !== selectedOwner
    );
    setSelectedMembers(filteredMembers);
    createGroupForm.setFieldsValue({
      memberUserIDs: filteredMembers
    });
  };

  // 处理群成员选择变化
  const handleMemberChange = (value: string[]) => {
    setSelectedMembers(value);
    // 从管理员中移除已选择的群成员
    const filteredAdmins = selectedAdmins.filter((id: string) => 
      !value.includes(id) && id !== selectedOwner
    );
    setSelectedAdmins(filteredAdmins);
    createGroupForm.setFieldsValue({
      adminUserIDs: filteredAdmins
    });
  };

  // 打开新建群组抽屉
  const handleOpenCreateGroup = () => {
    setCreateGroupDrawerVisible(true);
    createGroupForm.resetFields();
    // 重置选择状态
    setSelectedOwner('');
    setSelectedAdmins([]);
    setSelectedMembers([]);
    // 打开抽屉时获取用户列表
    fetchIMUsers();
  };

  // 关闭新建群组抽屉
  const handleCloseCreateGroup = () => {
    setCreateGroupDrawerVisible(false);
    createGroupForm.resetFields();
    // 重置选择状态
    setSelectedOwner('');
    setSelectedAdmins([]);
    setSelectedMembers([]);
  };

  // 确认创建群组
  const handleConfirmCreateGroup = async () => {
    try {
      const values = await createGroupForm.validateFields();
      setCreateGroupLoading(true);
      
      // 构建API请求参数
      const createGroupParams = {
        memberUserIDs: values.memberUserIDs || [],
        adminUserIDs: values.adminUserIDs || [],
        ownerUserID: values.ownerUserID,
        groupInfo: {
          groupName: values.groupName,
          groupType: 2, // 固定为普通群组
          needVerification: values.needVerification,
          lookMemberInfo: values.lookMemberInfo,
          applyMemberFriend: values.applyMemberFriend,
          introduction: values.introduction || '',
          notification: values.notification || '',
          faceURL: values.faceURL || '',
        }
      };
      
      console.log('创建群组数据:', createGroupParams);
      
      // 调用创建群组API
      const response = await createGroup(createGroupParams);
      
      if (response.errCode === 0) {
        message.success('群组创建成功');
        setCreateGroupDrawerVisible(false);
        createGroupForm.resetFields();
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '创建群组失败');
      }
    } catch (error) {
      console.error('创建群组失败:', error);
      message.error('创建群组失败，请重试');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleCloseGroupSettings = () => {
    setGroupSettingsDrawerVisible(false);
    groupSettingsForm.resetFields();
  };

  const handleConfirmGroupSettings = async () => {
    try {
      const values = await groupSettingsForm.validateFields();
      setGroupSettingsLoading(true);
      
      if (!currentGroup) {
        message.error('群组信息不存在');
        return;
      }
      
      // 构建API请求参数
      const setGroupInfoParams = {
        groupInfoForSet: {
          groupID: currentGroup.groupInfo.groupID,
          groupName: values.groupName,
          notification: values.notification || '',
          introduction: values.introduction || '',
          needVerification: values.needVerification,
          lookMemberInfo: values.lookMemberInfo,
          applyMemberFriend: values.applyMemberFriend,
        }
      };
      
      console.log('更新群组设置数据:', setGroupInfoParams);
      
      // 调用群设置API
      const response = await setGroupInfo(setGroupInfoParams);
      
      if (response.errCode === 0) {
        message.success('群组设置更新成功');
        setGroupSettingsDrawerVisible(false);
        groupSettingsForm.resetFields();
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '更新群组设置失败');
      }
    } catch (error) {
      console.error('更新群组设置失败:', error);
      message.error('更新群组设置失败，请重试');
    } finally {
      setGroupSettingsLoading(false);
    }
  };

  // 群组列表列定义
  const columns: ProColumns<GroupItem>[] = [
    {
      title: '群组头像',
      dataIndex: ['groupInfo', 'faceURL'],
      key: 'faceURL',
      width: 80,
      hideInSearch: true,
      render: (_, record: GroupItem) => (
        <Avatar
          size={40}
          src={record.groupInfo.faceURL}
          style={{ backgroundColor: '#1890ff' }}
        >
          {getInitial(record.groupInfo.groupName)}
        </Avatar>
      ),
    },
    {
      title: '群组名称',
      dataIndex: ['groupInfo', 'groupName'],
      key: 'groupName',
      width: 150,
      render: (_, record: GroupItem) => record.groupInfo.groupName || '未知群组',
      hideInTable: false,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入群组名称',
      },
    },
    {
      title: '群组ID',
      dataIndex: ['groupInfo', 'groupID'],
      key: 'groupID',
      width: 120,
      copyable: true,
      hideInTable: false,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入群组ID',
      },
    },
    {
      title: '群人数',
      dataIndex: ['groupInfo', 'memberCount'],
      key: 'memberCount',
      width: 80,
      hideInSearch: true,
      render: (_, record: GroupItem) => (
        <Tag color="blue">{record.groupInfo.memberCount}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: ['groupInfo', 'status'],
      key: 'status',
      width: 80,
      hideInSearch: true,
      render: (_, record: GroupItem) => {
        const isMuted = isGroupMuted(record);
        return (
          <Tag color={isMuted ? 'red' : 'green'}>
            {isMuted ? '禁言' : '正常'}
          </Tag>
        );
      },
    },
    {
      title: '群主ID',
      dataIndex: ['groupInfo', 'ownerUserID'],
      key: 'ownerUserID',
      width: 120,
      copyable: true,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: ['groupInfo', 'createTime'],
      key: 'createTime',
      width: 150,
      hideInSearch: true,
      render: (_, record: GroupItem) => new Date(record.groupInfo.createTime).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      hideInSearch: true,
      render: (_, record: GroupItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => {
              console.log('群成员按钮被点击');
              message.info('群成员按钮被点击');
              handleGroupMembers(record);
            }}
          >
            群成员
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleGroupSettings(record)}
          >
            群聊设置
          </Button>
          {isGroupMuted(record) ? (
            <Popconfirm
              title="确定要取消此群组的全体禁言吗？"
              description="此操作将恢复群内所有成员发送消息的权限"
              onConfirm={() => handleCancelGroupMute(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<StopOutlined />}
                style={{ color: '#52c41a' }}
              >
                取消禁言
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="确定要对此群组执行全体禁言吗？"
              description="此操作将禁止群内所有成员发送消息"
              onConfirm={() => handleGroupMute(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<StopOutlined />}
              >
                全体禁言
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="确定要解散此群组吗？"
            onConfirm={() => handleDissolveGroup(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              解散
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<GroupItem>
        columns={columns}
        request={fetchGroups}
        rowKey={(record) => record.groupInfo.groupID}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          searchText: '搜索',
          resetText: '重置',
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            icon={<TeamOutlined />}
            onClick={handleOpenCreateGroup}
          >
            新建群组
          </Button>,
        ]}
        scroll={{ x: 1000 }}
        key={refreshKey}
      />

      {/* 群成员弹窗 */}
      <GroupMembersModal
        visible={membersModalVisible}
        currentGroup={currentGroup}
        members={members}
        loading={membersLoading}
        total={membersTotal}
        pagination={membersPagination}
        onClose={handleCloseMembersModal}
        onTableChange={handleMembersTableChange}
        onSetRole={() => message.info('设置群身份功能待开发')}
        onMuteMember={() => message.info('禁言功能待开发')}
        onRemoveMember={() => message.info('移除成员功能待开发')}
      />

      {/* 新建群组抽屉 */}
      <CreateGroupDrawer
        visible={createGroupDrawerVisible}
        loading={createGroupLoading}
        form={createGroupForm}
        imUsers={imUsers}
        imUsersLoading={imUsersLoading}
        selectedOwner={selectedOwner}
        selectedAdmins={selectedAdmins}
        selectedMembers={selectedMembers}
        onClose={handleCloseCreateGroup}
        onConfirm={handleConfirmCreateGroup}
        onOwnerChange={handleOwnerChange}
        onAdminChange={handleAdminChange}
        onMemberChange={handleMemberChange}
        onSearchUsers={fetchIMUsers}
      />

      {/* 群设置抽屉 */}
      <GroupSettingsDrawer
        visible={groupSettingsDrawerVisible}
        loading={groupSettingsLoading}
        form={groupSettingsForm}
        currentGroup={currentGroup}
        onClose={handleCloseGroupSettings}
        onConfirm={handleConfirmGroupSettings}
      />
    </PageContainer>
  );
};

export default GroupList;