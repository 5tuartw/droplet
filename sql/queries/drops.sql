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

-- name: GetActiveDrops :many
SELECT * FROM drops WHERE expire_date > NOW() ORDER BY post_date DESC;

-- name: UpdateDrop :exec
UPDATE drops
SET title = $2, content = $3, post_date = $4, expire_date = $5, updated_at = NOW(), edited_by = $6
WHERE id = $1;

-- name: GetDropWithTargetsByID :many
SELECT
    d.id AS drop_id,
    d.user_id AS drop_user_id,
    d.title AS drop_title,
    d.content AS drop_content,
    d.post_date AS drop_post_date,
    d.expire_date AS drop_expire_date,
    d.created_at AS drop_created_at,
    d.updated_at AS drop_updated_at,
    d.edited_by AS drop_edited_by,
    -- Target details (will be NULL if drop has no targets)
    dt.type AS target_type,
    dt.target_id AS target_id,
    -- Target name (will be NULL if no target or name missing)
    COALESCE(
        cls.class_name,
        yg.year_group_name,
        div.division_name,
        p.surname || ', ' || p.first_name,
        'General' -- fallback
    ) AS target_name
FROM
    drops d
-- LEFT JOIN is essential here to get drops even if they have NO targets
LEFT JOIN
    drop_targets dt ON d.id = dt.drop_id
LEFT JOIN
    classes cls ON dt.type = 'Class' AND dt.target_id = cls.id
LEFT JOIN
    year_groups yg ON dt.type = 'YearGroup' AND dt.target_id = yg.id
LEFT JOIN
    divisions div ON dt.type = 'Division' AND dt.target_id = div.id
LEFT JOIN
    pupils p ON dt.type = 'Student' AND dt.target_id = p.id
WHERE
    d.id = $1 -- Filter for the specific drop ID
ORDER BY
    dt.type;