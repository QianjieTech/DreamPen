import { App as AntApp } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProjectList from './pages/ProjectList';
import { useAuthStore } from './store/auth';

// 私有路由组件 - 需要登录才能访问
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const { loadUser } = useAuthStore();

  // 应用启动时加载用户信息
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <AntApp>
      <BrowserRouter>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* 受保护的路由 - 需要登录 */}
          {/* 项目列表页 - 登录后的首页 */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ProjectList />
              </PrivateRoute>
            }
          />
          
          {/* 项目创作界面 */}
          <Route
            path="/project/:projectId"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          
          {/* 404重定向 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}

export default App;
