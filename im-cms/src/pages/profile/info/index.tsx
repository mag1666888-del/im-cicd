import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, Upload, Avatar, message, Space, Typography } from 'antd';
import { UserOutlined, UploadOutlined, CameraOutlined, ReloadOutlined } from '@ant-design/icons';
import { updateAccountInfo } from '@/services/ant-design-pro/api';
import { useModel } from '@umijs/max';
import { uploadAvatar } from '@/utils/fileUpload';
import type { UploadFile } from 'antd';

const { Title, Text } = Typography;

interface ProfileFormData {
  userID: string;
  nickname: string;
  faceURL: string;
}

const ProfileInfo: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 从全局状态获取用户信息并填充表单
  const loadUserInfoToForm = () => {
    if (!initialState?.currentUser) {
      console.log('initialState.currentUser 不存在');
      message.warning('用户信息未加载，请重新登录');
      return;
    }

    const currentUser = initialState.currentUser;
    console.log('从 initialState 获取用户信息:', currentUser);
    
    // 设置默认头像地址，如果没有则使用默认头像
    const defaultAvatarUrl = 'http://47.83.254.218:10002/object/imAdmin/default_avatar.png';
    const finalFaceURL = currentUser.faceURL || currentUser.avatar || defaultAvatarUrl;
    
    console.log('头像URL处理:', {
      'currentUser.faceURL': currentUser.faceURL,
      'currentUser.avatar': currentUser.avatar,
      'defaultAvatarUrl': defaultAvatarUrl,
      'finalFaceURL': finalFaceURL
    });
    
    // 填充表单数据
    const formData = {
      userID: currentUser.userid || currentUser.userID || '',
      nickname: currentUser.nickname || currentUser.name || '',
      faceURL: finalFaceURL,
    };
    
    console.log('准备填充表单数据:', formData);
    
    form.setFieldsValue(formData);
    setAvatarUrl(finalFaceURL);
    
    console.log('表单已填充数据:', formData);
    console.log('avatarUrl 状态已设置为:', finalFaceURL);
  };

  // 页面加载时获取用户信息并填充表单
  useEffect(() => {
    loadUserInfoToForm();
  }, [form]);

  // 处理头像上传
  const handleAvatarChange = async (info: any) => {
    let newFileList = [...info.fileList];
    
    // 只保留最后一个文件
    newFileList = newFileList.slice(-1);
    
    // 读取文件并转换为base64
    newFileList = newFileList.map((file) => {
      if (file.response) {
        file.url = file.response.url;
      }
      return file;
    });

    setFileList(newFileList);

    if (info.file.status === 'done') {
      const imageUrl = info.file.response?.url || info.file.thumbUrl;
      setAvatarUrl(imageUrl);
      form.setFieldValue('faceURL', imageUrl);
      
      // 刷新全局状态
      if ((initialState as any)?.setInitialState) {
        (initialState as any).setInitialState({
          ...initialState,
          currentUser: {
            ...(initialState?.currentUser || {}),
            faceURL: imageUrl,
            avatar: imageUrl,
          },
        });
      }
      
      message.success('头像上传成功');
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };


  // 自定义上传函数
  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    try {
      const userID = (initialState?.currentUser as any)?.adminUserID || 'imAdmin';
      const result = await uploadAvatar(file, userID);
      
      if (result.success) {
        onSuccess({ url: result.url });
      } else {
        onError(new Error(result.error || '上传失败'));
      }
    } catch (error: any) {
      console.error('头像上传失败，详细错误:', error);
      onError(error);
    }
  };

  // 提交表单
  const handleSubmit = async (values: ProfileFormData) => {
    setLoading(true);
    try {
      const currentUser = initialState?.currentUser;
      if (!currentUser) {
        message.error('用户信息不存在，请重新登录');
        return;
      }

      const updateData: { userID: string; nickname?: string; faceURL?: string } = {
        userID: values.userID,
      };

      // 只更新有变化的字段
      if (values.nickname && values.nickname !== (currentUser.nickname || currentUser.name)) {
        updateData.nickname = values.nickname;
      }
      if (values.faceURL && values.faceURL !== (currentUser.faceURL || currentUser.avatar)) {
        updateData.faceURL = values.faceURL;
      }

      // 如果没有需要更新的字段
      if (Object.keys(updateData).length === 1) {
        message.info('没有检测到需要更新的信息');
        setLoading(false);
        return;
      }

      const response = await updateAccountInfo(updateData);

      if (response.errCode === 0) {
        message.success('个人信息更新成功');
        
        // 更新全局状态
        const updatedUser = {
          ...currentUser,
          ...(updateData.nickname && { nickname: updateData.nickname, name: updateData.nickname }),
          ...(updateData.faceURL && { faceURL: updateData.faceURL, avatar: updateData.faceURL }),
        };
        
        setInitialState({
          ...initialState,
          currentUser: updatedUser,
        });
        
        // 更新localStorage中的信息
        if (updateData.nickname) {
          localStorage.setItem('nickname', updateData.nickname);
        }
        if (updateData.faceURL) {
          localStorage.setItem('faceURL', updateData.faceURL);
        }
        
        console.log('全局状态已更新:', updatedUser);
      } else {
        message.error(response.errMsg || '更新失败');
      }
    } catch (error) {
      console.error('更新个人信息失败:', error);
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '个人信息',
        breadcrumb: {
          items: [
            { title: '账号设置' },
            { title: '个人信息' },
          ],
        },
      }}
    >
      <Card>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 600 }}
        >
          <Form.Item label="头像">
            <Space direction="vertical" size="middle">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Avatar
                  size={80}
                  src={avatarUrl || 'http://47.83.254.218:10002/object/imAdmin/default_avatar.png'}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
                <div>
                  <Text type="secondary">当前头像</Text>
                  <br />
                  <Upload
                    fileList={fileList}
                    onChange={handleAvatarChange}
                    customRequest={customUpload}
                    showUploadList={false}
                    accept="image/*"
                  >
                    <Button icon={<CameraOutlined />} size="small">
                      更换头像
                    </Button>
                  </Upload>
                </div>
              </div>
            </Space>
          </Form.Item>

          <Form.Item label="用户ID" name="userID">
            <Input disabled />
          </Form.Item>

          <Form.Item
            label="昵称"
            name="nickname"
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, max: 20, message: '昵称长度应在2-20个字符之间' },
            ]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                保存修改
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  loadUserInfoToForm();
                  message.success('用户信息已重新加载');
                }}
                size="large"
              >
                重新加载
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default ProfileInfo;
