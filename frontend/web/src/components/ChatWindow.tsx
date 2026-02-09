import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Avatar, Empty, Tooltip } from 'antd';
import { SendOutlined, SmileOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setActiveConversation } from '../store/slices/messageSlice';
import wsService from '../services/websocket';

const ChatWindow: React.FC = () => {
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeConversation, conversations } = useSelector((state: RootState) => state.message);
  const { userId } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const messages = activeConversation ? conversations[activeConversation]?.messages || [] : [];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && activeConversation) {
      wsService.send({
        type: 'chat',
        to: activeConversation,
        content: input,
      });
      setInput('');
    }
  };

  const handleBack = () => {
    dispatch(setActiveConversation(null));
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (!activeConversation) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        background: '#f5f5f5',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 40%, rgba(0, 136, 204, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(102, 126, 234, 0.06) 0%, transparent 50%)',
          zIndex: 0
        }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ 
            fontSize: isMobile ? '56px' : '72px', 
            marginBottom: isMobile ? '16px' : '24px',
            filter: 'drop-shadow(0 4px 12px rgba(0, 136, 204, 0.15))'
          }}>
            💬
          </div>
          <h2 style={{ 
            color: '#0088cc', 
            marginBottom: '12px', 
            fontSize: isMobile ? '22px' : '28px', 
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>
            Cyperlo IM
          </h2>
          <p style={{ 
            color: '#8e8e93', 
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: 400
          }}>
            选择一个会话开始聊天
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: '1px solid #e8e8e8',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        {isMobile && (
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            style={{ padding: '4px 8px' }}
          />
        )}
        <Avatar 
          size={40} 
          style={{ 
            background: getAvatarColor(activeConversation),
            fontSize: '16px',
            fontWeight: 600
          }}
        >
          {activeConversation[0].toUpperCase()}
        </Avatar>
        <div>
          <div style={{ fontWeight: 600, fontSize: '16px', color: '#000' }}>
            {activeConversation}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e93' }}>在线</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: isMobile ? '16px 12px' : '20px 24px',
        background: '#f5f5f5'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#8e8e93'
          }}>
            <Empty 
              description="暂无消息，开始聊天吧"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <List
            dataSource={messages}
            renderItem={(item, index) => {
              const isMe = item.from === userId;
              const showAvatar = index === 0 || messages[index - 1].from !== item.from;
              
              return (
                <List.Item style={{ 
                  border: 'none',
                  padding: '4px 0',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'flex-end',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    maxWidth: isMobile ? '85%' : '70%',
                    gap: '8px'
                  }}>
                    {showAvatar ? (
                      <Avatar 
                        size={isMobile ? 32 : 36}
                        style={{ 
                          background: isMe ? '#0088cc' : getAvatarColor(item.from),
                          fontSize: isMobile ? '12px' : '14px',
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        {item.from[0].toUpperCase()}
                      </Avatar>
                    ) : (
                      <div style={{ width: isMobile ? '32px' : '36px', flexShrink: 0 }} />
                    )}
                    <Tooltip 
                      title={new Date(item.timestamp * 1000).toLocaleString('zh-CN')}
                      placement={isMe ? 'left' : 'right'}
                    >
                      <div style={{ 
                        padding: isMobile ? '8px 14px' : '10px 16px',
                        background: isMe ? '#0088cc' : '#fff',
                        color: isMe ? '#fff' : '#000',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        wordBreak: 'break-word',
                        fontSize: isMobile ? '14px' : '15px',
                        lineHeight: '1.5',
                        maxWidth: '100%'
                      }}>
                        {item.content}
                      </div>
                    </Tooltip>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        padding: isMobile ? '12px' : '16px 24px',
        borderTop: '1px solid #e8e8e8',
        background: '#fff'
      }}>
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center' }}>
          {!isMobile && (
            <Button 
              type="text" 
              icon={<SmileOutlined style={{ fontSize: '20px', color: '#8e8e93' }} />}
              style={{ padding: '4px 8px' }}
            />
          )}
          <Input
            style={{ 
              flex: 1,
              borderRadius: '22px',
              height: isMobile ? '40px' : '44px',
              fontSize: isMobile ? '14px' : '15px',
              border: '1px solid #e8e8e8',
              background: '#f8f9fa'
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSend}
            placeholder="输入消息..."
          />
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? '#0088cc' : '#e8e8e8',
              border: 'none',
              borderRadius: '22px',
              height: isMobile ? '40px' : '44px',
              paddingLeft: isMobile ? '16px' : '24px',
              paddingRight: isMobile ? '16px' : '24px',
              fontWeight: 500,
              fontSize: isMobile ? '14px' : '15px'
            }}
          >
            {!isMobile && '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
