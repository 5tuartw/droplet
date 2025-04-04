package models

import (
	"time"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/google/uuid"
)

type User struct {
	ID             uuid.UUID `json:"id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	Title          string    `json:"title"`
	FirstName      string    `json:"first_name"`
	Surname        string    `json:"surname"`
	HashedPassword string    `json:"-"` // Omit from JSON output
}

type TokenUser struct {
	ID           uuid.UUID `json:"id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
}

type DevModeUser struct {
	ID    uuid.UUID `json:"id"`
	Email string    `json:"email"`
	Role  string    `json:"role"`
}

type UserResponse struct {
	ID        uuid.UUID         `json:"id"`
	Email     string            `json:"email"`
	Role      database.UserRole `json:"role"`            // Or string if you prefer sending string role
	Title     string            `json:"title,omitempty"` // Keep if useful confirmation
	FirstName string            `json:"first_name,omitempty"`
	Surname   string            `json:"surname,omitempty"`
	CreatedAt time.Time         `json:"created_at"` // Assuming DB provides this
	UpdatedAt time.Time         `json:"updated_at"` // Assuming DB provides this
}
