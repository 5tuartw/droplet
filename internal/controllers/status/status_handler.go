package status

import (
	"net/http"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/helpers"
)

// GetStatus returns basic app status, including demo mode flag
func GetStatus(cfg *config.ApiConfig, w http.ResponseWriter, r *http.Request) {
	response := map[string]bool{
		"isDemoMode": cfg.IsDemoMode,
	}
	helpers.RespondWithJSON(w, http.StatusOK, response)
}
