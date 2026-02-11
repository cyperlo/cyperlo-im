import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id?: string;
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
  members?: any[];
  messages: Message[];
}

interface MessageState {
  conversations: Record<string, Conversation>;
  activeConversation: string | null;
  loaded: boolean;
}

const initialState: MessageState = {
  conversations: {},
  activeConversation: null,
  loaded: false,
};

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const { from, to, from_username, type } = action.payload;
      const currentUserId = localStorage.getItem('userId');
      
      console.log('addMessage reducer:', { from, to, from_username, type, currentUserId });
      
      // 确定对方的 username
      let otherUsername: string;
      
      // 检查是否为群组消息：to 存在且在 conversations 中已标记为群组
      const isGroupMessage = to && state.conversations[to]?.isGroup;
      
      if (isGroupMessage) {
        // 群组消息，使用 to 作为群组名
        otherUsername = to!;
        console.log('Group message, otherUsername:', otherUsername);
      } else if (from === currentUserId) {
        // 我发送的消息，对方是 to
        otherUsername = to!;
        console.log('Sent message, otherUsername:', otherUsername);
      } else {
        // 我接收的消息，对方是发送者的 username
        otherUsername = from_username || from;
        console.log('Received message, otherUsername:', otherUsername);
      }
      
      // 确保会话存在
      if (!state.conversations[otherUsername]) {
        console.log('Creating new conversation:', otherUsername);
        state.conversations[otherUsername] = {
          userId: from === currentUserId ? to! : from,
          username: otherUsername,
          messages: [],
        };
      }
      
      // 检查消息是否已存在（避免重复）
      const exists = state.conversations[otherUsername].messages.some(
        msg => {
          if (action.payload.id && msg.id) {
            return msg.id === action.payload.id;
          }
          return Math.abs(msg.timestamp - action.payload.timestamp) < 1 && 
                 msg.content === action.payload.content &&
                 msg.from === action.payload.from;
        }
      );
      
      if (!exists) {
        console.log('Adding message to conversation:', otherUsername);
        state.conversations[otherUsername].messages.push(action.payload);
      } else {
        console.log('Message already exists, skipping');
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
      state.loaded = false;
    },
    updateMessage: (state, action: PayloadAction<{ conversationName: string; messageId: string; content: string }>) => {
      const { conversationName, messageId, content } = action.payload;
      if (state.conversations[conversationName]) {
        const msgIndex = state.conversations[conversationName].messages.findIndex(m => m.id === messageId);
        if (msgIndex !== -1) {
          state.conversations[conversationName].messages[msgIndex].content = content;
        }
      }
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
          console.log('Loading group:', username, conv);
        } else {
          if (!conv.other_user) {
            console.warn('Missing other_user for conversation:', conv);
            return;
          }
          username = conv.other_user.username;
        }

        const existingMessages = state.conversations[username]?.messages || [];
        const newMessages = (conv.messages || []).map((msg: any) => ({
          id: msg.id,
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
          members: conv.members || [],
          messages: uniqueMessages.sort((a, b) => a.timestamp - b.timestamp),
        };
        
        console.log('Conversation added:', username, 'isGroup:', isGroup);
      });
      
      state.loaded = true;
      console.log('Total conversations:', Object.keys(state.conversations).length);
    },
  },
});

export const { addMessage, setActiveConversation, clearMessages, loadConversations, updateMessage } = messageSlice.actions;
export default messageSlice.reducer;
