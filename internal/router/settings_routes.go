package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/settings"
	"github.com/5tuartw/droplet/internal/database"
)

func registerSettingsRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// GET /api/settings/me
	getUserSettings := func(w http.ResponseWriter, r *http.Request) {
		settings.GetMySettings(dbq, w, r)
	}
	mux.HandleFunc("GET /api/settings/me", auth.RequireAuth(cfg, getUserSettings))

	// PUT /api/settings/me/preferences
	upsertUserSettings := func(w http.ResponseWriter, r *http.Request) {
		settings.UpdateUserSettings(dbq, w, r)
	}
	mux.HandleFunc("PUT /api/settings/me/preferences", auth.RequireAuth(cfg, upsertUserSettings))

	// PUT /api/settings/me/subscriptions
	updateTargetSubscriptions := func(w http.ResponseWriter, r *http.Request) {
		settings.UpdateTargetSubscriptions(db, dbq, w, r)
	}
	mux.HandleFunc("PUT /api/settings/me/subscriptions", auth.RequireAuth(cfg, updateTargetSubscriptions))

}
