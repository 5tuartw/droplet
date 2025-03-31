package main

import (
	"net/http"
	//"time"
	"log"
	//"fmt"
	"database/sql"
	"html/template"
	"os"
	"path/filepath"
	"time"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/drops"
	"github.com/5tuartw/droplet/internal/controllers/users"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Println("Error opening database:", err)
		return
	}

	defer db.Close()

	dbQueries := database.New(db)

	if dbQueries == nil {
		log.Fatal("dbQueries is nil")
	}

	cfg := config.ApiConfig{
		DB:          dbQueries,
		JWTSecret:   os.Getenv("JWT_SECRET"),
		DevMode:     os.Getenv("PLATFORM") == "DEV",
		DevModeUser: nil,
	}

	mux := http.NewServeMux()

	// API handlers
	mux.HandleFunc("POST /api/users", func(w http.ResponseWriter, r *http.Request) {
		users.CreateUser(&cfg, w, r)
	})
	mux.HandleFunc("GET /api/users", func(w http.ResponseWriter, r *http.Request) {
		users.GetUsers(&cfg, w, r)
	})
	mux.HandleFunc("GET /api/users/{userID}", func(w http.ResponseWriter, r *http.Request) {
		users.GetUserById(&cfg, w, r)
	})
	mux.HandleFunc("PUT /api/users", func(w http.ResponseWriter, r *http.Request) {
		users.ChangePasswordOrRole(&cfg, w, r)
	})
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		auth.Login(&cfg, w, r)
	})
	mux.HandleFunc("/api/token/refresh", func(w http.ResponseWriter, r *http.Request) {
		auth.Refresh(&cfg, w, r)
	})
	mux.HandleFunc("/api/token/revoke", func(w http.ResponseWriter, r *http.Request) {
		auth.Revoke(&cfg, w, r)
	})
	mux.HandleFunc("POST /api/drops", func(w http.ResponseWriter, r *http.Request) {
		drops.CreateDrop(&cfg, w, r)
	})

	// Web handlers
	mux.HandleFunc("/", indexHandler)
	mux.HandleFunc("/users", usersHandler(dbQueries))

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

func indexHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := struct {
		CurrentTime string
	}{
		CurrentTime: time.Now().Format(time.RFC1123),
	}

	tmpl.Execute(w, data)
}

func usersHandler(db database.UserDB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := db.GetUsers(r.Context())
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
