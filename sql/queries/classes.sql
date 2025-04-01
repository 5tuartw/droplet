-- name: GetClassID :one
SELECT id FROM classes WHERE class_name = $1;