package drops

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/google/uuid"
)

func GetActiveDrops(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)
	if !schoolOk {
		log.Println("Error: school id not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	rows, err := dbq.GetActiveDropsWithTargets(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}
	aggregatedDrops := database.AggregateDropRows(rows)
	helpers.RespondWithJSON(w, http.StatusOK, aggregatedDrops)
}

func GetUpcomingDrops(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)
	if !schoolOk {
		log.Println("Error: school id not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	rows, err := dbq.GetUpcomingDropsWithTargets(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}
	aggregatedDrops := database.AggregateUpcomingDropRows(rows)
	helpers.RespondWithJSON(w, http.StatusOK, aggregatedDrops)
}

func GetDropsForUser(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueID := r.Context().Value(auth.UserIDKey)
	userID, idOk := contextValueID.(uuid.UUID)
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)

	if !idOk || !schoolOk {
		log.Println("Error: one or more value not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	rows, err := dbq.GetDropsForUserWithTargets(r.Context(), database.GetDropsForUserWithTargetsParams{
		UserID: userID,
		SchoolID: schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}
	aggregatedDrops := database.AggregateCurrentUserDropRows(rows)
	helpers.RespondWithJSON(w, http.StatusOK, aggregatedDrops)
}

func GetDropAndTargets(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)
	if !schoolOk {
		log.Println("Error: school id not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	dropID, err := uuid.Parse(r.PathValue("dropID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid Drop ID", err)
		return
	}

	rows, err := dbq.GetDropWithTargetsByID(r.Context(), database.GetDropWithTargetsByIDParams{
		ID: dropID,
		SchoolID: schoolID,
	})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Printf("Database error fetching drop %s: %v", dropID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Database error", err)
		return
	}

	aggregateDropTargets := database.AggregateDropAndTargetRows(rows)
	if len(aggregateDropTargets) == 0 {
		helpers.RespondWithError(w, http.StatusNotFound, "Drop not found", nil)
		return
	}

	helpers.RespondWithJSON(w, http.StatusOK, aggregateDropTargets[0])
}
