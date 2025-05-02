package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
)

// NewRouter creates and configures the main application router
func NewRouter(cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) *http.ServeMux {
	mux := http.NewServeMux()

	registerAuthRoutes(mux, cfg, db, dbq)         // Handles /api/login, /api/token/*, /api/status
	registerUserRoutes(mux, cfg, db, dbq)         // Handles /api/users/*, /api/users/me/*
	registerPupilRoutes(mux, cfg, db, dbq)        // Handles /api/pupils/*
	registerDropRoutes(mux, cfg, db, dbq)         // Handles /api/drops/*, /api/mydrops, etc.
	registerSettingsRoutes(mux, cfg, db, dbq)     // Handles /api/settings/*
	registerTargetLookupRoutes(mux, cfg, db, dbq) // Handles /api/divisions, classes, etc.
	registerWebRoutes(mux, cfg, db, dbq)          // Handles static files, /, /admin etc.
	registerClassRoutes(mux, cfg, db, dbq)
	registerYearGroupRoutes(mux, cfg, db, dbq)
	registerDivisionRoutes(mux, cfg, db, dbq)
	registerSchoolStructureRoutesmux(mux, cfg, db, dbq)

	return mux
}
