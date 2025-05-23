-- name: CreateDrop :one
INSERT INTO drops (id, user_id, school_id, title, content, created_at, updated_at, post_date, expire_date)
VALUES (
    gen_random_uuid(),
    $1,
    $2,
    $3,
    $4,
    NOW(),
    NOW(),
    $5,
    $6   
)
RETURNING *;

-- name: DeleteDrop :exec
DELETE FROM drops WHERE id = $1 AND school_id = $2;

-- name: GetDropByID :one
SELECT * FROM drops WHERE id = $1 AND school_id = $2;

-- name: GetUserIdFromDropID :one
SELECT user_id FROM drops WHERE id = $1 AND school_id = $2;

-- name: GetActiveDrops :many
SELECT * FROM drops WHERE expire_date > NOW() AND school_id = $1 ORDER BY post_date DESC;

-- name: UpdateDrop :exec
UPDATE drops
SET title = $3, content = $4, post_date = $5, expire_date = $6, updated_at = NOW(), edited_by = $7
WHERE id = $1 and school_id = $2;

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
    ) AS target_name,
    COALESCE(cls.class_name, yg.year_group_name, div.division_name, p.surname || ', ' || p.first_name, 'General') AS target_name,
    -- Author Name (Concatenated, assumes author exists)
    COALESCE(CONCAT_WS(' ', author.first_name, author.surname), 'Unknown Author')::text AS author_name,
    -- Editor Name (Concatenated, handles NULL editor via LEFT JOIN + COALESCE on final result)
    COALESCE(CONCAT_WS(' ', editor.first_name,  editor.surname))::text AS editor_name -- This might be NULL if no editor
FROM
    drops d
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
LEFT JOIN
    users AS author ON d.user_id = author.id
LEFT JOIN
    users AS editor on d.edited_by = editor.id
WHERE
    d.id = $1 -- Filter for the specific drop ID
AND d.school_id = $2
ORDER BY
    dt.type;