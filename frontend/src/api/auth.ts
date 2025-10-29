/**
 * 认证API客户端
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.163:8000';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

/**
 * 用户注册
 */
export const register = async (data: RegisterData): Promise<UserResponse> => {
  const response = await axios.post(`${API_BASE_URL}/api/auth/register`, data);
  return response.data;
};

/**
 * 用户登录
 */
export const login = async (data: LoginData): Promise<TokenResponse> => {
  const response = await axios.post(`${API_BASE_URL}/api/auth/login`, data);
  return response.data;
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (token: string): Promise<UserResponse> => {
  const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};