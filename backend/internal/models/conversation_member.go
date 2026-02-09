package models

import "time"

type ConversationMember struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	ConversationID string    `json:"conversation_id" gorm:"index;size:36"`
	UserID         string    `json:"user_id" gorm:"index;size:36"`
	JoinedAt       time.Time `json:"joined_at"`
}

func (ConversationMember) TableName() string {
	return "conversation_members"
}
