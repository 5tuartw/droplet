package pupils

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func GetAllPupils(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, roleOk := contextValueRole.(string)
	contextValueID := r.Context().Value(auth.UserIDKey)
	editorUserID, editorOk := contextValueID.(uuid.UUID)

	if !(schoolOk && roleOk && editorOk) {
		log.Println("Error: one or more values not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	if !(requesterRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user %s attempted to access GetAllPupils", editorUserID)
		return
	}

	pupils, err := dbq.GetAllPupils(r.Context(), requesterSchoolID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("No pupils found for school %s", requesterSchoolID)
			helpers.RespondWithJSON(w, http.StatusOK, []models.Pupil{})
			return
		} else {
			log.Printf("Database error fetching pupils for school %s: %v", requesterSchoolID, err)
			helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to get users", err)
		}
		return
	}

	responsePayload := make([]models.Pupil, 0, len(pupils))
	for _, row := range pupils {
		pupil := models.Pupil{
			ID:        row.ID,
			FirstName: row.FirstName,
			Surname:   row.Surname,
			ClassName: row.ClassName,
			ClassID:   row.ClassID.Int32,
			SchoolID:  row.SchoolID,
		}
		responsePayload = append(responsePayload, pupil)
	}

	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)

}

func UpdatePupil(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, roleOk := contextValueRole.(string)
	contextValueID := r.Context().Value(auth.UserIDKey)
	editorUserID, editorOk := contextValueID.(uuid.UUID)

	if !(schoolOk && roleOk && editorOk) {
		log.Println("Error: one or more values not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}
	targetPupilID, err := strconv.Atoi(r.PathValue("pupilID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse pupil ID in path", err)
		return
	}

	if !(requesterRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user %s attempted to edit pupil %d", editorUserID, targetPupilID)
		return
	}

	var requestBody struct {
		FirstName string `json:"first_name"`
		Surname   string `json:"surname"`
		ClassID   int32  `json:"class_id"`
	}

	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request", err)
		return
	}

	isValidClass, err := dbq.CountValidClassesForSchool(r.Context(), database.CountValidClassesForSchoolParams{
		Column2:  []int32{requestBody.ClassID}, // The class ID from the request
		SchoolID: requesterSchoolID,            // The admin's school ID
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to validate class ID", err)
		return
	}
	if isValidClass == 0 {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid Class ID provided for this school", nil)
		return
	}

	if requestBody.FirstName == "" || requestBody.Surname == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "First name and surname cannot be empty", nil)
		return
	}

	err = dbq.UpdatePupil(r.Context(), database.UpdatePupilParams{
		ID:        int32(targetPupilID),
		SchoolID:  requesterSchoolID,
		FirstName: requestBody.FirstName,
		Surname:   requestBody.Surname,
		ClassID:   sql.NullInt32{Int32: requestBody.ClassID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "Pupil not found to update", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not update pupil", err)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeletePupil(db *sql.DB, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, roleOk := contextValueRole.(string)
	contextValueID := r.Context().Value(auth.UserIDKey)
	editorUserID, editorOk := contextValueID.(uuid.UUID)

	if !(schoolOk && roleOk && editorOk) {
		log.Println("Error: one or more values not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}
	targetPupilID, err := strconv.Atoi(r.PathValue("pupilID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse pupil ID in path", err)
		return
	}

	if !(requesterRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user %s attempted to delete pupil %d", editorUserID, targetPupilID)
		return
	}

	// begin transaction
	tx, err := db.BeginTx(r.Context(), nil)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not start database transaction", err)
		return
	}
	defer func() {
		if p := recover(); p != nil {
			log.Println("Recovered from panic, rolling back transaction")
			tx.Rollback()
			panic(p)
		} else if err != nil {
			log.Printf("Error occurred, rolling back transaction: %v", err)
			tx.Rollback()
		} else {
			err = tx.Commit()
			if err != nil {
				log.Printf("Failed to commit transaction: %v", err)
			} else {
				log.Println("Transaction committed successfully.")
			}
		}
	}()

	qtx := dbq.WithTx(tx)

	err = qtx.RemoveTarget(r.Context(), database.RemoveTargetParams{
		SchoolID: requesterSchoolID,
		Type:     "Student",
		TargetID: sql.NullInt32{Int32: int32(targetPupilID), Valid: true},
	})
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not delete target", err)
			return
		}
	}

	err = qtx.DeletePupil(r.Context(), database.DeletePupilParams{
		ID:       int32(targetPupilID),
		SchoolID: requesterSchoolID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "Pupil not found to delete", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not delete pupil", err)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
