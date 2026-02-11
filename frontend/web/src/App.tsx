import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Layout } from 'antd';
import { RootState } from './store/store';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import Login from './pages/Login';
import wsService from './services/websocket';
import { conversationAPI, groupAPI } from './services/api';
import { loadConversations } from './store/slices/messageSlice';
import './App.css';

const { Sider, Content } = Layout;

const App: React.FC = () => {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const { activeConversation, loaded } = useSelector((state: RootState) => state.message);
  const dispatch = useDispatch();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      wsService.connect(token);
      
      // 加载好友会话和群组
      Promise.all([
        conversationAPI.getFriendConversations(),
        groupAPI.getGroups()
      ]).then(([friendData, groupData]) => {
        const allConversations = [
          ...(friendData.conversations || []),
          ...(groupData.groups || [])
        ];
        dispatch(loadConversations(allConversations));
      }).catch((error) => {
        console.error('Failed to load conversations:', error);
      });
    }
    return () => {
      wsService.disconnect();
    };
  }, [isAuthenticated, token, dispatch]);

  if (!isAuthenticated) {
    return <Login />;
  }

  if (isMobile) {
    return (
      <Layout style={{ height: '100vh' }}>
        {!activeConversation ? (
          <div style={{ width: '100%', height: '100%' }}>
            <ConversationList />
          </div>
        ) : (
          <Content style={{ width: '100%', height: '100%' }}>
            <ChatWindow />
          </Content>
        )}
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={300} theme="light" className="desktop-sider">
        <ConversationList />
      </Sider>
      <Content>
        <ChatWindow />
      </Content>
    </Layout>
  );
};

export default App;
