-- name: GetSchoolName :one
SELECT name FROM schools WHERE id = $1;