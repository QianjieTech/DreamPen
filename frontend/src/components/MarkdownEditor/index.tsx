/**
 * Markdown 编辑器组件
 * 使用简单的 TextArea 实现 (解决Monaco CDN加载问题)
 */
import React, { useEffect, useState } from 'react';
import { Button, Space, message, Input } from 'antd';
import { SaveOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const { TextArea } = Input;

interface MarkdownEditorProps {
  fileName?: string;
  content?: string;
  onChange?: (content: string) => void;
  onSave?: (content: string) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  fileName,
  content = '',
  onChange,
  onSave,
}) => {
  const [editorContent, setEditorContent] = useState(content);
  const [isModified, setIsModified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // 当传入的 content 改变时更新编辑器内容
  useEffect(() => {
    console.log('🔵 MarkdownEditor useEffect - content changed');
    console.log('  - fileName:', fileName);
    console.log('  - content length:', content?.length);
    setEditorContent(content);
    setIsModified(false);
  }, [content, fileName]);

  // 处理编辑器内容变化
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    console.log('🔵 handleEditorChange 被调用');
    console.log('  - newContent length:', newContent.length);
    console.log('  - original content length:', content?.length);
    console.log('  - isModified:', newContent !== content);
    
    setEditorContent(newContent);
    setIsModified(newContent !== content);
    onChange?.(newContent);
  };

  // 处理快捷键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  // 处理保存
  const handleSave = async () => {
    console.log('🔵 MarkdownEditor.handleSave 被调用');
    console.log('  - isModified:', isModified);
    console.log('  - editorContent length:', editorContent?.length);
    
    if (!isModified) {
      console.log('⚠️ 内容未修改，不执行保存');
      message.info('内容未修改');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔵 调用 onSave 回调...');
      await onSave?.(editorContent);
      setIsModified(false);
      console.log('✅ 保存完成');
      message.success('保存成功');
    } catch (error) {
      console.error('❌ 保存错误:', error);
      message.error('保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换预览模式
  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="text-sm font-medium text-gray-700">
          {fileName ? (
            <>
              {fileName}
              {isModified && <span className="ml-2 text-orange-500">● 未保存</span>}
            </>
          ) : (
            <span className="text-gray-400">未选择文件</span>
          )}
        </div>
        <Space>
          <Button
            icon={isPreview ? <EditOutlined /> : <EyeOutlined />}
            onClick={togglePreview}
            disabled={!fileName}
          >
            {isPreview ? '编辑' : '预览'}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isLoading}
            disabled={!isModified || !fileName}
          >
            保存 (Ctrl+S)
          </Button>
        </Space>
      </div>

      {/* 编辑器/预览区 */}
      <div className="flex-1 relative overflow-auto">
        {!fileName ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            请在左侧选择一个文件开始编辑
          </div>
        ) : isPreview ? (
          <div className="prose prose-slate max-w-none p-6 h-full overflow-auto">
            <ReactMarkdown>{editorContent}</ReactMarkdown>
          </div>
        ) : (
          <TextArea
            value={editorContent}
            onChange={handleEditorChange}
            onKeyDown={handleKeyDown}
            placeholder={`编辑 ${fileName}`}
            className="h-full w-full font-mono border-0 rounded-none resize-none"
            style={{
              fontSize: '14px',
              lineHeight: '1.8',
              padding: '16px',
              minHeight: '100%',
            }}
            autoSize={false}
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;