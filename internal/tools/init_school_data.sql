-- initiate school division
/*CREATE TABLE divisions (
    id SERIAL PRIMARY KEY,
    division_name VARCHAR(255) UNIQUE NOT NULL
);*/
INSERT INTO divisions (division_name)
VALUES ('Upper School'),
       ('Lower School');


/*CREATE TABLE year_groups (
    id SERIAL PRIMARY KEY,
    year_group_name VARCHAR(255) UNIQUE NOT NULL,
    division_id INT REFERENCES divisions(id) ON DELETE SET NULL
);*/
INSERT INTO year_groups (year_group_name, division_id)
VALUES ('Year 1', 2),
       ('Year 2', 2),
       ('Year 3', 1),
       ('Year 4', 1),
       ('Year 5', 1),
       ('Year 6', 1);

/*CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) UNIQUE NOT NULL,
    year_group_id INT REFERENCES year_groups(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL
);*/
INSERT INTO classes (class_name, year_group_id, teacher_id)
VALUES ('1A', 1, (SELECT id FROM users WHERE email = 'emily.carter@dropletschool.co.uk')),
       ('1B', 1, (SELECT id FROM users WHERE email = 'david.rodriguez@dropletschool.co.uk')),
       ('2A', 2, (SELECT id FROM users WHERE email = 'sarah.thompson@dropletschool.co.uk')),
       ('2B', 2, (SELECT id FROM users WHERE email = 'john.wilson@dropletschool.co.uk')),
       ('3A', 3, (SELECT id FROM users WHERE email = 'jessica.perez@dropletschool.co.uk')),
       ('3B', 3, (SELECT id FROM users WHERE email = 'michael.davis@dropletschool.co.uk')),
       ('4A', 4, (SELECT id FROM users WHERE email = 'amanda.garcia@dropletschool.co.uk')),
       ('4B', 4, (SELECT id FROM users WHERE email = 'christopher.martinez@dropletschool.co.uk')),
       ('5A', 5, (SELECT id FROM users WHERE email = 'stephanie.anderson@dropletschool.co.uk')),
       ('5B', 5, (SELECT id FROM users WHERE email = 'brian.taylor@dropletschool.co.uk')),
       ('6A', 6, (SELECT id FROM users WHERE email = 'nicole.moore@dropletschool.co.uk')),
       ('6B', 6, (SELECT id FROM users WHERE email = 'kevin.jackson@dropletschool.co.uk'));
    
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'emily.carter@dropletschool.co.uk')
WHERE id = 13;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'david.rodriguez@dropletschool.co.uk')
WHERE id = 14;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'sarah.thompson@dropletschool.co.uk')
WHERE id = 15;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'john.wilson@dropletschool.co.uk')
WHERE id = 16;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'jessica.perez@dropletschool.co.uk')
WHERE id = 17;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'michael.davis@dropletschool.co.uk')
WHERE id = 18;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'amanda.garcia@dropletschool.co.uk')
WHERE id = 19;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'christopher.martinez@dropletschool.co.uk')
WHERE id = 20;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'stephanie.anderson@dropletschool.co.uk')
WHERE id = 21;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'brian.taylor@dropletschool.co.uk')
WHERE id = 22;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'nicole.moore@dropletschool.co.uk')
WHERE id = 23;
UPDATE classes
SET teacher_id = (SELECT id FROM users WHERE email = 'kevin.jackson@dropletschool.co.uk')
WHERE id = 24;

/*CREATE TABLE pupils (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    class_id INT REFERENCES classes(id) ON DELETE SET NULL
);*/
-- Pupils loaded using tools/load_pupils/load_test_pupils.go

/*CREATE TABLE custom_groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE
);*/

