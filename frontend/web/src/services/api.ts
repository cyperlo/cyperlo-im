import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081/api/v1';
const GATEWAY_URL = 'http://localhost:8080/api/v1';

// 添加请求拦截器
axios.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
axios.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface RegisterData {
  username: string;
  password: string;
  email: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export const authAPI = {
  register: async (data: RegisterData) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, data);
    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, data);
    return response.data;
  },
};

export const friendAPI = {
  addFriend: async (friendId: string) => {
    const response = await axios.post(
      `${GATEWAY_URL}/friends`,
      { friend_id: friendId },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  getFriends: async () => {
    const response = await axios.get(`${GATEWAY_URL}/friends`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  searchUser: async (username: string) => {
    const response = await axios.get(`${GATEWAY_URL}/users/search`, {
      params: { username },
      headers: getAuthHeader(),
    });
    return response.data;
  },
};

export const conversationAPI = {
  getHistory: async () => {
    const response = await axios.get(`${GATEWAY_URL}/conversations`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};

export const groupAPI = {
  createGroup: async (name: string, members: string[]) => {
    const response = await axios.post(
      `${GATEWAY_URL}/groups`,
      { name, members },
      { headers: getAuthHeader() }
    );
    return response.data;
  },
  getGroups: async () => {
    const response = await axios.get(`${GATEWAY_URL}/groups`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};

export const messageAPI = {
  send: async (to: string, content: string) => {
    const response = await axios.post(
      `${GATEWAY_URL}/messages`,
      { to, content, type: 'text' },
      { headers: getAuthHeader() }
    );
    return response.data;
  },
  sendToGroup: async (conversationId: string, content: string) => {
    const response = await axios.post(
      `${GATEWAY_URL}/groups/${conversationId}/messages`,
      { content },
      { headers: getAuthHeader() }
    );
    return response.data;
  },
};
