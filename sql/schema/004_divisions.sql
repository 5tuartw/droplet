-- +goose Up
CREATE TABLE divisions (
    id SERIAL PRIMARY KEY,
    division_name VARCHAR(255) UNIQUE NOT NULL
);

-- +goose Down
DROP TABLE divisions;