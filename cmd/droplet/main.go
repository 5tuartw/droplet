package main

import (
	"net/http"
	//"time"
	"log"
	//"fmt"

	"os"
	"path/filepath"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/drops"
	"github.com/5tuartw/droplet/internal/controllers/settings"
	"github.com/5tuartw/droplet/internal/controllers/status"
	"github.com/5tuartw/droplet/internal/controllers/targets"
	"github.com/5tuartw/droplet/internal/controllers/users"
	_ "github.com/lib/pq"
)

func main() {

	cfg, dbQueries, db := config.LoadConfig()
	defer db.Close()

	mux := http.NewServeMux()

	// API handlers

	// Public API Handlers
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		auth.Login(cfg, dbQueries, w, r)
	})
	mux.HandleFunc("/api/token/refresh", func(w http.ResponseWriter, r *http.Request) {
		auth.Refresh(cfg, dbQueries, w, r)
	})
	mux.HandleFunc("/api/token/revoke", func(w http.ResponseWriter, r *http.Request) {
		auth.Revoke(cfg, dbQueries, w, r)
	})

	statusHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		// Pass config pointer to the handler
		status.GetStatus(cfg, w, r)
	}
	mux.HandleFunc("GET /api/status", statusHandlerFunc)

	// Private API Handlers

	// GET /api/users (GetUsers)
	getUsersHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.GetUsers(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/users", auth.RequireAuth(cfg, getUsersHandlerFunc))

	// GET /api/users/{userID}
	getUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.GetUserById(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/users/{userID}", auth.RequireAuth(cfg, getUserHandlerFunc))

	// PUT /api/users/me/password (ChangeMyPassword)
	changeMyPasswordHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangeMyPassword(cfg, dbQueries, w, r)
	}
	mux.HandleFunc("PUT /api/users/me/password", auth.RequireAuth(cfg, changeMyPasswordHandlerFunc))

	// PUT /api/users/{userID}/password (ChangePassword)
	changePasswordHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangePassword(cfg, dbQueries, w, r)
	}
	mux.HandleFunc("PUT /api/users/{userID}/password", auth.RequireAuth(cfg, changePasswordHandlerFunc))

	// PATCH /api/users/{userID}/role (ChangeRole)
	changeRoleHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangeRole(dbQueries, w, r)
	}
	mux.HandleFunc("PATCH /api/users/{userID}/role", auth.RequireAuth(cfg, changeRoleHandlerFunc))

	// PATCH /api/users/{userID}/name
	updateUserNameHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangeName(dbQueries, w, r)
	}
	mux.HandleFunc("PATCH /api/users/{userID}/name", auth.RequireAuth(cfg, updateUserNameHandlerFunc))

	// DELETE /api/users (DeleteAllUsers)
	deleteUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.DeleteAllUsers(cfg, dbQueries, w, r)
	}
	mux.HandleFunc("DELETE /api/users", auth.RequireAuth(cfg, deleteUserHandlerFunc))

	// POST /api/users (CreateUser)
	createUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.CreateUser(dbQueries, w, r)
	}
	mux.HandleFunc("POST /api/users", auth.RequireAuth(cfg, createUserHandlerFunc))

	// POST /api/drops (CreateDrop)
	createDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.CreateDrop(db, dbQueries, w, r)
	}
	mux.HandleFunc("POST /api/drops", auth.RequireAuth(cfg, createDropHandlerFunc))

	// DELETE /api/drops/{dropID} (DeleteDrop)
	deleteDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.DeleteDrop(dbQueries, w, r)
	}
	mux.HandleFunc("DELETE /api/drops/{dropID}", auth.RequireAuth(cfg, deleteDropHandlerFunc))

	// PUT /api/drops{dropID} (UpdateDrop)
	updateDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.UpdateDrop(db, dbQueries, w, r)
	}
	mux.HandleFunc("PUT /api/drops/{dropID}", auth.RequireAuth(cfg, updateDropHandlerFunc))

	// GET /api/drops (GetActiveDrops) - Assuming this needs auth
	getActiveDropsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetActiveDrops(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/drops", auth.RequireAuth(cfg, getActiveDropsHandlerFunc))

	// GET /api/mydrops (GetDropsForUser)
	getDropsForUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetDropsForUser(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/mydrops", auth.RequireAuth(cfg, getDropsForUserHandlerFunc))

	// GET /api/upcomingdrops (GetUpcomingDrops)
	getUpcomingDropsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetUpcomingDrops(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/upcomingdrops", auth.RequireAuth(cfg, getUpcomingDropsHandlerFunc))

	// GET /api/drops/{dropID} (GetDropAndTargets)
	getDropAndTargetsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetDropAndTargets(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/drops/{dropID}", auth.RequireAuth(cfg, getDropAndTargetsHandlerFunc))

	// POST /api/droptargets (AddDropTarget)
	addDropTargetHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.AddDropTarget(dbQueries, w, r)
	}
	mux.HandleFunc("POST /api/droptargets", auth.RequireAuth(cfg, addDropTargetHandlerFunc))

	// Handlers for getting the target types
	// GET /api/divisions
	getDivisionsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetDivisions(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/divisions", auth.RequireAuth(cfg, getDivisionsHandlerFunc))
	// GET /api/yeargroups
	getYearGroupsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetYearGroups(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/yeargroups", auth.RequireAuth(cfg, getYearGroupsHandlerFunc))
	// GET /api/classes
	getClassesHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetClasses(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/classes", auth.RequireAuth(cfg, getClassesHandlerFunc))
	// GET /api/pupils
	getPupilsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetPupils(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/pupils", auth.RequireAuth(cfg, getPupilsHandlerFunc))

	// GET /api/settings/me
	getUserSettings := func(w http.ResponseWriter, r *http.Request) {
		settings.GetMySettings(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/settings/me", auth.RequireAuth(cfg, getUserSettings))

	// PUT /api/settings/me/preferences
	upsertUserSettings := func(w http.ResponseWriter, r *http.Request) {
		settings.UpdateUserSettings(dbQueries, w, r)
	}
	mux.HandleFunc("PUT /api/settings/me/preferences", auth.RequireAuth(cfg, upsertUserSettings))

	// PUT /api/settings/me/subscriptions
	updateTargetSubscriptions := func(w http.ResponseWriter, r *http.Request) {
		settings.UpdateTargetSubscriptions(db, dbQueries, w, r)
	}
	mux.HandleFunc("PUT /api/settings/me/subscriptions", auth.RequireAuth(cfg, updateTargetSubscriptions))

	// Web handlers

	// Public web handlers
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "public/index.html")
	})

	// Private web handlers
	dropsPageHandler := func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "public/drops.html")
	}
	mux.HandleFunc("/drops", dropsPageHandler)

	adminPageHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		serveAdminPage(w, r)
	}
	mux.HandleFunc("GET /admin", adminPageHandlerFunc)

	// Get the current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}
	// Construct the path to the "public" directory
	publicDir := filepath.Join(cwd, "public")

	// Create a file server to serve static files from the "public" directory.
	fs := http.FileServer(http.Dir(publicDir))

	// Serve static files from /static/
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// Start the server on port 8080.
	listenAddr := ":" + cfg.Port
	log.Printf("Server listening on %s", listenAddr)
	err = http.ListenAndServe(listenAddr, mux) // Use the mux multiplexer
	if err != nil {
		log.Fatal(err)
	}
}

func serveAdminPage(w http.ResponseWriter, r *http.Request) {
	// No role check needed here - that happens in admin.html's JS via API call
	filePath := "./public/admin.html" // Adjust path as needed
	http.ServeFile(w, r, filePath)
}
