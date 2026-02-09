import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { loadConversations } from '../store/slices/messageSlice';
import { friendAPI, conversationAPI } from '../services/api';
import wsService from '../services/websocket';

export default function MainScreen({ navigation }: any) {
  const [friends, setFriends] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('messages');
  const { username, token, userId } = useSelector((state: RootState) => state.auth);
  const { conversations } = useSelector((state: RootState) => state.message);
  const dispatch = useDispatch();

  const conversationList = Object.values(conversations);

  useEffect(() => {
    if (token) {
      wsService.connect(token);
      loadFriends();
      loadHistory();
    }
    return () => wsService.disconnect();
  }, [token]);

  const loadFriends = async () => {
    try {
      const data = await friendAPI.getFriends(token!);
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await conversationAPI.getHistory(token!);
      if (data.conversations) {
        dispatch(loadConversations(data.conversations));
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const data = await friendAPI.searchUser(searchUsername, token!);
      setSearchResult(data);
    } catch (error: any) {
      Alert.alert('错误', error.response?.data?.error || '用户不存在');
    }
  };

  const handleAddFriend = async () => {
    try {
      await friendAPI.addFriend(searchResult.id, token!);
      Alert.alert('成功', '添加成功');
      setModalVisible(false);
      setSearchResult(null);
      loadFriends();
    } catch (error: any) {
      Alert.alert('错误', error.response?.data?.error || '添加失败');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigation.replace('Login');
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const renderContent = () => {
    if (activeTab === 'messages') {
      return (
        <FlatList
          data={conversationList}
          keyExtractor={(item) => item.username}
          renderItem={({ item }) => {
            const lastMsg = item.messages[item.messages.length - 1];
            return (
              <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => navigation.navigate('Chat', { username: item.username })}
              >
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.username) }]}>
                  <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                </View>
                <View style={styles.conversationInfo}>
                  <Text style={styles.conversationName}>{item.username}</Text>
                  <Text style={styles.conversationMessage} numberOfLines={1}>
                    {lastMsg?.content || '暂无消息'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>暂无会话</Text>
          }
        />
      );
    }

    if (activeTab === 'contacts') {
      return (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => navigation.navigate('Chat', { username: item.username })}
            >
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.username) }]}>
                <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
              </View>
              <View style={styles.conversationInfo}>
                <Text style={styles.conversationName}>{item.username}</Text>
                <Text style={styles.conversationMessage}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>暂无好友</Text>
          }
          ListHeaderComponent={
            <TouchableOpacity style={styles.addContactButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addContactText}>+ 添加好友</Text>
            </TouchableOpacity>
          }
        />
      );
    }

    if (activeTab === 'me') {
      return (
        <View style={styles.meContainer}>
          <View style={styles.meHeader}>
            <View style={[styles.meAvatar, { backgroundColor: getAvatarColor(username!) }]}>
              <Text style={styles.meAvatarText}>{username![0].toUpperCase()}</Text>
            </View>
            <Text style={styles.meUsername}>{username}</Text>
            <Text style={styles.mePhone}>+86 138****8888</Text>
          </View>

          <View style={styles.meSection}>
            <TouchableOpacity style={styles.meItem}>
              <Text style={styles.meItemIcon}>📱</Text>
              <Text style={styles.meItemText}>账号</Text>
              <Text style={styles.meItemArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.meItem}>
              <Text style={styles.meItemIcon}>🔔</Text>
              <Text style={styles.meItemText}>通知和声音</Text>
              <Text style={styles.meItemArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.meItem}>
              <Text style={styles.meItemIcon}>🔒</Text>
              <Text style={styles.meItemText}>隐私和安全</Text>
              <Text style={styles.meItemArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.meItem}>
              <Text style={styles.meItemIcon}>💾</Text>
              <Text style={styles.meItemText}>数据和存储</Text>
              <Text style={styles.meItemArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.meSection}>
            <TouchableOpacity style={styles.meItem}>
              <Text style={styles.meItemIcon}>❓</Text>
              <Text style={styles.meItemText}>帮助</Text>
              <Text style={styles.meItemArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.meItem}>
              <Text style={styles.meItemIcon}>💬</Text>
              <Text style={styles.meItemText}>Cyperlo FAQ</Text>
              <Text style={styles.meItemArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'messages' ? '消息' : activeTab === 'contacts' ? '联系人' : '我的'}
        </Text>
      </View>

      {renderContent()}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabIcon, activeTab === 'messages' && styles.tabIconActive]}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'messages' && styles.tabLabelActive]}>消息</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('contacts')}
        >
          <Text style={[styles.tabIcon, activeTab === 'contacts' && styles.tabIconActive]}>👥</Text>
          <Text style={[styles.tabLabel, activeTab === 'contacts' && styles.tabLabelActive]}>联系人</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('me')}
        >
          <Text style={[styles.tabIcon, activeTab === 'me' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'me' && styles.tabLabelActive]}>我的</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加好友</Text>
            <TextInput
              style={styles.input}
              placeholder="输入用户名"
              value={searchUsername}
              onChangeText={setSearchUsername}
            />
            <TouchableOpacity style={styles.button} onPress={handleSearch}>
              <Text style={styles.buttonText}>搜索</Text>
            </TouchableOpacity>

            {searchResult && (
              <View style={styles.searchResult}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(searchResult.username) }]}>
                  <Text style={styles.avatarText}>{searchResult.username[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.resultName}>{searchResult.username}</Text>
                  <Text style={styles.resultEmail}>{searchResult.email}</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={handleAddFriend}>
                  <Text style={styles.addBtnText}>添加</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  conversationMessage: {
    fontSize: 14,
    color: '#8e8e93',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8e8e93',
    marginTop: 50,
  },
  addContactButton: {
    backgroundColor: '#0088cc',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addContactText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  meContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  meHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  meAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  meAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '600',
  },
  meUsername: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  mePhone: {
    fontSize: 14,
    color: '#8e8e93',
  },
  meSection: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  meItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  meItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  meItemText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  meItemArrow: {
    fontSize: 20,
    color: '#c7c7cc',
  },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  logoutButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  tabLabelActive: {
    color: '#0088cc',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0088cc',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 15,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultEmail: {
    fontSize: 14,
    color: '#8e8e93',
  },
  addBtn: {
    backgroundColor: '#0088cc',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelText: {
    color: '#0088cc',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});
