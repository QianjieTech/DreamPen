/**
 * 世界观 Agent API
 */
import apiClient from './client';
import { useAuthStore } from '../store/auth';
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
    console.log('[chatStream] 开始执行');
    console.log('[chatStream] 请求数据:', data);
    
    try {
      // 获取认证token
      const token = useAuthStore.getState().token;
      console.log('[chatStream] Token存在:', !!token);
      
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.163:8000';
      const url = `${baseURL}/api/worldview/chat/stream`;
      console.log('[chatStream] 请求URL:', url);
      
      // 构建请求头，包含认证token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('[chatStream] 请求头:', headers);
      console.log('[chatStream] 即将发送fetch请求...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      
      console.log('[chatStream] 收到响应, status:', response.status);
      console.log('[chatStream] 响应headers:', Object.fromEntries(response.headers.entries()));
      console.log('[chatStream] response.ok:', response.ok);
      console.log('[chatStream] response.body存在:', !!response.body);
      console.log('[chatStream] response.bodyUsed:', response.bodyUsed);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[chatStream] 响应错误内容:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      console.log('[chatStream] 尝试获取reader...');
      const reader = response.body?.getReader();
      console.log('[chatStream] reader获取结果:', !!reader);
      
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      console.log('[chatStream] 开始读取流...');

      let buffer = ''; // 用于累积不完整的数据块

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[Stream] 流读取完成');
          break;
        }

        // 将新数据添加到缓冲区 - 使用 UTF-8 解码
        buffer += decoder.decode(value, { stream: true });
        
        // 按行分割缓冲区
        const lines = buffer.split('\n');
        
        // 保留最后一个不完整的行（如果有）
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6);
            
            try {
              const parsed = JSON.parse(dataStr);
              
              // 检查是否是完成信号
              if (parsed.type === 'done') {
                console.log('[Stream] 收到完成信号');
                onComplete();
                return; // 提前返回
              }
              
              // 调用回调处理数据块
              onChunk(parsed);
            } catch (e) {
              console.error('Failed to parse SSE data:', dataStr, e);
            }
          }
        }
      }
      
      // 如果没有收到done信号但读取完成了，也要调用onComplete
      console.log('[Stream] 流读取结束，调用onComplete');
      onComplete();
      
    } catch (error) {
      console.error('[Stream] 流式请求错误:', error);
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