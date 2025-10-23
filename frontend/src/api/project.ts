/**
 * 项目管理 API
 */
import apiClient from './client';
import type { CreateProjectRequest, CreateProjectResponse, FileNode } from '../types/project';

export const projectAPI = {
  /**
   * 创建新项目
   */
  createProject: (data: CreateProjectRequest) =>
    apiClient.post<CreateProjectResponse>('/api/projects/', data),

  /**
   * 获取项目章节列表
   */
  getChapters: (projectId: string, userId: string) =>
    apiClient.get<{ chapters: string[] }>(`/api/projects/${projectId}/chapters`, {
      params: { user_id: userId },
    }),

  /**
   * 检查项目是否存在
   */
  checkExists: (projectId: string, userId: string) =>
    apiClient.get<{ exists: boolean }>(`/api/projects/${projectId}/exists`, {
      params: { user_id: userId },
    }),

  /**
   * 获取项目文件树
   */
  getFileTree: (projectId: string, userId: string): Promise<FileNode[]> =>
    apiClient.get(`/api/projects/${projectId}/files`, {
      params: { user_id: userId },
    }),

  /**
   * 读取文件内容
   */
  readFile: (projectId: string, userId: string, filePath: string) =>
    apiClient.get<{ content: string }>(`/api/projects/${projectId}/files/${filePath}`, {
      params: { user_id: userId },
    }),

  /**
   * 写入文件内容
   */
  writeFile: (projectId: string, userId: string, filePath: string, content: string) =>
    apiClient.post(`/api/projects/${projectId}/files/${filePath}`, {
      content,
      user_id: userId,
    }),

  /**
   * 删除文件
   */
  deleteFile: (projectId: string, userId: string, filePath: string) =>
    apiClient.delete(`/api/projects/${projectId}/files/${filePath}`, {
      params: { user_id: userId },
    }),

  /**
   * 创建新文件
   */
  createFile: (projectId: string, userId: string, filePath: string, content: string = '') =>
    apiClient.post(`/api/projects/${projectId}/files/create`, {
      file_path: filePath,
      content,
      user_id: userId,
    }),
};