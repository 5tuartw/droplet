package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/school_structure"
	"github.com/5tuartw/droplet/internal/database"
)

func registerSchoolStructureRoutesmux(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {
	// get /api/school-structure (admin only)
	getSchoolStructureHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		school_structure.GetSchoolStructure(dbq, w, r)
	}
	getSchoolStructureChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, getSchoolStructureHandlerFunc))
	mux.HandleFunc("GET /api/school-structure", getSchoolStructureChain)
}
