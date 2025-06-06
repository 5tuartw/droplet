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

	// PATCH /api/divisions/{divisionID}/name
	renameDivisionHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.RenameDivision(cfg, dbq, w, r)
	}
	renameDivisionChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, renameDivisionHandler))
	mux.HandleFunc("PATCH /api/divisions/{divisionID}/name", renameDivisionChain)

	// DELETE /api/divisions/{divisionID}
	deleteDivisionHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.DeleteDivision(cfg, dbq, w, r)
	}
	deleteDivisionChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, deleteDivisionHandler))
	mux.HandleFunc("DELETE /api/divisions/{divisionID}", deleteDivisionChain)

}
