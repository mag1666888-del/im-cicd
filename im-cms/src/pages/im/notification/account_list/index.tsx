import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Modal, Input, message, Avatar, Upload } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { getNotificationAccounts, deleteNotificationAccount, updateNotificationAccount } from '@/services/ant-design-pro/api';
import { uploadGenericFile } from '@/utils/fileUpload';

interface NotificationAccount {
  userID: string;
  nickName: string;
  faceURL: string;
  appMangerLevel: number;
}

const AccountList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingNickName, setEditingNickName] = useState<string>('');
  const [editingAvatar, setEditingAvatar] = useState<string>('');
  const [avatarLoading, setAvatarLoading] = useState<string>('');
  const actionRef = useRef<ActionType>(null);

  // 表格列配置
  const columns: ProColumns<NotificationAccount>[] = [
    {
      title: '用户头像',
      dataIndex: 'faceURL',
      hideInSearch: true,
      width: 120,
      render: (_, record) => {
        const isEditing = editingKey === record.userID;
        const isLoading = avatarLoading === record.userID;
        
        if (isEditing) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar
                size={40}
                src={editingAvatar || record.faceURL}
                icon={!editingAvatar && !record.faceURL && <span>头像</span>}
              />
              <Upload
                beforeUpload={(file) => handleAvatarUpload(file, record.userID)}
                showUploadList={false}
                accept="image/*"
                multiple={false}
                maxCount={1}
              >
                <Button 
                  size="small" 
                  icon={<UploadOutlined />} 
                  loading={isLoading}
                >
                  更换
                </Button>
              </Upload>
            </div>
          );
        }
        
        return (
          <Avatar
            size={40}
            src={record.faceURL}
            icon={!record.faceURL && <span>头像</span>}
          />
        );
      },
    },
    {
      title: '用户昵称',
      dataIndex: 'nickName',
      ellipsis: true,
      renderFormItem: () => <Input placeholder="请输入用户昵称" />,
      render: (_, record) => {
        const isEditing = editingKey === record.userID;
        if (isEditing) {
          return (
            <Input
              value={editingNickName}
              onChange={(e) => setEditingNickName(e.target.value)}
              onPressEnter={() => handleSave(record.userID)}
              style={{ width: '100%' }}
            />
          );
        }
        return record.nickName;
      },
    },
    {
      title: '用户ID',
      dataIndex: 'userID',
      copyable: true,
      ellipsis: true,
      renderFormItem: () => <Input placeholder="请输入用户ID" />,
    },
    {
      title: '用户类型',
      dataIndex: 'appMangerLevel',
      hideInSearch: true,
      width: 120,
      render: (_, record) => {
        const typeMap = {
          3: { text: '系统账号', color: 'blue' },
          4: { text: '机器人', color: 'green' },
        };
        const type = typeMap[record.appMangerLevel as keyof typeof typeMap];
        return (
          <span style={{ color: type?.color || '#666' }}>
            {type?.text || '未知'}
          </span>
        );
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => {
        const isEditing = editingKey === record.userID;
        if (isEditing) {
          return [
            <Button
              key="save"
              type="link"
              size="small"
              icon={<SaveOutlined />}
              onClick={() => handleSave(record.userID)}
            >
              保存
            </Button>,
            <Button
              key="cancel"
              type="link"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleCancel()}
            >
              取消
            </Button>,
          ];
        }
        return [
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>,
        ];
      },
    },
  ];

  // 获取通知账号列表
  const fetchNotificationAccounts = async (params: any) => {
    try {
      const response = await getNotificationAccounts({
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      });
      
      return {
        data: response.data?.notificationAccounts || [],
        success: true,
        total: response.data?.total || 0,
      };
    } catch (error) {
      console.error('获取通知账号列表失败:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };


  // 处理编辑
  const handleEdit = (record: NotificationAccount) => {
    setEditingKey(record.userID);
    setEditingNickName(record.nickName);
    setEditingAvatar(record.faceURL);
  };

  // 处理保存
  const handleSave = async (userID: string) => {
    if (!editingNickName.trim()) {
      message.error('昵称不能为空');
      return;
    }

    try {
      setLoading(true);
      
      // 如果头像有变化，先更新头像
      if (editingAvatar && editingAvatar !== '') {
        await updateNotificationAccount({
          userID,
          nickName: editingNickName.trim(),
          faceURL: editingAvatar,
        });
      } else {
        await updateNotificationAccount({
          userID,
          nickName: editingNickName.trim(),
        });
      }
      
      message.success('保存成功');
      setEditingKey('');
      setEditingNickName('');
      setEditingAvatar('');
      actionRef.current?.reload();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    setEditingKey('');
    setEditingNickName('');
    setEditingAvatar('');
  };

  // 处理头像上传
  const handleAvatarUpload = async (file: File, userID: string) => {
    try {
      console.log('开始上传头像:', {
        name: file.name,
        size: file.size,
        type: file.type,
        userID
      });
      
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        message.error('只能上传图片文件');
        return false;
      }
      
      // 验证文件大小 (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        message.error('图片大小不能超过5MB');
        return false;
      }
      
      setAvatarLoading(userID);
      
      // 使用通用文件上传
      const result = await uploadGenericFile(file, `notification/${userID}_${file.name}`);
      console.log('上传结果:', result);
      
      if (result.success) {
        setEditingAvatar(result.url);
        message.success('头像上传成功');
      } else {
        throw new Error(result.error || '上传失败');
      }
      
      return false; // 阻止默认上传行为
    } catch (error) {
      console.error('头像上传失败:', error);
      message.error(`头像上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    } finally {
      setAvatarLoading('');
    }
  };

  // 处理删除
  const handleDelete = async (userID: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个通知账号吗？',
      onOk: async () => {
        try {
          await deleteNotificationAccount({ userID });
          message.success('删除成功');
          actionRef.current?.reload();
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };


  return (
    <PageContainer
      header={{
        title: '通知账号',
        breadcrumb: {
          items: [
            { title: 'IM 系统' },
            { title: '通知管理' },
            { title: '通知账号' },
          ],
        },
      }}
    >
      <ProTable<NotificationAccount>
        headerTitle="通知账号列表"
        actionRef={actionRef}
        rowKey="userID"
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        request={fetchNotificationAccounts}
        columns={columns}
        toolBarRender={() => []}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

    </PageContainer>
  );
};

export default AccountList;
