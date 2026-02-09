package models

import "time"

type Message struct {
	ID             string    `json:"id" gorm:"primaryKey;size:36"`
	ConversationID string    `json:"conversation_id" gorm:"index;size:36"`
	SenderID       string    `json:"sender_id" gorm:"size:36"`
	SenderType     string    `json:"sender_type" gorm:"size:20"`
	ContentType    string    `json:"content_type" gorm:"size:20"`
	Content        string    `json:"content" gorm:"type:text"`
	Status         string    `json:"status" gorm:"size:20;default:'sent'"`
	CreatedAt      time.Time `json:"created_at" gorm:"index"`
}

func (Message) TableName() string {
	return "messages"
}
