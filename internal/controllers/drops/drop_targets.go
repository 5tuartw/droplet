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
	contextValueID := r.Context().Value(auth.UserIDKey)
	userID, idOk := contextValueID.(uuid.UUID)
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	userRole, roleOk := contextValueRole.(string)

	if !idOk || !schoolOk || !roleOk {
		log.Println("Error: one or more value not found in context")
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
	dropAuthorId, err := dbq.GetUserIdFromDropID(r.Context(), database.GetUserIdFromDropIDParams{
		ID: requestBody.DropID,
		SchoolID: schoolID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "Drop not found", err)
		} else {
			log.Printf("Error getting drop author ID %s: %v", requestBody.DropID, err)
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not identify drop author", err)
		}
		return
	}

	// Use case-insensitive role check
	isAdmin := strings.EqualFold(userRole, "Admin")
	isAuthor := userID == dropAuthorId

	if !(isAdmin || isAuthor) {
		log.Printf("Authorization Failed: User %s (Role: %s) attempted to add target to drop %s owned by %s",
			userID, userRole, requestBody.DropID, dropAuthorId)
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Only the drop creator or an admin can add targets.", errors.New("forbidden"))
		return
	}

	dbType := database.TargetType(requestBody.TargetType)
	params := database.AddDropTargetParams{
		DropID:   requestBody.DropID,
		SchoolID: schoolID,
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
