package config

import (
	"database/sql"
	"log"
	"os"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type ApiConfig struct {
	JWTSecret   string
	DevMode     bool
	DevModeUser *models.User
	Port        string
	IsDemoMode  bool
}

func LoadConfig() (*ApiConfig, *database.Queries, *sql.DB) {
	err := godotenv.Load()
	if err != nil {
		log.Printf("Info: No .env file found or error loading: %v. Relying on system environment variables.", err)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("FATAL: DATABASE_URL environment variable is required but not set.")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("FATAL: Error opening database connection (driver/dsn issue): %v", err)
	}

	err = db.Ping() // verifies a connection can be made
	if err != nil {
		log.Fatalf("FATAL: Could not ping database. Check connection string/DB status: %v", err)
	}
	log.Println("Database connection successful.")

	dbQueries := database.New(db)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// CRITICAL: Fail fast if JWT Secret isn't set.
		log.Fatal("FATAL: JWT_SECRET environment variable is required but not set.")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default if not set
		log.Println("Info: PORT environment variable not set, defaulting to 8080")
	}

	isDemo := os.Getenv("DEMO_MODE") == "true"
	log.Printf("Demo mode active: %t", isDemo)

	cfg := ApiConfig{
		JWTSecret:   jwtSecret,
		DevMode:     os.Getenv("PLATFORM") == "DEV",
		DevModeUser: nil,
		Port:        port,
		IsDemoMode:  isDemo,
	}

	return &cfg, dbQueries, db
}
