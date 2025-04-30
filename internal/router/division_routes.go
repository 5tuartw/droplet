package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/school_structure"
	"github.com/5tuartw/droplet/internal/database"
)

func registerDivisionRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// GET /api/divisions
	getDivisionsHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.GetDivisions(dbq, w, r)
	}
    mux.HandleFunc("GET /api/divisions", auth.RequireAuth(cfg, getDivisionsHandler)) // <<< No RequireAdmin here

	// All Admin only
	// POST /api/divisions
	addDivisionHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		school_structure.CreateDivision(dbq, w, r)
	}
	addDivisionChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, addDivisionHandlerFunc))
	mux.HandleFunc("POST /api/divisions", addDivisionChain)

	// PUT /api/divisions/{divisionID}
	updateDivisionHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.UpdateDivision(cfg, dbq, w, r)
	}
	updateDivisionChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, updateDivisionHandler))
	mux.HandleFunc("PUT /api/divisions/{divisionID}", updateDivisionChain)

	// DELETE /api/divisions/{divisionID}
	deleteDivisionHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.DeleteDivision(cfg, dbq, w, r)
	}
	deleteDivisionChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, deleteDivisionHandler))
	mux.HandleFunc("DELETE /api/divisions/{divisionID}", deleteDivisionChain)

}
