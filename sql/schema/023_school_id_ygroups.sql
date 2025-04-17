-- +goose Up
ALTER TABLE year_groups ADD COLUMN school_id UUID;

UPDATE year_groups SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE year_groups ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE year_groups
ADD CONSTRAINT fk_year_groups_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

CREATE INDEX idx_year_groups_school_id ON year_groups(school_id);
CREATE INDEX idx_year_groups_division_id ON year_groups(division_id);

-- +goose Down
DROP INDEX IF EXISTS idx_year_groups_school_id;
DROP INDEX IF EXISTS idx_year_groups_division_id;
ALTER TABLE year_groups DROP CONSTRAINT IF EXISTS fk_year_groups_school;
ALTER TABLE year_groups ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE year_groups DROP COLUMN school_id;