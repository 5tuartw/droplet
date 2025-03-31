-- name: CreateDrop :one
INSERT INTO drops (id, user_id, title, content, created_at, updated_at, post_date, expire_date)
VALUES (
    gen_random_uuid(),
    $1,
    $2,
    $3,
    NOW(),
    NOW(),
    $4,
    $5
)
RETURNING *;

-- name: DeleteDrop :exec
DELETE FROM drops WHERE id = $1;

-- name: GetUserIdFromDropID :one
SELECT user_id FROM drops WHERE id = $1;