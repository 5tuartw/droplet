-- name: UpsertUserSettings :exec
INSERT INTO user_settings (
    user_id,
    school_id,
    color_theme,
    layout_pref,
    updated_at
) VALUES (
    $1, $2, $3, $4, NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    color_theme = EXCLUDED.color_theme,
    layout_pref = EXCLUDED.layout_pref,
    updated_at = NOW();

-- name: GetUserSettings :one
SELECT * FROM user_settings where user_id = $1 AND school_id = $2;