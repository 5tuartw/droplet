package users

import (
	"net/http"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/google/uuid"
)

func GetUsers(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	users, err := dbq.GetUsers(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to get users", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusOK, users)
}

func GetUserById(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not prase user id", err)
		return
	}

	user, err := dbq.GetUserById(r.Context(), id)
	if err != nil {
		helpers.RespondWithError(w, 404, "Could not fetch chirp", err)
	}

	helpers.RespondWithJSON(w, http.StatusOK, user)
}
