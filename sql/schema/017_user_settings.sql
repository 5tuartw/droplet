-- +goose Up
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    color_theme VARCHAR(50) NOT NULL DEFAULT 'default',
    layout_pref VARCHAR(50) NOT NULL DEFAULT 'list',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE user_settings;