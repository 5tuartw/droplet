package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/school_structure"
	"github.com/5tuartw/droplet/internal/database"
)

func registerClassRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// GET /api/classes
	getClassesHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.GetClasses(dbq, w, r)
	}
	mux.HandleFunc("GET /api/classes", auth.RequireAuth(cfg, getClassesHandler))

	// All Admin only
	// POST /api/classes
	addClassHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		school_structure.CreateClass(dbq, w, r)
	}
	addYearGroupChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, addClassHandlerFunc))
	mux.HandleFunc("POST /api/classes", addYearGroupChain)

	// PUT /api/classes/{classID}
	updateClassHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.UpdateClass(cfg, dbq, w, r)
	}
	updateClassChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, updateClassHandler))
	mux.HandleFunc("PUT /api/classes/{classID}", updateClassChain)

	// DELETE /api/classes/{classID}
	deleteClassHandler := func(w http.ResponseWriter, r *http.Request) {
		school_structure.DeleteClass(cfg, dbq, w, r)
	}
	deleteClassChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, deleteClassHandler))
	mux.HandleFunc("DELETE /api/classes/{classID}", deleteClassChain)

}
