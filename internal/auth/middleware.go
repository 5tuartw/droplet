package auth

import (
	"context"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/config"
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

		userID, userRole, err := ValidateJWT(tokenString, cfg.JWTSecret)
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
		//Create a new request objedefct with the updated context
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	}
}
