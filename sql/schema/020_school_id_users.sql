-- +goose Up
ALTER TABLE users ADD COLUMN school_id UUID;

INSERT INTO schools (id, name, status) -- Add other columns as needed from your final schema
VALUES ('1ba13e47-ca2d-44af-9f4d-fb7326d83999', 'Demo Primary School', 'active');

UPDATE users SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE users ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE users
ADD CONSTRAINT fk_users_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_users_school_id ON users(school_id);

-- +goose Down
DROP INDEX IF EXISTS idx_users_school_id;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_school;
ALTER TABLE users ALTER COLUMN school_id DROP NOT NULL;
DELETE FROM schools WHERE id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999';
ALTER TABLE users DROP COLUMN school_id;