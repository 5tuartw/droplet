package drops

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func AddDropTarget(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
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
