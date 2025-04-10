package api_test

import (
	"context"
	"database/sql"
	"log"
	"testing"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func seedTestUser(t *testing.T, db *sql.DB, email string, rawPassword string, isAdmin bool) uuid.UUID {
	t.Helper() // mark this as test helper function

	if testDB == nil {
		t.Fatalf("Test database connection pool (testDB) is nil")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(rawPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password for test user %s: %v", email, err)
	}

	q := database.New(db)
	var userRole string
	if isAdmin {
		userRole = "admin"
	} else {
		userRole = "user"
	}
	params := database.CreateUserParams{
		Email:          email,
		HashedPassword: string(hashedPassword),
		Role:           database.UserRole(userRole),
		Title:          "Ms",
		FirstName:      "Test",
		Surname:        "User",
	}

	user, err := q.CreateUser(context.Background(), params)
	if err != nil {
		t.Fatalf("Failed to seed user %s using sqlc CreateUser: %v", email, err)
	}

	log.Printf("Seeded user %s with ID %s\n", email, user.ID)
	return user.ID
}
