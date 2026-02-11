package message

import (
	"net/http"
	"strconv"

	"github.com/cyperlo/im/internal/models"
	"github.com/cyperlo/im/pkg/database"
	"github.com/gin-gonic/gin"
)

type SendMessageRequest struct {
	To      string `json:"to" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	conversation, err := GetOrCreateConversation(userID, req.To)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建会话失败"})
		return
	}

	message, err := SaveMessage(conversation.ID, userID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存消息失败"})
		return
	}

	c.JSON(http.StatusOK, message)
}

func GetConversation(c *gin.Context) {
	conversationID := c.Param("id")
	limit := 50

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	messages, err := GetConversationMessages(conversationID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取消息失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func GetHistory(c *gin.Context) {
	userID := c.GetString("user_id")

	var members []models.ConversationMember
	if err := database.DB.Where("user_id = ?", userID).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取会话失败"})
		return
	}

	var conversationIDs []string
	for _, m := range members {
		conversationIDs = append(conversationIDs, m.ConversationID)
	}

	if len(conversationIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"conversations": []interface{}{}})
		return
	}

	// 批量获取会话
	var conversations []models.Conversation
	if err := database.DB.Where("id IN ?", conversationIDs).Find(&conversations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取会话失败"})
		return
	}

	// 批量获取所有会话成员
	var allMembers []models.ConversationMember
	database.DB.Where("conversation_id IN ?", conversationIDs).Find(&allMembers)

	// 构建会话成员映射
	memberMap := make(map[string][]string)
	for _, m := range allMembers {
		memberMap[m.ConversationID] = append(memberMap[m.ConversationID], m.UserID)
	}

	// 收集所有需要查询的用户ID
	userIDSet := make(map[string]bool)
	for _, members := range memberMap {
		for _, uid := range members {
			userIDSet[uid] = true
		}
	}

	// 批量获取消息
	type MessageWithUsername struct {
		models.Message
		SenderUsername string `json:"sender_username"`
	}

	var allMessages []models.Message
	database.DB.Where("conversation_id IN ?", conversationIDs).
		Order("created_at DESC").
		Limit(50 * len(conversationIDs)).
		Find(&allMessages)

	// 收集消息发送者ID
	for _, msg := range allMessages {
		userIDSet[msg.SenderID] = true
	}

	// 批量获取所有用户信息
	var userIDs []string
	for uid := range userIDSet {
		userIDs = append(userIDs, uid)
	}

	var users []models.User
	database.DB.Where("id IN ?", userIDs).Find(&users)

	// 构建用户映射
	userMap := make(map[string]models.User)
	for _, u := range users {
		userMap[u.ID] = u
	}

	// 构建消息映射
	messageMap := make(map[string][]MessageWithUsername)
	for _, msg := range allMessages {
		username := ""
		if user, ok := userMap[msg.SenderID]; ok {
			username = user.Username
		}
		messageMap[msg.ConversationID] = append(messageMap[msg.ConversationID], MessageWithUsername{
			Message:        msg,
			SenderUsername: username,
		})
	}

	type ConversationResult struct {
		ID        string                `json:"id"`
		Type      string                `json:"type"`
		Name      string                `json:"name,omitempty"`
		OtherUser *models.User          `json:"other_user,omitempty"`
		Messages  []MessageWithUsername `json:"messages"`
	}

	var result []ConversationResult

	for _, conv := range conversations {
		convResult := ConversationResult{
			ID:       conv.ID,
			Type:     conv.Type,
			Name:     conv.Name,
			Messages: messageMap[conv.ID],
		}

		if conv.Type == "single" {
			members := memberMap[conv.ID]
			for _, uid := range members {
				if uid != userID {
					if user, ok := userMap[uid]; ok {
						convResult.OtherUser = &user
					}
					break
				}
			}
		}

		result = append(result, convResult)
	}

	c.JSON(http.StatusOK, gin.H{"conversations": result})
}
