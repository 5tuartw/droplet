package users

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/google/uuid"
)

func DeleteAllUsers(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	//currently only permissable on dev platform
	if !c.DevMode {
		helpers.RespondWithError(w, http.StatusUnauthorized, "only accessible to developers", errors.New("unauthorized"))
		return
	}

	err := dbq.DeleteUsers(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "unable to delete users", err)
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeleteUser(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {

	if c.IsDemoMode {
		log.Println("Attempted user deletion in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "User deletion is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	userToDelete, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "No valid user id in path", err)
		return
	}

	contextValueRole := r.Context().Value(auth.UserRoleKey)
	editorRole, ok := contextValueRole.(string)
	if !ok {
		log.Println("Error: role not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	if !(editorRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user attempted to delete user %v", userToDelete)
		return
	}

	contextValueID := r.Context().Value(auth.UserIDKey)
	editorUserID, ok := contextValueID.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}
	if userToDelete == editorUserID {
		helpers.RespondWithError(w, http.StatusBadRequest, "Cannot delete own account", err)
		return
	}

	err = dbq.DeleteUser(r.Context(), userToDelete)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "could not delete user", err)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
