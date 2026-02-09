import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import wsService from '../services/websocket';

export default function ChatScreen({ route, navigation }: any) {
  const { username } = route.params;
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { conversations } = useSelector((state: RootState) => state.message);
  const { userId } = useSelector((state: RootState) => state.auth);

  const messages = conversations[username]?.messages || [];

  useEffect(() => {
    navigation.setOptions({ title: username });
  }, [username]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      wsService.send({
        type: 'chat',
        to: username,
        content: input,
      });
      setInput('');
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
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
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
