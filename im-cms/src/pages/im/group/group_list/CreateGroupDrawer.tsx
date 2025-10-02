import React from 'react';
import {
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Upload,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';
import type { IMUserItem, CreateGroupFormData } from './types';

interface CreateGroupDrawerProps {
  visible: boolean;
  loading: boolean;
  form: any;
  imUsers: IMUserItem[];
  imUsersLoading: boolean;
  selectedOwner: string;
  selectedAdmins: string[];
  selectedMembers: string[];
  onClose: () => void;
  onConfirm: () => void;
  onOwnerChange: (value: string) => void;
  onAdminChange: (value: string[]) => void;
  onMemberChange: (value: string[]) => void;
  onSearchUsers: (value: string) => void;
}

const CreateGroupDrawer: React.FC<CreateGroupDrawerProps> = ({
  visible,
  loading,
  form,
  imUsers,
  imUsersLoading,
  selectedOwner,
  selectedAdmins,
  selectedMembers,
  onClose,
  onConfirm,
  onOwnerChange,
  onAdminChange,
  onMemberChange,
  onSearchUsers,
}) => {
  // 获取用户头像首字母
  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <Drawer
      title="新建群组"
      width={400}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            取消
          </Button>
          <Button type="primary" loading={loading} onClick={onConfirm}>
            确定
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          groupName: '',
          introduction: '',
          notification: '',
          ownerUserID: '',
          adminUserIDs: [],
          memberUserIDs: [],
          needVerification: 0,
          lookMemberInfo: 0,
          applyMemberFriend: 0,
        }}
      >
        {/* 群头像 */}
        <Form.Item label="群头像" name="faceURL">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              size={64}
              style={{ marginRight: 16, backgroundColor: '#1890ff' }}
            >
              群
            </Avatar>
            <Upload
              name="avatar"
              listType="text"
              showUploadList={false}
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />} size="small">
                上传头像
              </Button>
            </Upload>
          </div>
        </Form.Item>

        {/* 群组名称 */}
        <Form.Item
          label="群组名称"
          name="groupName"
          rules={[
            { required: true, message: '请输入群组名称' },
            { max: 20, message: '群组名称长度不能超过20个字符' },
          ]}
        >
          <Input placeholder="请输入群组名称" />
        </Form.Item>

        {/* 群主选择 */}
        <Form.Item
          label="群主"
          name="ownerUserID"
          rules={[{ required: true, message: '请选择群主' }]}
        >
          <Select
            placeholder="请选择群主"
            showSearch
            loading={imUsersLoading}
            filterOption={false}
            onSearch={onSearchUsers}
            notFoundContent={imUsersLoading ? '加载中...' : '暂无用户'}
            optionLabelProp="label"
            onChange={onOwnerChange}
          >
            {imUsers.map(user => (
              <Select.Option key={user.userID} value={user.userID} label={user.nickname || '未知用户'}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    size={20}
                    src={user.faceURL}
                    style={{ marginRight: 8 }}
                  >
                    {getInitial(user.nickname || user.userID)}
                  </Avatar>
                  <span>{user.nickname || '未知用户'}</span>
                  <span style={{ color: '#999', marginLeft: 8, fontSize: '12px' }}>
                    ({user.userID})
                  </span>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* 管理员选择 */}
        <Form.Item
          label="管理员"
          name="adminUserIDs"
        >
          <Select
            mode="multiple"
            placeholder="请选择管理员（可选）"
            showSearch
            loading={imUsersLoading}
            filterOption={false}
            onSearch={onSearchUsers}
            notFoundContent={imUsersLoading ? '加载中...' : '暂无用户'}
            optionLabelProp="label"
            maxTagCount={3}
            maxTagTextLength={10}
            onChange={onAdminChange}
            disabled={!selectedOwner}
          >
            {imUsers.map(user => {
              const isDisabled = user.userID === selectedOwner || selectedMembers.includes(user.userID);
              
              return (
                <Select.Option 
                  key={user.userID} 
                  value={user.userID} 
                  label={user.nickname || '未知用户'}
                  disabled={isDisabled}
                >
                  <div style={{ display: 'flex', alignItems: 'center', opacity: isDisabled ? 0.5 : 1 }}>
                    <Avatar
                      size={20}
                      src={user.faceURL}
                      style={{ marginRight: 8 }}
                    >
                      {getInitial(user.nickname || user.userID)}
                    </Avatar>
                    <span>{user.nickname || '未知用户'}</span>
                    <span style={{ color: '#999', marginLeft: 8, fontSize: '12px' }}>
                      ({user.userID})
                    </span>
                    {isDisabled && (
                      <span style={{ color: '#ff4d4f', marginLeft: 8, fontSize: '12px' }}>
                        {user.userID === selectedOwner ? '(群主)' : '(群成员)'}
                      </span>
                    )}
                  </div>
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>

        {/* 群成员选择 */}
        <Form.Item
          label="群成员"
          name="memberUserIDs"
          rules={[{ required: true, message: '请选择群成员' }]}
        >
          <Select
            mode="multiple"
            placeholder="请选择群成员"
            showSearch
            loading={imUsersLoading}
            filterOption={false}
            onSearch={onSearchUsers}
            notFoundContent={imUsersLoading ? '加载中...' : '暂无用户'}
            optionLabelProp="label"
            maxTagCount={5}
            maxTagTextLength={10}
            onChange={onMemberChange}
            disabled={!selectedOwner}
          >
            {imUsers.map(user => {
              const isDisabled = user.userID === selectedOwner || selectedAdmins.includes(user.userID);
              
              return (
                <Select.Option 
                  key={user.userID} 
                  value={user.userID} 
                  label={user.nickname || '未知用户'}
                  disabled={isDisabled}
                >
                  <div style={{ display: 'flex', alignItems: 'center', opacity: isDisabled ? 0.5 : 1 }}>
                    <Avatar
                      size={20}
                      src={user.faceURL}
                      style={{ marginRight: 8 }}
                    >
                      {getInitial(user.nickname || user.userID)}
                    </Avatar>
                    <span>{user.nickname || '未知用户'}</span>
                    <span style={{ color: '#999', marginLeft: 8, fontSize: '12px' }}>
                      ({user.userID})
                    </span>
                    {isDisabled && (
                      <span style={{ color: '#ff4d4f', marginLeft: 8, fontSize: '12px' }}>
                        {user.userID === selectedOwner ? '(群主)' : '(管理员)'}
                      </span>
                    )}
                  </div>
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>

        {/* 群组设置 */}
        <Form.Item
          label="群验证"
          name="needVerification"
          rules={[{ required: true, message: '请选择群验证方式' }]}
        >
          <Select placeholder="请选择群验证方式">
            <Select.Option value={0}>群成员邀请无需验证</Select.Option>
            <Select.Option value={1}>需要发送验证消息</Select.Option>
            <Select.Option value={2}>允许所有人加群</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="查看资料"
          name="lookMemberInfo"
          rules={[{ required: true, message: '请选择查看资料权限' }]}
        >
          <Select placeholder="请选择查看资料权限">
            <Select.Option value={0}>允许查看群员资料</Select.Option>
            <Select.Option value={1}>不允许查看群员资料</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="添加好友"
          name="applyMemberFriend"
          rules={[{ required: true, message: '请选择添加好友权限' }]}
        >
          <Select placeholder="请选择添加好友权限">
            <Select.Option value={0}>允许群内添加好友</Select.Option>
            <Select.Option value={1}>不允许群内添加好友</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="群公告"
          name="notification"
          rules={[
            { max: 200, message: '群公告长度不能超过200个字符' },
          ]}
        >
          <Input.TextArea
            placeholder="请输入群公告"
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="群简介"
          name="introduction"
          rules={[
            { max: 200, message: '群简介长度不能超过200个字符' },
          ]}
        >
          <Input.TextArea
            placeholder="请输入群简介"
            rows={4}
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CreateGroupDrawer;
