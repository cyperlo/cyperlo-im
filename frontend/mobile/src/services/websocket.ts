import { store } from '../store/store';
import { addMessage } from '../store/slices/messageSlice';
import Constants from 'expo-constants';
import { getWsUrl } from './api';

let WS_URL = Constants.expoConfig?.extra?.wsUrl || 'ws://192.168.10.182:8080/ws';

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
    WS_URL = getWsUrl();
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const state = store.getState();
      const currentUserId = state.auth.userId;
      
      if (currentUserId) {
        store.dispatch(addMessage({ message, currentUserId }));
      }
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
      this.ws.send(JSON.stringify(message));
      return true;
    }
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
