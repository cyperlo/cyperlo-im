import { store } from '../store/store';
import { addMessage, updateMessage } from '../store/slices/messageSlice';

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(url: string) {
    this.url = url;
  }

  connect(token: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(`${this.url}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received:', message);
        
        if (message.type === 'chat') {
          console.log('Dispatching chat message');
          store.dispatch(addMessage(message));
        } else if (message.type === 'group_message') {
          console.log('Dispatching group message');
          const groupMsg = {
            type: 'chat',
            from: message.from,
            from_username: message.from_username,
            to: message.group_name,
            content: message.content,
            timestamp: message.timestamp
          };
          console.log('Group message payload:', groupMsg);
          store.dispatch(addMessage(groupMsg));
          console.log('State after dispatch:', store.getState().message.conversations);
        } else if (message.type === 'message_recalled') {
          store.dispatch(updateMessage({
            conversationName: message.conversation_name || message.group_name,
            messageId: message.message_id,
            content: '[消息已撤回]'
          }));
        } else if (message.type === 'group_created') {
          console.log('Group created, reloading...');
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.handleReconnect(token);
    };
  }

  private handleReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => {
        this.connect(token);
      }, this.reconnectDelay);
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService('ws://localhost:8080/ws');
