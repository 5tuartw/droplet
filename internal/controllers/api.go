package controllers

import (
	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
)

type Api struct {
	Config   config.ApiConfig
	auth.Api // Embed auth.Api
}
