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

  // 计算字数统计
  const wordCount = editorContent.length;
  const lineCount = editorContent.split('\n').length;
  const wordCountChinese = editorContent.replace(/[^\u4e00-\u9fa5]/g, '').length;
  const wordCountEnglish = editorContent.match(/[a-zA-Z]+/g)?.length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)',
        }}
      >
        <div className="text-sm font-medium text-gray-700 flex items-center gap-3">
          {fileName ? (
            <>
              <span style={{ color: '#1e293b' }}>{fileName}</span>
              {isModified && (
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
                    color: '#f97316',
                    border: '1px solid rgba(251, 146, 60, 0.2)',
                  }}
                >
                  ● 未保存
                </span>
              )}
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  color: '#667eea',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                }}
              >
                {wordCount} 字符 | {lineCount} 行 | {wordCountChinese} 中文 | {wordCountEnglish} 英文词
              </span>
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
            style={{
              borderRadius: '8px',
              fontWeight: 500,
            }}
          >
            {isPreview ? '编辑' : '预览'}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isLoading}
            disabled={!isModified || !fileName}
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            }}
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
          <div
            className="prose prose-slate max-w-none h-full overflow-auto"
            style={{
              padding: '32px 48px 32px 48px',
            }}
          >
            <style>{`
              .prose p {
                margin-top: 1.5em;
                margin-bottom: 1.5em;
                line-height: 2;
              }
              .prose h1 {
                margin-top: 2em;
                margin-bottom: 1em;
              }
              .prose h2 {
                margin-top: 1.75em;
                margin-bottom: 0.875em;
              }
              .prose h3 {
                margin-top: 1.5em;
                margin-bottom: 0.75em;
              }
              .prose ul, .prose ol {
                margin-top: 1.5em;
                margin-bottom: 1.5em;
              }
              .prose li {
                margin-top: 0.5em;
                margin-bottom: 0.5em;
              }
              .prose blockquote {
                margin-top: 1.5em;
                margin-bottom: 1.5em;
                padding-left: 1em;
                border-left: 3px solid #667eea;
              }
              .prose code {
                background: rgba(102, 126, 234, 0.1);
                padding: 0.2em 0.4em;
                border-radius: 4px;
                font-size: 0.9em;
              }
              .prose pre {
                margin-top: 1.5em;
                margin-bottom: 1.5em;
                background: #f8fafc;
                border: 1px solid rgba(102, 126, 234, 0.1);
                border-radius: 8px;
              }
            `}</style>
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
              lineHeight: '2',
              padding: '32px 48px 32px 48px',
              minHeight: '100%',
              background: '#fafafa',
            }}
            autoSize={false}
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;