# Cyperlo IM 系统

基于 Go + React 的即时通信平台，支持统一登录与第三方系统接入。

## 项目结构

```
cyperlo-im/
├── backend/              # Go 后端
│   ├── cmd/             # 服务入口
│   │   ├── gateway/     # IM 网关
│   │   ├── auth/        # 认证服务
│   │   └── message/     # 消息服务
│   ├── internal/        # 内部代码
│   │   ├── gateway/     # 网关逻辑
│   │   ├── auth/        # 认证逻辑
│   │   ├── message/     # 消息逻辑
│   │   └── models/      # 数据模型
│   ├── pkg/             # 可复用包
│   │   ├── jwt/         # JWT 工具
│   │   └── redis/       # Redis 客户端
│   └── config/          # 配置文件
├── frontend/            # React 前端
│   └── web/            # Web 应用
│       └── src/
│           ├── components/  # React 组件
│           ├── services/    # API 服务
│           └── store/       # Redux 状态
└── docs/               # 文档
```

## 快速开始

### 后端

```bash
cd backend
go mod download

# 启动认证服务
go run cmd/auth/main.go

# 启动网关服务（新终端）
go run cmd/gateway/main.go
```

### 前端

```bash
cd frontend/web
npm install
npm start
```

### 测试流程

1. 访问 http://localhost:3000
2. 注册新用户
3. 登录后创建会话（输入对方用户ID）
4. 开始聊天

## 技术栈

- 后端：Go 1.22, Gin, GORM, WebSocket
- 前端：React 18, TypeScript, Redux, Ant Design
- 数据库：MySQL, Redis
- 认证：JWT, OAuth2

## 开发阶段

- Phase 1: 单聊、WebSocket、基础登录 ✅
  - 用户注册/登录
  - JWT 认证
  - WebSocket 实时通信
  - 单聊功能
  - 会话管理
- Phase 2: 群聊、消息持久化、第三方推送
- Phase 3: 多端同步、离线消息、管理后台
