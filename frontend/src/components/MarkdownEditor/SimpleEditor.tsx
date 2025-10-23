/**
 * 简化版Markdown编辑器 (临时替代Monaco)
 */
import React from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

interface SimpleEditorProps {
  value: string;
  onChange: (value: string) => void;
  fileName?: string;
}

const SimpleEditor: React.FC<SimpleEditorProps> = ({
  value,
  onChange,
  fileName,
}) => {
  return (
    <div className="h-full w-full">
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fileName ? `编辑 ${fileName}` : '开始编写...'}
        className="h-full w-full font-mono"
        style={{
          resize: 'none',
          fontSize: '14px',
          lineHeight: '1.6',
          padding: '16px',
          border: 'none',
          borderRadius: 0,
        }}
      />
    </div>
  );
};

export default SimpleEditor;