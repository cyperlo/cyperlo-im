import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import wsService from '../services/websocket';
import { messageAPI } from '../services/api';

export default function ChatScreen({ route, navigation }: any) {
  const { username } = route.params;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { conversations } = useSelector((state: RootState) => state.message);
  const { userId, token } = useSelector((state: RootState) => state.auth);

  const messages = conversations[username]?.messages || [];

  useEffect(() => {
    navigation.setOptions({ title: username });
  }, [username]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() && !sending) {
      const content = input.trim();
      setInput('');
      setSending(true);

      try {
        const conversationId = conversations[username]?.userId;
        
        // 判断是否为群组（群组的userId就是conversationId）
        const isGroup = conversationId && conversationId.length > 20; // UUID长度判断
        
        console.log('Sending message:', { username, conversationId, isGroup, wsConnected: wsService.isConnected() });
        
        if (wsService.isConnected()) {
          const sent = wsService.send({
            type: isGroup ? 'group_message' : 'chat',
            to: username,
            content,
          });
          console.log('WebSocket send result:', sent);
        } else {
          console.log('WebSocket not connected, using HTTP API');
          if (isGroup) {
            await messageAPI.sendGroupMessage(conversationId, content, token);
          } else {
            await messageAPI.send(username, content, token);
          }
        }
      } catch (error) {
        console.error('Send error:', error);
        Alert.alert('发送失败', '消息发送失败，请重试');
        setInput(content);
      } finally {
        setSending(false);
      }
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={[styles.smallAvatar, { backgroundColor: getAvatarColor(username) }]}>
            <Text style={styles.smallAvatarText}>{username[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{username}</Text>
            <Text style={styles.headerSubtitle}>在线</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        contentContainerStyle={styles.messageList}
        renderItem={({ item, index }) => {
          const isMe = item.from === userId;
          const showAvatar = index === 0 || messages[index - 1].from !== item.from;

          return (
            <View style={[styles.messageRow, isMe && styles.messageRowRight]}>
              {!isMe && showAvatar && (
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.from) }]}>
                  <Text style={styles.avatarText}>{item.from[0].toUpperCase()}</Text>
                </View>
              )}
              {!isMe && !showAvatar && <View style={styles.avatarPlaceholder} />}
              
              <View style={[
                styles.messageBubble,
                isMe ? styles.myMessage : styles.otherMessage
              ]}>
                <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                  {item.content}
                </Text>
              </View>

              {isMe && showAvatar && (
                <View style={[styles.avatar, { backgroundColor: '#0088cc' }]}>
                  <Text style={styles.avatarText}>{item.from[0].toUpperCase()}</Text>
                </View>
              )}
              {isMe && !showAvatar && <View style={styles.avatarPlaceholder} />}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>暂无消息，开始聊天吧</Text>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="输入消息..."
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendButtonText}>{sending ? '发送中...' : '发送'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      android: {
        paddingBottom: 0,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  backButton: {
    fontSize: 16,
    color: '#0088cc',
    marginRight: 15,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  smallAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8e8e93',
  },
  messageList: {
    padding: 15,
    ...Platform.select({
      android: {
        paddingBottom: 80,
      },
    }),
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  messageRowRight: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarPlaceholder: {
    width: 36,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  myMessage: {
    backgroundColor: '#0088cc',
  },
  otherMessage: {
    backgroundColor: 'white',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8e8e93',
    marginTop: 50,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    ...Platform.select({
      android: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      },
    }),
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0088cc',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e8e8e8',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
