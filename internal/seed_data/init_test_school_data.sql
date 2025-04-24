
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
INSERT INTO year_groups (id, year_group_name, division_id, school_id)
VALUES (1, 'Year 1', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (2, 'Year 2', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (3, 'Year 3', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (4, 'Year 4', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (5, 'Year 5', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (6, 'Year 6', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58');

/*CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) UNIQUE NOT NULL,
    year_group_id INT REFERENCES year_groups(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL
);*/
INSERT INTO classes (id, class_name, year_group_id, school_id)
VALUES (1, '1A', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (2, '1B', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (3, '2A', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (4, '2B', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (5, '3A', 3, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (6, '3B', 3, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (7, '4A', 4, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (8, '4B', 4, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (9, '5A', 5, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (10, '5B', 5, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (11, '6A', 6, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       (12, '6B', 6, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58');