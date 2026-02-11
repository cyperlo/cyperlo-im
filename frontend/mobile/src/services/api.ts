import { API_CONFIG } from '../config';

const GATEWAY_URL = API_CONFIG.API_URL;
const AUTH_URL = `${API_CONFIG.AUTH_BASE}/auth`;

export const getWsUrl = () => API_CONFIG.WS_URL;

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
  getFriendConversations: async (token: string) => {
    return request(GATEWAY_URL, '/friends/conversations', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const groupAPI = {
  createGroup: async (name: string, members: string[], token: string) => {
    return request(GATEWAY_URL, '/groups', {
      method: 'POST',
      body: JSON.stringify({ name, members }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  getGroups: async (token: string) => {
    return request(GATEWAY_URL, '/groups', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const messageAPI = {
  send: async (to: string, content: string, token: string) => {
    return request(GATEWAY_URL, '/messages', {
      method: 'POST',
      body: JSON.stringify({ to, content, type: 'text' }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  sendGroupMessage: async (groupId: string, content: string, token: string) => {
    return request(GATEWAY_URL, `/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
