package model

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Email     string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"type:varchar(255);not null" json:"-"`
	Role      string    `gorm:"type:varchar(50);default:'member'" json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserLogin struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	RememberMe bool   `json:"remember_me"`
}

type LoginResponse struct {
	Token string   `json:"token"`
	User  UserInfo `json:"user"`
}

type UserInfo struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type UserRegister struct {
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string	`json:"password"`
}
