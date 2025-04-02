-- name: AddDropTarget :one
INSERT INTO drop_targets (drop_id, type, target_id)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- name: GetDropsForCurrentUser :many
SELECT d.*
FROM drops d
JOIN drop_targets dt ON d.id = dt.drop_id
WHERE
    (dt.type = 'General'
    OR (dt.type = 'Class' AND dt.target_id = (SELECT id FROM classes WHERE classes.teacher_id = $1))
    OR (dt.type = 'YearGroup' AND dt.target_id = (SELECT year_group_id FROM classes WHERE classes.teacher_id = $1))
    OR (dt.type = 'Division' AND dt.target_id = (SELECT division_id FROM year_groups WHERE year_groups.id = (SELECT year_group_id FROM classes WHERE classes.teacher_id = $1))))
    AND (d.expire_date IS NULL OR d.expire_date > NOW())
ORDER BY d.post_date DESC;

-- name: GetActiveDropsWithTargets :many
SELECT
    d.id AS drop_id,         
    d.user_id AS drop_user_id,
    d.title AS drop_title,
    d.content AS drop_content,
    d.post_date AS drop_post_date,
    d.expire_date AS drop_expire_date,
    -- Select target info using LEFT JOINs
    dt.type AS target_type,  -- e.g., 'Class', 'YearGroup', 'General'
    dt.target_id AS target_id, -- The ID of the class, year group, etc.
    -- Use COALESCE to get the name from the first matching joined table
    COALESCE(cls.class_name, yg.year_group_name, div.division_name, 'General') AS target_name -- Adjust default/fallback as needed
FROM
    drops d
-- LEFT JOIN drop_targets, ensures drops with no targets are still listed (target columns will be NULL)
LEFT JOIN
    drop_targets dt ON d.id = dt.drop_id
-- LEFT JOINs to get target names based on type
LEFT JOIN
    classes cls ON dt.type = 'Class' AND dt.target_id = cls.id
LEFT JOIN
    year_groups yg ON dt.type = 'YearGroup' AND dt.target_id = yg.id
LEFT JOIN
    divisions div ON dt.type = 'Division' AND dt.target_id = div.id
    -- Add other LEFT JOINs for other target types if they exist
WHERE
    (d.expire_date IS NULL OR d.expire_date > NOW()) -- Filter for active drops
ORDER BY
    d.post_date DESC, d.id, dt.type; -- Order by drop, then target type for easier grouping in Go

-- name: GetDropsForCurrentUserWithTargets :many
SELECT
    d.id AS drop_id,         -- Select specific drop columns
    d.user_id AS drop_user_id,
    d.title AS drop_title,
    d.content AS drop_content,
    d.post_date AS drop_post_date,
    d.expire_date AS drop_expire_date,
    -- Select target info for the *matching* target
    dt_filter.type AS target_type,
    dt_filter.target_id AS target_id,
    -- Use COALESCE to get the name from the correct table for the matching target
    COALESCE(cls.class_name, yg.year_group_name, div.division_name, 'General') AS target_name
FROM
    drops d
-- This JOIN finds the specific target(s) making the drop visible to user $1 (teacher_id)
JOIN
    drop_targets dt_filter ON d.id = dt_filter.drop_id
    AND (
        dt_filter.type = 'General'
        OR (dt_filter.type = 'Class' AND dt_filter.target_id = (SELECT id FROM classes WHERE classes.teacher_id = $1))
        OR (dt_filter.type = 'YearGroup' AND dt_filter.target_id = (SELECT yg_inner.id FROM year_groups yg_inner JOIN classes cls_inner ON yg_inner.id = cls_inner.year_group_id WHERE cls_inner.teacher_id = $1 LIMIT 1))
        OR (dt_filter.type = 'Division' AND dt_filter.target_id = (SELECT div_inner.id FROM divisions div_inner JOIN year_groups yg_inner ON div_inner.id = yg_inner.division_id JOIN classes cls_inner ON yg_inner.id = cls_inner.year_group_id WHERE cls_inner.teacher_id = $1 LIMIT 1))
    )
-- These LEFT JOINs get the name for the target identified by dt_filter
LEFT JOIN
    classes cls ON dt_filter.type = 'Class' AND dt_filter.target_id = cls.id
LEFT JOIN
    year_groups yg ON dt_filter.type = 'YearGroup' AND dt_filter.target_id = yg.id
LEFT JOIN
    divisions div ON dt_filter.type = 'Division' AND dt_filter.target_id = div.id
WHERE
    (d.expire_date IS NULL OR d.expire_date > NOW()) -- Filter out expired drops
ORDER BY
    d.post_date DESC, d.id, dt_filter.type;