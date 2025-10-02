import React from 'react';
import { Modal, Table, Avatar, Tag, Space, Button, Popconfirm, message } from 'antd';
import { CrownOutlined, StopOutlined as MuteOutlined, UserDeleteOutlined } from '@ant-design/icons';
import type { GroupItem, GroupMemberItem } from './types';

interface GroupMembersModalProps {
  visible: boolean;
  currentGroup: GroupItem | null;
  members: GroupMemberItem[];
  loading: boolean;
  total: number;
  pagination: {
    current: number;
    pageSize: number;
  };
  onClose: () => void;
  onTableChange: (pagination: any) => void;
  onSetRole: (userID: string) => void;
  onMuteMember: (userID: string) => void;
  onRemoveMember: (userID: string) => void;
}

const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  visible,
  currentGroup,
  members,
  loading,
  total,
  pagination,
  onClose,
  onTableChange,
  onSetRole,
  onMuteMember,
  onRemoveMember,
}) => {
  // 获取用户头像首字母
  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // 获取角色文本和颜色
  const getRoleText = (roleLevel: number) => {
    switch (roleLevel) {
      case 100:
        return { text: '群主', color: 'red' };
      case 20:
        return { text: '管理员', color: 'blue' };
      default:
        return { text: '群成员', color: 'default' };
    }
  };

  // 获取入群方式文本
  const getJoinSourceText = (joinSource: number) => {
    switch (joinSource) {
      case 1:
        return '邀请';
      case 2:
        return '二维码';
      case 3:
        return '搜索';
      case 4:
        return '分享';
      default:
        return '未知';
    }
  };

  const memberColumns = [
    {
      title: '用户头像',
      dataIndex: 'faceURL',
      key: 'faceURL',
      width: 80,
      render: (faceURL: string, record: GroupMemberItem) => (
        <Avatar
          size={40}
          src={faceURL}
          style={{ backgroundColor: '#1890ff' }}
        >
          {getInitial(record.nickname)}
        </Avatar>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'userID',
      key: 'userID',
      width: 120,
      copyable: true,
    },
    {
      title: '群员角色',
      dataIndex: 'roleLevel',
      key: 'roleLevel',
      width: 100,
      render: (roleLevel: number) => {
        const { text, color } = getRoleText(roleLevel);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '群昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (nickname: string) => nickname || '未知用户',
    },
    {
      title: '入群时间',
      dataIndex: 'joinTime',
      key: 'joinTime',
      width: 150,
      render: (joinTime: number) => new Date(joinTime).toLocaleString('zh-CN'),
    },
    {
      title: '入群方式',
      dataIndex: 'joinSource',
      key: 'joinSource',
      width: 100,
      render: (joinSource: number) => getJoinSourceText(joinSource),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: GroupMemberItem) => {
        const isOwner = record.roleLevel === 100;
        return (
          <Space>
            <Button
              type="link"
              icon={<CrownOutlined />}
              disabled={isOwner}
              onClick={() => onSetRole(record.userID)}
            >
              设置群身份
            </Button>
            <Button
              type="link"
              icon={<MuteOutlined />}
              onClick={() => onMuteMember(record.userID)}
            >
              禁言
            </Button>
            <Popconfirm
              title="确定要移除此成员吗？"
              onConfirm={() => onRemoveMember(record.userID)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                danger
                icon={<UserDeleteOutlined />}
                disabled={isOwner}
              >
                移除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  console.log('GroupMembersModal render - visible:', visible, 'currentGroup:', currentGroup, 'members:', members);
  
  return (
    <Modal
      title={`群成员 - ${currentGroup?.groupInfo.groupName || ''}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Table
        columns={memberColumns}
        dataSource={members}
        loading={loading}
        rowKey="userID"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          onChange: onTableChange,
          onShowSizeChange: onTableChange,
        }}
        scroll={{ x: 800 }}
      />
    </Modal>
  );
};

export default GroupMembersModal;
