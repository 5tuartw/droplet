package settings

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/controllers/targets"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

type UpdateSubscriptionsRequest struct {
	Targets []models.Target `json:"targets"`
}

func UpdateTargetSubscriptions(db *sql.DB, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueID := r.Context().Value(auth.UserIDKey)
	userID, idOk := contextValueID.(uuid.UUID)
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)

	if !idOk || !schoolOk {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	requestBody := UpdateSubscriptionsRequest{}
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Error decoding json data for update subscriptions", err)
		return
	}

	err = targets.ValidateTargetsBelongToSchool(r.Context(), dbq, schoolID, requestBody.Targets)
	if err != nil {
		log.Printf("Target validation failed for user %s school %s: %v", userID, schoolID, err)
		helpers.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("Invalid target(s) provided: %v", err), err)
		return
	}

	//create transactional query
	tx, err := db.BeginTx(r.Context(), nil)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not start database transaction", err)
		return
	}
	defer func() {
		if p := recover(); p != nil {
			log.Println("Recovered from panic, rolling back transaction")
			tx.Rollback() // Rollback on panic
			panic(p)      // Re-panic after rollback attempt
		} else if err != nil {
			log.Printf("Error occurred, rolling back transaction: %v", err)
			tx.Rollback() // Rollback on normal error
		} else {
			// No error, attempt to commit
			err = tx.Commit()
			if err != nil {
				log.Printf("Failed to commit transaction: %v", err)
			} else {
				log.Println("Transaction committed successfully.")
			}
		}
	}()

	qtx := dbq.WithTx(tx)

	//delete existing subscriptions
	err = qtx.DeleteTargetSubscriptions(r.Context(), database.DeleteTargetSubscriptionsParams{
		UserID:   userID,
		SchoolID: schoolID,
	})
	if err != nil {
		log.Printf("TX Error deleting subscriptions for user %s: %v", userID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not delete old subscriptions", err)
		return
	}

	//loop through new subscriptions
	for _, subscription := range requestBody.Targets {
		dbTargetType := database.TargetType(subscription.Type)
		nullTargetID := sql.NullInt32{Valid: false}
		if subscription.Type != "General" && subscription.ID != 0 {
			nullTargetID = sql.NullInt32{Int32: subscription.ID, Valid: true}
		}
		err = qtx.AddTargetSubscription(r.Context(), database.AddTargetSubscriptionParams{
			UserID:   userID,
			SchoolID: schoolID,
			Type:     dbTargetType,
			TargetID: nullTargetID.Int32,
		})
		if err != nil {
			log.Printf("TX Error adding subscription %+v for user %s: %v", subscription, userID, err)
			helpers.RespondWithError(w, http.StatusInternalServerError, "could not add new subscription", err)
			return
		}
	}

	log.Printf("User subscriptions successfully updated for %s.", userID)
	w.WriteHeader(http.StatusNoContent)
}
