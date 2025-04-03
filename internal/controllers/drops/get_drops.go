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
	rows, err := dbq.GetActiveDropsWithTargets(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}
	aggregatedDrops := database.AggregateDropRows(rows)
	helpers.RespondWithJSON(w, http.StatusOK, aggregatedDrops)
}

func GetDropsForUser(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context or is of wrong type in GetDropsForUser")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	rows, err := dbq.GetDropsForUserWithTargets(r.Context(), uuid.NullUUID{UUID: userID, Valid: true})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}
	aggregatedDrops := database.AggregateCurrentUserDropRows(rows)
	helpers.RespondWithJSON(w, http.StatusOK, aggregatedDrops)
}

func GetDropAndTargets(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	dropID, err := uuid.Parse(r.PathValue("dropID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid Drop ID", err)
		return
	}

	rows, err := dbq.GetDropWithTargetsByID(r.Context(), dropID)
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
