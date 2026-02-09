# Cyperlo IM Mobile

React Native 移动端应用

## 安装

```bash
cd frontend/mobile
npm install
```

## 运行

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

## 配置

修改 `src/services/api.ts` 和 `src/services/websocket.ts` 中的 API 地址：
- 开发环境：`http://localhost:8080`
- 真机测试：`http://YOUR_IP:8080`

## 技术栈

- React Native + Expo
- TypeScript
- Redux Toolkit
- React Navigation
- WebSocket
- Axios
