/**
 * 主页面组件
 */
import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import Layout from '../components/Layout';
import Workspace from '../components/Workspace';
import FileTree from '../components/FileTree';
import MarkdownEditor from '../components/MarkdownEditor';
import MultiChatPanel from '../components/MultiChatPanel';
import { useAppStore } from '../store';
import { projectAPI } from '../api/project';
import { worldviewAPI } from '../api/worldview';
import type { FileNode } from '../types/project';
import type { ChatMessage } from '../types/chat';

const Home: React.FC = () => {
  // 临时使用硬编码的项目ID和用户ID，实际应用中应该从路由或认证系统获取
  const [projectId] = useState('test-project');
  const [userId] = useState('test-user');

  // 从 Zustand store 获取状态和方法
  const fileTree = useAppStore((state) => state.fileTree);
  const selectedFile = useAppStore((state) => state.selectedFile);
  const fileContent = useAppStore((state) => state.fileContent);
  const setFileTree = useAppStore((state) => state.setFileTree);
  const openFile = useAppStore((state) => state.openFile);
  const setFileContent = useAppStore((state) => state.setFileContent);
  const saveFile = useAppStore((state) => state.saveFile);
  const addMessage = useAppStore((state) => state.addMessage);
  const setIsAiTyping = useAppStore((state) => state.setIsAiTyping);

  // 初始化：加载文件树
  useEffect(() => {
    const loadFileTree = async () => {
      try {
        // 从后端获取文件树
        const tree = await projectAPI.getFileTree(projectId, userId);
        setFileTree(tree);
        console.log('✅ 文件树加载成功，来自后端 API');
        message.success('项目加载成功');
      } catch (error) {
        console.error('❌ 加载文件树失败:', error);
        message.error('加载项目失败，请确保后端服务正常运行');
        setFileTree([]);
      }
    };

    loadFileTree();
  }, [projectId, userId, setFileTree]);

  // 处理文件选择
  const handleFileSelect = async (file: FileNode) => {
    try {
      // 尝试从后端加载文件内容
      const data = (await projectAPI.readFile(projectId, userId, file.path)) as any;
      openFile(file, data.content);
      console.log('文件加载成功:', file.name);
    } catch (error) {
      console.error('加载文件内容失败，使用模拟数据:', error);
      // 如果后端未启动或出错，使用模拟数据
      const mockContent = `# ${file.name}\n\n这是 ${file.name} 的内容。\n\n你可以在这里编辑 Markdown 文本。`;
      openFile(file, mockContent);
    }
  };

  // 处理内容变化（仅更新本地状态，不触发重新渲染）
  const handleContentChange = (content: string) => {
    // 不调用 setFileContent，避免触发编辑器的 useEffect
    // setFileContent(content);
  };

  // 处理保存
  const handleSave = async (content: string) => {
    console.log('🔵 handleSave 被调用');
    console.log('  - selectedFile:', selectedFile);
    console.log('  - content length:', content.length);
    
    if (!selectedFile) {
      message.error('没有选中的文件');
      return;
    }

    try {
      console.log('🔵 开始保存文件到后端...');
      console.log('  - projectId:', projectId);
      console.log('  - userId:', userId);
      console.log('  - filePath:', selectedFile.path);
      
      // 尝试保存到后端
      await projectAPI.writeFile(projectId, userId, selectedFile.path, content);
      console.log('✅ 后端保存成功');
      
      // 更新 store 中的内容
      setFileContent(content);
      await saveFile();
      console.log('✅ Store 更新成功');
      
      message.success('文件保存成功');
      console.log('✅ 文件已保存:', selectedFile.name);
    } catch (error) {
      console.error('❌ 保存失败:', error);
      message.error('保存文件失败');
      throw error;
    }
  };

  // 处理创建文件
  const handleFileCreate = async (filePath: string) => {
    try {
      await projectAPI.createFile(projectId, userId, filePath, '');
      // 重新加载文件树
      const tree = await projectAPI.getFileTree(projectId, userId);
      setFileTree(tree);
      message.success('文件创建成功');
    } catch (error) {
      console.error('创建文件失败:', error);
      throw error;
    }
  };

  // 处理创建文件夹
  const handleFolderCreate = async (folderPath: string) => {
    try {
      // 创建一个 .gitkeep 文件来保持文件夹
      await projectAPI.createFile(projectId, userId, `${folderPath}/.gitkeep`, '');
      // 重新加载文件树
      const tree = await projectAPI.getFileTree(projectId, userId);
      setFileTree(tree);
      message.success('文件夹创建成功');
    } catch (error) {
      console.error('创建文件夹失败:', error);
      throw error;
    }
  };

  // 处理删除文件
  const handleFileDelete = async (filePath: string) => {
    console.log('🔵 handleFileDelete 被调用');
    console.log('  - filePath:', filePath);
    console.log('  - projectId:', projectId);
    console.log('  - userId:', userId);
    
    try {
      console.log('🔵 调用后端删除 API...');
      await projectAPI.deleteFile(projectId, userId, filePath);
      console.log('✅ 后端删除成功');
      
      // 重新加载文件树
      console.log('🔵 重新加载文件树...');
      const tree = await projectAPI.getFileTree(projectId, userId);
      setFileTree(tree);
      console.log('✅ 文件树已更新, 文件数:', tree.length);
      
      message.success('文件删除成功');
    } catch (error) {
      console.error('❌ 删除文件失败:', error);
      message.error('删除文件失败');
      throw error;
    }
  };

  // 处理发送消息（流式版本）
  const handleSendMessage = async (messageText: string): Promise<string> => {
    try {
      // 从 store 获取当前对话历史
      const currentMessages = useAppStore.getState().messages;
      
      const MAX_HISTORY = 200;
      const recentMessages = currentMessages.slice(-MAX_HISTORY);
      
      // 构建对话历史（转换为后端需要的格式）
      const conversationHistory: ChatMessage[] = recentMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      
      console.log('🔵 发送对话请求（流式 + 打字机）');
      console.log('  - 消息内容:', messageText);
      console.log('  - 总消息数:', currentMessages.length);
      console.log('  - 发送历史消息数:', conversationHistory.length);
      
      let fullResponse = '';
      let documentContent = '';
      let fileOperation: any = null;
      let estimatedDocLength = 5000; // 估计文档长度
      
      // 先添加一个空的AI消息用于打字机效果
      const { addMessage, updateLastMessage, setDocumentGenerationProgress } = useAppStore.getState();
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      });
      
      // 使用流式API
      await worldviewAPI.chatStream(
        {
          message: messageText,
          conversation_history: conversationHistory,
        },
        // onChunk - 处理每个数据块
        (chunk) => {
          console.log('📦 收到数据块:', chunk);
          
          if (chunk.type === 'content') {
            // AI对话内容 - 打字机效果
            fullResponse += chunk.content;
            updateLastMessage(fullResponse);
            console.log('💬 内容片段:', chunk.content);
          } else if (chunk.type === 'status') {
            // 状态消息
            console.log('📊 状态:', chunk.message);
            message.info(chunk.message);
            setDocumentGenerationProgress(0, chunk.message);
          } else if (chunk.type === 'document') {
            // 文档生成内容 - 更新进度
            documentContent += chunk.content;
            const progress = Math.min(95, Math.floor((documentContent.length / estimatedDocLength) * 100));
            setDocumentGenerationProgress(progress, `生成中... (${documentContent.length} 字符)`);
            console.log('📄 文档进度:', progress + '%', documentContent.length, '字符');
          } else if (chunk.type === 'file_operation') {
            // 文件操作
            fileOperation = chunk.operation;
            setDocumentGenerationProgress(100, '文档生成完成');
            console.log('📁 文件操作:', fileOperation);
          }
        },
        // onComplete - 完成回调
        async () => {
          console.log('✅ 流式响应完成');
          console.log('  - 完整回复长度:', fullResponse.length);
          console.log('  - 文档内容长度:', documentContent.length);
          
          // 处理文件操作
          if (fileOperation) {
            try {
              console.log('🔵 执行文件写入:', fileOperation.path);
              await projectAPI.writeFile(projectId, userId, fileOperation.path, fileOperation.content);
              console.log('✅ 文件写入成功:', fileOperation.path);
              message.success(`文件已创建: ${fileOperation.path}`);
              
              // 重新加载文件树
              const tree = await projectAPI.getFileTree(projectId, userId);
              setFileTree(tree);
              
              // 重置进度
              setDocumentGenerationProgress(0, '');
            } catch (error) {
              console.error('❌ 文件写入失败:', error);
              message.error(`文件创建失败: ${fileOperation.path}`);
            }
          } else {
            // 如果没有文件操作，也重置进度
            setDocumentGenerationProgress(0, '');
          }
        },
        // onError - 错误回调
        (error) => {
          console.error('❌ 流式响应错误:', error);
          message.error('AI响应失败，请重试');
          throw error;
        }
      );
      
      // 返回完整响应
      if (fullResponse) {
        return fullResponse;
      }
      
      // 如果只有文档内容，返回提示信息
      if (documentContent) {
        return '世界观文档已生成完成！请查看左侧文件树中的 worldview.md 文件。';
      }
      
      console.warn('⚠️ 流式响应未返回任何内容');
      return '收到响应，但没有内容返回。';
    } catch (error: any) {
      console.error('❌ 发送消息失败:');
      console.error('  - 错误类型:', error?.constructor?.name);
      console.error('  - 错误消息:', error?.message);
      console.error('  - 状态码:', error?.response?.status);
      console.error('  - 响应数据:', error?.response?.data);
      console.error('  - 完整错误:', error);
      
      // 如果是超时错误
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        return '⏰ 请求超时。对话历史过长，AI处理时间较长。建议清空对话历史后重试。';
      }
      
      // 如果后端返回了错误信息
      if (error?.response?.data?.detail) {
        return `❌ 后端错误: ${error.response.data.detail}`;
      }
      
      // 如果后端未启动或出错，返回模拟回复
      return '❌ 这是一个模拟的 AI 回复。后端服务可能未启动或出现错误，请检查后端服务状态和控制台日志。';
    }
  };

  return (
    <Layout>
      <Workspace
        fileTree={
          <FileTree
            files={fileTree}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFolderCreate={handleFolderCreate}
            onFileDelete={handleFileDelete}
          />
        }
        editor={
          <MarkdownEditor
            fileName={selectedFile?.name}
            content={fileContent}
            onChange={handleContentChange}
            onSave={handleSave}
          />
        }
        chatPanel={
          <MultiChatPanel
            projectId={projectId}
            onSendMessage={async (sessionId: number, message: string, onStreamUpdate: (content: string) => void) => {
              // 调用流式 API,使用回调来更新UI
              try {
                const currentMessages = useAppStore.getState().messages;
                const MAX_HISTORY = 200;
                const recentMessages = currentMessages.slice(-MAX_HISTORY);
                
                const conversationHistory: ChatMessage[] = recentMessages.map(msg => ({
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                }));
                
                let fullResponse = '';
                
                // 使用流式API
                await worldviewAPI.chatStream(
                  {
                    message: message,
                    conversation_history: conversationHistory,
                  },
                  // onChunk - 处理每个数据块
                  (chunk) => {
                    if (chunk.type === 'content') {
                      // AI对话内容 - 打字机效果
                      fullResponse += chunk.content;
                      onStreamUpdate(fullResponse); // 调用回调更新UI
                    }
                  },
                  // onComplete
                  async () => {
                    console.log('✅ 流式响应完成');
                  },
                  // onError
                  (error) => {
                    console.error('❌ 流式响应错误:', error);
                    throw error;
                  }
                );
                
                return fullResponse;
              } catch (error: any) {
                console.error('❌ 发送消息失败:', error);
                return '❌ AI响应失败,请重试';
              }
            }}
          />
        }
      />
    </Layout>
  );
};

export default Home;