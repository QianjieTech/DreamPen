/**
 * 文件操作相关类型定义
 */

export interface FileContent {
  content: string;
}

export interface WriteFileRequest {
  content: string;
}

export interface FileListResponse {
  files: string[];
}

export interface FileExistsResponse {
  exists: boolean;
}

export const FileType = {
  WORLDVIEW: 'worldview',
  CHARACTER: 'character',
  OUTLINE: 'outline',
  CHAPTER: 'chapter',
  STYLE_GUIDE: 'style_guide',
} as const;

export type FileType = typeof FileType[keyof typeof FileType];