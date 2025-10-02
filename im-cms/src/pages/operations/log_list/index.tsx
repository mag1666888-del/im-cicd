import React, { useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Avatar, Tag, Space, Button, Popconfirm, message, Typography, DatePicker } from 'antd';
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { searchClientLogs, deleteClientLogs } from '@/services/ant-design-pro/api';
import { LogItem, PLATFORM_TYPES } from './types';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ClientLogList: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取客户端日志列表
  const fetchClientLogs = async (params: any) => {
    try {
      // 处理时间范围搜索
      let startTime, endTime;
      if (params.createTime && params.createTime.length === 2) {
        startTime = dayjs(params.createTime[0]).valueOf();
        endTime = dayjs(params.createTime[1]).valueOf();
      }

      // 构建请求参数
      const requestParams: any = {
        current: params.current || 1,
        pageSize: params.pageSize || 10,
        pagination: {
          pageNumber: params.current || 1,
          showNumber: params.pageSize || 10,
        },
      };

      // 只有当 userID 有值且不为空字符串时才添加该参数
      if (params.userID && params.userID.trim() !== '') {
        requestParams.userID = params.userID;
      }

      // 只有当时间范围有值时才添加该参数
      if (startTime && endTime) {
        requestParams.startTime = startTime;
        requestParams.endTime = endTime;
      }

      // 添加调试信息
      console.log('搜索客户端日志请求参数:', requestParams);
      
      const response = await searchClientLogs(requestParams);

      if (response.errCode === 0) {
        return {
          data: response.data.logsInfos || [],
          success: true,
          total: response.data.total || 0,
        };
      } else {
        message.error(response.errMsg || '获取客户端日志列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取客户端日志列表失败:', error);
      message.error('获取客户端日志列表失败，请重试');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取头像首字母
  const getInitial = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // 下载日志
  const handleDownload = (record: LogItem) => {
    try {
      // 创建一个临时的 a 标签来触发下载
      const link = document.createElement('a');
      link.href = record.url;
      link.download = record.filename.split('/').pop() || `log_${record.logID}.zip`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('开始下载日志文件');
    } catch (error) {
      console.error('下载日志失败:', error);
      message.error('下载日志失败，请重试');
    }
  };

  // 删除日志
  const handleDelete = async (record: LogItem) => {
    try {
      const response = await deleteClientLogs({
        logIDs: [record.logID]
      });

      if (response.errCode === 0) {
        message.success('日志删除成功');
        setRefreshKey(prev => prev + 1);
      } else {
        message.error(response.errMsg || '删除日志失败');
      }
    } catch (error) {
      console.error('删除日志失败:', error);
      message.error('删除日志失败，请重试');
    }
  };

  // 获取平台标签颜色
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'Android':
        return 'green';
      case 'iOS':
        return 'blue';
      case 'Windows':
        return 'cyan';
      case 'macOS':
        return 'purple';
      case 'Web':
        return 'orange';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '用户ID',
      dataIndex: 'userID',
      key: 'userID',
      width: 120,
      copyable: true,
      hideInSearch: false,
      fieldProps: {
        placeholder: '请输入用户ID',
      },
    },
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      hideInSearch: true,
      render: (_: any, record: LogItem) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            size={32}
            style={{ backgroundColor: '#1890ff', marginRight: 8 }}
          >
            {getInitial(record.nickname || 'U')}
          </Avatar>
          <span>{record.nickname || '未知用户'}</span>
        </div>
      ),
    },
    {
      title: '系统型号',
      dataIndex: 'systemType',
      key: 'systemType',
      width: 120,
      hideInSearch: true,
      render: (_: any, record: LogItem) => (
        <span>{record.systemType || '-'}</span>
      ),
    },
    {
      title: '发送平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      hideInSearch: true,
      render: (_: any, record: LogItem) => (
        <Tag color={getPlatformColor(record.platform)}>
          {record.platform}
        </Tag>
      ),
    },
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      hideInSearch: true,
      render: (_: any, record: LogItem) => (
        <Tag color="blue">{record.version}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      hideInSearch: false,
      valueType: 'dateRange' as const,
      fieldProps: {
        placeholder: ['开始日期', '结束日期'],
      },
      render: (_: any, record: LogItem) => (
        <span>{new Date(record.createTime).toLocaleString('zh-CN')}</span>
      ),
    },
    {
      title: 'ex',
      dataIndex: 'ex',
      key: 'ex',
      width: 100,
      hideInSearch: true,
      render: (_: any, record: LogItem) => (
        <span>{record.ex || '-'}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      hideInSearch: true,
      render: (_: any, record: LogItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Popconfirm
            title="确定要删除这条日志吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
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
      title="客户端日志管理"
      content="管理客户端日志，支持搜索、下载、删除等操作"
    >
      <ProTable<LogItem>
        columns={columns}
        request={fetchClientLogs}
        rowKey={(record) => record.logID}
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
        scroll={{ x: 1000 }}
        options={{
          reload: () => setRefreshKey(prev => prev + 1),
        }}
        refreshKey={refreshKey}
      />
    </PageContainer>
  );
};

export default ClientLogList;