package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/status"
	"github.com/5tuartw/droplet/internal/database"
)

func registerAuthRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {
	
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		auth.Login(cfg, dbq, w, r)
	})
	mux.HandleFunc("/api/token/refresh", func(w http.ResponseWriter, r *http.Request) {
		auth.Refresh(cfg, dbq, w, r)
	})
	mux.HandleFunc("/api/token/revoke", func(w http.ResponseWriter, r *http.Request) {
		auth.Revoke(cfg, dbq, w, r)
	})

	mux.HandleFunc("GET /api/status", func(w http.ResponseWriter, r *http.Request) {
		status.GetStatus(cfg, w, r)
	})

}