package models

import (
	"time"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/google/uuid"
)

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

type DropRequest struct { //renamed from UpdateDropRequest
	Title      string              `json:"title"`
	Content    string              `json:"content"`
	PostDate   *string             `json:"post_date,omitempty"`
	ExpireDate *string             `json:"expire_date,omitempty"`
	Targets    []Target `json:"targets"`
}

type DropView struct {
	Title        string     `json:"title"`
	TargetGroups []string   `json:"target_groups"`
	Content      string     `json:"content"`
	Teacher      string     `json:"teacher"`
	PostDate     *time.Time `json:"post_date"`
	ExpireData   *time.Time `json:"expire_date"`
}

type DropTarget struct {
	DropID     uuid.UUID           `json:"drop_id"`
	TargetType database.TargetType `json:"type"`
	TargetID   int                 `json:"target_id"`
}

type Target struct {
	Type string `json:"type"`
	ID   int32  `json:"id"`
}
