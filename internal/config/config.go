package config

import (
	"github.com/5tuartw/droplet/internal/database"
)

type ApiConfig struct {
	isDev     bool
	JWTSecret string
	DB        *database.Queries
}
