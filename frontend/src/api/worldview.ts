/**
 * 世界观 Agent API
 */
import apiClient from './client';
import type { ChatRequest, ChatResponse } from '../types/chat';

export const worldviewAPI = {
  /**
   * 与世界观 Agent 对话（流式）
   */
  chatStream: async (
    data: ChatRequest,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ) => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseURL}/api/worldview/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              onChunk(parsed);
            } catch (e) {
              console.error('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      onError(error as Error);
    }
  },

  /**
   * 与世界观 Agent 对话（非流式）
   */
  chat: (data: ChatRequest) =>
    apiClient.post<ChatResponse>('/api/worldview/chat', data),

  /**
   * 读取世界观文件
   */
  read: (projectId: string, userId: string) =>
    apiClient.get<{ content: string }>('/api/worldview/read', {
      params: { project_id: projectId, user_id: userId },
    }),

  /**
   * 写入世界观文件
   */
  write: (projectId: string, userId: string, content: string) =>
    apiClient.post('/api/worldview/write', {
      project_id: projectId,
      user_id: userId,
      content,
    }),
};