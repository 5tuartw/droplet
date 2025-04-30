package school_structure

import (
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

func GetClasses(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusBadRequest, "School id missing from context", nil)
		return
	}

	classes, err := dbq.GetClasses(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up classes", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, classes)
}

func CreateClass(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	var requestBody struct {
		ClassName   string `json:"class_name"`
		YearGroupID int32  `json:"year_group_id"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	defer r.Body.Close()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}
	if requestBody.ClassName == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Class name cannot be empty", nil)
		return
	}

	err = CheckYearGroupID(dbq, r.Context(), schoolID, requestBody.YearGroupID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not add class to year group", err)
		return
	}

	newClass, err := dbq.CreateClass(r.Context(), database.CreateClassParams{
		ClassName:   requestBody.ClassName,
		YearGroupID: sql.NullInt32{Int32: requestBody.YearGroupID, Valid: true},
		SchoolID:    schoolID,
	})
	if err != nil {
		// Check for unique violation (Example using lib/pq)
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			helpers.RespondWithError(w, http.StatusConflict, "Class name already exists in this scope", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Unable to create new class", err)
		}
		return
	}

	helpers.RespondWithJSON(w, http.StatusCreated, newClass)
}

func UpdateClass(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if cfg.IsDemoMode {
		log.Println("Attempted class update in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Class updating is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	targetClassIDStr := r.PathValue("classID")
	targetClassIDint, err := strconv.Atoi(targetClassIDStr)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid class ID format in path", err)
		return
	}
	targetClassID := int32(targetClassIDint)

	var requestBody struct {
		ClassName   string `json:"class_name"`
		YearGroupID int32  `json:"year_group_id"`
	}
	err = json.NewDecoder(r.Body).Decode(&requestBody)
	defer r.Body.Close()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}
	err = CheckYearGroupID(dbq, r.Context(), schoolID, requestBody.YearGroupID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Year group ID not valid", err)
		return
	}
	if requestBody.ClassName == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Class name cannot be empty", nil)
		return
	}

	_, err = dbq.UpdateClass(r.Context(), database.UpdateClassParams{
		ClassName:   requestBody.ClassName,
		YearGroupID: sql.NullInt32{Int32: requestBody.YearGroupID, Valid: true},
		ID:          targetClassID,
		SchoolID:    schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Unable to update class", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeleteClass(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if cfg.IsDemoMode {
		log.Println("Attempted class deletion in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Class deletion is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOK := contextValueSchool.(uuid.UUID)

	if !schoolOK {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Value missing from context", nil)
		return
	}

	targetClassIDstr := r.PathValue("classID")
	targetClassIDint, err := strconv.Atoi(targetClassIDstr)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid class ID format in path", err)
		return
	}
	targetClassID := int32(targetClassIDint)

	// check pupils
	pupilCount, err := dbq.CountPupilsInClass(r.Context(), database.CountPupilsInClassParams{
		ClassID:  sql.NullInt32{Int32: targetClassID, Valid: true},
		SchoolID: schoolID,
	})
	if err != nil {
		log.Printf("Error deleting class %d from school %s: %v", targetClassID, schoolID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to check for pupils", err)
		return
	}
	if pupilCount > 0 {
		log.Printf("Deletion forbidden: Class %d still has %d pupil(s) associated.", targetClassID, pupilCount)
		helpers.RespondWithError(w, http.StatusConflict, fmt.Sprintf("Cannot delete class: %d pupil(s) still assigned.", pupilCount), errors.New("conflict: child records exist"))
		return
	}

	rowsAffected, err := dbq.DeleteClass(r.Context(), database.DeleteClassParams{
		ID:       targetClassID,
		SchoolID: schoolID,
	})
	if err != nil {
		log.Printf("Error deleting class %d: %v", targetClassID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error deleting class", err)
		return
	}
	if rowsAffected == 0 {
		// Class ID didn't exist OR didn't match the school ID
		helpers.RespondWithError(w, http.StatusNotFound, "Class not found within scope", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
