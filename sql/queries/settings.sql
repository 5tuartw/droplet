-- name: AddSettings :exec
INSERT INTO user_settings (user_id, color_theme, layout_pref)
VALUES (
    $1,
    $2,
    $3
);

-- name: UpdateSettings :exec
UPDATE user_settings
SET color_theme = $2, layout_pref = $3, updated_at = NOW()
WHERE user_id = $1;