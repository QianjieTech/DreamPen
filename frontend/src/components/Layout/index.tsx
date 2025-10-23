/**
 * 主布局组件
 */
import React from 'react';
import { Layout as AntLayout } from 'antd';

const { Header, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <AntLayout className="h-screen">
      <Header className="flex items-center justify-between bg-white border-b border-gray-200 px-6">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-800">DreamPen</h1>
        </div>
      </Header>
      <Content className="overflow-hidden">{children}</Content>
    </AntLayout>
  );
};

export default Layout;