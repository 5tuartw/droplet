package main

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

var testSchoolID = uuid.MustParse("4adc3aaf-8f42-4ef8-a800-46ab05dfaf58")

func main() {
	_, dbq, db := config.LoadConfig()
	defer db.Close()

	users, err := loadUsersFromCSV("internal/seed_data/test_teachers.csv")
	if err != nil {
		log.Fatalf("Error loading users from csv: %v", err)
	}

	err = insertUsers(dbq, users)
	if err != nil {
		log.Fatalf("Error inserting users: %v", err)
	}

	fmt.Println("Successfully loaded test users!")
}

func loadUsersFromCSV(filename string) ([]models.User, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("error opening file: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	header, err := reader.Read()
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("error reading header: %w", err)
	}

	expectedHeaders := []string{"title", "first_name", "surname", "email", "password", "role"}
	if len(header) != len(expectedHeaders) {
		return nil, errors.New("invalid CSV header count")
	}
	for i, h := range header {
		if h != expectedHeaders[i] {
			return nil, fmt.Errorf("invalid CSV header: expected '%s', got '%s'", expectedHeaders[i], h)
		}
	}

	var users []models.User
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading record: %w", err)
		}

		if len(record) < 6 {
			return nil, errors.New("invalid CSV record format")
		}

		hashedPassword, err := auth.HashPassword(record[4])
		if err != nil {
			return nil, fmt.Errorf("error hashing password for %s: %w", record[3], err)
		}

		user := models.User{
			Title:          record[0],
			FirstName:      record[1],
			Surname:        record[2],
			Email:          record[3],
			Role:           record[5],
			HashedPassword: string(hashedPassword),
			SchoolID:       testSchoolID,
		}
		users = append(users, user)
	}

	return users, nil
}

func insertUsers(dbq *database.Queries, users []models.User) error {
	ctx := context.Background()
	for _, user := range users {
		_, err := dbq.CreateUser(ctx, database.CreateUserParams{
			SchoolID:       testSchoolID,
			Email:          user.Email,
			HashedPassword: user.HashedPassword,
			Role:           database.UserRole(user.Role),
			Title:          user.Title,
			FirstName:      user.FirstName,
			Surname:        user.Surname,
		})
		if err != nil {
			return fmt.Errorf("error inserting user %s: %w", user.Email, err)
		}
	}

	return nil
}
