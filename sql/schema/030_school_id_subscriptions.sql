-- +goose Up
ALTER TABLE target_subscriptions ADD COLUMN school_id UUID;

UPDATE target_subscriptions SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE target_subscriptions ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE target_subscriptions
ADD CONSTRAINT fk_target_subscriptions_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_target_subscriptions_school_id ON target_subscriptions(school_id);
CREATE INDEX idx_target_subscriptions_user_id ON target_subscriptions(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_target_subscriptions_school_id;
DROP INDEX IF EXISTS idx_target_subscriptions_user_id;
ALTER TABLE target_subscriptions DROP CONSTRAINT IF EXISTS fk_target_subscriptions_school;
ALTER TABLE target_subscriptions ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE target_subscriptions DROP COLUMN school_id;