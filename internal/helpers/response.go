package helpers

import (
	"encoding/json"
	"log"
	"net/http"
)

// RespondWithError sends an error response with the given status code and message.
func RespondWithError(w http.ResponseWriter, code int, msg string, err error) {
	errorMsg := msg
	if err != nil {
		errorMsg += ": " + err.Error()
	}
	RespondWithJSON(w, code, map[string]string{"error": errorMsg})
}

// RespondWithJSON sends a JSON response with the given status code and payload.
func RespondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	dat, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshalling JSON: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(dat)
}
