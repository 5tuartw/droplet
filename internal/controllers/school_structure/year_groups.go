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
	"github.com/lib/pq"
)

func GetYearGroups(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusBadRequest, "School id missing from context", nil)
		return
	}
	yearGroups, err := dbq.GetYearGroups(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up year groups", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, yearGroups)
}

func CheckYearGroupID(dbq *database.Queries, ctx context.Context, schoolID uuid.UUID, yearGroupID int32) error {
	_, err := dbq.GetYearGroupByID(ctx, database.GetYearGroupByIDParams{
		ID:       yearGroupID,
		SchoolID: schoolID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("year group ID %d not found in school %s", yearGroupID, schoolID)
		}
		log.Printf("DB error checking year group ID %d for school %s: %v", yearGroupID, schoolID, err)
		return fmt.Errorf("database error checking year group ID")
	}
	return nil
}

func CreateYearGroup(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	var requestBody struct {
		YearGroupName string `json:"year_group_name"`
		DivisionID    int32  `json:"division_id"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	defer r.Body.Close()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}
	if requestBody.YearGroupName == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Year group name cannot be empty", nil)
		return
	}

	err = CheckDivisionID(dbq, r.Context(), schoolID, requestBody.DivisionID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not add year group to division", err)
		return
	}

	newYearGroup, err := dbq.CreateYearGroup(r.Context(), database.CreateYearGroupParams{
		YearGroupName: requestBody.YearGroupName,
		DivisionID:    sql.NullInt32{Int32: requestBody.DivisionID, Valid: true},
		SchoolID:      schoolID,
	})
	if err != nil {
		// Check for unique violation (Example using lib/pq)
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			helpers.RespondWithError(w, http.StatusConflict, "Year group name already exists in this scope", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Unable to create new year group", err)
		}
		return
	}

	helpers.RespondWithJSON(w, http.StatusCreated, newYearGroup)
}

func RenameYearGroup(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if cfg.IsDemoMode {
		log.Println("Attempted year group update in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Year group updating is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	targetYearGroupIDStr := r.PathValue("yeargroupID")
	targetYearGroupIDint, err := strconv.Atoi(targetYearGroupIDStr)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid year group ID format in path", err)
		return
	}
	targetYearGroupID := int32(targetYearGroupIDint)

	var requestBody struct {
		YearGroupName string `json:"year_group_name"`
	}
	err = json.NewDecoder(r.Body).Decode(&requestBody)
	defer r.Body.Close()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}
	
	if requestBody.YearGroupName == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Year group name cannot be empty", nil)
		return
	}

	_, err = dbq.RenameYearGroup(r.Context(), database.RenameYearGroupParams{
		YearGroupName: requestBody.YearGroupName,
		ID:            targetYearGroupID,
		SchoolID:      schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Unable to update year group", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func MoveYearGroup(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if cfg.IsDemoMode {
		log.Println("Attempted year group update in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Year group updating is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	targetYearGroupIDStr := r.PathValue("yeargroupID")
	targetYearGroupIDint, err := strconv.Atoi(targetYearGroupIDStr)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid year group ID format in path", err)
		return
	}
	targetYearGroupID := int32(targetYearGroupIDint)

	var requestBody struct {
		DivisionID    int32  `json:"division_id"`
	}
	err = json.NewDecoder(r.Body).Decode(&requestBody)
	defer r.Body.Close()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}
	err = CheckDivisionID(dbq, r.Context(), schoolID, requestBody.DivisionID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Division ID not valid", err)
		return
	}

	_, err = dbq.MoveYearGroup(r.Context(), database.MoveYearGroupParams{
		DivisionID:    sql.NullInt32{Int32: requestBody.DivisionID, Valid: true},
		ID:            targetYearGroupID,
		SchoolID:      schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Unable to update year group", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeleteYearGroup(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if cfg.IsDemoMode {
		log.Println("Attempted year group deletion in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Year group deletion is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	targetYearGroupIDstr := r.PathValue("yeargroupID")
	targetYearGroupIDint, err := strconv.Atoi(targetYearGroupIDstr)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid year group ID format in path", err)
		return
	}
	targetYearGroupID := int32(targetYearGroupIDint)

	// check year groups
	classesCount, err := dbq.CountClassesInYearGroup(r.Context(), database.CountClassesInYearGroupParams{
		YearGroupID: sql.NullInt32{Int32: targetYearGroupID, Valid: true},
		SchoolID:    schoolID,
	})
	if err != nil {
		log.Printf("Error deleting year group %d from school %s: %v", targetYearGroupID, schoolID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to check for classes", err)
		return
	}
	if classesCount > 0 {
		log.Printf("Deletion forbidden: Year group %d still has %d class(es) associated.", targetYearGroupID, classesCount)
		helpers.RespondWithError(w, http.StatusConflict, fmt.Sprintf("Cannot delete year group: %d class(es) still assigned.", classesCount), errors.New("conflict: child records exist"))
		return
	}

	rowsAffected, err := dbq.DeleteYearGroup(r.Context(), database.DeleteYearGroupParams{
		ID:       targetYearGroupID,
		SchoolID: schoolID,
	})
	if err != nil {
		log.Printf("Error deleting year group %d: %v", targetYearGroupID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error deleting year group", err)
		return
	}
	if rowsAffected == 0 {
		// Year group ID didn't exist OR didn't match the school ID
		helpers.RespondWithError(w, http.StatusNotFound, "Year group not found within scope", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
