-- +goose Up
CREATE TABLE schools (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADDRESS TEXT,
    contact_email TEXT,
    contact_phone VARCHAR,
    subdomain VARCHAR UNIQUE,
    logo_url TEXT,
    status TEXT,
    SETTINGS JSONB
);

CREATE INDEX idx_schools_name ON schools(name);

-- +goose Down
DROP TABLE schools;