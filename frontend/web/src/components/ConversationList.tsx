import React, { useState, useEffect } from 'react';
import { List, Avatar, Button, Modal, Form, message, Empty, Input, Badge, Tabs } from 'antd';
import { PlusOutlined, LogoutOutlined, SearchOutlined, UserOutlined, MessageOutlined, TeamOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setActiveConversation } from '../store/slices/messageSlice';
import { logout } from '../store/slices/authSlice';
import { friendAPI, groupAPI } from '../services/api';
import './ConversationList.css';

const ConversationList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const dispatch = useDispatch();
  const { conversations, activeConversation } = useSelector((state: RootState) => state.message);
  const { username } = useSelector((state: RootState) => state.auth);

  const conversationList = Object.values(conversations);

  useEffect(() => {
    loadFriends();
    loadGroups();
  }, []);

  const loadFriends = async () => {
    try {
      const data = await friendAPI.getFriends();
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await groupAPI.getGroups();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleCreateGroup = async (values: any) => {
    if (selectedMembers.length === 0) {
      message.error('请至少选择一个成员');
      return;
    }
    try {
      await groupAPI.createGroup(values.groupName, selectedMembers);
      message.success('创建群组成功');
      setIsGroupModalOpen(false);
      setSelectedMembers([]);
      loadGroups();
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleSearch = async (values: any) => {
    setSearchLoading(true);
    try {
      const data = await friendAPI.searchUser(values.username);
      setSearchResult(data);
    } catch (error: any) {
      message.error(error.response?.data?.error || '用户不存在');
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;
    try {
      await friendAPI.addFriend(searchResult.id);
      message.success('添加成功');
      setIsModalOpen(false);
      setSearchResult(null);
      loadFriends();
      // 自动开始会话并创建空会话
      const newConversation = {
        userId: searchResult.id,
        username: searchResult.username,
        messages: [],
      };
      // 手动添加到 Redux store
      dispatch(setActiveConversation(searchResult.username));
      setActiveTab('conversations');
    } catch (error: any) {
      message.error(error.response?.data?.error || '添加失败');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    message.success('已退出登录');
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 16px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar size={40} style={{ background: '#0088cc' }}>
              <UserOutlined />
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px', color: '#000' }}>{username}</div>
              <div style={{ fontSize: '12px', color: '#8e8e93' }}>在线</div>
            </div>
          </div>
          <Button 
            icon={<LogoutOutlined />} 
            onClick={handleLogout} 
            type="text"
            style={{ color: '#8e8e93' }}
          />
        </div>
        <Button 
          icon={<PlusOutlined />} 
          onClick={() => setIsModalOpen(true)} 
          block
          type="primary"
          size="large"
          style={{ 
            background: '#0088cc',
            border: 'none',
            borderRadius: '10px',
            height: '44px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0, 136, 204, 0.2)',
            marginBottom: '8px'
          }}
        >
          添加好友
        </Button>
        <Button 
          icon={<TeamOutlined />} 
          onClick={() => setIsGroupModalOpen(true)} 
          block
          size="large"
          style={{ 
            background: '#fff',
            border: '1px solid #0088cc',
            color: '#0088cc',
            borderRadius: '10px',
            height: '44px',
            fontWeight: 500
          }}
        >
          创建群组
        </Button>
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'conversations',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageOutlined />
                  会话
                </span>
              ),
              children: conversationList.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  padding: '40px 20px'
                }}>
                  <Empty 
                    description={
                      <span style={{ color: '#8e8e93' }}>
                        暂无会话<br/>
                        <span style={{ fontSize: '12px' }}>添加好友开始聊天</span>
                      </span>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ) : (
                <List
                  dataSource={conversationList}
                  renderItem={(item) => {
                    const lastMsg = item.messages[item.messages.length - 1];
                    return (
                      <List.Item
                        onClick={() => {
                          dispatch(setActiveConversation(item.username));
                          setActiveTab('conversations');
                        }}
                        style={{
                          cursor: 'pointer',
                          background: activeConversation === item.username ? '#f0f8ff' : 'transparent',
                          padding: '16px',
                          borderBottom: '1px solid #f5f5f5',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (activeConversation !== item.username) {
                            e.currentTarget.style.background = '#fafafa';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeConversation !== item.username) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge dot status="success">
                              <Avatar 
                                size={48} 
                                style={{ 
                                  background: getAvatarColor(item.username),
                                  fontSize: '18px',
                                  fontWeight: 600
                                }}
                              >
                                {item.username[0].toUpperCase()}
                              </Avatar>
                            </Badge>
                          }
                          title={
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ 
                                fontWeight: 600,
                                fontSize: '15px',
                                color: '#000'
                              }}>
                                {item.username}
                              </span>
                              {lastMsg && (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#8e8e93'
                                }}>
                                  {new Date(lastMsg.timestamp * 1000).toLocaleTimeString('zh-CN', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              )}
                            </div>
                          }
                          description={
                            <div style={{ 
                              color: '#8e8e93',
                              fontSize: '14px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '4px'
                            }}>
                              {lastMsg?.content || '暂无消息'}
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ),
            },
            {
              key: 'friends',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TeamOutlined />
                  好友
                </span>
              ),
              children: friends.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  padding: '40px 20px'
                }}>
                  <Empty 
                    description={
                      <span style={{ color: '#8e8e93' }}>
                        暂无好友<br/>
                        <span style={{ fontSize: '12px' }}>点击上方按钮添加好友</span>
                      </span>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ) : (
                <List
                  dataSource={friends}
                  renderItem={(friend) => (
                    <List.Item
                      onClick={() => {
                        dispatch(setActiveConversation(friend.username));
                        setActiveTab('conversations');
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '16px',
                        borderBottom: '1px solid #f5f5f5',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge dot status="success">
                            <Avatar 
                              size={48} 
                              style={{ 
                                background: getAvatarColor(friend.username),
                                fontSize: '18px',
                                fontWeight: 600
                              }}
                            >
                              {friend.username[0].toUpperCase()}
                            </Avatar>
                          </Badge>
                        }
                        title={
                          <span style={{ 
                            fontWeight: 600,
                            fontSize: '15px',
                            color: '#000'
                          }}>
                            {friend.username}
                          </span>
                        }
                        description={
                          <span style={{ 
                            color: '#8e8e93',
                            fontSize: '13px'
                          }}>
                            {friend.email}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </div>

      {/* Add Friend Modal */}
      <Modal
        title={null}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setSearchResult(null);
        }}
        footer={null}
        width={460}
        centered
        styles={{
          body: { padding: '32px' }
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            margin: 0,
            color: '#000',
            letterSpacing: '-0.5px'
          }}>
            添加好友
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#8e8e93', 
            margin: '8px 0 0 0' 
          }}>
            输入用户名搜索并添加好友
          </p>
        </div>

        <Form onFinish={handleSearch}>
          <Form.Item 
            name="username" 
            rules={[{ required: true, message: '请输入用户名' }]}
            style={{ marginBottom: '20px' }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input 
                name="username"
                size="large"
                placeholder="输入用户名" 
                prefix={<SearchOutlined style={{ color: '#8e8e93', fontSize: '16px' }} />}
                style={{ 
                  flex: 1,
                  borderRadius: '12px',
                  height: '48px',
                  fontSize: '15px'
                }}
              />
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={searchLoading}
                size="large"
                style={{ 
                  background: '#0088cc',
                  border: 'none',
                  borderRadius: '12px',
                  height: '48px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  fontWeight: 500
                }}
              >
                搜索
              </Button>
            </div>
          </Form.Item>
        </Form>

        {searchResult && (
          <div style={{ 
            padding: '24px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '16px',
            border: '1px solid #e8e8e8',
            marginTop: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <Avatar 
                size={64} 
                style={{ 
                  background: getAvatarColor(searchResult.username),
                  fontSize: '24px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0, 136, 204, 0.15)'
                }}
              >
                {searchResult.username[0].toUpperCase()}
              </Avatar>
              <div style={{ marginLeft: '16px', flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '18px', 
                  marginBottom: '4px',
                  color: '#000'
                }}>
                  {searchResult.username}
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#8e8e93',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>📧</span>
                  {searchResult.email}
                </div>
              </div>
            </div>
            <Button 
              type="primary" 
              onClick={handleAddFriend} 
              block
              size="large"
              style={{
                background: '#0088cc',
                border: 'none',
                borderRadius: '12px',
                height: '48px',
                fontWeight: 600,
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(0, 136, 204, 0.2)'
              }}
            >
              添加为好友
            </Button>
          </div>
        )}

        {!searchResult && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#8e8e93'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🔍</div>
            <p style={{ margin: 0, fontSize: '14px' }}>搜索用户开始添加好友</p>
          </div>
        )}
      </Modal>

      {/* Create Group Modal */}
      <Modal
        title="创建群组"
        open={isGroupModalOpen}
        onCancel={() => {
          setIsGroupModalOpen(false);
          setSelectedMembers([]);
        }}
        footer={null}
        width={500}
      >
        <Form onFinish={handleCreateGroup}>
          <Form.Item name="groupName" rules={[{ required: true, message: '请输入群组名称' }]}>
            <Input placeholder="群组名称" size="large" />
          </Form.Item>
          <Form.Item label="选择成员">
            <List
              dataSource={friends}
              renderItem={(friend) => (
                <List.Item
                  onClick={() => {
                    setSelectedMembers(prev =>
                      prev.includes(friend.id)
                        ? prev.filter(id => id !== friend.id)
                        : [...prev, friend.id]
                    );
                  }}
                  style={{
                    cursor: 'pointer',
                    background: selectedMembers.includes(friend.id) ? '#e6f7ff' : 'transparent',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <List.Item.Meta
                    avatar={<Avatar style={{ background: getAvatarColor(friend.username) }}>{friend.username[0].toUpperCase()}</Avatar>}
                    title={friend.username}
                  />
                  {selectedMembers.includes(friend.id) && <span>✓</span>}
                </List.Item>
              )}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            创建
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default ConversationList;
