package router

import (
	"database/sql" // db is passed down, but might not be needed directly here
	"log"          // For logging errors
	"net/http"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
)

func registerWebRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// --- Static File Server ---
	// Use relative path from where the binary runs. Assumes binary runs from project root.
	// If running from cmd/api/, the path might need to be "../public"
	// Using "./public" is common if structured appropriately. Adjust if needed.
	const publicDir = "./public"
	fs := http.FileServer(http.Dir(publicDir))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))
	log.Println("Serving static files from:", publicDir)

	// --- Root Path (Public) ---
	rootHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// ServeFile typically only responds to GET/HEAD anyway.
		// You could add strict checks, but often not needed just for ServeFile:
		// if r.Method != http.MethodGet && r.Method != http.MethodHead {
		//     http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		//     return
		// }
		// Check if path is exactly "/" if you don't want this handler catching /some-other-path
		// if r.URL.Path != "/" {
		//     http.NotFound(w, r)
		//     return
		// }

		indexPath := publicDir + "/index.html" // Or use filepath.Join
		http.ServeFile(w, r, indexPath)
	})
	// Register using Handle
	mux.Handle("/", rootHandler)

	// Drops Page
	dropsPageHandler := func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, publicDir+"/drops.html")
	}
	mux.HandleFunc("GET /drops", dropsPageHandler) // Keep HandleFunc here

	// Admin Page
	adminPageHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		serveAdminPage(w, r)
	}
	mux.HandleFunc("GET /admin", adminPageHandlerFunc)

}

func serveAdminPage(w http.ResponseWriter, r *http.Request) {
	// Assumes auth middleware already verified admin status
	filePath := "./public/admin.html" // Adjust path as needed
	http.ServeFile(w, r, filePath)
}
