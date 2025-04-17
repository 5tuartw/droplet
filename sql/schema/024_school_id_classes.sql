-- +goose Up
ALTER TABLE classes ADD COLUMN school_id UUID;

UPDATE classes SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE classes ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE classes
ADD CONSTRAINT fk_classes_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_year_group_id ON classes(year_group_id);

-- +goose Down
DROP INDEX IF EXISTS idx_classes_school_id;
DROP INDEX IF EXISTS idx_classes_year_group_id;
ALTER TABLE classes DROP CONSTRAINT IF EXISTS fk_classes_school;
ALTER TABLE classes ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE classes DROP COLUMN school_id;