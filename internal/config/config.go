package config

import (
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/models"
)

type ApiConfig struct {
	DevMode     bool
	JWTSecret   string
	DB          *database.Queries
	DevModeUser *models.User
}
