-- +goose Up
ALTER TABLE drop_views ADD COLUMN school_id UUID;

UPDATE drop_views SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE drop_views ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE drop_views
ADD CONSTRAINT fk_drop_views_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_drop_views_school_id ON drop_views(school_id);
CREATE INDEX idx_drop_views_user_id ON drop_views(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_drop_views_school_id;
DROP INDEX IF EXISTS idx_drop_views_user_id;
ALTER TABLE drop_views DROP CONSTRAINT IF EXISTS fk_drop_views_school;
ALTER TABLE drop_views ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE drop_views DROP COLUMN school_id;