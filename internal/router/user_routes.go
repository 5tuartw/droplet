package router

import (
	"database/sql"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/users"
	"github.com/5tuartw/droplet/internal/database"
)

func registerUserRoutes(mux *http.ServeMux, cfg *config.ApiConfig, db *sql.DB, dbq *database.Queries) {

	// GET /api/users (GetUsers)
	getUsersHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.GetUsers(dbq, w, r)
	}
	mux.HandleFunc("GET /api/users", auth.RequireAuth(cfg, getUsersHandlerFunc))

	// GET /api/users/{userID}
	getUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.GetUserById(dbq, w, r)
	}
	mux.HandleFunc("GET /api/users/{userID}", auth.RequireAuth(cfg, getUserHandlerFunc))

	// GET /api/users/me route (requires login, but NOT admin)
	getMeHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.GetMe(dbq, w, r)
	}
	mux.HandleFunc("GET /api/users/me", auth.RequireAuth(cfg, getMeHandlerFunc))

	// PUT /api/users/me/password (ChangeMyPassword)
	changeMyPasswordHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangeMyPassword(cfg, dbq, w, r)
	}
	mux.HandleFunc("PUT /api/users/me/password", auth.RequireAuth(cfg, changeMyPasswordHandlerFunc))

	// PUT /api/users/{userID}/password (ChangePassword)
	changePasswordHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangePassword(cfg, dbq, w, r)
	}
	changePasswordChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, changePasswordHandlerFunc))
	mux.HandleFunc("PUT /api/users/{userID}/password", changePasswordChain)

	// PATCH /api/users/{userID}/role (ChangeRole)
	changeRoleHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangeRole(dbq, w, r)
	}
	changeRoleChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, changeRoleHandlerFunc))
	mux.HandleFunc("PATCH /api/users/{userID}/role", changeRoleChain)

	// PATCH /api/users/{userID}/name
	updateUserNameHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.ChangeName(dbq, w, r)
	}
	updateNameChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, updateUserNameHandlerFunc))
	mux.HandleFunc("PATCH /api/users/{userID}/name", updateNameChain)

	// DELETE /api/users (DeleteAllUsers)
	deleteUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.DeleteAllUsers(cfg, dbq, w, r)
	}
	mux.HandleFunc("DELETE /api/users", auth.RequireAuth(cfg, deleteUserHandlerFunc))

	// POST /api/users (CreateUser)
	createUserHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		users.CreateUser(dbq, w, r)
	}
	createUserChain := auth.RequireAuth(cfg, auth.RequireAdmin(cfg, createUserHandlerFunc))
	mux.HandleFunc("POST /api/users", createUserChain)

}
