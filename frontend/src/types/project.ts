/**
 * 项目相关类型定义
 */

export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

export interface CreateProjectRequest {
  name: string;
  userId: string;
}

export interface CreateProjectResponse {
  project_id: string;
  message: string;
}