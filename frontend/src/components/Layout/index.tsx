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
      <Header
        className="flex items-center justify-between px-6 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          height: '64px',
          lineHeight: '64px',
          padding: '0 24px',
        }}
      >
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              className="flex items-center hover:bg-purple-50 transition-all duration-200"
              style={{
                color: '#667eea',
                fontWeight: 500,
                height: '40px',
                borderRadius: '10px',
              }}
            >
              返回项目列表
            </Button>
          )}
          <h1
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '24px',
              letterSpacing: '-0.5px',
              margin: 0,
            }}
          >
            DreamPen
            {projectName && (
              <span
                className="text-sm font-normal ml-3"
                style={{
                  background: 'none',
                  WebkitTextFillColor: '#94a3b8',
                  fontSize: '14px',
                }}
              >
                / {projectName}
              </span>
            )}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <>
              <div
                className="px-3 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: '#667eea' }}
                >
                  👤 {user.username}
                </span>
              </div>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                className="hover:bg-red-50 transition-all duration-200"
                style={{
                  color: '#ef4444',
                  fontWeight: 500,
                  height: '40px',
                  borderRadius: '10px',
                }}
              >
                退出登录
              </Button>
            </>
          )}
        </div>
      </Header>
      <Content className="overflow-hidden" style={{ background: '#f8fafc' }}>
        {children}
      </Content>
    </AntLayout>
  );
};

export default Layout;