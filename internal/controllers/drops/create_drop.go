package drops

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func CreateDrop(db *sql.DB, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	requestBody := models.DropRequest{}
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error decoding json data", err)
		return
	}

	postTime, err := helpers.ParsePostDate(requestBody.PostDate)
	if err != nil {
		// Use the specific error message returned by the helper
		helpers.RespondWithError(w, http.StatusBadRequest, err.Error(), err)
		return
	}

	expireTime, err := helpers.ParseExpireDate(requestBody.ExpireDate)
	if err != nil {
		// Use the specific error message returned by the helper
		helpers.RespondWithError(w, http.StatusBadRequest, err.Error(), err)
		return
	}

	//logic to check drop data - NYI length check
	if requestBody.Content == "" && requestBody.Title == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Title and Content cannot both be empty", errors.New("title and content both tempty"))
		return
	}

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
			err = tx.Commit() // Commit the transaction
			if err != nil {
				log.Printf("Failed to commit transaction: %v", err)
				// If commit fails, we might have already sent a response,
				// but ideally we catch this before responding.
				// RespondWithError might be problematic if headers already sent.
				// For now, just log it. A robust system might have more complex recovery.
			} else {
				log.Println("Transaction committed successfully.")
			}
		}
	}()

	qtx := dbq.WithTx(tx)

	drop, err := qtx.CreateDrop(r.Context(), database.CreateDropParams{
		UserID:     userID,
		Title:      requestBody.Title,
		Content:    requestBody.Content,
		PostDate:   postTime,
		ExpireDate: expireTime,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not create new drop", err)
		return
	}

	for _, target := range requestBody.Targets {
		dbTargetType := database.TargetType(target.Type)
		nullTargetID := sql.NullInt32{Valid: false}
		if target.Type != "General" && target.ID != 0 {
			nullTargetID = sql.NullInt32{Int32: target.ID, Valid: true}
		}
		_, err = qtx.AddDropTarget(r.Context(), database.AddDropTargetParams{
			DropID:   drop.ID,
			Type:     dbTargetType,
			TargetID: nullTargetID,
		})
		if err != nil {
			log.Printf("TX Error adding target %+v for drop %s: %v", target, drop.ID, err)
			helpers.RespondWithError(w, http.StatusInternalServerError, "could not add new target(s)", err)
			return
		}
	}
	log.Printf("Drop %s added successfully by user %s.", drop.ID, userID)
	helpers.RespondWithJSON(w, http.StatusCreated, drop)
}
