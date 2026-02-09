package message

import (
	"time"

	"github.com/cyperlo/im/internal/models"
	"github.com/cyperlo/im/pkg/database"
	"github.com/google/uuid"
)

func SaveMessage(conversationID, senderID, content string) (*models.Message, error) {
	message := &models.Message{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		SenderID:       senderID,
		SenderType:     "user",
		ContentType:    "text",
		Content:        content,
		Status:         "sent",
		CreatedAt:      time.Now(),
	}

	if err := database.DB.Create(message).Error; err != nil {
		return nil, err
	}

	return message, nil
}

func GetConversationMessages(conversationID string, limit int) ([]models.Message, error) {
	var messages []models.Message
	err := database.DB.Where("conversation_id = ?", conversationID).
		Order("created_at ASC").
		Limit(limit).
		Find(&messages).Error
	return messages, err
}

func GetOrCreateConversation(user1ID, user2ID string) (*models.Conversation, error) {
	var conversation models.Conversation

	err := database.DB.Raw(`
		SELECT c.* FROM conversations c
		INNER JOIN conversation_members cm1 ON c.id = cm1.conversation_id
		INNER JOIN conversation_members cm2 ON c.id = cm2.conversation_id
		WHERE c.type = 'single'
		AND cm1.user_id = ?
		AND cm2.user_id = ?
		LIMIT 1
	`, user1ID, user2ID).Scan(&conversation).Error

	if err == nil && conversation.ID != "" {
		return &conversation, nil
	}

	conversation = models.Conversation{
		ID:        uuid.New().String(),
		Type:      "single",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&conversation).Error; err != nil {
		return nil, err
	}

	members := []models.ConversationMember{
		{ConversationID: conversation.ID, UserID: user1ID, JoinedAt: time.Now()},
		{ConversationID: conversation.ID, UserID: user2ID, JoinedAt: time.Now()},
	}

	if err := database.DB.Create(&members).Error; err != nil {
		return nil, err
	}

	return &conversation, nil
}
