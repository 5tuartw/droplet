package main

import (
	"net/http"
	//"time"
	"log"
	//"fmt"

	"html/template"
	"os"
	"path/filepath"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/drops"
	"github.com/5tuartw/droplet/internal/controllers/targets"
	"github.com/5tuartw/droplet/internal/controllers/users"
	"github.com/5tuartw/droplet/internal/database"
	_ "github.com/lib/pq"
)

func main() {

	cfg, dbQueries, db := config.LoadConfig()
	defer db.Close()

	mux := http.NewServeMux()

	// API handlers
	/*mux.HandleFunc("GET /api/users/{userID}", func(w http.ResponseWriter, r *http.Request) {
		users.GetUserById(&cfg, dbQueries, w, r)
	})*/ //unnecessary?

	// Public API Handlers
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		auth.Login(&cfg, dbQueries, w, r)
	})
	mux.HandleFunc("/api/token/refresh", func(w http.ResponseWriter, r *http.Request) {
		auth.Refresh(&cfg, dbQueries, w, r)
	})
	mux.HandleFunc("/api/token/revoke", func(w http.ResponseWriter, r *http.Request) {
		auth.Revoke(&cfg, dbQueries, w, r)
	})

	// Private API Handlers

	// GET /api/users (GetUsers)
	getUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.GetUsers(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/users", auth.RequireAuth(&cfg, getUserHandlerFunc))

	// PUT /api/users (ChangePasswordOrRole)
	changePasswordOrRoleHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangePasswordOrRole(dbQueries, w, r)
	}
	mux.HandleFunc("PUT /api/users", auth.RequireAuth(&cfg, changePasswordOrRoleHandlerFunc))

	// DELETE /api/users (DeleteUsers)
	deleteUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.DeleteUsers(&cfg, dbQueries, w, r)
	}
	mux.HandleFunc("DELETE /api/users", auth.RequireAuth(&cfg, deleteUserHandlerFunc))

	// POST /api/users (CreateUser)
	createUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.CreateUser(dbQueries, w, r)
	}
	mux.HandleFunc("POST /api/users", auth.RequireAuth(&cfg, createUserHandlerFunc))

	// POST /api/drops (CreateDrop)
	createDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.CreateDrop(db, dbQueries, w, r)
	}
	mux.HandleFunc("POST /api/drops", auth.RequireAuth(&cfg, createDropHandlerFunc))

	// DELETE /api/drops/{dropID} (DeleteDrop)
	deleteDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.DeleteDrop(dbQueries, w, r)
	}
	mux.HandleFunc("DELETE /api/drops/{dropID}", auth.RequireAuth(&cfg, deleteDropHandlerFunc))

	// PUT /api/drops{dropID} (UpdateDrop)
	updateDropHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.UpdateDrop(db, dbQueries, w, r)
	}
	mux.HandleFunc("PUT /api/drops/{dropID}", auth.RequireAuth(&cfg, updateDropHandlerFunc))

	// GET /api/drops (GetActiveDrops) - Assuming this needs auth
	getActiveDropsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetActiveDrops(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/drops", auth.RequireAuth(&cfg, getActiveDropsHandlerFunc))

	// GET /api/mydrops (GetDropsForUser)
	getDropsForUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetDropsForUser(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/mydrops", auth.RequireAuth(&cfg, getDropsForUserHandlerFunc))

	// GET /api/drops/{dropID} (GetDropAndTargets)
	getDropAndTargetsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.GetDropAndTargets(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/drops/{dropID}", auth.RequireAuth(&cfg, getDropAndTargetsHandlerFunc))

	// POST /api/droptargets (AddDropTarget)
	addDropTargetHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		drops.AddDropTarget(dbQueries, w, r)
	}
	mux.HandleFunc("POST /api/droptargets", auth.RequireAuth(&cfg, addDropTargetHandlerFunc))

	// Handlers for getting the target types
	// GET /api/divisions
	getDivisionsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetDivisions(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/divisions", auth.RequireAuth(&cfg, getDivisionsHandlerFunc))
	// GET /api/yeargroups
	getYearGroupsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetYearGroups(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/yeargroups", auth.RequireAuth(&cfg, getYearGroupsHandlerFunc))
	// GET /api/classes
	getClassesHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetClasses(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/classes", auth.RequireAuth(&cfg, getClassesHandlerFunc))
	// GET /api/pupils
	getPupilsHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		targets.GetPupils(dbQueries, w, r)
	}
	mux.HandleFunc("GET /api/pupils", auth.RequireAuth(&cfg, getPupilsHandlerFunc))

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

	mux.HandleFunc("/users", auth.RequireAuth(&cfg, usersHandler(&cfg, dbQueries)))

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
	log.Println("Server listening on :8080")
	err = http.ListenAndServe(":8080", mux) // Use the mux multiplexer
	if err != nil {
		log.Fatal(err)
	}
}

func usersHandler(c *config.ApiConfig, dbq *database.Queries) http.HandlerFunc {
	//NEEDS check someone is logged in (dev or admin)
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := dbq.GetUsers(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		tmpl, err := template.ParseFiles("templates/users.html")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		tmpl.Execute(w, users)
	}
}
