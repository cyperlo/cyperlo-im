import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  type: string;
  from: string;
  from_username?: string;
  to?: string;
  content: string;
  timestamp: number;
}

interface Conversation {
  userId?: string;
  username: string;
  conversationId?: string;
  isGroup?: boolean;
  messages: Message[];
}

interface MessageState {
  conversations: Record<string, Conversation>;
  activeConversation: string | null;
}

const initialState: MessageState = {
  conversations: {},
  activeConversation: null,
};

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const { from, to, from_username } = action.payload;
      const currentUserId = localStorage.getItem('userId');
      
      // 确定对方的 username
      let otherUsername: string;
      if (from === currentUserId) {
        // 我发送的消息，对方是 to
        otherUsername = to!;
      } else {
        // 我接收的消息，对方是发送者的 username
        otherUsername = from_username || from;
      }
      
      // 确保会话存在
      if (!state.conversations[otherUsername]) {
        state.conversations[otherUsername] = {
          userId: from === currentUserId ? to! : from,
          username: otherUsername,
          messages: [],
        };
      }
      
      // 检查消息是否已存在（避免重复）
      const exists = state.conversations[otherUsername].messages.some(
        msg => msg.timestamp === action.payload.timestamp && msg.content === action.payload.content
      );
      
      if (!exists) {
        state.conversations[otherUsername].messages.push(action.payload);
      }
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversation = action.payload;
      // 如果会话不存在，创建空会话
      if (action.payload && !state.conversations[action.payload]) {
        state.conversations[action.payload] = {
          userId: '',
          username: action.payload,
          messages: [],
        };
      }
    },
    clearMessages: (state) => {
      state.conversations = {};
      state.activeConversation = null;
    },
    loadConversations: (state, action: PayloadAction<any[]>) => {
      const currentUserId = localStorage.getItem('userId');
      console.log('Loading conversations:', action.payload);
      
      action.payload.forEach((conv) => {
        let username: string;
        let isGroup = false;
        let conversationId = conv.id;

        if (conv.type === 'group') {
          username = conv.name;
          isGroup = true;
        } else {
          if (!conv.other_user) {
            console.warn('Missing other_user for conversation:', conv);
            return;
          }
          username = conv.other_user.username;
        }

        const existingMessages = state.conversations[username]?.messages || [];
        const newMessages = (conv.messages || []).map((msg: any) => ({
          type: 'chat',
          from: msg.sender_id,
          from_username: msg.sender_username,
          to: isGroup ? conversationId : (msg.sender_id === currentUserId ? username : currentUserId),
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime() / 1000,
        }));
        
        const allMessages = [...existingMessages, ...newMessages];
        const uniqueMessages = allMessages.filter((msg, index, self) => 
          index === self.findIndex((m) => m.timestamp === msg.timestamp && m.content === msg.content)
        );
        
        state.conversations[username] = {
          userId: isGroup ? undefined : conv.other_user?.id,
          username: username,
          conversationId: conversationId,
          isGroup: isGroup,
          messages: uniqueMessages.sort((a, b) => a.timestamp - b.timestamp),
        };
      });
    },
  },
});

export const { addMessage, setActiveConversation, clearMessages, loadConversations } = messageSlice.actions;
export default messageSlice.reducer;
