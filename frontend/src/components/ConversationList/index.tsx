/**
 * 对话卡片列表组件
 * 显示小卡片形式的对话预览，点击后打开完整对话
 */
import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Spin, Modal, Popconfirm, Typography } from 'antd';
import {
  PlusOutlined,
  MessageOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { conversationAPI } from '../../api/conversation';
import type { ConversationResponse } from '../../types/chat';
import ChatModal from '../ChatModal';

const { Text, Title } = Typography;

interface ConversationListProps {
  projectId: string;
}

const ConversationList: React.FC<ConversationListProps> = ({ projectId }) => {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationResponse | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  // 加载对话列表
  useEffect(() => {
    loadConversations();
  }, [projectId]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convs = await conversationAPI.list(projectId);
      setConversations(convs);
    } catch (error) {
      console.error('加载对话列表失败:', error);
      message.error('加载对话列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新对话
  const handleCreateConversation = async () => {
    try {
      const newConv = await conversationAPI.create({
        project_id: projectId,
        title: `对话 ${conversations.length + 1}`,
        messages: [],
      });
      setConversations(prev => [newConv, ...prev]);
      message.success('创建成功');
      
      // 立即打开新对话
      setSelectedConversation(newConv);
      setChatModalVisible(true);
    } catch (error) {
      console.error('创建对话失败:', error);
      message.error('创建对话失败');
    }
  };

  // 打开对话
  const handleOpenConversation = (conv: ConversationResponse) => {
    setSelectedConversation(conv);
    setChatModalVisible(true);
  };

  // 删除对话
  const handleDeleteConversation = async (convId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发卡片点击
    try {
      await conversationAPI.delete(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      message.success('删除成功');
    } catch (error) {
      console.error('删除对话失败:', error);
      message.error('删除失败');
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  // 获取对话预览文本
  const getPreviewText = (conv: ConversationResponse) => {
    if (conv.messages.length === 0) return '开始新的对话...';
    const lastMsg = conv.messages[conv.messages.length - 1];
    return lastMsg.content.slice(0, 60) + (lastMsg.content.length > 60 ? '...' : '');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      {/* 顶部标题和按钮 */}
      <div className="flex items-center justify-between mb-6">
        <Title level={3} className="m-0">对话列表</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateConversation}
          size="large"
        >
          新建对话
        </Button>
      </div>

      {/* 对话卡片网格 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spin size="large" tip="加载中..." />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <MessageOutlined className="text-6xl mb-4" />
          <Text type="secondary" className="text-lg mb-4">
            还没有对话
          </Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateConversation}
            size="large"
          >
            创建第一个对话
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {conversations.map((conv) => (
            <Card
              key={conv.id}
              hoverable
              className="cursor-pointer transition-all duration-200 hover:shadow-lg"
              onClick={() => handleOpenConversation(conv)}
              bodyStyle={{ padding: '16px' }}
            >
              {/* 卡片头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Text strong className="text-base block truncate">
                    {conv.title || '未命名对话'}
                  </Text>
                  <Space size={4} className="mt-1">
                    <ClockCircleOutlined className="text-gray-400 text-xs" />
                    <Text type="secondary" className="text-xs">
                      {formatTime(conv.updated_at)}
                    </Text>
                  </Space>
                </div>
                <Popconfirm
                  title="确定删除这个对话吗？"
                  onConfirm={(e) => handleDeleteConversation(conv.id, e!)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>

              {/* 预览文本 */}
              <div className="bg-gray-50 rounded p-3 min-h-[80px]">
                <Text type="secondary" className="text-sm line-clamp-3">
                  {getPreviewText(conv)}
                </Text>
              </div>

              {/* 底部信息 */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <Space size={4}>
                  <MessageOutlined className="text-gray-400 text-xs" />
                  <Text type="secondary" className="text-xs">
                    {conv.messages.length} 条消息
                  </Text>
                </Space>
                <Button type="link" size="small" onClick={() => handleOpenConversation(conv)}>
                  打开
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 对话模态框 */}
      {selectedConversation && (
        <ChatModal
          visible={chatModalVisible}
          conversation={selectedConversation}
          onClose={() => {
            setChatModalVisible(false);
            setSelectedConversation(null);
            loadConversations(); // 关闭时重新加载列表
          }}
          onUpdate={(updatedConv: ConversationResponse) => {
            // 更新列表中的对话
            setConversations(prev =>
              prev.map(c => c.id === updatedConv.id ? updatedConv : c)
            );
          }}
        />
      )}
    </div>
  );
};

export default ConversationList;