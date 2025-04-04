-- name: AddDropTarget :one
INSERT INTO drop_targets (drop_id, type, target_id)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- name: DeleteAllTargetsForDrop :exec
DELETE FROM drop_targets WHERE drop_id = $1;

-- name: GetDropsForCurrentUser :many
SELECT d.*
FROM drops d
JOIN drop_targets dt ON d.id = dt.drop_id
WHERE
    (dt.type = 'General'
    OR (dt.type = 'Class' AND dt.target_id = (SELECT id FROM classes WHERE classes.teacher_id = $1))
    OR (dt.type = 'YearGroup' AND dt.target_id = (SELECT year_group_id FROM classes WHERE classes.teacher_id = $1))
    OR (dt.type = 'Division' AND dt.target_id = (SELECT division_id FROM year_groups WHERE year_groups.id = (SELECT year_group_id FROM classes WHERE classes.teacher_id = $1))))
    AND d.expire_date > NOW()
ORDER BY d.post_date DESC;

-- name: GetActiveDropsWithTargets :many
SELECT
    d.id AS drop_id,
    d.user_id AS drop_user_id,
    d.title AS drop_title,
    d.content AS drop_content,
    d.post_date AS drop_post_date,
    d.updated_at AS drop_updated_date,
    d.expire_date AS drop_expire_date,
    dt.type AS target_type,
    dt.target_id AS target_id,
    COALESCE(
        cls.class_name,             -- Name if type is Class
        yg.year_group_name,         -- Name if type is YearGroup
        div.division_name,          -- Name if type is Division
        p.surname || ', ' || p.first_name, -- Concatenated name if type is Student
        'General'                   -- Fallback if type is General or name is NULL
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
    (d.expire_date IS NULL OR d.expire_date > NOW())
ORDER BY
    d.post_date DESC, d.id, dt.type;

-- name: GetDropsForUserWithTargets :many
SELECT
    d.id AS drop_id,
    d.user_id AS drop_user_id,
    d.title AS drop_title,
    d.content AS drop_content,
    d.post_date AS drop_post_date,
    d.updated_at AS drop_updated_date,
    d.expire_date AS drop_expire_date,
    dt_filter.type AS target_type,
    dt_filter.target_id AS target_id,
    COALESCE(
        cls.class_name,
        yg.year_group_name,
        div.division_name,
        p.surname || ', ' || p.first_name, -- Concatenated pupil name
        'General'
    ) AS target_name,
    COALESCE(cls.class_name, yg.year_group_name, div.division_name, p.surname || ', ' || p.first_name, 'General') AS target_name,
    -- Author Name (Concatenated, assumes author exists)
    COALESCE(CONCAT_WS(' ', author.first_name, author.surname), 'Unknown Author')::text AS author_name,
    -- Editor Name (Concatenated, handles NULL editor via LEFT JOIN + COALESCE on final result)
    COALESCE(CONCAT_WS(' ', editor.first_name,  editor.surname))::text AS editor_name -- This might be NULL if no editor
FROM
    drops d
JOIN -- Filter drops based on visibility to user $1 (teacher_id)
    drop_targets dt_filter ON d.id = dt_filter.drop_id
    AND (
        dt_filter.type = 'General'
        OR (dt_filter.type = 'Class' AND dt_filter.target_id = (SELECT id FROM classes WHERE classes.teacher_id = $1))
        OR (dt_filter.type = 'YearGroup' AND dt_filter.target_id = (SELECT yg_inner.id FROM year_groups yg_inner JOIN classes cls_inner ON yg_inner.id = cls_inner.year_group_id WHERE cls_inner.teacher_id = $1 LIMIT 1))
        OR (dt_filter.type = 'Division' AND dt_filter.target_id = (SELECT div_inner.id FROM divisions div_inner JOIN year_groups yg_inner ON div_inner.id = yg_inner.division_id JOIN classes cls_inner ON yg_inner.id = cls_inner.year_group_id WHERE cls_inner.teacher_id = $1 LIMIT 1))
        -- Consider if student targets need to be added to this visibility filter
    )
-- LEFT JOINs to get the name for the specific target row identified by dt_filter
LEFT JOIN
    classes cls ON dt_filter.type = 'Class' AND dt_filter.target_id = cls.id
LEFT JOIN
    year_groups yg ON dt_filter.type = 'YearGroup' AND dt_filter.target_id = yg.id
LEFT JOIN
    divisions div ON dt_filter.type = 'Division' AND dt_filter.target_id = div.id
LEFT JOIN --
    pupils p ON dt_filter.type = 'Student' AND dt_filter.target_id = p.id
LEFT JOIN
    users AS author ON d.user_id = author.id
LEFT JOIN
    users AS editor on d.edited_by = editor.id
WHERE
    d.expire_date > NOW()
ORDER BY
    d.post_date DESC, d.id, dt_filter.type;