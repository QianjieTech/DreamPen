/**
 * Axios HTTP 客户端配置
 */
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 2400000, // 增加到120秒，因为AI需要时间生成长文档
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证 token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data as any,
  (error) => {
    // 统一错误处理
    if (error.response) {
      const { status, data } = error.response;
      console.error(`API Error [${status}]:`, data);
      
      // 可以根据状态码做不同处理
      if (status === 401) {
        // 未授权，可能需要重新登录
        console.error('Unauthorized access');
      } else if (status === 404) {
        console.error('Resource not found');
      } else if (status === 500) {
        console.error('Server error');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;