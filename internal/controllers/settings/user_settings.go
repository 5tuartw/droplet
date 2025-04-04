package settings

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

type UpdateSubscriptionsRequest struct {
	Targets []models.DropTargetPayload `json:"targets"`
}

func UpdateTargetSubscriptions(db *sql.DB, dbq *database.Queries, w http.ResponseWriter, r http.Request) {
	//get user id from context

	//create transactional query

	//update layout/view settings

	//if new subscriptions
	//delete existing subscriptions

	//loop through new subscriptions

	//if finished commit transaction
}

func UpdateUserSettings(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}


	//update layout/view settings


	helpers.RespondWithJSON(w, http.StatusNoContent, userID)

}
