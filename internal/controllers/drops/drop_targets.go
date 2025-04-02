package drops

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/users"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
)

func AddDropTarget(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	requestBody := models.DropTarget{}

	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error decoding json data", err)
		return
	}

	user, err := users.GetCurrentUser(c)
	if err != nil {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Error finding current user", err)
		return
	}

	//check if the current logged in user is the drop creator or an admin
	dropAuthorId, err := dbq.GetUserIdFromDropID(r.Context(), requestBody.DropID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not identify drop author", err)
		return
	}
	if !(user.Role == "admin" || user.ID == dropAuthorId) {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Current user cannot add drop target", errors.New("unauthorized"))
		return
	}
	_, err = dbq.AddDropTarget(r.Context(), database.AddDropTargetParams{
		DropID:   requestBody.DropID,
		Type:     requestBody.TargetType,
		TargetID: sql.NullInt32{Int32: int32(requestBody.TargetID), Valid: true},
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not add drop target", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func GetDropTargets() {

}
