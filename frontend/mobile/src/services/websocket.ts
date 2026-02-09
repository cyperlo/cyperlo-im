import { store } from '../store/store';
import { addMessage } from '../store/slices/messageSlice';

// 修改为你的电脑局域网 IP
const WS_URL = 'ws://192.168.10.182:8080/ws';

class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string = '';

  connect(token: string) {
    this.token = token;
    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
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
    };
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default new WebSocketService();
