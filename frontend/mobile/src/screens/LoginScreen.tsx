import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { login } from '../store/slices/authSlice';
import { authAPI } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = async () => {
    try {
      if (isLogin) {
        const data = await authAPI.login(username, password);
        dispatch(login({ token: data.token, userId: data.user_id, username: data.username }));
        navigation.replace('Main');
      } else {
        await authAPI.register(username, email, password);
        Alert.alert('成功', '注册成功，请登录');
        setIsLogin(true);
      }
    } catch (error: any) {
      Alert.alert('错误', error.response?.data?.error || '操作失败');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Cyperlo IM</Text>
        <Text style={styles.subtitle}>{isLogin ? '登录' : '注册'}</Text>

        <TextInput
          style={styles.input}
          placeholder="用户名"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="邮箱"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>{isLogin ? '登录' : '注册'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin ? '没有账号？注册' : '已有账号？登录'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsText}>⚙️ 服务器设置</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0088cc',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0088cc',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
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
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: '#0088cc',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  settingsButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  settingsText: {
    color: '#666',
    fontSize: 14,
  },
});
