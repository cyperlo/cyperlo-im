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
  userId: string;
  username: string;
  messages: Message[];
}

interface MessageState {
  conversations: Record<string, Conversation>;
}

const initialState: MessageState = {
  conversations: {},
};

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ message: Message; currentUserId: string }>) => {
      const { message, currentUserId } = action.payload;
      const { from, to, from_username, content, timestamp, type } = message;
      
      console.log('addMessage called:', { message, currentUserId });
      
      // 确定对方的 username
      let otherUsername: string;
      if (type === 'group_message') {
        // 群组消息使用 group_name
        otherUsername = to!;
        console.log('Group message, otherUsername:', otherUsername);
      } else if (from === currentUserId) {
        otherUsername = to!;
        console.log('Sent message, otherUsername:', otherUsername);
      } else {
        otherUsername = from_username || from;
        console.log('Received message, otherUsername:', otherUsername);
      }
      
      if (!state.conversations[otherUsername]) {
        console.log('Creating new conversation for:', otherUsername);
        state.conversations[otherUsername] = {
          userId: from === currentUserId ? to! : from,
          username: otherUsername,
          messages: [],
        };
      }
      
      // 去重：检查是否已存在相同时间戳和内容的消息
      const exists = state.conversations[otherUsername].messages.some(
        msg => msg.timestamp === timestamp && msg.content === content
      );
      
      if (!exists) {
        console.log('Adding message to conversation:', otherUsername);
        state.conversations[otherUsername].messages.push(message);
      } else {
        console.log('Message already exists, skipping');
      }
    },
    addConversation: (state, action: PayloadAction<any>) => {
      const conv = action.payload;
      const username = conv.other_user?.username || conv.name;
      const userId = conv.other_user?.id || conv.id;
      
      if (!state.conversations[username]) {
        state.conversations[username] = {
          userId: userId,
          username: username,
          messages: conv.messages?.map((msg: any) => ({
            type: msg.type || 'chat',
            from: msg.sender_id || msg.from,
            from_username: msg.sender_username || msg.from_username,
            content: msg.content,
            timestamp: msg.timestamp || new Date(msg.created_at).getTime() / 1000,
          })) || [],
        };
      }
    },
    loadConversations: (state, action: PayloadAction<any[]>) => {
      action.payload.forEach((conv) => {
        const username = conv.other_user.username;
        state.conversations[username] = {
          userId: conv.other_user.id,
          username: username,
          messages: conv.messages.map((msg: any) => ({
            type: 'chat',
            from: msg.sender_id,
            from_username: msg.sender_username,
            content: msg.content,
            timestamp: new Date(msg.created_at).getTime() / 1000,
          })),
        };
      });
    },
    clearMessages: (state) => {
      state.conversations = {};
    },
  },
});

export const { addMessage, addConversation, loadConversations, clearMessages } = messageSlice.actions;
export default messageSlice.reducer;
