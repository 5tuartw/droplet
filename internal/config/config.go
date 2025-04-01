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
}

func LoadConfig() (ApiConfig, *database.Queries, *sql.DB) {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	dbURL := os.Getenv("DB_URL")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Error opening database:", err)
	}

	dbQueries := database.New(db)
	if dbQueries == nil {
		log.Fatal("dbQueries is nil")
	}

	cfg := ApiConfig{
		JWTSecret:   os.Getenv("JWT_SECRET"),
		DevMode:     os.Getenv("PLATFORM") == "DEV",
		DevModeUser: nil,
	}

	return cfg, dbQueries, db
}
