-- name: CreatePupil :one
INSERT INTO pupils (first_name, surname, class_id, school_id)
VALUES (
    $1,
    $2,
    $3,
    $4
)
RETURNING *;