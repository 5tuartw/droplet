package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/targets"
	"github.com/5tuartw/droplet/internal/database"
)

func registerTargetLookupRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// Functionality moved to school structure routes
	/*// GET /api/divisions
	getDivisionsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetDivisions(dbq, w, r)
	}
	mux.HandleFunc("GET /api/divisions", auth.RequireAuth(cfg, getDivisionsHandlerFunc))
	// GET /api/yeargroups
	getYearGroupsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetYearGroups(dbq, w, r)
	}
	mux.HandleFunc("GET /api/yeargroups", auth.RequireAuth(cfg, getYearGroupsHandlerFunc))
	// GET /api/classes
	getClassesHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetClasses(dbq, w, r)
	}
	mux.HandleFunc("GET /api/classes", auth.RequireAuth(cfg, getClassesHandlerFunc))*/

	// GET /api/pupils/lookup
	getPupilNamesHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetPupils(dbq, w, r)
	}
	mux.HandleFunc("GET /api/pupils/lookup", auth.RequireAuth(cfg, getPupilNamesHandlerFunc))

}
