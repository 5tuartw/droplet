package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/school_structure"
	"github.com/5tuartw/droplet/internal/database"
)

func registerYearGroupRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// GET /api/yeargroups
	getYearGroupsHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.GetYearGroups(dbq, w, r)
	}
	mux.HandleFunc("GET /api/yeargroups", auth.RequireAuth(cfg, getYearGroupsHandler))

	// All Admin only
	// POST /api/yeargroups
	addYearGroupHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		school_structure.CreateYearGroup(dbq, w, r)
	}
	addYearGroupChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, addYearGroupHandlerFunc))
	mux.HandleFunc("POST /api/yeargroups", addYearGroupChain)

	// PUT /api/yeargroups/{yeargroupID}
	updateYearGroupHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.UpdateYearGroup(cfg, dbq, w, r)
	}
	updateYearGroupChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, updateYearGroupHandler))
	mux.HandleFunc("PUT /api/yeargroups/{yeargroupID}", updateYearGroupChain)

	// DELETE /api/yeargroups/{yeargroupID}
	deleteYearGroupHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.DeleteYearGroup(cfg, dbq, w, r)
	}
	deleteYearGroupChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, deleteYearGroupHandler))
	mux.HandleFunc("DELETE /api/yeargroups/{yeargroupID}", deleteYearGroupChain)

}
