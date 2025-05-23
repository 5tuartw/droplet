
-- initiate school
/*CREATE TABLE schools (
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
);*/
INSERT INTO schools (id, name, created_at, updated_at)
VALUES ('4adc3aaf-8f42-4ef8-a800-46ab05dfaf58', 'Test School', NOW(), NOW());


-- initiate school division
/*CREATE TABLE divisions (
    id SERIAL PRIMARY KEY,
    division_name VARCHAR(255) UNIQUE NOT NULL
);*/
INSERT INTO divisions (division_name, school_id)
VALUES ('Upper School', '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('Lower School', '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58');


/*CREATE TABLE year_groups (
    id SERIAL PRIMARY KEY,
    year_group_name VARCHAR(255) UNIQUE NOT NULL,
    division_id INT REFERENCES divisions(id) ON DELETE SET NULL
);*/
INSERT INTO year_groups (year_group_name, division_id, school_id)
VALUES ('Year 1', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('Year 2', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('Year 3', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('Year 4', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('Year 5', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('Year 6', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58');

/*CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) UNIQUE NOT NULL,
    year_group_id INT REFERENCES year_groups(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL
);*/
INSERT INTO classes (class_name, year_group_id, teacher_id, school_id)
VALUES ('1A', 1, (SELECT id FROM users WHERE email = 'emily.carter@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('1B', 1, (SELECT id FROM users WHERE email = 'david.rodriguez@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('2A', 2, (SELECT id FROM users WHERE email = 'sarah.thompson@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('2B', 2, (SELECT id FROM users WHERE email = 'john.wilson@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('3A', 3, (SELECT id FROM users WHERE email = 'jessica.perez@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('3B', 3, (SELECT id FROM users WHERE email = 'michael.davis@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('4A', 4, (SELECT id FROM users WHERE email = 'amanda.garcia@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('4B', 4, (SELECT id FROM users WHERE email = 'christopher.martinez@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('5A', 5, (SELECT id FROM users WHERE email = 'stephanie.anderson@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('5B', 5, (SELECT id FROM users WHERE email = 'brian.taylor@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('6A', 6, (SELECT id FROM users WHERE email = 'nicole.moore@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('6B', 6, (SELECT id FROM users WHERE email = 'kevin.jackson@dropletschool.co.uk'), '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58');
    