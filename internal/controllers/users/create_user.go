package users

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func CreateUser(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {

	// Get Requester's UserID from Context
	contextValueID := r.Context().Value(auth.UserIDKey) // Use exported key
	requesterUserID, ok := contextValueID.(uuid.UUID)
	if !ok {
		log.Println("Error: requester userID not found in context in CreateUser")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		log.Println("Error: requester schoolID not found in context in CreateUser")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, ok := contextValueRole.(string)
	if !ok {
		log.Println("Error: requester role not found in context in CreateUser")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	// Ensure Requester is Admin
	if !strings.EqualFold(requesterRole, "Admin") { //case insensitive check
		log.Printf("Authorization Failed: User %s (Role: %s) attempted to create user", requesterUserID, requesterRole)
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Only administrators can create users.", errors.New("forbidden"))
		return // Stop processing if not admin
	}

	var requestBody struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		Role      string `json:"role"`
		Title     string `json:"title"`
		FirstName string `json:"first_name"`
		Surname   string `json:"surname"`
	}

	// Read the raw request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error reading request body", err)
		return
	}
	defer r.Body.Close()

	// Decode the JSON into the requestBody struct
	err = json.Unmarshal(bodyBytes, &requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Error decoding JSON data", err)
		return
	}

	if requestBody.Email == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Email is required", err)
		return
	}

	if requestBody.Password == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Password is required", err)
		return
	}

	hashedPword, err := auth.HashPassword(requestBody.Password)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not create hashed password", err)
		return
	}

	newUser, err := dbq.CreateUser(r.Context(), database.CreateUserParams{
		SchoolID:       requesterSchoolID,
		Email:          requestBody.Email,
		HashedPassword: string(hashedPword),
		Role:           database.UserRole(requestBody.Role),
		Title:          requestBody.Title,
		FirstName:      requestBody.FirstName,
		Surname:        requestBody.Surname,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not create new user", err)
		return
	}
	log.Printf("Admin User %s created new user %s (ID: %s)", requesterUserID, newUser.Email, newUser.ID)

	responsePayload := models.UserResponse{
		ID:        newUser.ID,
		Email:     newUser.Email,
		Role:      newUser.Role,
		Title:     newUser.Title,
		FirstName: newUser.FirstName,
		Surname:   newUser.Surname,
	}

	helpers.RespondWithJSON(w, http.StatusCreated, responsePayload)
}
