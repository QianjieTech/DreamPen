/**
 * Zustand 状态管理
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode } from '../types/project';
import type { Message } from '../types/chat';

interface AppState {
  // 项目相关
  currentProjectId: string | null;
  fileTree: FileNode[];
  
  // 文件编辑相关
  selectedFile: FileNode | null;
  fileContent: string;
  isFileModified: boolean;
  
  // 聊天相关
  messages: Message[];
  isAiTyping: boolean;
  documentGenerationProgress: number; // 0-100
  documentGenerationStatus: string;
  
  // UI 状态
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  
  // Actions
  setCurrentProjectId: (id: string | null) => void;
  setFileTree: (tree: FileNode[]) => void;
  setSelectedFile: (file: FileNode | null) => void;
  setFileContent: (content: string) => void;
  setIsFileModified: (modified: boolean) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void; // 新增：更新最后一条消息（用于打字机效果）
  clearMessages: () => void;
  setIsAiTyping: (typing: boolean) => void;
  setDocumentGenerationProgress: (progress: number, status: string) => void; // 新增：设置文档生成进度
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  
  // 复合操作
  openFile: (file: FileNode, content: string) => void;
  saveFile: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentProjectId: null,
      fileTree: [],
      selectedFile: null,
      fileContent: '',
      isFileModified: false,
      messages: [],
      isAiTyping: false,
      documentGenerationProgress: 0,
      documentGenerationStatus: '',
      isLeftPanelCollapsed: false,
      isRightPanelCollapsed: false,
      
      // Actions
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      
      setFileTree: (tree) => set({ fileTree: tree }),
      
      setSelectedFile: (file) => set({ selectedFile: file }),
      
      setFileContent: (content) => {
        const { fileContent, selectedFile } = get();
        set({
          fileContent: content,
          isFileModified: selectedFile !== null && content !== fileContent,
        });
      },
      
      setIsFileModified: (modified) => set({ isFileModified: modified }),
      
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      
      updateLastMessage: (content) =>
        set((state) => {
          const messages = [...state.messages];
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content,
            };
          }
          return { messages };
        }),
      
      clearMessages: () => set({ messages: [] }),
      
      setIsAiTyping: (typing) => set({ isAiTyping: typing }),
      
      setDocumentGenerationProgress: (progress, status) =>
        set({
          documentGenerationProgress: progress,
          documentGenerationStatus: status,
        }),
      
      toggleLeftPanel: () =>
        set((state) => ({
          isLeftPanelCollapsed: !state.isLeftPanelCollapsed,
        })),
      
      toggleRightPanel: () =>
        set((state) => ({
          isRightPanelCollapsed: !state.isRightPanelCollapsed,
        })),
      
      // 复合操作
      openFile: (file, content) =>
        set({
          selectedFile: file,
          fileContent: content,
          isFileModified: false,
        }),
      
      saveFile: async () => {
        const { selectedFile, fileContent, isFileModified } = get();
        
        if (!selectedFile || !isFileModified) {
          return;
        }
        
        try {
          // TODO: 调用 API 保存文件
          console.log('保存文件:', selectedFile.path, fileContent);
          
          // 保存成功后更新状态
          set({ isFileModified: false });
        } catch (error) {
          console.error('保存文件失败:', error);
          throw error;
        }
      },
    }),
    {
      name: 'dreampen-storage',
      partialize: (state) => ({
        messages: state.messages,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);