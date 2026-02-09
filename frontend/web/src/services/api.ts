import axios from 'axios';

const API_BASE_URL = 'http://localhost:8081/api/v1';
const GATEWAY_URL = 'http://localhost:8080/api/v1';

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
