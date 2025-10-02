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
import type { GroupItem } from './types';

interface GroupSettingsDrawerProps {
  visible: boolean;
  loading: boolean;
  form: any;
  currentGroup: GroupItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

const GroupSettingsDrawer: React.FC<GroupSettingsDrawerProps> = ({
  visible,
  loading,
  form,
  currentGroup,
  onClose,
  onConfirm,
}) => {

  return (
    <Drawer
      title="群聊设置"
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
          groupID: '',
          introduction: '',
          notification: '',
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

        {/* 群组ID - 不可编辑 */}
        <Form.Item
          label="群组ID"
          name="groupID"
        >
          <Input 
            placeholder="群组ID" 
            disabled 
            style={{ backgroundColor: '#f5f5f5', color: '#999' }}
          />
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

export default GroupSettingsDrawer;
