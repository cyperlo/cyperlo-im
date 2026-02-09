import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_CONFIG_KEY = '@server_config';

let API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.10.182:8080/api/v1';
let AUTH_BASE = Constants.expoConfig?.extra?.authUrl || 'http://192.168.10.182:8081/api/v1';
let WS_URL = 'ws://192.168.10.182:8080/ws';

// 加载服务器配置
export const loadServerConfig = async () => {
  try {
    const config = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
    if (config) {
      const parsed = JSON.parse(config);
      API_URL = parsed.apiUrl || API_URL;
      AUTH_BASE = parsed.authUrl || AUTH_BASE;
      WS_URL = parsed.wsUrl || WS_URL;
    }
  } catch (error) {
    console.error('加载服务器配置失败:', error);
  }
};

export const getWsUrl = () => WS_URL;

const GATEWAY_URL = API_URL;
const AUTH_URL = `${AUTH_BASE}/auth`;

const request = async (baseUrl: string, url: string, options: any = {}) => {
  try {
    await loadServerConfig();
    const finalBaseUrl = baseUrl.includes('auth') ? `${AUTH_BASE}/auth` : API_URL;
    console.log('Request:', `${finalBaseUrl}${url}`, options);
    const response = await fetch(`${finalBaseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.log('Error:', error);
      throw { response: { data: error } };
    }
    
    const data = await response.json();
    console.log('Success:', data);
    return data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

export const authAPI = {
  login: async (username: string, password: string) => {
    return request(AUTH_URL, '/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  register: async (username: string, email: string, password: string) => {
    return request(AUTH_URL, '/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },
};

export const friendAPI = {
  getFriends: async (token: string) => {
    return request(GATEWAY_URL, '/friends', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  searchUser: async (username: string, token: string) => {
    return request(GATEWAY_URL, `/users/search?username=${username}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  addFriend: async (friendId: string, token: string) => {
    return request(GATEWAY_URL, '/friends', {
      method: 'POST',
      body: JSON.stringify({ friend_id: friendId }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const conversationAPI = {
  getHistory: async (token: string) => {
    return request(GATEWAY_URL, '/conversations', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const messageAPI = {
  send: async (to: string, content: string, token: string) => {
    await loadServerConfig();
    return request(API_URL, '/messages', {
      method: 'POST',
      body: JSON.stringify({ to, content, type: 'text' }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
