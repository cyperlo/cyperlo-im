import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.10.182:8080/api/v1';
const AUTH_BASE = Constants.expoConfig?.extra?.authUrl || 'http://192.168.10.182:8081/api/v1';

const GATEWAY_URL = API_URL;
const AUTH_URL = `${AUTH_BASE}/auth`;

const request = async (baseUrl: string, url: string, options: any = {}) => {
  try {
    console.log('Request:', `${baseUrl}${url}`, options);
    const response = await fetch(`${baseUrl}${url}`, {
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
