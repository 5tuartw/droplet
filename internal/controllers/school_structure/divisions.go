package school_structure

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/google/uuid"
)

func GetDivisions(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusInternalServerError, "School id missing from context", nil)
		return
	}

	divisions, err := dbq.GetDivisions(r.Context(), schoolID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithJSON(w, http.StatusOK, []database.Division{})
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up divisions", err)
		}
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, divisions)
}

func CheckDivisionID(dbq *database.Queries, ctx context.Context, schoolID uuid.UUID, divisionID int32) error {
	_, err := dbq.GetDivisionByID(ctx, database.GetDivisionByIDParams{
		ID:       divisionID,
		SchoolID: schoolID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("division ID %d not found in school %s", divisionID, schoolID)
		}
		log.Printf("DB error checking division ID %d for school %s: %v", divisionID, schoolID, err)
		return fmt.Errorf("database error checking division ID")
	}
	return nil
}

func CreateDivision(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	var requestBody struct {
		DivisionName string `json:"division_name"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	defer r.Body.Close()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}
	if requestBody.DivisionName == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Division name cannot be empty", nil)
		return
	}

	newDivision, err := dbq.CreateDivision(r.Context(), database.CreateDivisionParams{
		DivisionName: requestBody.DivisionName,
		SchoolID:     schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Unable to create new division", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusCreated, newDivision)
}

func RenameDivision(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if cfg.IsDemoMode {
		log.Println("Attempted division update in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Division updating is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	targetDivisionIDstr := r.PathValue("divisionID")
	targetDivisionIDint, err := strconv.Atoi(targetDivisionIDstr)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid division ID format in path", err)
		return
	}
	targetDivisionID := int32(targetDivisionIDint)

	var requestBody struct {
		DivisionName string `json:"division_name"`
	}
	err = json.NewDecoder(r.Body).Decode(&requestBody)
	defer r.Body.Close()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}
	if requestBody.DivisionName == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Division name cannot be empty", nil)
		return
	}

	_, err = dbq.RenameDivision(r.Context(), database.RenameDivisionParams{
		DivisionName: requestBody.DivisionName,
		ID:           targetDivisionID,
		SchoolID:     schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Unable to update division", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeleteDivision(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if cfg.IsDemoMode {
		log.Println("Attempted division deletion in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Division deletion is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	targetDivisionIDstr := r.PathValue("divisionID") // Use your router's way to get path param
	targetDivisionIDint, err := strconv.Atoi(targetDivisionIDstr)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid division ID format in path", err)
		return
	}
	targetDivisionID := int32(targetDivisionIDint)

	// check year groups
	yearGroupsCount, err := dbq.CountYearGroupsInDivision(r.Context(), database.CountYearGroupsInDivisionParams{
		DivisionID: sql.NullInt32{Int32: targetDivisionID, Valid: true},
		SchoolID:   schoolID,
	})
	if err != nil {
		log.Printf("Error deleting division %d from school %s: %v", targetDivisionID, schoolID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to check for year groups", err)
		return
	}
	if yearGroupsCount > 0 {
		log.Printf("Deletion forbidden: Division %d still has %d year group(s) associated.", targetDivisionID, yearGroupsCount)
		helpers.RespondWithError(w, http.StatusConflict, fmt.Sprintf("Cannot delete division: %d year group(s) still assigned.", yearGroupsCount), errors.New("conflict: child records exist"))
		return
	}

	rowsAffected, err := dbq.DeleteDivision(r.Context(), database.DeleteDivisionParams{
		ID:       targetDivisionID,
		SchoolID: schoolID,
	})
	if err != nil {
		log.Printf("Error deleting division %d: %v", targetDivisionID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error deleting division", err)
		return
	}
	if rowsAffected == 0 {
		// Division ID didn't exist OR didn't match the school ID
		helpers.RespondWithError(w, http.StatusNotFound, "Division not found within scope", nil) // Good message
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
