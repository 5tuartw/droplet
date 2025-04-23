-- name: AddDropTarget :one
INSERT INTO drop_targets (drop_id, type, target_id, school_id)
VALUES (
    $1,
    $2,
    $3,
    $4
)
RETURNING *;

-- name: RemoveTarget :exec
DELETE from drop_targets WHERE school_id = $1 AND type = $2 AND target_id = $3;

-- name: DeleteAllTargetsForDrop :exec
DELETE FROM drop_targets WHERE drop_id = $1 AND school_id = $2;

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
    AND d.school_id = $2
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
    (d.expire_date IS NULL OR d.expire_date > NOW()) AND d.post_date <= NOW() and d.school_id = $1
ORDER BY
    d.post_date DESC, d.id, dt.type;

-- name: GetDropsForUserWithTargets :many
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
    -- Target details
    dt.type AS target_type,
    dt.target_id AS target_id,
    COALESCE(
        cls_name.class_name,
        yg_name.year_group_name,
        div_name.division_name,
        CONCAT_WS(', ', p_name.surname, p_name.first_name), -- Pupil Name included
        'General'
    )::text AS target_name,
    -- Author and Editor Names
    COALESCE(CONCAT_WS(' ', author.first_name, author.surname))::text AS author_name,
    CONCAT_WS(' ', editor.first_name, editor.surname)::text AS editor_name
FROM
    drops d
LEFT JOIN users author ON d.user_id = author.id
LEFT JOIN users editor ON d.edited_by = editor.id
LEFT JOIN drop_targets dt ON d.id = dt.drop_id
LEFT JOIN classes cls_name ON dt.type = 'Class' AND dt.target_id = cls_name.id
LEFT JOIN year_groups yg_name ON dt.type = 'YearGroup' AND dt.target_id = yg_name.id
LEFT JOIN divisions div_name ON dt.type = 'Division' AND dt.target_id = div_name.id
LEFT JOIN pupils p_name ON dt.type = 'Student' AND dt.target_id = p_name.id

WHERE
    -- Filter 1: Drop is currently active
    d.post_date <= NOW()
    AND (d.expire_date IS NULL OR d.expire_date > NOW())

    -- Filter 2: Drop belongs to school
    AND d.school_id = $2

    -- Filter 3: Drop is visible to the user ($1 = logged_in_user_id)
    AND EXISTS (
        SELECT 1
        FROM drop_targets dt_filter
        WHERE dt_filter.drop_id = d.id
          AND (
            -- Condition A: Target is 'General'
            dt_filter.type = 'General'

            -- Condition B: Target is explicitly subscribed to by user $1
            OR EXISTS (
                SELECT 1 FROM target_subscriptions sub
                WHERE sub.user_id = $1
                  AND sub.type = dt_filter.type
                  AND sub.target_id = dt_filter.target_id
            )

            -- Condition C: Target matches user's implicit groups based on user_id $1
            -- (Verify these subqueries match how your user $1 links to classes)
            OR (dt_filter.type = 'Class' AND dt_filter.target_id IN (SELECT classes.id FROM classes WHERE classes.teacher_id = $1))
            OR (dt_filter.type = 'YearGroup' AND dt_filter.target_id IN (SELECT classes.year_group_id FROM classes WHERE classes.teacher_id = $1))
            OR (dt_filter.type = 'Division' AND dt_filter.target_id IN (SELECT yg.division_id FROM year_groups yg JOIN classes cls ON yg.id = cls.year_group_id WHERE cls.teacher_id = $1))

            -- *** Condition D: Target is a Student in one of the user's ($1) classes ***
            OR (dt_filter.type = 'Student' AND dt_filter.target_id IN (
                -- This subquery finds pupil IDs whose class_id matches a class taught by user $1
                SELECT p_implicit.id
                FROM pupils p_implicit
                WHERE p_implicit.class_id IN (
                    -- This subquery finds the class IDs taught by user $1
                    SELECT cls_teacher.id FROM classes cls_teacher WHERE cls_teacher.teacher_id = $1
                )
            ))
            -- *** End Condition D ***
          )
    )
ORDER BY
    d.post_date DESC, d.id, dt.type;


-- name: GetUpcomingDropsWithTargets :many
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
    d.post_date > NOW() and d.school_id = $1
ORDER BY
    d.post_date DESC, d.id, dt.type;