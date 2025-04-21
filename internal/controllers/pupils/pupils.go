package pupils

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func GetAllPupils(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)

	if !schoolOk {
		log.Println("Error: one or more values not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
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
