import React, { useState, useEffect } from 'react';
import { Select, message } from 'antd';
import { listPrompts, type PromptInfo } from '../../api/prompts';
import './styles.css';

interface PromptSelectorProps {
  value?: string;
  onChange?: (value: string, promptName: string) => void;
  style?: React.CSSProperties;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({ value, onChange, style }) => {
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>(value || 'worldview_agent');

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    if (value && value !== selectedPrompt) {
      setSelectedPrompt(value);
    }
  }, [value]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await listPrompts();
      setPrompts(data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      message.error('加载提示词列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setSelectedPrompt(value);
    const selectedPromptInfo = prompts.find(p => p.name === value);
    if (onChange && selectedPromptInfo) {
      onChange(value, selectedPromptInfo.display_name);
    }
  };

  return (
    <div className="prompt-selector" style={style}>
      <Select
        value={selectedPrompt}
        onChange={handleChange}
        loading={loading}
        style={{ width: '100%', minWidth: 250 }}
        placeholder="选择Agent提示词"
        showSearch
        filterOption={(input, option) => {
          const label = option?.children as unknown;
          if (typeof label === 'string') {
            return label.toLowerCase().includes(input.toLowerCase());
          }
          return false;
        }}
      >
        {prompts.map((prompt) => (
          <Select.Option key={prompt.name} value={prompt.name}>
            {prompt.display_name}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};

export default PromptSelector;