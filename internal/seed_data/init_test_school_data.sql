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
INSERT INTO classes (class_name, year_group_id)
VALUES ('1A', 1),
       ('1B', 1),
       ('2A', 2),
       ('2B', 2),
       ('3A', 3),
       ('3B', 3),
       ('4A', 4),
       ('4B', 4),
       ('5A', 5),
       ('5B', 5),
       ('6A', 6),
       ('6B', 6);