/**
 * 多对话管理面板组件
 * 支持多个对话并行存在，每个对话可以独立折叠成气泡预览
 */
import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, message, Spin, Tag, Tooltip, Popconfirm } from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types/chat';
import { useAppStore } from '../../store';
import { conversationAPI } from '../../api/conversation';
import type { ConversationResponse } from '../../types/chat';

const { TextArea } = Input;

interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
  isCollapsed: boolean;
  isActive: boolean;
}

interface MultiChatPanelProps {
  projectId: string;
  onSendMessage?: (
    sessionId: number,
    message: string,
    conversationHistory: Message[],
    onStreamUpdate: (content: string) => void
  ) => Promise<string>;
}

const MultiChatPanel: React.FC<MultiChatPanelProps> = ({ projectId, onSendMessage }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [loadingSessions, setLoadingSessions] = useState<Record<number, boolean>>({});
  const messagesEndRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 加载用户的所有对话
  useEffect(() => {
    loadConversations();
  }, [projectId]);

  const loadConversations = async () => {
    try {
      const conversations = await conversationAPI.list(projectId);
      const loadedSessions: ChatSession[] = conversations.map(conv => ({
        id: conv.id,
        title: conv.title || '新对话',
        messages: conv.messages,
        isCollapsed: conv.is_collapsed,
        isActive: false,
      }));
      
      setSessions(loadedSessions);
      
      // 如果有对话，激活最近的一个
      if (loadedSessions.length > 0) {
        setActiveSessionId(loadedSessions[0].id);
      }
    } catch (error) {
      console.error('加载对话失败:', error);
      message.error('加载对话失败');
    }
  };

  // 创建新对话
  const handleCreateSession = async () => {
    try {
      const newConv = await conversationAPI.create({
        project_id: projectId,
        title: `对话 ${sessions.length + 1}`,
        messages: [],
      });

      const newSession: ChatSession = {
        id: newConv.id,
        title: newConv.title || '新对话',
        messages: [],
        isCollapsed: false,
        isActive: false,
      };

      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(newSession.id);
      message.success('已创建新对话');
    } catch (error) {
      console.error('创建对话失败:', error);
      message.error('创建对话失败');
    }
  };

  // 切换对话折叠状态（并自动保存）
  const handleToggleCollapse = async (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const newCollapsedState = !session.isCollapsed;

    // 立即更新UI
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId ? { ...s, isCollapsed: newCollapsedState } : s
      )
    );

    // 自动保存到后端
    try {
      await conversationAPI.update(sessionId, {
        messages: session.messages,
        is_collapsed: newCollapsedState,
      });
    } catch (error) {
      console.error('保存对话状态失败:', error);
      message.error('保存失败');
      // 回滚UI状态
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId ? { ...s, isCollapsed: !newCollapsedState } : s
        )
      );
    }
  };

  // 删除对话
  const handleDeleteSession = async (sessionId: number) => {
    try {
      await conversationAPI.delete(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // 如果删除的是当前激活的对话，切换到其他对话
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      message.success('对话已删除');
    } catch (error) {
      console.error('删除对话失败:', error);
      message.error('删除对话失败');
    }
  };

  // 发送消息
  const handleSendMessage = async (sessionId: number) => {
    const inputValue = inputValues[sessionId]?.trim();
    if (!inputValue) {
      message.warning('请输入消息内容');
      return;
    }

    // ⭐ 关键修复：在更新状态之前，先获取当前session的消息历史
    const currentSession = sessions.find(s => s.id === sessionId);
    const conversationHistory = currentSession ? currentSession.messages : [];
    
    console.log('[MultiChatPanel] 准备发送消息');
    console.log('  - 当前历史消息数:', conversationHistory.length);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    // 添加空的 AI 消息用于流式更新
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
    };

    // 更新本地状态:添加用户消息和空的AI消息
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, userMessage, aiMessage] }
          : s
      )
    );

    setInputValues(prev => ({ ...prev, [sessionId]: '' }));
    setLoadingSessions(prev => ({ ...prev, [sessionId]: true }));

    try {
      // 调用父组件提供的发送消息方法,传入流式更新回调
      if (onSendMessage) {
        
        const finalResponse = await onSendMessage(
          sessionId,
          inputValue,
          conversationHistory,
          // 流式更新回调 - 更新最后一条消息的内容
          (streamContent: string) => {
            setSessions(prev =>
              prev.map(s => {
                if (s.id !== sessionId) return s;
                
                const updatedMessages = [...s.messages];
                const lastMsgIndex = updatedMessages.length - 1;
                if (lastMsgIndex >= 0 && updatedMessages[lastMsgIndex].role === 'assistant') {
                  updatedMessages[lastMsgIndex] = {
                    ...updatedMessages[lastMsgIndex],
                    content: streamContent,
                  };
                }
                return { ...s, messages: updatedMessages };
              })
            );
          }
        );

        // 保存完整对话到后端 - 使用最新的状态
        try {
          // 获取最新的session状态
          setSessions(prev => {
            const currentSession = prev.find(s => s.id === sessionId);
            if (currentSession) {
              // 异步保存,不阻塞UI
              const finalMessages = [...currentSession.messages];
              // 确保最后一条消息内容是最新的
              if (finalMessages.length > 0 && finalMessages[finalMessages.length - 1].role === 'assistant') {
                finalMessages[finalMessages.length - 1] = {
                  ...finalMessages[finalMessages.length - 1],
                  content: finalResponse,
                };
              }
              
              conversationAPI.update(sessionId, {
                messages: finalMessages,
              }).catch(saveError => {
                console.error('保存对话失败:', saveError);
                // 保存失败不影响用户体验,只记录错误
              });
            }
            return prev;
          });
        } catch (saveError) {
          console.error('保存对话失败:', saveError);
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
      
      // 发送失败时,移除刚添加的空AI消息
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== sessionId) return s;
          const messages = s.messages.filter(m => m.id !== aiMessageId);
          return { ...s, messages };
        })
      );
    } finally {
      setLoadingSessions(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // 自动滚动到底部
  const scrollToBottom = (sessionId: number) => {
    messagesEndRefs.current[sessionId]?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    sessions.forEach(session => {
      if (!session.isCollapsed) {
        scrollToBottom(session.id);
      }
    });
  }, [sessions]);

  // 获取对话预览文本
  const getPreviewText = (messages: Message[]) => {
    if (messages.length === 0) return '暂无消息';
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (!firstUserMsg) return '暂无消息';
    return firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center space-x-2">
          <RobotOutlined className="text-lg text-blue-500" />
          <span className="font-semibold text-gray-700">AI 助手</span>
          <Tag color="blue">{sessions.length} 个对话</Tag>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateSession}
          size="small"
        >
          新建对话
        </Button>
      </div>

      {/* 对话列表区域 */}
      <div className="flex-1 overflow-y-auto flex flex-col p-2 space-y-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <RobotOutlined className="text-4xl mb-2" />
            <p>还没有对话</p>
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={handleCreateSession}
            >
              创建第一个对话
            </Button>
          </div>
        ) : sessions.some(s => !s.isCollapsed) ? (
          // 如果有展开的对话,只显示那个对话
          sessions.filter(s => !s.isCollapsed).map(session => (
            <div
              key={session.id}
              className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-blue-400"
            >
              {/* 展开状态 - 对话头部 */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center space-x-2 flex-1">
                  <span className="font-medium text-gray-700">{session.title}</span>
                  <Tag color="green" className="text-xs">
                    {session.messages.length} 条消息
                  </Tag>
                </div>
                <Space size="small">
                  <Tooltip title="折叠">
                    <Button
                      type="text"
                      size="small"
                      icon={<UpOutlined />}
                      onClick={() => handleToggleCollapse(session.id)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="确定删除这个对话吗？"
                    onConfirm={() => handleDeleteSession(session.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Space>
              </div>

              {/* 展开状态 - 消息列表 */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {session.messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p>开始新的对话</p>
                  </div>
                ) : (
                  session.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex items-start space-x-2 max-w-[80%] ${
                          msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                      >
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
                        <div
                          className={`rounded-lg px-3 py-2 ${
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
                            <div className="whitespace-pre-wrap break-words text-sm">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* 加载指示器 */}
                {loadingSessions[session.id] && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <LoadingOutlined className="text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <Spin size="small" />
                        <span className="ml-2 text-sm text-gray-600">AI 正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={el => { messagesEndRefs.current[session.id] = el; }} />
              </div>

              {/* 展开状态 - 输入区域 */}
              <div className="border-t border-gray-100 p-3 flex-shrink-0">
                <Space.Compact className="w-full">
                  <TextArea
                    value={inputValues[session.id] || ''}
                    onChange={(e) => setInputValues(prev => ({
                      ...prev,
                      [session.id]: e.target.value
                    }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(session.id);
                      }
                    }}
                    placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    disabled={loadingSessions[session.id]}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => handleSendMessage(session.id)}
                    loading={loadingSessions[session.id]}
                    disabled={!inputValues[session.id]?.trim()}
                  >
                    发送
                  </Button>
                </Space.Compact>
              </div>
            </div>
          ))
        ) : (
          // 如果所有对话都收起,显示细长条列表
          sessions.map(session => (
            <div
              key={session.id}
              className="flex-shrink-0"
            >
              {/* 收起状态 - 极简紧凑的条状按钮 */}
              <div
                className={`flex items-center justify-between px-3 py-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors ${
                  activeSessionId === session.id ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => handleToggleCollapse(session.id)}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <RobotOutlined className="text-blue-500 text-sm flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate">{session.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">({session.messages.length})</span>
                </div>
                <Space size={4}>
                  <Tooltip title="展开">
                    <Button
                      type="text"
                      size="small"
                      icon={<DownOutlined className="text-xs" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCollapse(session.id);
                      }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="确定删除?"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined className="text-xs" />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </Space>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MultiChatPanel;