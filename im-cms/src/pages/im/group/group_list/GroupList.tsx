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
import { getGroups, getGroupMemberList, getIMUsers, createGroup } from '@/services/ant-design-pro/api';
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
  const [settingsSelectedOwner, setSettingsSelectedOwner] = useState<string>('');
  const [settingsSelectedAdmins, setSettingsSelectedAdmins] = useState<string[]>([]);
  const [settingsSelectedMembers, setSettingsSelectedMembers] = useState<string[]>([]);

  // 获取群组列表数据
  const fetchGroups = async (params: any) => {
    try {
      const response = await getGroups({
        current: params.current || 1,
        pageSize: params.pageSize || 10,
        groupID: params.groupID || '',
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

  // 处理群成员操作
  const handleGroupMembers = (record: GroupItem) => {
    console.log('点击群成员按钮，群组信息:', record);
    setCurrentGroup(record);
    setMembersModalVisible(true);
    fetchGroupMembers(record.groupInfo.groupID);
  };

  // 处理群聊设置
  const handleGroupSettings = (record: GroupItem) => {
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
    // 重置选择状态
    setSettingsSelectedOwner('');
    setSettingsSelectedAdmins([]);
    setSettingsSelectedMembers([]);
    // 获取用户列表
    fetchIMUsers();
  };

  // 处理全体禁言
  const handleGroupMute = (record: GroupItem) => {
    message.info('全体禁言功能待开发');
  };

  // 处理解散群组
  const handleDissolveGroup = (record: GroupItem) => {
    message.info('解散群组功能待开发');
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

  // 群设置相关处理函数
  const handleSettingsOwnerChange = (value: string) => {
    setSettingsSelectedOwner(value);
    // 清空管理员和群成员选择
    setSettingsSelectedAdmins([]);
    setSettingsSelectedMembers([]);
    groupSettingsForm.setFieldsValue({
      adminUserIDs: [],
      memberUserIDs: []
    });
    // 重新获取用户列表
    fetchIMUsers();
  };

  const handleSettingsAdminChange = (value: string[]) => {
    setSettingsSelectedAdmins(value);
    // 从群成员中移除已选择的管理员
    const filteredMembers = settingsSelectedMembers.filter((id: string) => 
      !value.includes(id) && id !== settingsSelectedOwner
    );
    setSettingsSelectedMembers(filteredMembers);
    groupSettingsForm.setFieldsValue({
      memberUserIDs: filteredMembers
    });
  };

  const handleSettingsMemberChange = (value: string[]) => {
    setSettingsSelectedMembers(value);
    // 从管理员中移除已选择的群成员
    const filteredAdmins = settingsSelectedAdmins.filter((id: string) => 
      !value.includes(id) && id !== settingsSelectedOwner
    );
    setSettingsSelectedAdmins(filteredAdmins);
    groupSettingsForm.setFieldsValue({
      adminUserIDs: filteredAdmins
    });
  };

  const handleCloseGroupSettings = () => {
    setGroupSettingsDrawerVisible(false);
    groupSettingsForm.resetFields();
    // 重置选择状态
    setSettingsSelectedOwner('');
    setSettingsSelectedAdmins([]);
    setSettingsSelectedMembers([]);
  };

  const handleConfirmGroupSettings = async () => {
    try {
      const values = await groupSettingsForm.validateFields();
      setGroupSettingsLoading(true);
      
      // 这里应该调用更新群组的API
      console.log('更新群组数据:', values);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('群组设置更新成功');
      setGroupSettingsDrawerVisible(false);
      groupSettingsForm.resetFields();
      setRefreshKey(prev => prev + 1);
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
    },
    {
      title: '群组ID',
      dataIndex: ['groupInfo', 'groupID'],
      key: 'groupID',
      width: 120,
      copyable: true,
    },
    {
      title: '群人数',
      dataIndex: ['groupInfo', 'memberCount'],
      key: 'memberCount',
      width: 80,
      render: (_, record: GroupItem) => (
        <Tag color="blue">{record.groupInfo.memberCount}</Tag>
      ),
    },
    {
      title: '群主ID',
      dataIndex: ['groupInfo', 'ownerUserID'],
      key: 'ownerUserID',
      width: 120,
      copyable: true,
    },
    {
      title: '创建时间',
      dataIndex: ['groupInfo', 'createTime'],
      key: 'createTime',
      width: 150,
      render: (_, record: GroupItem) => new Date(record.groupInfo.createTime).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 370,
      fixed: 'right',
      render: (_, record: GroupItem) => (
        <Space size="small">
          <Button
            type="link"
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
            icon={<SettingOutlined />}
            onClick={() => handleGroupSettings(record)}
          >
            群聊设置
          </Button>
          <Button
            type="link"
            icon={<StopOutlined />}
            onClick={() => handleGroupMute(record)}
          >
            全体禁言
          </Button>
          <Popconfirm
            title="确定要解散此群组吗？"
            onConfirm={() => handleDissolveGroup(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
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
        search={false}
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
        imUsers={imUsers}
        imUsersLoading={imUsersLoading}
        selectedOwner={settingsSelectedOwner}
        selectedAdmins={settingsSelectedAdmins}
        selectedMembers={settingsSelectedMembers}
        onClose={handleCloseGroupSettings}
        onConfirm={handleConfirmGroupSettings}
        onOwnerChange={handleSettingsOwnerChange}
        onAdminChange={handleSettingsAdminChange}
        onMemberChange={handleSettingsMemberChange}
        onSearchUsers={fetchIMUsers}
      />
    </PageContainer>
  );
};

export default GroupList;