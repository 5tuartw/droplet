package drops

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func AddDropTarget(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	requesterUserID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context or is of wrong type in CreateDrop")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	requestBody := models.DropTarget{}
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Error decoding json data", err)
		return
	}

	log.Printf("Decoded Request Body Type: '%s'", requestBody.TargetType)

	//check if the current logged in user is the drop creator or an admin
	dropAuthorId, err := dbq.GetUserIdFromDropID(r.Context(), requestBody.DropID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "Drop not found", err)
		} else {
			log.Printf("Error getting drop author ID %s: %v", requestBody.DropID, err)
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not identify drop author", err)
		}
		return
	}

	requesterUser, err := dbq.GetUserById(r.Context(), requesterUserID) // Use GetUserByID
	if err != nil {
		// Handle user not found (shouldn't happen if token was valid) or other DB errors
		log.Printf("Error fetching requester user %s details in AddDropTarget: %v", requesterUserID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not retrieve requester details", err)
		return
	}
	// Use case-insensitive role check
	isAdmin := strings.EqualFold(string(requesterUser.Role), "Admin")
	isAuthor := requesterUserID == dropAuthorId

	if !(isAdmin || isAuthor) {
		log.Printf("Authorization Failed: User %s (Role: %s) attempted to add target to drop %s owned by %s",
			requesterUserID, requesterUser.Role, requestBody.DropID, dropAuthorId)
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Only the drop creator or an admin can add targets.", errors.New("forbidden"))
		return
	}

	/*// Verify TargetID type conversion - assumes requestBody.TargetID is int64 and DB expects NullInt32
	// If DB expects NullInt64, change sql.NullInt32 to sql.NullInt64 and remove int32() cast if needed.
	nullTargetID := sql.NullInt32{Int32: int32(requestBody.TargetID), Valid: requestBody.TargetID != 0} // Assume ID 0 means General/NULL? Or check type?
	// Safer: Check type before setting Valid=true
	if requestBody.TargetType != "General" && requestBody.TargetID != 0 {
		nullTargetID = sql.NullInt32{Int32: int32(requestBody.TargetID), Valid: true}
	} else if requestBody.TargetType == "General" {
		nullTargetID = sql.NullInt32{Valid: false} // Represent General target with NULL ID? Or ID 0? DB dependent. Let's assume NULL.
	} else {
		// ID was 0 for a non-General type? Error?
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid TargetID for the specified TargetType", nil)
		return
	}*/

	dbType := database.TargetType(requestBody.TargetType)
	params := database.AddDropTargetParams{
		DropID:   requestBody.DropID,
		Type:     dbType,
		TargetID: sql.NullInt32{Int32: int32(requestBody.TargetID), Valid: requestBody.TargetID != 0},
	}
	log.Printf("Params for DB: Type='%s' (Value: %+v)", params.Type, params)

	_, err = dbq.AddDropTarget(r.Context(), params)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not add drop target", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
