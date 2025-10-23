/**
 * AI 对话面板组件
 */
import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, message, Spin, Tag, Progress } from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ClearOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types/chat';
import { useAppStore } from '../../store';

const { TextArea } = Input;

interface ChatPanelProps {
  onSendMessage?: (message: string) => Promise<string>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage }) => {
  // 从 Zustand store 获取消息和方法
  const messages = useAppStore((state) => state.messages);
  const addMessage = useAppStore((state) => state.addMessage);
  const clearMessages = useAppStore((state) => state.clearMessages);
  const documentGenerationProgress = useAppStore((state) => state.documentGenerationProgress);
  const documentGenerationStatus = useAppStore((state) => state.documentGenerationStatus);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理发送消息
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

    // 添加用户消息到 store
    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      // 调用 AI 回复（流式处理会在 Home.tsx 中自动添加和更新消息）
      await onSendMessage?.(inputValue);
      // 注意：不需要在这里添加 AI 消息，因为流式处理已经在 Home.tsx 中处理了
    } catch (error) {
      message.error('发送消息失败');
      console.error('发送消息错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理清空对话
  const handleClearMessages = () => {
    clearMessages();
    message.success('对话已清空');
  };

  // 处理快捷键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <RobotOutlined className="text-lg text-blue-500" />
          <span className="font-semibold text-gray-700">AI 助手</span>
          <Tag color="green">在线</Tag>
        </div>
        <Button
          type="text"
          size="small"
          icon={<ClearOutlined />}
          onClick={handleClearMessages}
          disabled={messages.length === 0}
        >
          清空
        </Button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <RobotOutlined className="text-4xl mb-2" />
            <p>开始与 AI 助手对话</p>
            <p className="text-sm mt-1">它可以帮助你编写和改进内容</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[80%] ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {/* 头像 */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <UserOutlined className="text-white" />
                    ) : (
                      <RobotOutlined className="text-white" />
                    )}
                  </div>

                  {/* 消息内容 */}
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    )}
                    <div
                      className={`text-xs mt-1 ${
                        msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 加载指示器 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <RobotOutlined className="text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <Spin size="small" />
                    <span className="ml-2 text-gray-600">AI 正在思考...</span>
                  </div>
                </div>
              </div>
            )}

            {/* 文档生成进度条 */}
            {documentGenerationProgress > 0 && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <LoadingOutlined className="text-white" />
                  </div>
                  <div className="bg-blue-50 rounded-lg px-4 py-3 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        {documentGenerationStatus || '正在生成文档...'}
                      </span>
                      <span className="text-sm text-blue-600">
                        {documentGenerationProgress}%
                      </span>
                    </div>
                    <Progress
                      percent={documentGenerationProgress}
                      status={documentGenerationProgress === 100 ? 'success' : 'active'}
                      strokeColor={{
                        '0%': '#1890ff',
                        '100%': '#52c41a',
                      }}
                      showInfo={false}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-4">
        <Space.Compact className="w-full">
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isLoading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={isLoading}
            disabled={!inputValue.trim()}
          >
            发送
          </Button>
        </Space.Compact>
      </div>
    </div>
  );
};

export default ChatPanel;