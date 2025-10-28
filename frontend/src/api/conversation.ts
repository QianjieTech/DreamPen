/**
 * 对话管理 API 客户端
 */
import apiClient from './client';
import type {
  Message,
  ConversationResponse,
  ConversationCreate,
  ConversationUpdate
} from '../types/chat';

/**
 * 重试函数
 */
const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

export const conversationAPI = {
  /**
   * 创建新对话
   */
  create: async (data: ConversationCreate): Promise<ConversationResponse> => {
    try {
      return await retryRequest(() => apiClient.post('/api/conversations', data));
    } catch (error: any) {
      console.error('创建对话失败:', error);
      throw new Error(error.response?.data?.detail || '创建对话失败');
    }
  },

  /**
   * 获取项目的所有对话
   */
  list: async (projectId: string): Promise<ConversationResponse[]> => {
    try {
      return await retryRequest(() =>
        apiClient.get('/api/conversations', {
          params: { project_id: projectId }
        })
      );
    } catch (error: any) {
      console.error('获取对话列表失败:', error);
      throw new Error(error.response?.data?.detail || '获取对话列表失败');
    }
  },

  /**
   * 获取指定对话详情（支持分页）
   */
  get: async (
    conversationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationResponse> => {
    try {
      return await retryRequest(() =>
        apiClient.get(`/api/conversations/${conversationId}`, {
          params: { limit, offset }
        })
      );
    } catch (error: any) {
      console.error('获取对话详情失败:', error);
      throw new Error(error.response?.data?.detail || '获取对话详情失败');
    }
  },

  /**
   * 更新对话
   */
  update: async (conversationId: number, data: ConversationUpdate): Promise<ConversationResponse> => {
    try {
      return await retryRequest(() =>
        apiClient.put(`/api/conversations/${conversationId}`, data)
      );
    } catch (error: any) {
      console.error('更新对话失败:', error);
      throw new Error(error.response?.data?.detail || '更新对话失败');
    }
  },

  /**
   * 删除对话
   */
  delete: async (conversationId: number): Promise<void> => {
    try {
      return await retryRequest(() =>
        apiClient.delete(`/api/conversations/${conversationId}`)
      );
    } catch (error: any) {
      console.error('删除对话失败:', error);
      throw new Error(error.response?.data?.detail || '删除对话失败');
    }
  },

  /**
   * 添加消息到对话
   */
  addMessage: async (conversationId: number, message: Message): Promise<any> => {
    try {
      return await retryRequest(() =>
        apiClient.post(`/api/conversations/${conversationId}/messages`, { message })
      );
    } catch (error: any) {
      console.error('添加消息失败:', error);
      throw new Error(error.response?.data?.detail || '添加消息失败');
    }
  }
};