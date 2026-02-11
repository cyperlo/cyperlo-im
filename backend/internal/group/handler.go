package group

import (
	"log"
	"net/http"

	"github.com/cyperlo/im/internal/models"
	"github.com/cyperlo/im/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateGroupRequest struct {
	Name    string   `json:"name" binding:"required"`
	Members []string `json:"members" binding:"required"`
}

func CreateGroup(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	conversationID := uuid.New().String()
	conversation := models.Conversation{
		ID:   conversationID,
		Type: "group",
		Name: req.Name,
	}

	if err := database.DB.Create(&conversation).Error; err != nil {
		log.Printf("Failed to create group: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建群组失败"})
		return
	}

	members := append(req.Members, userID)
	for _, memberID := range members {
		member := models.ConversationMember{
			ConversationID: conversationID,
			UserID:         memberID,
		}
		if err := database.DB.Create(&member).Error; err != nil {
			log.Printf("Failed to add member: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"conversation_id": conversationID,
		"name":            req.Name,
	})
}

func GetGroups(c *gin.Context) {
	userID := c.GetString("user_id")

	var members []models.ConversationMember
	if err := database.DB.Where("user_id = ?", userID).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取群组失败"})
		return
	}

	var conversationIDs []string
	for _, m := range members {
		conversationIDs = append(conversationIDs, m.ConversationID)
	}

	var conversations []models.Conversation
	if err := database.DB.Where("id IN ? AND type = ?", conversationIDs, "group").Find(&conversations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取群组失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"groups": conversations})
}

func SendGroupMessage(c *gin.Context) {
	conversationID := c.Param("id")
	userID := c.GetString("user_id")

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := models.Message{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		SenderID:       userID,
		SenderType:     "user",
		ContentType:    "text",
		Content:        req.Content,
		Status:         "sent",
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "发送失败"})
		return
	}

	c.JSON(http.StatusOK, msg)
}
