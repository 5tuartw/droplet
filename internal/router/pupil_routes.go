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

	// PUT /api/pupils/{pupilID} (Admin only)
	updatePupilHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		pupils.UpdatePupil(cfg, dbq, w, r)
	}
	updatePupilChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, updatePupilHandlerFunc))
	mux.HandleFunc("PUT /api/pupils/{pupilID}", updatePupilChain)

	// DELETE /api/pupils/{pupilID} (Admin only)
	deletePupilHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		pupils.DeletePupil(cfg, db, dbq, w, r)
	}
	deletePupilChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, deletePupilHandlerFunc))
	mux.HandleFunc("DELETE /api/pupils/{pupilID}", deletePupilChain)

	// POST /api/pupils (Admin only)
	addPupilHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		pupils.AddPupil(dbq, w, r)
	}
	addPupilChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, addPupilHandlerFunc))
	mux.HandleFunc("POST /api/pupils", addPupilChain)

	// GET /api/pupils/{pupilID} (single)
	getPupilHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		pupils.GetPupil(dbq, w, r)
	}
	mux.HandleFunc("GET /api/pupils/{pupilID}", auth.RequireAuth(cfg, getPupilHandlerFunc))

}
