-- +goose Up
ALTER TABLE users
ADD COLUMN title VARCHAR(255),
ADD COLUMN first_name VARCHAR(255),
ADD COLUMN surname VARCHAR(255);

-- +goose Down
ALTER TABLE users
DROP COLUMN title,
DROP COLUMN first_name,
DROP COLUMN surname;