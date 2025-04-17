package drops

import (
	"errors"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/google/uuid"
)

func DeleteDrop(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
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

	//check the request data
	dropId, err := uuid.Parse(r.PathValue("dropID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "invalid drop id", err)
		return
	}

	//check person logged in is writer of drop or admin or developer
	dropAuthorId, err := dbq.GetUserIdFromDropID(r.Context(), database.GetUserIdFromDropIDParams{
		ID:       dropId,
		SchoolID: schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not retrieve drop author id", err)
		return
	}

	if !(dropAuthorId == userID || userRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Cannot perform drop deletion unless logged in as admin or drop creator")
		return
	}

	//delete the drop
	err = dbq.DeleteDrop(r.Context(), database.DeleteDropParams{
		ID:       dropId,
		SchoolID: schoolID,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not delete drop from db", err)
		return
	}

	//respond with success/no content
	w.WriteHeader(http.StatusNoContent)
}
