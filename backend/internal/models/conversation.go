package models

import "time"

type Conversation struct {
	ID        string    `json:"id" gorm:"primaryKey;size:36"`
	Type      string    `json:"type" gorm:"size:20"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Conversation) TableName() string {
	return "conversations"
}
