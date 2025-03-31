package models

import "time"

type Drop struct {
	ID         string     `json:"id"`
	UserID     string     `json:"user_id"`
	Title      string     `json:"title"`
	Content    string     `json:"content"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	PostDate   *time.Time `json:"post_date"`
	ExpireDate *time.Time `json:"expire_date"`
}

type CreateDropRequest struct {
	UserID     string     `json:"user_id"`
	Title      string     `json:"title"`
	Content    string     `json:"content"`
	PostDate   *time.Time `json:"post_date"`
	ExpireDate *time.Time `json:"expire_date"`
}

type UpdateDropRequest struct {
	Title      string     `json:"title"`
	Content    string     `json:"content"`
	PostDate   *time.Time `json:"post_date"`
	ExpireDate *time.Time `json:"expire_date"`
}
