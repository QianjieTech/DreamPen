/**
 * 对话相关类型定义
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  suggestions?: string[]; // AI 提供的快速选项
}

export interface ChatRequest {
  message: string;
  conversation_history: ChatMessage[];
  custom_prompt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;  // 后端使用 'reply' 字段
  response?: string;  // 保留兼容性
  file_operations?: any[];
  suggestions?: string[];
}

export type AgentType = 'worldview' | 'character' | 'outline' | 'scene' | 'writer' | 'style';

// 对话相关类型
export interface ConversationCreate {
  project_id: string;
  title: string;
  messages: Message[];
}

export interface ConversationUpdate {
  title?: string | null;
  messages?: Message[];
  is_collapsed?: boolean;
}

export interface ConversationResponse {
  id: number;
  user_id: number;
  project_id: string;
  title: string | null;
  messages: Message[];
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageCreate {
  message: Message;
}

export interface MessageResponse {
  conversation_id: number;
  message: Message;
}