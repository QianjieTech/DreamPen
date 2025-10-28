/**
 * 工作区三栏布局组件
 */
import React, { useState } from 'react';
import { Layout } from 'antd';

const { Sider, Content } = Layout;

interface WorkspaceProps {
  fileTree: React.ReactNode;
  editor: React.ReactNode;
  chatPanel: React.ReactNode;
}

const Workspace: React.FC<WorkspaceProps> = ({ fileTree, editor, chatPanel }) => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  return (
    <Layout className="h-full">
      {/* 左侧文件树 */}
      <Sider
        collapsible
        collapsed={leftCollapsed}
        onCollapse={setLeftCollapsed}
        width={280}
        className="bg-gray-50 border-r border-gray-200"
        theme="light"
      >
        <div className="h-full overflow-auto">{fileTree}</div>
      </Sider>

      {/* 中间编辑器 */}
      <Content className="flex flex-col bg-white">
        {editor}
      </Content>

      {/* 右侧 AI 对话面板 - 固定宽度,不可折叠 */}
      <Sider
        width={400}
        className="bg-white border-l border-gray-200"
        theme="light"
      >
        <div className="h-full overflow-hidden">{chatPanel}</div>
      </Sider>
    </Layout>
  );
};

export default Workspace;