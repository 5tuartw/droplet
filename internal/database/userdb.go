package database

import (
	"context"
)

type UserDB interface {
	CreateUser(ctx context.Context, arg CreateUserParams) (User, error)
	GetUsers(ctx context.Context) ([]GetUsersRow, error)
}

var _ UserDB = &Queries{}
