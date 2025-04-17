-- +goose Up
ALTER TABLE pupils ADD COLUMN school_id UUID;

UPDATE pupils SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE pupils ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE pupils
ADD CONSTRAINT fk_pupils_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_pupils_school_id ON pupils(school_id);
CREATE INDEX idx_pupils_class_id ON pupils(class_id);

-- +goose Down
DROP INDEX IF EXISTS idx_pupils_school_id;
DROP INDEX IF EXISTS idx_pupils_class_id;
ALTER TABLE pupils DROP CONSTRAINT IF EXISTS fk_pupils_school;
ALTER TABLE pupils ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE pupils DROP COLUMN school_id;