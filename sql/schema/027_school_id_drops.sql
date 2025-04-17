-- +goose Up
ALTER TABLE drops ADD COLUMN school_id UUID;

UPDATE drops SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE drops ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE drops
ADD CONSTRAINT fk_drops_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_drops_school_id ON drops(school_id);
CREATE INDEX idx_drops_user_id ON drops(user_id);
CREATE INDEX idx_drops_post_date ON drops(post_date);

-- +goose Down
DROP INDEX IF EXISTS idx_drops_school_id;
DROP INDEX IF EXISTS idx_drops_user_id;
DROP INDEX IF EXISTS idx_drops_post_date;
ALTER TABLE drops DROP CONSTRAINT IF EXISTS fk_drops_school;
ALTER TABLE drops ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE drops DROP COLUMN school_id;