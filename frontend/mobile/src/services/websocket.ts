import { store } from '../store/store';
import { addMessage, addConversation } from '../store/slices/messageSlice';
import { getWsUrl } from './api';

class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string = '';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isManualClose = false;

  connect(token: string) {
    this.token = token;
    this.isManualClose = false;
    const WS_URL = getWsUrl();
    
    console.log('Connecting to WebSocket:', WS_URL);
    
    // 强制关闭旧连接
    if (this.ws) {
      console.log('Closing existing WebSocket connection');
      this.ws.close();
      this.ws = null;
    }

    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('=== WebSocket onmessage START ===');
      console.log('WebSocket received:', JSON.stringify(message, null, 2));
      console.log('Message type:', message.type);
      console.log('=== WebSocket onmessage END ===');
      
      const state = store.getState();
      const currentUserId = state.auth.userId;
      
      if (!currentUserId) {
        console.log('No currentUserId, ignoring message');
        return;
      }

      // 处理群组创建通知
      if (message.type === 'group_created') {
        console.log('Group created notification:', message);
        store.dispatch(addConversation({
          id: message.conversation_id,
          name: message.group_name,
          messages: [],
        }));
        return;
      }

      // 处理群组消息
      if (message.type === 'group_message') {
        console.log('Processing group message:', message);
        const groupMessage = {
          type: 'group_message',
          from: message.from,
          from_username: message.from_username,
          to: message.group_name,
          content: message.content,
          timestamp: message.timestamp,
        };
        console.log('Dispatching group message:', groupMessage);
        store.dispatch(addMessage({ 
          message: groupMessage, 
          currentUserId 
        }));
        return;
      }

      // 处理普通消息
      console.log('Processing chat message:', message);
      store.dispatch(addMessage({ message, currentUserId }));
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (!this.isManualClose) {
        this.attemptReconnect();
      }
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, this.reconnectDelay);
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.log('WebSocket not connected');
    return false;
  }

  disconnect() {
    this.isManualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();
