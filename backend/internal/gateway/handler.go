package gateway

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/cyperlo/im/internal/auth"
	"github.com/cyperlo/im/pkg/jwt"
	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type SendMessageRequest struct {
	To      string `json:"to" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 简化版：直接生成 token
	token, err := jwt.GenerateToken(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成 token 失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    token,
		"username": req.Username,
	})
}

func SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	// 保存消息到数据库
	if err := saveMessageToDB(userID.(string), req.To, req.Content); err != nil {
		log.Printf("Failed to save message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存消息失败"})
		return
	}

	// 构造消息
	sender := auth.GetUserByID(userID.(string))
	msg := WSMessage{
		Type:         "chat",
		To:           req.To,
		From:         userID.(string),
		FromUsername: sender.Username,
		Content:      req.Content,
		Timestamp:    time.Now().Unix(),
	}

	// 通过 WebSocket 广播
	data, _ := json.Marshal(msg)
	hub.Broadcast <- data

	c.JSON(http.StatusOK, gin.H{
		"status":    "sent",
		"timestamp": msg.Timestamp,
	})
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少 token"})
			c.Abort()
			return
		}

		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		claims, err := jwt.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的 token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Next()
	}
}
