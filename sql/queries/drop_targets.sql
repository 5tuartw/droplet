-- name: AddDropTarget :one
INSERT INTO drop_targets (drop_id, type, target_id)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;