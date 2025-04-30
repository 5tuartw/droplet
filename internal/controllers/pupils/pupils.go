package pupils

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
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

func GetPupils(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusBadRequest, "School id missing from context", nil)
		return
	}

	pupils, err := dbq.GetPupils(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up pupils", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, pupils)
}

func UpdatePupil(cfg *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, roleOk := contextValueRole.(string)

	if !schoolOk || roleOk {
		log.Println("Error: school ID or role not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	if !(requesterRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user attempted to access UpdatePupil")
		return
	}

	targetPupilID, err := strconv.Atoi(r.PathValue("pupilID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse pupil ID in path", err)
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

func DeletePupil(cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, roleOk := contextValueRole.(string)

	if !schoolOk || roleOk {
		log.Println("Error: school ID or role not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	if !(requesterRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user attempted to access DeletePupil")
		return
	}

	targetPupilID, err := strconv.Atoi(r.PathValue("pupilID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse pupil ID in path", err)
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

func AddPupil(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, roleOk := contextValueRole.(string)

	if !schoolOk || roleOk {
		log.Println("Error: school ID or role not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	if !(requesterRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user attempted to access AddPupil")
		return
	}

	var requestBody struct {
		FirstName string `json:"first_name"`
		Surname   string `json:"surname"`
		ClassID   int32  `json:"class_id"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}

	if requestBody.FirstName == "" || requestBody.Surname == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "First name and surname are required", nil)
		return
	}
	if requestBody.ClassID <= 0 {
		helpers.RespondWithError(w, http.StatusBadRequest, "A valid Class ID is required", nil)
		return
	}

	// to add check valid class id

	newPupil, err := dbq.CreatePupil(r.Context(), database.CreatePupilParams{
		FirstName: requestBody.FirstName,
		Surname:   requestBody.Surname,
		ClassID:   sql.NullInt32{Int32: requestBody.ClassID, Valid: true},
		SchoolID:  requesterSchoolID,
	})
	if err != nil {
		log.Printf("Error creating pupil in school %s: %v", requesterSchoolID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not create pupil", err)
		return
	}

	responsePayload := models.Pupil{
		ID:        newPupil.ID,
		FirstName: newPupil.FirstName,
		Surname:   newPupil.Surname,
		ClassID:   newPupil.ClassID.Int32,
	}

	helpers.RespondWithJSON(w, http.StatusCreated, responsePayload)

}

func GetPupil(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)

	if !schoolOk {
		log.Println("Error: school ID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	targetPupilID, err := strconv.Atoi(r.PathValue("pupilID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse pupil ID in path", err)
		return
	}

	pupil, err := dbq.GetPupil(r.Context(), database.GetPupilParams{
		ID:       int32(targetPupilID),
		SchoolID: requesterSchoolID,
	})
	if err != nil {
		// Check if the error is "not found"
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "Pupil not found", err)
		} else {
			// Other potential database errors
			log.Printf("Database error fetching pupil %d: %v", targetPupilID, err) // Log the error
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch pupil data", err)
		}
		return
	}

	responsePayload := models.Pupil{
		ID:        pupil.ID,
		FirstName: pupil.FirstName,
		Surname:   pupil.Surname,
		ClassID:   pupil.ClassID.Int32,
		SchoolID:  pupil.SchoolID,
		ClassName: pupil.ClassName.String,
	}

	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)

}
