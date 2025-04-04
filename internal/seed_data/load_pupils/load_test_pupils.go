package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/models"
)

func main() {
	_, dbq, db := config.LoadConfig()
	defer db.Close()

	pupils, err := loadPupilsFromCSV("internal/seed_data/test_pupils.csv", dbq)
	if err != nil {
		log.Fatalf("Error loading pupils from csv: %v", err)
	}

	err = insertPupils(dbq, pupils)
	if err != nil {
		log.Fatalf("Error inserting pupil: %v", err)
	}

	fmt.Println("Successfully loaded test pupils!")
}

func loadPupilsFromCSV(filename string, dbq *database.Queries) ([]models.Pupil, error) {
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

	expectedHeaders := []string{"class", "first_name", "surname"}
	if len(header) != len(expectedHeaders) {
		return nil, errors.New("invalid CSV header count")
	}
	for i, h := range header {
		if h != expectedHeaders[i] {
			return nil, fmt.Errorf("invalid CSV header: expected '%s', got '%s'", expectedHeaders[i], h)
		}
	}

	var pupils []models.Pupil
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading record: %w", err)
		}

		if len(record) < 3 {
			return nil, errors.New("invalid CSV record format")
		}
		ctx := context.Background()
		classId, err := dbq.GetClassID(ctx, record[0])
		if err != nil {
			return nil, fmt.Errorf("could not look up class name %v: %w", record[0], err)
		}
		pupil := models.Pupil{
			ClassID:   int(classId),
			FirstName: record[1],
			Surname:   record[2],
		}
		pupils = append(pupils, pupil)
	}

	return pupils, nil
}

func insertPupils(dbq *database.Queries, pupils []models.Pupil) error {
	ctx := context.Background()
	for _, pupil := range pupils {
		_, err := dbq.CreatePupil(ctx, database.CreatePupilParams{
			FirstName: pupil.FirstName,
			Surname:   pupil.Surname,
			ClassID:   sql.NullInt32{Int32: int32(pupil.ClassID), Valid: true},
		})
		if err != nil {
			return fmt.Errorf("error inserting user %s %s: %w", pupil.FirstName, pupil.Surname, err)
		}
	}

	return nil
}
