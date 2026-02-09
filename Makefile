.PHONY: help run-gateway run-auth run-message run-all

help:
	@echo "可用命令:"
	@echo "  make run-gateway  - 启动网关服务"
	@echo "  make run-auth     - 启动认证服务"
	@echo "  make run-message  - 启动消息服务"
	@echo "  make run-all      - 启动所有服务"

run-gateway:
	cd backend && go run cmd/gateway/main.go

run-auth:
	cd backend && go run cmd/auth/main.go

run-message:
	cd backend && go run cmd/message/main.go

run-all:
	@echo "启动所有后端服务..."
	cd backend && go run cmd/gateway/main.go & \
	go run cmd/auth/main.go & \
	go run cmd/message/main.go
