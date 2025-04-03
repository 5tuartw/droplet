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

func DeleteDrop(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context or is of wrong type in DeleteDrop")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	//check the request data
	dropId, err := uuid.Parse(r.PathValue("dropID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "invalid drop id", err)
		return
	}

	//check person logged in is writer of drop or admin or developer
	dropAuthorId, err := dbq.GetUserIdFromDropID(r.Context(), dropId)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not retrieve user id", err)
		return
	}

	user, err := dbq.GetUserById(r.Context(), userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "User not found", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "could not retrieve user from database", err)
		}
		return
	}

	if !(dropAuthorId == userID || user.Role == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Cannot perform drop deletion unless logged in as admin or drop creator")
		return
	}

	//delete the drop
	err = dbq.DeleteDrop(r.Context(), dropId)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not delete drop from db", err)
		return
	}

	//respond with success/no content
	w.WriteHeader(http.StatusNoContent)
}