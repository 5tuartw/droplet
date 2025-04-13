-- +goose Up
DELETE FROM refresh_tokens;
ALTER TABLE refresh_tokens
ADD COLUMN role user_role NOT NULL;

-- +goose Down
ALTER TABLE refresh_tokens
DROP COLUMN role;