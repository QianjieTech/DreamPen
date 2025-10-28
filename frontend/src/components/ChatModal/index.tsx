/**
 * 全屏对话模态框组件
 * 点击卡片后显示完整的对话界面
 */
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Input, Button, Space, message, Spin } from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { conversationAPI } from '../../api/conversation';
import { worldviewAPI } from '../../api/worldview';
import type { ConversationResponse, Message, ChatMessage } from '../../types/chat';

const { TextArea } = Input;

interface ChatModalProps {
  visible: boolean;
  conversation: ConversationResponse;
  onClose: () => void;
  onUpdate: (conv: ConversationResponse) => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  conversation,
  onClose,
  onUpdate,
}) => {
  const [messages, setMessages] = useState<Message[]>(conversation.messages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 同步conversation的messages
  useEffect(() => {
    setMessages(conversation.messages);
  }, [conversation.messages]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 保存对话到后端
  const saveConversation = async (updatedMessages: Message[]) => {
    try {
      const updated = await conversationAPI.update(conversation.id, {
        messages: updatedMessages,
      });
      onUpdate(updated);
    } catch (error) {
      console.error('保存对话失败:', error);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // 构建对话历史
      const conversationHistory: ChatMessage[] = messages.slice(-50).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      let fullResponse = '';
      const aiMessageId = (Date.now() + 1).toString();

      // 添加空的AI消息用于流式显示
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }]);

      // 使用流式API
      await worldviewAPI.chatStream(
        {
          message: inputValue,
          conversation_history: conversationHistory,
        },
        // onChunk
        (chunk) => {
          if (chunk.type === 'content') {
            fullResponse += chunk.content;
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.id === aiMessageId) {
                lastMsg.content = fullResponse;
              }
              return updated;
            });
          }
        },
        // onComplete
        async () => {
          // 保存完整对话
          const finalMessages = [...newMessages, {
            id: aiMessageId,
            role: 'assistant' as const,
            content: fullResponse,
            timestamp: Date.now(),
          }];
          await saveConversation(finalMessages);
        },
        // onError
        (error) => {
          console.error('AI响应失败:', error);
          message.error('AI响应失败，请重试');
        }
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理快捷键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Modal
      title={conversation.title || '对话'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ top: 20 }}
      bodyStyle={{ height: 'calc(90vh - 110px)', padding: 0 }}
    >
      <div className="h-full flex flex-col">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <RobotOutlined className="text-6xl mb-4" />
              <p className="text-lg">开始新的对话</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-3 max-w-[70%] ${
                      msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* 头像 */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <UserOutlined className="text-white text-lg" />
                      ) : (
                        <RobotOutlined className="text-white text-lg" />
                      )}
                    </div>

                    {/* 消息内容 */}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* 加载指示器 */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <LoadingOutlined className="text-white text-lg" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <Spin size="small" />
                      <span className="ml-2 text-gray-600">AI 正在思考...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <Space.Compact className="w-full">
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              autoSize={{ minRows: 2, maxRows: 6 }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              loading={isLoading}
              disabled={!inputValue.trim()}
              size="large"
            >
              发送
            </Button>
          </Space.Compact>
        </div>
      </div>
    </Modal>
  );
};

export default ChatModal;