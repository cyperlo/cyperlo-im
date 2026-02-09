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

	// 获取用户的所有会话
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

	// 获取每个会话的最新消息
	type MessageWithUsername struct {
		models.Message
		SenderUsername string `json:"sender_username"`
	}

	type ConversationWithMessages struct {
		ConversationID string                `json:"conversation_id"`
		OtherUser      models.User           `json:"other_user"`
		Messages       []MessageWithUsername `json:"messages"`
	}

	var result []ConversationWithMessages

	for _, convID := range conversationIDs {
		// 获取会话成员
		var convMembers []models.ConversationMember
		database.DB.Where("conversation_id = ?", convID).Find(&convMembers)

		// 找到对方用户
		var otherUserID string
		for _, m := range convMembers {
			if m.UserID != userID {
				otherUserID = m.UserID
				break
			}
		}

		if otherUserID == "" {
			continue
		}

		// 获取对方用户信息
		var otherUser models.User
		if err := database.DB.Where("id = ?", otherUserID).First(&otherUser).Error; err != nil {
			continue
		}

		// 获取最近的消息
		messages, _ := GetConversationMessages(convID, 50)

		// 为每条消息添加发送者用户名
		var messagesWithUsername []MessageWithUsername
		for _, msg := range messages {
			var sender models.User
			senderUsername := ""
			if err := database.DB.Where("id = ?", msg.SenderID).First(&sender).Error; err == nil {
				senderUsername = sender.Username
			}
			messagesWithUsername = append(messagesWithUsername, MessageWithUsername{
				Message:        msg,
				SenderUsername: senderUsername,
			})
		}

		result = append(result, ConversationWithMessages{
			ConversationID: convID,
			OtherUser:      otherUser,
			Messages:       messagesWithUsername,
		})
	}

	c.JSON(http.StatusOK, gin.H{"conversations": result})
}
