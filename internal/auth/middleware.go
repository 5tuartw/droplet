package auth

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/helpers"
)

func RequireAuth(cfg *config.ApiConfig, next http.HandlerFunc) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {
		tokenString, err := GetBearerToken(r.Header)
		if err != nil {
			log.Printf("Auth Error: %v\n", err)
			// Consistently return 401 error
			// You might want to use your helpers.RespondWithError if it sets JSON content type
			// helpers.RespondWithError(w, http.StatusUnauthorized, "Unauthorized: Missing or malformed token", err)
			http.Error(w, "Unauthorized: Missing or malformed token", http.StatusUnauthorized)
			return
		}

		userID, schoolID, userRole, err := ValidateJWT(tokenString, cfg.JWTSecret)
		if err != nil {
			log.Printf("Auth Error: Invalid token - %v\n", err)
			// Consistently return 401 error
			// helpers.RespondWithError(w, http.StatusUnauthorized, "Unauthorized: Invalid or expired token", err)
			http.Error(w, "Unauthorized: Invalid or expired token", http.StatusUnauthorized)
			return
		}

		//log.Printf("User %s authenticated successfully.\n", userID)

		//To pass on userID, create a new context with the userID value
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserRoleKey, userRole)
		ctx = context.WithValue(ctx, UserSchoolKey, schoolID)
		//Create a new request objedefct with the updated context
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	}
}

func RequireAdmin(cfg *config.ApiConfig, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(string) // Use your actual role context key

		// Use case-insensitive compare for robustness
		if !ok || !strings.EqualFold(role, "Admin") {
			helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Admin access required", nil)
			return // Stop processing if not admin
		}

		// If role is admin, call the next handler in the chain
		next.ServeHTTP(w, r)
	}
}
