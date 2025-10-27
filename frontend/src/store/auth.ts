/**
 * 认证状态管理 - Zustand Store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '../api/auth';

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokenResponse = await authApi.login({ username, password });
          const token = tokenResponse.access_token;
          
          // 同步保存到 localStorage,供 API client 使用
          localStorage.setItem('token', token);
          localStorage.setItem('username', username);
          
          // 获取用户信息
          const user = await authApi.getCurrentUser(token);
          
          set({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || '登录失败';
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register({ username, email, password });
          
          // 注册成功后自动登录
          await get().login(username, password);
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || '注册失败';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: () => {
        // 清除 localStorage 中的 token
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      loadUser: async () => {
        const { token } = get();
        if (!token) {
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.getCurrentUser(token);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token无效,清除认证状态
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // 当从持久化存储恢复时,也同步到 localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('token', state.token);
          if (state.user?.username) {
            localStorage.setItem('username', state.user.username);
          }
        }
      },
    }
  )
);