import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_CONFIG_KEY = '@server_config';

export default function SettingsScreen({ navigation }: any) {
  const [apiUrl, setApiUrl] = useState('http://192.168.10.182:8080/api/v1');
  const [authUrl, setAuthUrl] = useState('http://192.168.10.182:8081/api/v1');
  const [wsUrl, setWsUrl] = useState('ws://192.168.10.182:8080/ws');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
      if (config) {
        const parsed = JSON.parse(config);
        setApiUrl(parsed.apiUrl || apiUrl);
        setAuthUrl(parsed.authUrl || authUrl);
        setWsUrl(parsed.wsUrl || wsUrl);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const saveConfig = async () => {
    try {
      const config = { apiUrl, authUrl, wsUrl };
      await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
      Alert.alert('成功', '服务器配置已保存，请重启应用生效');
    } catch (error) {
      Alert.alert('错误', '保存配置失败');
    }
  };

  const resetConfig = () => {
    setApiUrl('http://192.168.10.182:8080/api/v1');
    setAuthUrl('http://192.168.10.182:8081/api/v1');
    setWsUrl('ws://192.168.10.182:8080/ws');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>服务器设置</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>API 服务器地址</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.100:8080/api/v1"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>认证服务器地址</Text>
        <TextInput
          style={styles.input}
          value={authUrl}
          onChangeText={setAuthUrl}
          placeholder="http://192.168.1.100:8081/api/v1"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>WebSocket 地址</Text>
        <TextInput
          style={styles.input}
          value={wsUrl}
          onChangeText={setWsUrl}
          placeholder="ws://192.168.1.100:8080/ws"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveConfig}>
          <Text style={styles.saveButtonText}>保存配置</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetConfig}>
          <Text style={styles.resetButtonText}>恢复默认</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0088cc',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#0088cc',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0088cc',
  },
  resetButtonText: {
    color: '#0088cc',
    fontSize: 16,
    fontWeight: '600',
  },
});
