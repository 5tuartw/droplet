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
INSERT INTO year_groups (year_group_name, division_id)
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
INSERT INTO classes (class_name, year_group_id)
VALUES ('1A', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('1B', 1, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('2A', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('2B', 2, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('3A', 3, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('3B', 3, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('4A', 4, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('4B', 4, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('5A', 5, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('5B', 5, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('6A', 6, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58'),
       ('6B', 6, '4adc3aaf-8f42-4ef8-a800-46ab05dfaf58');