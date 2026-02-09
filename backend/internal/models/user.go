package models

import "time"

type User struct {
	ID           string    `json:"id" gorm:"primaryKey;size:36"`
	Username     string    `json:"username" gorm:"uniqueIndex;size:50"`
	PasswordHash string    `json:"-" gorm:"size:255"`
	Email        string    `json:"email" gorm:"size:100"`
	Status       string    `json:"status" gorm:"size:20;default:'active'"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
