package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/drops"
	"github.com/5tuartw/droplet/internal/database"
)

func registerDropRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// POST /api/drops (CreateDrop)
	createDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.CreateDrop(db, dbq, w, r)
	}
	mux.HandleFunc("POST /api/drops", auth.RequireAuth(cfg, createDropHandlerFunc))

	// DELETE /api/drops/{dropID} (DeleteDrop)
	deleteDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.DeleteDrop(dbq, w, r)
	}
	mux.HandleFunc("DELETE /api/drops/{dropID}", auth.RequireAuth(cfg, deleteDropHandlerFunc))

	// PUT /api/drops{dropID} (UpdateDrop)
	updateDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.UpdateDrop(db, dbq, w, r)
	}
	mux.HandleFunc("PUT /api/drops/{dropID}", auth.RequireAuth(cfg, updateDropHandlerFunc))

	// GET /api/drops (GetActiveDrops) - Assuming this needs auth
	getActiveDropsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetActiveDrops(dbq, w, r)
	}
	mux.HandleFunc("GET /api/drops", auth.RequireAuth(cfg, getActiveDropsHandlerFunc))

	// GET /api/mydrops (GetDropsForUser)
	getDropsForUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetDropsForUser(dbq, w, r)
	}
	mux.HandleFunc("GET /api/mydrops", auth.RequireAuth(cfg, getDropsForUserHandlerFunc))

	// GET /api/upcomingdrops (GetUpcomingDrops)
	getUpcomingDropsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetUpcomingDrops(dbq, w, r)
	}
	mux.HandleFunc("GET /api/upcomingdrops", auth.RequireAuth(cfg, getUpcomingDropsHandlerFunc))

	// GET /api/drops/{dropID} (GetDropAndTargets)
	getDropAndTargetsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetDropAndTargets(dbq, w, r)
	}
	mux.HandleFunc("GET /api/drops/{dropID}", auth.RequireAuth(cfg, getDropAndTargetsHandlerFunc))

	// POST /api/droptargets (AddDropTarget)
	addDropTargetHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.AddDropTarget(dbq, w, r)
	}
	mux.HandleFunc("POST /api/droptargets", auth.RequireAuth(cfg, addDropTargetHandlerFunc))

}
