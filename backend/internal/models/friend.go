package models

import "time"

type Friend struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"index;size:36"`
	FriendID  string    `json:"friend_id" gorm:"index;size:36"`
	Status    string    `json:"status" gorm:"size:20;default:'pending'"` // pending, accepted, rejected
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Friend) TableName() string {
	return "friends"
}
