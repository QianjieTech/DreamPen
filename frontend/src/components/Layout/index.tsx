/**
 * 主布局组件
 */
import React from 'react';
import { Layout as AntLayout, Button } from 'antd';
import { ArrowLeftOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

const { Header, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  projectName?: string;
  onBack?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showBackButton = false, 
  projectName,
  onBack 
}) => {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AntLayout className="h-screen">
      <Header className="flex items-center justify-between bg-white border-b border-gray-200 px-6">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              className="flex items-center"
            >
              返回项目列表
            </Button>
          )}
          <h1 className="text-xl font-bold text-gray-800">
            DreamPen
            {projectName && <span className="text-sm font-normal text-gray-500 ml-3">/ {projectName}</span>}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-gray-600">欢迎, {user.username}</span>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              >
                退出登录
              </Button>
            </>
          )}
        </div>
      </Header>
      <Content className="overflow-hidden">{children}</Content>
    </AntLayout>
  );
};

export default Layout;