-- name: CreateUser :one
INSERT INTO users (id, school_id, created_at, updated_at, email, hashed_password, role, title, first_name, surname)
VALUES (
    gen_random_uuid(),
    $1,
    NOW(),
    NOW(),
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
)
RETURNING *;

-- name: GetUsers :many
SELECT id, email, role, title, first_name, surname FROM users WHERE school_id = $1;

-- name: GetUserById :one
SELECT id, school_id, created_at, updated_at, email, role, title, first_name, surname FROM users where id = $1 and school_id = $2;

-- name: GetUserByEmail :one
SELECT id, school_id, created_at, updated_at, email, role FROM users where email = $1;

-- name: GetPasswordByID :one
SELECT hashed_password FROM users where id = $1 and school_id = $2;

-- name: GetPasswordByEmail :one
SELECT hashed_password FROM users where email = $1;

-- name: ChangePassword :exec
UPDATE users
SET hashed_password = $3, updated_at = NOW()
WHERE id = $1 and school_id = $2;

-- name: GetRole :one
SELECT role from users WHERE id = $1 and school_id = $2;

-- name: ChangeRole :exec
UPDATE users
SET role = $3, updated_at = NOW()
where id = $1 and school_id = $2;

-- name: DeleteUser :execrows
DELETE FROM users WHERE id = $1 and school_id = $2;

-- name: DeleteUsers :exec
DELETE FROM users where school_id = $1;

-- name: GetUsercount :one
SELECT count(*) from users where school_id = $1;

-- name: UpdateUserName :exec
UPDATE users
SET title = $3, first_name = $4, surname = $5, updated_at = NOW()
WHERE id = $1 and school_id = $2;