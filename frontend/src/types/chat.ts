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