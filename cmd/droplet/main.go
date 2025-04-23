package main

import (
	"net/http"
	//"time"
	"log"
	//"fmt"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/router"
	_ "github.com/lib/pq"
)

func main() {

	cfg, dbQueries, db := config.LoadConfig()
	defer db.Close()

	mux := router.NewRouter(cfg, db, dbQueries)

	// Start the server on port 8080.
	listenAddr := ":" + cfg.Port
	log.Printf("Server listening on %s", listenAddr)
	err := http.ListenAndServe(listenAddr, mux) // Use the mux multiplexer
	if err != nil {
		log.Fatal(err)
	}
}
