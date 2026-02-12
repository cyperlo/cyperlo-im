import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Tabs, message, Checkbox, Modal, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import './Login.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    try {
      const config = localStorage.getItem('server_config');
      if (config) {
        form.setFieldsValue(JSON.parse(config));
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const saveConfig = (values: any) => {
    try {
      localStorage.setItem('server_config', JSON.stringify(values));
      message.success('服务器配置已保存，请刷新页面生效');
      setSettingsVisible(false);
    } catch (error) {
      message.error('保存配置失败');
    }
  };

  const resetConfig = () => {
    form.setFieldsValue({
      apiUrl: 'http://localhost:8090/api/v1',
      authUrl: 'http://localhost:8091/api/v1',
      wsUrl: 'ws://localhost:8090/ws'
    });
  };

  const onLogin = async (values: any) => {
    setLoading(true);
    try {
      const data = await authAPI.login(values);
      dispatch(setCredentials({
        token: data.token,
        userId: data.user_id,
        username: data.username,
      }));
      message.success('登录成功');
    } catch (error: any) {
      message.error(error.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: any) => {
    setLoading(true);
    try {
      await authAPI.register(values);
      message.success('注册成功');
      
      if (values.autoLogin) {
        const loginData = await authAPI.login({
          username: values.username,
          password: values.password,
        });
        dispatch(setCredentials({
          token: loginData.token,
          userId: loginData.user_id,
          username: loginData.username,
        }));
        message.success('自动登录成功');
      } else {
        setActiveTab('login');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <h1>Cyperlo IM</h1>
          <p>统一通信平台</p>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form onFinish={onLogin} size="large">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form onFinish={onRegister} size="large">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                    <Input prefix={<MailOutlined />} placeholder="邮箱" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item name="autoLogin" valuePropName="checked" initialValue={true}>
                    <Checkbox>注册后自动登录</Checkbox>
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button 
            type="link" 
            icon={<SettingOutlined />}
            onClick={() => setSettingsVisible(true)}
          >
            服务器设置
          </Button>
        </div>
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined style={{ fontSize: 20 }} />
            <span>服务器设置</span>
          </div>
        }
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
        width={520}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveConfig}
          initialValues={{
            apiUrl: 'http://localhost:8090/api/v1',
            authUrl: 'http://localhost:8091/api/v1',
            wsUrl: 'ws://localhost:8090/ws'
          }}
        >
          <Form.Item
            label="API 服务器地址"
            name="apiUrl"
            rules={[{ required: true, message: '请输入 API 服务器地址' }]}
            tooltip="用于处理业务请求的服务器地址"
          >
            <Input 
              placeholder="http://localhost:8090/api/v1" 
              prefix={<span style={{ color: '#999' }}>🌐</span>}
            />
          </Form.Item>

          <Form.Item
            label="认证服务器地址"
            name="authUrl"
            rules={[{ required: true, message: '请输入认证服务器地址' }]}
            tooltip="用于用户登录认证的服务器地址"
          >
            <Input 
              placeholder="http://localhost:8091/api/v1" 
              prefix={<span style={{ color: '#999' }}>🔐</span>}
            />
          </Form.Item>

          <Form.Item
            label="WebSocket 地址"
            name="wsUrl"
            rules={[{ required: true, message: '请输入 WebSocket 地址' }]}
            tooltip="用于实时消息推送的 WebSocket 地址"
          >
            <Input 
              placeholder="ws://localhost:8090/ws" 
              prefix={<span style={{ color: '#999' }}>⚡</span>}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={resetConfig}>
                恢复默认
              </Button>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Login;
