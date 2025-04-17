package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type ContextKey string

// AppClaims defines your custom JWT claims, embedding standard claims
type AppClaims struct {
	Role     string    `json:"role"` // Your custom claim(s)
	SchoolID uuid.UUID `json:"school_id"`
	// Add other custom claims here if needed: OrgID string `json:"org_id"`

	jwt.RegisteredClaims // Embed standard claims (Issuer, Subject, ExpiresAt, etc.)
}

const UserIDKey ContextKey = "userID"
const UserRoleKey ContextKey = "role"
const UserSchoolKey ContextKey = "schoolID"

func HashPassword(password string) ([]byte, error) {
	hpassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return hpassword, err
}

func CheckPasswordHash(password, hash string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err
}

func MakeJWT(userID uuid.UUID, schoolID uuid.UUID, userRole string, tokenSecret string, expiresIn time.Duration) (string, error) {
	claims := AppClaims{
		Role:     userRole, // Set your custom field
		SchoolID: schoolID,
		// Set other custom fields if you add them
		RegisteredClaims: jwt.RegisteredClaims{ // Populate the embedded standard claims
			Issuer:    "droplet", // Your issuer
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			Subject:   userID.String(),
		},
	}
	// Create the token with standard claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key (converted to []byte)
	return token.SignedString([]byte(tokenSecret))
}

func ValidateJWT(tokenString, tokenSecret string) (userID uuid.UUID, schoolID uuid.UUID, userRole string, err error) {
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		return []byte(tokenSecret), nil
	}

	claims := &AppClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, keyFunc) // <<< Pass your struct instance
	if err != nil {
		return uuid.Nil, uuid.Nil, "", err // Return empty role on error
	}

	if !token.Valid {
		return uuid.Nil, uuid.Nil, "", fmt.Errorf("invalid token") // Return empty role on error
	}

	// Type assertion is now to *AppClaims (already done by ParseWithClaims)
	// claims, ok := token.Claims.(*AppClaims) <-- No longer needed if parsing directly into claims variable
	// if !ok {
	//  return uuid.Nil, "", fmt.Errorf("invalid claims structure")
	// }

	// --- Extract User ID (from embedded RegisteredClaims) ---
	if claims.Subject == "" { // Access Subject directly
		return uuid.Nil, uuid.Nil, "", fmt.Errorf("token subject is empty")
	}
	userID, err = uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, uuid.Nil, "", fmt.Errorf("invalid UUID in token subject: %w", err)
	}

	// --- Extract Custom Role Claim ---
	if claims.Role == "" { // Access Role directly
		// Decide if role is mandatory. If so, return error.
		return uuid.Nil, uuid.Nil, "", fmt.Errorf("role claim is empty or missing")
	}
	userRole = claims.Role

	if claims.SchoolID == uuid.Nil {
		return uuid.Nil, uuid.Nil, "", fmt.Errorf("school id claim is empty of missing")
	}
	userSchool := claims.SchoolID

	// --- Return all values ---
	return userID, userSchool, userRole, nil // Success!
}

func GetBearerToken(headers http.Header) (string, error) {
	authHeader := headers.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("no authorization header")
	}
	// Split the header value by space
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" || parts[1] == "" {
		return "", fmt.Errorf("authorization header format must be 'Bearer {token}'")
	}

	return parts[1], nil
}

func GetAPIKey(headers http.Header) (string, error) {
	authHeader := headers.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("no authorization header")
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "ApiKey" || parts[1] == "" {
		return "", fmt.Errorf("authorization header format must be 'ApiKey {api_key}'")
	}
	return parts[1], nil
}

func MakeRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("error generating random data for  %v", err)
	}
	tokenString := hex.EncodeToString(bytes)
	return tokenString, nil

}
