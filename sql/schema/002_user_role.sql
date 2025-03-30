-- +goose Up
CREATE TYPE user_role AS ENUM ('user', 'admin');

ALTER TABLE users
ADD COLUMN role user_role DEFAULT 'user' NOT NULL;

-- +goose Down
ALTER TABLE users
DROP COLUMN role;

DROP TYPE user_role;