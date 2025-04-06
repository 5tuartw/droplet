-- name: CreateUser :one
INSERT INTO users (id, created_at, updated_at, email, hashed_password, role, title, first_name, surname)
VALUES (
    gen_random_uuid(),
    NOW(),
    NOW(),
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
RETURNING *;

-- name: GetUsers :many
SELECT id, email, role, title, first_name, surname FROM users;

-- name: GetUserById :one
SELECT id, created_at, updated_at, email, role FROM users where id = $1;

-- name: GetUserByEmail :one
SELECT id, created_at, updated_at, email, role FROM users where email = $1;

-- name: GetPasswordByEmail :one
SELECT hashed_password FROM users where email = $1;

-- name: ChangePassword :exec
UPDATE users
SET hashed_password = $2, updated_at = NOW()
WHERE email = $1;

-- name: GetRole :one
SELECT role from users WHERE id = $1;

-- name: ChangeRole :exec
UPDATE users
SET role = $2, updated_at = NOW()
where email = $1;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: DeleteUsers :exec
DELETE FROM users;

-- name: GetUsercount :one
SELECT count(*) from users;