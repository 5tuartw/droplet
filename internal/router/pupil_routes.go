package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/pupils"
	"github.com/5tuartw/droplet/internal/database"
)

func registerPupilRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// GET /api/pupils FULL list
	getPupilsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		pupils.GetAllPupils(dbq, w, r)
	}
	mux.HandleFunc("GET /api/pupils", auth.RequireAuth(cfg, getPupilsHandlerFunc))

}
