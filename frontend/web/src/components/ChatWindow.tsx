import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Avatar, Empty, Tooltip, message as antMessage, Modal, Popover, Dropdown } from 'antd';
import { SendOutlined, SmileOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setActiveConversation, updateMessage, addMessage } from '../store/slices/messageSlice';
import wsService from '../services/websocket';
import { messageAPI, groupAPI, friendAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

const ChatWindow: React.FC = () => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeConversation, conversations } = useSelector((state: RootState) => state.message);
  const { userId } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const messages = activeConversation ? conversations[activeConversation]?.messages || [] : [];
  const currentConv = activeConversation ? conversations[activeConversation] : null;

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'];

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

  const handleSend = async () => {
    if (input.trim() && activeConversation && !sending) {
      const content = input.trim();
      const currentConv = conversations[activeConversation];
      const timestamp = Date.now() / 1000;
      
      setInput('');
      setSending(true);

      // 立即添加消息到本地状态 - 群组消息不需要立即添加，等WebSocket推送
      if (!currentConv?.isGroup) {
        dispatch(addMessage({
          type: 'chat',
          from: userId!,
          to: activeConversation,
          content,
          timestamp,
        }));
      }

      try {
        if (currentConv?.isGroup) {
          await messageAPI.sendToGroup(currentConv.conversationId!, content);
        } else if (wsService.isConnected()) {
          wsService.send({
            type: 'chat',
            to: activeConversation,
            content,
          });
        } else {
          await messageAPI.send(activeConversation, content);
        }
      } catch (error) {
        antMessage.error('发送失败，请重试');
        setInput(content);
      } finally {
        setSending(false);
      }
    }
  };

  const handleBack = () => {
    dispatch(setActiveConversation(null));
  };

  const getAvatarColor = (name: string) => {
    if (!name || name.length === 0) return '#0088cc';
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
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => {
            if (currentConv?.isGroup) {
              setShowMembersModal(true);
            } else {
              setShowUserInfoModal(true);
            }
          }}
        >
          {activeConversation[0].toUpperCase()}
        </Avatar>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '16px', color: '#000' }}>
            {activeConversation}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e93' }}>
            {currentConv?.isGroup && currentConv.members ? `${currentConv.members.length}位成员` : '在线'}
          </div>
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
              
              const canRecall = isMe && item.id;
              
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
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'copy',
                            label: '复制',
                            onClick: () => {
                              navigator.clipboard.writeText(item.content);
                              antMessage.success('已复制');
                            }
                          },
                          {
                            key: 'forward',
                            label: '转发',
                            onClick: () => {
                              antMessage.info('转发功能开发中');
                            }
                          },
                          ...(isMe ? [{
                            key: 'recall',
                            label: '撤回',
                            danger: true,
                            onClick: async () => {
                              try {
                                await messageAPI.recall(item.id!);
                                dispatch(updateMessage({
                                  conversationName: activeConversation!,
                                  messageId: item.id!,
                                  content: '[消息已撤回]'
                                }));
                                antMessage.success('消息已撤回');
                              } catch (error: any) {
                                antMessage.error(error.response?.data?.error || '撤回失败');
                              }
                            }
                          }] : []),
                          {
                            type: 'divider'
                          },
                          {
                            key: 'delete',
                            label: '删除',
                            danger: true,
                            onClick: () => {
                              antMessage.info('删除功能开发中');
                            }
                          }
                        ]
                      }}
                      trigger={['contextMenu']}
                    >
                      <Tooltip 
                        title={new Date(item.timestamp * 1000).toLocaleString('zh-CN')}
                        placement={isMe ? 'left' : 'right'}
                      >
                        <div 
                          style={{ 
                            padding: isMobile ? '8px 14px' : '10px 16px',
                            background: isMe ? '#0088cc' : '#fff',
                            color: isMe ? '#fff' : '#000',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            wordBreak: 'break-word',
                            fontSize: isMobile ? '14px' : '15px',
                            lineHeight: '1.5',
                            maxWidth: '100%',
                            cursor: canRecall ? 'context-menu' : 'default',
                            whiteSpace: 'pre-wrap'
                          }}>
                        {/```|`[^`]+`/.test(item.content) ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              code: ({node, inline, className, children, ...props}: any) => {
                                return inline ? (
                                  <code style={{ 
                                    background: isMe ? 'rgba(255,255,255,0.25)' : '#f0f0f0',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.92em',
                                    fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                                  }} {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <pre style={{
                                    background: isMe ? 'rgba(0,0,0,0.15)' : '#f5f5f5',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    margin: '8px 0',
                                    border: isMe ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e8e8e8',
                                    whiteSpace: 'pre',
                                    wordWrap: 'normal'
                                  }}>
                                    <code className={className} style={{
                                      fontSize: '0.88em',
                                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                      lineHeight: '1.6',
                                      display: 'block'
                                    }} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                );
                              },
                              p: ({children}: any) => <div style={{ margin: '4px 0' }}>{children}</div>,
                              a: ({children, href}: any) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" style={{
                                  color: isMe ? '#fff' : '#0088cc',
                                  textDecoration: 'underline'
                                }}>
                                  {children}
                                </a>
                              ),
                              pre: ({children}: any) => <>{children}</>
                            }}
                          >
                            {item.content}
                          </ReactMarkdown>
                        ) : (
                          item.content
                        )}
                        </div>
                      </Tooltip>
                    </Dropdown>
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
            <Popover
              content={
                <div style={{ 
                  width: '320px', 
                  maxHeight: '240px', 
                  overflow: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '8px',
                  padding: '8px'
                }}>
                  {emojis.map((emoji, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setInput(input + emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={{
                        fontSize: '24px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              }
              trigger="click"
              open={showEmojiPicker}
              onOpenChange={setShowEmojiPicker}
              placement="topLeft"
            >
              <Button 
                type="text" 
                icon={<SmileOutlined style={{ fontSize: '20px', color: '#8e8e93' }} />}
                style={{ padding: '4px 8px' }}
              />
            </Popover>
          )}
          <Input.TextArea
            style={{ 
              flex: 1,
              borderRadius: '12px',
              minHeight: isMobile ? '40px' : '44px',
              maxHeight: '120px',
              fontSize: isMobile ? '14px' : '15px',
              border: '1px solid #e8e8e8',
              background: '#f8f9fa',
              resize: 'none',
              padding: '10px 16px'
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息... (Shift+Enter 换行)"
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSend}
            disabled={!input.trim() || sending}
            loading={sending}
            style={{
              background: (input.trim() && !sending) ? '#0088cc' : '#e8e8e8',
              border: 'none',
              borderRadius: '22px',
              height: isMobile ? '40px' : '44px',
              paddingLeft: isMobile ? '16px' : '24px',
              paddingRight: isMobile ? '16px' : '24px',
              fontWeight: 500,
              fontSize: isMobile ? '14px' : '15px'
            }}
          >
            {!isMobile && (sending ? '发送中...' : '发送')}
          </Button>
        </div>
      </div>

      {/* Members Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 600,
            padding: '8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {editingGroupName ? (
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onPressEnter={async () => {
                  try {
                    await groupAPI.updateGroupName(currentConv?.conversationId!, newGroupName);
                    antMessage.success('群组名称已更新');
                    setEditingGroupName(false);
                    window.location.reload();
                  } catch (error) {
                    antMessage.error('更新失败');
                  }
                }}
                autoFocus
                style={{ fontSize: '20px', fontWeight: 600 }}
              />
            ) : (
              <>
                <span>群组成员</span>
                <Button 
                  type="text" 
                  size="small"
                  onClick={() => {
                    setNewGroupName(activeConversation || '');
                    setEditingGroupName(true);
                  }}
                  style={{ fontSize: '12px', color: '#0088cc' }}
                >
                  修改名称
                </Button>
              </>
            )}
          </div>
        }
        open={showMembersModal}
        onCancel={() => {
          setShowMembersModal(false);
          setEditingGroupName(false);
        }}
        footer={
          <Button 
            danger 
            block 
            size="large"
            onClick={async () => {
              try {
                await groupAPI.leaveGroup(currentConv?.conversationId!);
                antMessage.success('已退出群组');
                setShowMembersModal(false);
                dispatch(setActiveConversation(null));
                window.location.reload();
              } catch (error) {
                antMessage.error('退出失败');
              }
            }}
            style={{
              borderRadius: '8px',
              height: '44px',
              fontWeight: 500
            }}
          >
            退出群组
          </Button>
        }
        width={460}
        styles={{
          body: { padding: '16px 24px' }
        }}
      >
        <div style={{ marginBottom: '16px', color: '#8e8e93', fontSize: '14px' }}>
          {currentConv?.members?.length || 0} 位成员
        </div>
        <List
          dataSource={currentConv?.members || []}
          renderItem={(member: any) => (
            <List.Item style={{ padding: '12px 0', border: 'none' }}>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    size={48}
                    style={{ background: getAvatarColor(member.username) }}
                  >
                    {member.username[0].toUpperCase()}
                  </Avatar>
                }
                title={
                  <div style={{ fontWeight: 500, fontSize: '15px' }}>
                    {member.username}
                  </div>
                }
                description={
                  <div style={{ fontSize: '13px', color: '#8e8e93' }}>
                    {member.email}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* User Info Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 600,
            padding: '8px 0'
          }}>
            用户信息
          </div>
        }
        open={showUserInfoModal}
        onCancel={() => setShowUserInfoModal(false)}
        footer={
          <Button 
            danger 
            block 
            size="large"
            onClick={async () => {
              try {
                await friendAPI.deleteFriend(currentConv?.userId!);
                antMessage.success('已删除好友');
                setShowUserInfoModal(false);
                dispatch(setActiveConversation(null));
                window.location.reload();
              } catch (error) {
                antMessage.error('删除失败');
              }
            }}
            style={{
              borderRadius: '8px',
              height: '44px',
              fontWeight: 500
            }}
          >
            删除好友
          </Button>
        }
        width={460}
        styles={{
          body: { padding: '24px' }
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Avatar 
            size={80}
            style={{ 
              background: getAvatarColor(activeConversation || ''),
              marginBottom: '16px'
            }}
          >
            {activeConversation?.[0].toUpperCase()}
          </Avatar>
          <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            {activeConversation}
          </div>
          <div style={{ fontSize: '14px', color: '#8e8e93' }}>
            {currentConv?.userId}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatWindow;
