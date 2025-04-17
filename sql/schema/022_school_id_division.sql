-- +goose Up
ALTER TABLE divisions ADD COLUMN school_id UUID;

UPDATE divisions SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE divisions ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE divisions
ADD CONSTRAINT fk_divisions_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

CREATE INDEX idx_divisions_school_id ON divisions(school_id);

-- +goose Down
DROP INDEX IF EXISTS idx_divisions_school_id;
ALTER TABLE divisions DROP CONSTRAINT IF EXISTS fk_divisions_school;
ALTER TABLE divisions ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE divisions DROP COLUMN school_id;