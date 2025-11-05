import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface PromptInfo {
  name: string;
  filename: string;
  display_name: string;
  path: string;
}

export interface PromptContent {
  name: string;
  filename: string;
  content: string;
  size: number;
}

export interface PromptsListResponse {
  success: boolean;
  data: PromptInfo[];
  count: number;
}

export interface PromptContentResponse {
  success: boolean;
  data: PromptContent;
}

/**
 * 获取所有可用的提示词列表
 */
export const listPrompts = async (): Promise<PromptInfo[]> => {
  try {
    const response = await axios.get<PromptsListResponse>(
      `${API_BASE_URL}/api/prompts/list`
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to list prompts:', error);
    throw error;
  }
};

/**
 * 获取指定提示词的内容
 */
export const getPromptContent = async (promptName: string): Promise<PromptContent> => {
  try {
    const response = await axios.get<PromptContentResponse>(
      `${API_BASE_URL}/api/prompts/content/${promptName}`
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to get prompt content for ${promptName}:`, error);
    throw error;
  }
};