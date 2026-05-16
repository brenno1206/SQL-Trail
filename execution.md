# Execução do Projeto

## arquivo backend/.env

```env
# Configuração do Supabase
SUPABASE_URL_RECURSOS_HUMANOS=xxx
SUPABASE_KEY_RECURSOS_HUMANOS=xxx

SUPABASE_URL_UNIVERSIDADE=xxx
SUPABASE_KEY_UNIVERSIDADE=xxx

# Configuração do Flask
FLASK_SECRET_KEY=supersecretkey
APP_SETTINGS=app.config.DevelopmentConfig
JWT_SECRET_KEY=jwtsecretkey

# Configuração do TiDB
TIDB_HOST=xxx
TIDB_PORT=xxx
TIDB_USER=xxx
TIDB_PASSWORD=xxx
TIDB_DB_NAME=xxx
CA_PATH=xxx
```

- É necessário substituir o .env com os dados necessários

### TiBD Cloud

- crie o schema SQL no SUPABASE e utilie o código abaixo para criar as tabelas
- Coloque as informações necessárias para a conexão do banco em `backend/.env` (TIBD_HOST, TIBD_PORT, TIBD_USER, TIBD_PASSWORD, TIBD_DB_NAME, CA_PATH)

<details>
<summary>Clique aqui para expandir o código SQL de criação das tabelas do sistema</summary>

```sql
USE SQL_TRAIL;

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS
  `admins` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- TEACHERS TABLE
CREATE TABLE IF NOT EXISTS
  `teachers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `registration_number` VARCHAR(50) UNIQUE NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- STUDENTS TABLE
CREATE TABLE IF NOT EXISTS
  `students` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `registration_number` VARCHAR(50) UNIQUE NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- CLASSES TABLE
CREATE TABLE IF NOT EXISTS
  `classes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `teacher_id` INT NOT NULL,
    `class_name` VARCHAR(100) NOT NULL,
    `subject` VARCHAR(100) NOT NULL,
    `year_semester` VARCHAR(20) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE
  );

-- ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS
  `enrollments` (
    `class_id` INT NOT NULL,
    `student_id` INT NOT NULL,
    PRIMARY KEY (`class_id`, `student_id`),
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
  );

-- SCENARIO DATABASES TABLE
CREATE TABLE IF NOT EXISTS
  `scenario_databases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(100) UNIQUE NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `diagram_url` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS
  `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `scenario_database_id` INT NOT NULL,
    `statement` TEXT NOT NULL,
    `expected_query` TEXT NOT NULL,
    `question_number` INT NOT NULL,
    `is_special` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`scenario_database_id`) REFERENCES `scenario_databases`(`id`) ON DELETE CASCADE
  );

-- SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS
  `submissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `question_id` INT NOT NULL,
    `time_spent_seconds` INT NOT NULL,
    `submitted_query` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT FALSE,
    `execution_output` TEXT,
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
  );
```

</details>

### Supabase

- O supabase é utilizado para simular os cenários onde o aluno utilizará as queries
- No momento há 2 bancos de dados: Recursos Humanos e Universidade
- No Supabase e necessário inserir apenas a URL e a KEY de cada banco de dados no `backend/.env`

- <b>Recursos Humanos</b>
<details>
<summary>Clique aqui para expandir o código SQL de criação do database Recursos Humanos</summary>

```sql
-- 1. Tabela regions (Regiões)
CREATE TABLE regions (
    region_id INTEGER NOT NULL,
    region_name VARCHAR(25),
    PRIMARY KEY (region_id)
);

-- 2. Tabela jobs (Cargos)
CREATE TABLE jobs (
    job_id VARCHAR(10) NOT NULL,
    job_title VARCHAR(35) NOT NULL,
    min_salary INTEGER,
    max_salary INTEGER,
    PRIMARY KEY (job_id)
);

-- 3. Tabela countries (Países)
CREATE TABLE countries (
    country_id CHAR(2) NOT NULL,
    country_name VARCHAR(40),
    region_id INTEGER,
    PRIMARY KEY (country_id),
    FOREIGN KEY (region_id) REFERENCES regions(region_id)
);

-- 4. Tabela locations (Localizações)
CREATE TABLE locations (
    location_id INTEGER NOT NULL,
    street_address VARCHAR(40),
    postal_code VARCHAR(12),
    city VARCHAR(30) NOT NULL,
    state_province VARCHAR(25),
    country_id CHAR(2),
    PRIMARY KEY (location_id),
    FOREIGN KEY (country_id) REFERENCES countries(country_id)
);

-- 5. Tabela departments (Departamentos)
CREATE TABLE departments (
    department_id INTEGER NOT NULL,
    department_name VARCHAR(30) NOT NULL,
    manager_id INTEGER,
    location_id INTEGER,
    PRIMARY KEY (department_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- 6. Tabela employees (Funcionários)
CREATE TABLE employees (
    employee_id INTEGER NOT NULL,
    first_name VARCHAR(20),
    last_name VARCHAR(25) NOT NULL,
    email VARCHAR(25) NOT NULL,
    phone_number VARCHAR(20),
    hire_date DATE NOT NULL,
    job_id VARCHAR(10) NOT NULL,
    salary DECIMAL(8, 2),
    commission_pct DECIMAL(2, 2),
    manager_id INTEGER,
    department_id INTEGER,
    PRIMARY KEY (employee_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);

-- 7. ALTER TABLE departments (Modificar Departamentos)
ALTER TABLE departments
ADD CONSTRAINT fk_dept_manager
FOREIGN KEY (manager_id) REFERENCES employees(employee_id);

-- 8. Tabela job_history (Histórico de Cargos)
CREATE TABLE job_history (
    employee_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    job_id VARCHAR(10) NOT NULL,
    department_id INTEGER,
    PRIMARY KEY (employee_id, start_date),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);
```

</details>

<br>

<details>
<summary>Clique aqui para expandir o código SQL de povoamento database Recursos Humanos</summary>

```sql
INSERT INTO regions (region_id, region_name) VALUES
(1, 'Europe'),
(2, 'Americas'),
(3, 'Asia'),
(4, 'Middle East and Africa');

INSERT INTO jobs (job_id, job_title, min_salary, max_salary) VALUES
('PRES', 'President', 20000, 40000),
('VP_MKT', 'Vice President Marketing', 15000, 30000),
('SA_MAN', 'Sales Manager', 10000, 20000),
('SA_REP', 'Sales Representative', 6000, 12000),
('IT_PROG', 'Programmer', 4000, 10000),
('HR_REP', 'Human Resources Representative', 4000, 9000),
('MK_REP', 'Marketing Representative', 4000, 9000),
('AD_ASST', 'Administration Assistant', 3000, 6000),
('FI_MAN', 'Finance Manager', 8000, 16000),
('FI_ACC', 'Accountant', 4200, 9000),
('PU_MAN', 'Purchasing Manager', 8000, 15000);

INSERT INTO countries (country_id, country_name, region_id) VALUES
('US', 'United States of America', 2),
('CA', 'Canada', 2),
('BR', 'Brazil', 2),
('UK', 'United Kingdom', 1),
('DE', 'Germany', 1),
('JP', 'Japan', 3),
('CN', 'China', 3),
('IN', 'India', 3),
('AU', 'Australia', 3),
('EG', 'Egypt', 4),
('ZW', 'Zimbabwe', 4);

INSERT INTO locations (location_id, street_address, postal_code, city, state_province, country_id) VALUES
(1000, '2004 Charade Rd', '98199', 'Seattle', 'Washington', 'US'),
(1100, '1470 River Drive', '90210', 'Los Angeles', 'California', 'US'),
(1200, '8204 Arthur St', NULL, 'London', NULL, 'UK'),
(1300, '2014 Jabberwocky Rd', '26192', 'Toronto', 'Ontario', 'CA'),
(1400, 'Schwanthalerstr. 70', '80336', 'Munich', 'Bavaria', 'DE'),
(1500, 'Av. Paulista 1000', '01310', 'Sao Paulo', 'SP', 'BR'),
(1600, '1-1-2 Otemachi', '100-8111', 'Tokyo', 'Tokyo', 'JP'),
(1700, '123 Main St', 'V5A 1A1', 'Vancouver', 'British Columbia', 'CA');

INSERT INTO departments (department_id, department_name, manager_id, location_id) VALUES
(10, 'Administration', NULL, 1000),
(20, 'Marketing', NULL, 1200),
(30, 'Purchasing', NULL, 1000),
(40, 'Human Resources', NULL, 1200),
(50, 'Shipping', NULL, 1100),
(60, 'IT', NULL, 1300),
(70, 'Public Relations', NULL, 1400),
(80, 'Sales', NULL, 1300),
(90, 'Executive', NULL, 1000),
(100, 'Finance', NULL, 1000),
(110, 'Accounting', NULL, 1000),
(150, 'Operations', NULL, 1500),
(160, 'Research', NULL, 1600),
(170, 'Support', NULL, 1700),
(190, 'Data Science', NULL, 1100),
(200, 'Internal Audit', NULL, 1000);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(100, 'Steven', 'King', 'SKING', '515.123.4567', '2003-06-17', 'PRES', 24000.00, NULL, NULL, 90),
(101, 'Neena', 'Kochhar', 'NKOCHHAR', '515.123.4568', '2005-09-21', 'VP_MKT', 17000.00, NULL, 100, 90),
(102, 'Lex', 'De Haan', 'LDEHAAN', '515.123.4569', '2006-01-13', 'VP_MKT', 17000.00, NULL, 100, 90);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(103, 'Alexander', 'Hunold', 'AHUNOLD', '590.423.4567', '2008-01-03', 'IT_PROG', 9000.00, NULL, 102, 60),
(104, 'Bruce', 'Ernst', 'BERNST', '590.423.4568', '2009-05-21', 'IT_PROG', 6000.00, NULL, 103, 60),
(105, 'David', 'Austin', 'DAUSTIN', '590.423.4569', '2010-06-25', 'IT_PROG', 4800.00, NULL, 103, 60),
(106, 'Valli', 'Pataballa', 'VPATABAL', '590.423.4570', '2011-02-05', 'IT_PROG', 4800.00, NULL, 103, 60),
(107, 'Diana', 'Lorentz', 'DLORENTZ', '590.423.4571', '2012-02-07', 'IT_PROG', 4200.00, NULL, 103, 60);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(108, 'Nancy', 'Greenberg', 'NGREENBE', '515.124.4569', '2007-08-17', 'FI_MAN', 12000.00, NULL, 101, 100),
(109, 'Daniel', 'Faviet', 'DFAVIET', '515.124.4169', '2008-08-16', 'FI_ACC', 9000.00, NULL, 108, 100),
(110, 'John', 'Chen', 'JCHEN', '515.124.4269', '2009-09-28', 'FI_ACC', 8200.00, NULL, 108, 100),
(111, 'Ismael', 'Sciarra', 'ISCIARRA', '515.124.4369', '2010-09-30', 'FI_ACC', 7700.00, NULL, 108, 100),
(112, 'Jose Manuel', 'Urman', 'JMURMAN', '515.124.4469', '2011-03-07', 'FI_ACC', 7800.00, NULL, 108, 100),
(113, 'Luis', 'Popp', 'LPOPP', '515.124.4567', '2012-12-07', 'FI_ACC', 6900.00, NULL, 108, 100);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(114, 'Den', 'Raphaely', 'DRAPHEAL', '515.127.4561', '2007-12-07', 'PU_MAN', 11000.00, NULL, 100, 30),
(115, 'Alexander', 'Khoo', 'AKHOO', '515.127.4562', '2009-05-18', 'AD_ASST', 3100.00, NULL, 114, 30),
(116, 'Shelli', 'Baida', 'SBAIDA', '515.127.4563', '2010-12-24', 'AD_ASST', 2900.00, NULL, 114, 30),
(117, 'Sigal', 'Tobias', 'STOBIAS', '515.127.4564', '2011-07-24', 'AD_ASST', 2800.00, NULL, 114, 30),
(118, 'Guy', 'Himuro', 'GHIMURO', '515.127.4565', '2012-11-15', 'AD_ASST', 2600.00, NULL, 114, 30),
(119, 'Karen', 'Colmenares', 'KCOLMENA', '515.127.4566', '2013-08-10', 'AD_ASST', 2500.00, NULL, 114, 30);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(145, 'John', 'Russell', 'JRUSSEL', '011.44.1344.429268', '2009-10-01', 'SA_MAN', 14000.00, 0.40, 100, 80),
(146, 'Karen', 'Partners', 'KPARTNER', '011.44.1344.467268', '2010-01-05', 'SA_REP', 13500.00, 0.30, 145, 80),
(147, 'Alberto', 'Errazuriz', 'AERRAZUR', '011.44.1344.429278', '2011-03-10', 'SA_REP', 12000.00, 0.30, 145, 80),
(148, 'Gerald', 'Cambrault', 'GCAMBRAU', '011.44.1344.619268', '2012-10-15', 'SA_REP', 11000.00, 0.30, 145, 80),
(149, 'Eleni', 'Zlotkey', 'EZLOTKEY', '011.44.1344.429018', '2013-01-29', 'SA_REP', 10500.00, 0.20, 145, 80),
(150, 'Peter', 'Tucker', 'PTUCKER', '011.44.1344.129268', '2014-01-30', 'SA_REP', 10000.00, 0.30, 145, 80),
(151, 'David', 'Bernstein', 'DBERNSTE', '011.44.1344.345268', '2015-03-24', 'SA_REP', 9500.00, 0.25, 145, 80);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(200, 'Michael', 'Hartstein', 'MHARTSTE', '515.123.5555', '2009-02-17', 'MK_REP', 13000.00, NULL, 101, 20);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(201, 'Pat', 'Fay', 'PFAY', '603.123.6666', '2010-08-17', 'HR_REP', 6500.00, NULL, 101, 40),
(202, 'Susan', 'Mavris', 'SMAVRIS', '515.123.7777', '2011-06-07', 'HR_REP', 6500.00, NULL, 201, 40);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(205, 'Shelley', 'Higgins', 'SHIGGINS', '515.123.8080', '2007-06-07', 'AD_ASST', 12000.00, NULL, 101, 10),
(206, 'William', 'Gietz', 'WGIETZ', '515.123.8181', '2008-06-07', 'AD_ASST', 8300.00, NULL, 205, 10);

UPDATE departments SET manager_id = 205 WHERE department_id = 10;
UPDATE departments SET manager_id = 200 WHERE department_id = 20;
UPDATE departments SET manager_id = 114 WHERE department_id = 30;
UPDATE departments SET manager_id = 201 WHERE department_id = 40;
UPDATE departments SET manager_id = 103 WHERE department_id = 60;
UPDATE departments SET manager_id = 145 WHERE department_id = 80;
UPDATE departments SET manager_id = 100 WHERE department_id = 90;
UPDATE departments SET manager_id = 108 WHERE department_id = 100;

INSERT INTO job_history (employee_id, start_date, end_date, job_id, department_id) VALUES
(101, '2001-10-28', '2004-03-15', 'SA_REP', 80),
(101, '2004-03-16', '2005-09-20', 'SA_MAN', 80);

INSERT INTO job_history (employee_id, start_date, end_date, job_id, department_id) VALUES
(105, '2006-03-24', '2010-06-24', 'AD_ASST', 10);

INSERT INTO job_history (employee_id, start_date, end_date, job_id, department_id) VALUES
(206, '2006-06-07', '2008-06-06', 'FI_ACC', 100);

INSERT INTO job_history (employee_id, start_date, end_date, job_id, department_id) VALUES
(200, '2006-02-17', '2009-02-16', 'SA_REP', 80);

INSERT INTO countries (country_id, country_name, region_id) VALUES
('AR', 'Argentina', 2),
('BE', 'Belgium', 1),
('NG', 'Nigeria', 4);

INSERT INTO locations (location_id, street_address, postal_code, city, state_province, country_id) VALUES
(1800, 'Calle Falsa 123', '1001', 'Buenos Aires', 'Capital Federal', 'AR'),
(1900, 'Rue du Musée 9', '1000', 'Brussels', 'Brussels', 'BE');

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(210, 'Julia', 'Nayer', 'JNAYER', '650.124.1214', '2015-07-16', 'IT_PROG', 8200, NULL, 103, 60),
(211, 'Kevin', 'Mourgos', 'KMOURGOS', '650.123.5234', '2017-05-01', 'SA_MAN', 12000, 0.3, 100, 80);

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, commission_pct, manager_id, department_id) VALUES
(212, 'Trenna', 'Rajs', 'TRAJS', '650.121.8009', '2016-10-17', 'SA_REP', 7000, 0.2, 211, 80),
(213, 'Curtis', 'Davies', 'CDAVIES', '650.121.2994', '2018-01-29', 'SA_REP', 6500, 0.15, 211, 80),
(214, 'Randall', 'Matos', 'RMATOS', '650.121.2874', '2019-03-15', 'SA_REP', 6100, 0.15, 211, 80);

INSERT INTO job_history (employee_id, start_date, end_date, job_id, department_id) VALUES
(102, '2001-01-13', '2005-12-31', 'IT_PROG', 60),
(108, '2004-08-17', '2007-08-16', 'FI_ACC', 110),
(206, '2005-06-07', '2008-06-06', 'AD_ASST', 10);

UPDATE employees SET salary = 4500 WHERE employee_id = 103;

UPDATE employees SET hire_date = '2008-06-15' WHERE employee_id = 105;
UPDATE employees SET hire_date = '2008-01-03' WHERE employee_id = 103;
```

</details>

<br>

- <b>Universidade</b>
<details>
<summary>Clique aqui para expandir o código SQL de criação do database Universidade</summary>

```sql

-- -----------------------------------------------------
-- Definição dos Tipos ENUM
-- -----------------------------------------------------
CREATE TYPE professor_title_enum AS ENUM (
  'Assistant Professor',
  'Associate Professor',
  'Full Professor',
  'MSc',
  'Dr',
  'PhD'
);

CREATE TYPE degree_type_enum AS ENUM (
  'Bachelors',
  'Licentiate',
  'Associate',
  'Masters',
  'Doctorate'
);

CREATE TYPE enrollment_status_enum AS ENUM (
  'Enrolled',
  'Passed',
  'Failed',
  'Withdrawn'
);
-- -----------------------------------------------------
-- Table addresses
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
  address_id SERIAL PRIMARY KEY,
  street VARCHAR(100),
  number VARCHAR(20),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  postal_code VARCHAR(9)
);

-- -----------------------------------------------------
-- Table members
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  member_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  date_of_birth DATE,
  phone_number VARCHAR(20),
  address_id INT NOT NULL,
  CONSTRAINT fk_members_addresses
    FOREIGN KEY (address_id)
    REFERENCES addresses (address_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table students
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  start_date DATE NOT NULL,
  student_id INT NOT NULL PRIMARY KEY,
  CONSTRAINT fk_students_members
    FOREIGN KEY (student_id)
    REFERENCES members (member_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table departments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  department_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(10) NOT NULL
);

-- -----------------------------------------------------
-- Table professors
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS professors (
  start_date DATE,
  professor_id INT NOT NULL PRIMARY KEY,
  title professor_title_enum NOT NULL,
  department_id INT NOT NULL,
  CONSTRAINT fk_professors_members1
    FOREIGN KEY (professor_id)
    REFERENCES members (member_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT fk_professors_departments1
    FOREIGN KEY (department_id)
    REFERENCES departments (department_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table programs
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  program_id SERIAL PRIMARY KEY,
  program_name VARCHAR(100) NOT NULL,
  credits INT NOT NULL,
  degree_type degree_type_enum NOT NULL,
  department_id INT NOT NULL,
  coordinator_id INT NOT NULL,
  CONSTRAINT fk_programs_departments1
    FOREIGN KEY (department_id)
    REFERENCES departments (department_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT fk_programs_professors1
    FOREIGN KEY (coordinator_id)
    REFERENCES professors (professor_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table courses
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  course_id SERIAL PRIMARY KEY,
  course_name VARCHAR(100),
  credits INT,
  course_description TEXT
);

-- -----------------------------------------------------
-- Table course_prerequisites
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id INT NOT NULL,
  prerequisite_course_id INT NOT NULL,
  PRIMARY KEY (course_id, prerequisite_course_id),
  CONSTRAINT fk_prereq_course
    FOREIGN KEY (course_id)
    REFERENCES courses (course_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT fk_prereq_prerequisite
    FOREIGN KEY (prerequisite_course_id)
    REFERENCES courses (course_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table classes
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  class_id SERIAL PRIMARY KEY,
  semester VARCHAR(10),
  schedule VARCHAR(100),
  room VARCHAR(20),
  course_id INT NOT NULL,
  program_id INT NOT NULL,
  professor_id INT NOT NULL,
  CONSTRAINT fk_classes_course1
    FOREIGN KEY (course_id)
    REFERENCES courses (course_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT fk_classes_programs1
    FOREIGN KEY (program_id)
    REFERENCES programs (program_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT fk_classes_professors1
    FOREIGN KEY (professor_id)
    REFERENCES professors (professor_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table enrollments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  start_date DATE,
  grade DECIMAL(5, 2),
  status enrollment_status_enum, -- Alterado para ENUM
  absences INT,
  PRIMARY KEY (class_id, student_id),
  CONSTRAINT fk_classes_has_students_classes1
    FOREIGN KEY (class_id)
    REFERENCES classes (class_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT fk_classes_has_students_students1
    FOREIGN KEY (student_id)
    REFERENCES students (student_id)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);
```

</details>

<br>

<details>
<summary>Clique aqui para expandir o código SQL de povoamento database Universidade</summary>

```sql
ALTER TABLE students
ADD COLUMN program_id INT;

ALTER TABLE students
ADD CONSTRAINT fk_students_programs
  FOREIGN KEY (program_id)
  REFERENCES programs (program_id)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;

INSERT INTO addresses (street, "number", neighborhood, city, postal_code)
VALUES
  ('123 Maple St', 'Apt 1A', 'Downtown', 'Springfield', '62704'),
  ('456 Oak Ave', 'Unit 5', 'Westside', 'Shelbyville', '62565'),
  ('789 Pine Ln', '#12', 'North End', 'Capital City', '90210'),
  ('321 Birch Rd', '', 'Southside', 'Springfield', '62702'),
  ('654 Cedar Pl', 'Apt 3B', 'Easttown', 'Ogdenville', '45875'),
  ('987 Elm Blvd', '', 'University Hills', 'Springfield', '62707'),
  ('101 Spruce Dr', 'Unit 20C', 'Lakeview', 'Shelbyville', '62565'),
  ('202 Fir Ct', '', 'Old Town', 'Capital City', '90211'),
  ('303 Aspen Way', 'Ste 100', 'Business District', 'Ogdenville', '45875'),
  ('404 Willow Creek', 'Lot 5', 'Riverbend', 'Springfield', '62703'),
  ('505 Redwood Pass', 'Apt 8', 'Green Valley', 'Shelbyville', '62565'),
  ('606 Sequoia Trl', '', 'Mountainview', 'Capital City', '90212'),
  ('707 Juniper St', 'Unit 1F', 'Downtown', 'Ogdenville', '45875'),
  ('808 Cypress Ave', '', 'Westside', 'Springfield', '62704'),
  ('909 Holly Ln', 'Apt 15', 'North End', 'Shelbyville', '62565'),
  ('111 Cherry Dr', '', 'Southside', 'Capital City', '90210'),
  ('222 Plum Rd', 'Unit 7A', 'Easttown', 'Ogdenville', '45875'),
  ('333 Peach Ct', 'Ste 250', 'University Hills', 'Springfield', '62707'),
  ('444 Apple Way', '', 'Lakeview', 'Shelbyville', '62565'),
  ('555 Orange Pl', 'Apt 301', 'Old Town', 'Capital City', '90211'),
  ('666 Grape St', '', 'Business District', 'Ogdenville', '45875'),
  ('777 Lemon Ave', 'Unit 12', 'Riverbend', 'Springfield', '62703'),
  ('888 Lime Ln', '', 'Green Valley', 'Shelbyville', '62565'),
  ('999 Banana Blvd', 'Apt 5C', 'Mountainview', 'Capital City', '90212'),
  ('121 Watermelon Dr', '', 'Downtown', 'Ogdenville', '45875'),
  ('131 Coconut Ct', 'Ste 3', 'Westside', 'Springfield', '62704'),
  ('141 Mango Way', '', 'North End', 'Shelbyville', '62565'),
  ('151 Papaya Pass', 'Unit 19B', 'Southside', 'Capital City', '90210'),
  ('161 Kiwi Pl', 'Apt 42', 'Easttown', 'Ogdenville', '45875'),
  ('171 Fig St', '', 'University Hills', 'Springfield', '62707'),
  ('1900 University Ave', 'Office 301', 'Campus Core', 'Capital City', '90210'),
  ('201 Faculty Rd', 'Bldg 7', 'Campus West', 'Springfield', '62707'),
  ('302 Research Pkwy', 'Ste 500', 'Tech Park', 'Ogdenville', '45875'),
  ('403 Scholars Walk', '', 'Faculty Housing', 'Shelbyville', '62565'),
  ('504 Discovery Ct', 'Lab 2B', 'Science Hill', 'Capital City', '90211'),
  ('605 Knowledge Ln', '', 'Faculty Housing', 'Springfield', '62707'),
  ('706 Academy Pl', 'Office 112', 'Campus Core', 'Ogdenville', '45875'),
  ('807 Education Blvd', 'Admin Bldg', 'Downtown', 'Shelbyville', '62565'),
  ('908 Library Way', 'Unit 3', 'Campus East', 'Capital City', '90212'),
  ('1000 Main St', 'Office 404', 'Campus Core', 'Springfield', '62704');

INSERT INTO members (first_name, last_name, email, date_of_birth, phone_number, address_id)
VALUES
  -- Students (IDs 1-30)
  ('Emily', 'Smith', 'emily.smith@university.edu', '2003-05-15', '555-1234', 1),
  ('Michael', 'Johnson', 'michael.johnson@university.edu', '2002-09-22', '555-5678', 2),
  ('Jessica', 'Williams', 'jessica.williams@university.edu', '2004-01-10', '555-8765', 3),
  ('Christopher', 'Brown', 'chris.brown@university.edu', '2003-11-30', '555-4321', 4),
  ('Ashley', 'Jones', 'ashley.jones@university.edu', '2002-07-19', '555-9876', 5),
  ('Matthew', 'Garcia', 'matthew.garcia@university.edu', '2004-03-05', '555-6543', 6),
  ('Amanda', 'Miller', 'amanda.miller@university.edu', '2003-08-12', '555-3210', 7),
  ('David', 'Davis', 'david.davis@university.edu', '2002-12-25', '555-7890', 8),
  ('Sarah', 'Rodriguez', 'sarah.rodriguez@university.edu', '2004-02-14', '555-0123', 9),
  ('James', 'Martinez', 'james.martinez@university.edu', '2003-06-01', '555-4567', 10),
  ('Jennifer', 'Hernandez', 'jennifer.hernandez@university.edu', '2002-10-08', '555-7891', 11),
  ('Daniel', 'Lopez', 'daniel.lopez@university.edu', '2004-04-20', '555-2345', 12),
  ('Elizabeth', 'Gonzalez', 'elizabeth.gonzalez@university.edu', '2003-01-28', '555-5679', 13),
  ('Joseph', 'Wilson', 'joseph.wilson@university.edu', '2002-08-17', '555-8901', 14),
  ('Megan', 'Anderson', 'megan.anderson@university.edu', '2004-07-07', '555-3456', 15),
  ('Robert', 'Thomas', 'robert.thomas@university.edu', '2003-03-14', '555-6789', 16),
  ('Lauren', 'Taylor', 'lauren.taylor@university.edu', '2002-11-03', '555-9012', 17),
  ('William', 'Moore', 'william.moore@university.edu', '2004-09-09', '555-1235', 18),
  ('Olivia', 'Jackson', 'olivia.jackson@university.edu', '2003-04-27', '555-2346', 19),
  ('John', 'Martin', 'john.martin@university.edu', '2002-06-18', '555-3457', 20),
  ('Sophia', 'Lee', 'sophia.lee@university.edu', '2004-12-03', '555-4568', 21),
  ('Benjamin', 'Perez', 'benjamin.perez@university.edu', '2003-02-08', '555-5670', 22),
  ('Ava', 'Thompson', 'ava.thompson@university.edu', '2002-05-29', '555-6780', 23),
  ('Jacob', 'White', 'jacob.white@university.edu', '2004-10-16', '555-7892', 24),
  ('Mia', 'Harris', 'mia.harris@university.edu', '2003-07-25', '555-8903', 25),
  ('Ethan', 'Sanchez', 'ethan.sanchez@university.edu', '2002-04-02', '555-9014', 26),
  ('Isabella', 'Clark', 'isabella.clark@university.edu', '2004-08-21', '555-0125', 27),
  ('Alexander', 'Ramirez', 'alex.ramirez@university.edu', '2003-10-24', '555-1236', 28),
  ('Charlotte', 'Lewis', 'charlotte.lewis@university.edu', '2002-02-27', '555-2347', 29),
  ('Ryan', 'Robinson', 'ryan.robinson@university.edu', '2004-06-13', '555-3458', 30),
  ('Dr. Evelyn', 'Reed', 'evelyn.reed@university.edu', '1975-02-20', '555-1111', 31),
  ('Prof. Alan', 'Grant', 'alan.grant@university.edu', '1980-08-10', '555-2222', 32),
  ('Dr. Iris', 'Chen', 'iris.chen@university.edu', '1985-11-05', '555-3333', 33),
  ('Prof. Samuel', 'Bell', 'samuel.bell@university.edu', '1978-01-15', '555-4444', 34),
  ('Dr. Maria', 'Rossi', 'maria.rossi@university.edu', '1982-06-22', '555-5555', 35),
  ('Prof. David', 'Kim', 'david.kim@university.edu', '1990-03-30', '555-6666', 36),
  ('Dr. Helen', 'Mirren', 'helen.mirren@university.edu', '1972-09-12', '555-7777', 37),
  ('Prof. Victor', 'Stone', 'victor.stone@university.edu', '1988-07-19', '555-8888', 38),
  ('Dr. Eleanor', 'Bishop', 'eleanor.bishop@university.edu', '1983-04-01', '555-9999', 39),
  ('Prof. Arthur', 'Pendleton', 'arthur.pendleton@university.edu', '1976-10-10', '555-0000', 40);

UPDATE members
SET first_name = REPLACE(REPLACE(first_name, 'Dr. ', ''), 'Prof. ', '')
WHERE first_name LIKE 'Dr. %' OR first_name LIKE 'Prof. %';

INSERT INTO students (start_date, student_id)
VALUES
  ('2022-08-20', 1), ('2021-08-20', 2), ('2023-08-20', 3), ('2022-08-20', 4),
  ('2021-08-20', 5), ('2023-08-20', 6), ('2022-08-20', 7), ('2021-08-20', 8),
  ('2023-08-20', 9), ('2022-08-20', 10), ('2021-08-20', 11), ('2023-08-20', 12),
  ('2022-08-20', 13), ('2021-08-20', 14), ('2023-08-20', 15), ('2022-08-20', 16),
  ('2021-08-20', 17), ('2023-08-20', 18), ('2022-08-20', 19), ('2021-08-20', 20),
  ('2023-08-20', 21), ('2022-08-20', 22), ('2021-08-20', 23), ('2023-08-20', 24),
  ('2022-08-20', 25), ('2021-08-20', 26), ('2023-08-20', 27), ('2022-08-20', 28),
  ('2021-08-20', 29), ('2023-08-20', 30);

INSERT INTO departments (name, abbreviation)
VALUES
  ('Computer Science', 'CS'),
  ('Mathematics', 'MATH'),
  ('Physics', 'PHYS'),
  ('English', 'ENGL');

UPDATE departments
SET
  name = 'Information Technology',
  abbreviation = 'IT'
WHERE
  name = 'Computer Science';

INSERT INTO professors (start_date, professor_id, title, department_id)
VALUES
  ('2005-08-15', 31, 'MSc', 1),
  ('2010-08-15', 32, 'Associate Professor', 3),
  ('2018-08-15', 33, 'Dr', 1),
  ('2008-08-15', 34, 'Full Professor', 2),
  ('2012-01-10', 35, 'PhD', 2),
  ('2020-08-15', 36, 'Dr', 1),
  ('2000-08-15', 37, 'Full Professor', 4),
  ('2019-01-10', 38, 'Assistant Professor', 3),
  ('2015-08-15', 39, 'Associate Professor', 4),
  ('2002-08-15', 40, 'Full Professor', 1);

INSERT INTO programs (program_name, credits, degree_type, department_id, coordinator_id)
VALUES
  ('BSc in Computer Science', 120, 'Bachelors', 1, 31),
  ('MSc in Data Science', 45, 'Masters', 1, 40),
  ('BSc in Applied Mathematics', 120, 'Bachelors', 2, 34),
  ('PhD in Astrophysics', 90, 'Doctorate', 3, 32),
  ('BA in English Literature', 110, 'Bachelors', 4, 37);

INSERT INTO courses (course_name, credits, course_description)
VALUES
  ('Introduction to Programming', 3, 'A first course in programming using Python.'),
  ('Data Structures', 3, 'Study of fundamental data structures and their algorithms.'),
  ('Database Systems', 3, 'Introduction to database design, SQL, and normalization.'),
  ('Algorithms', 3, 'Design and analysis of computer algorithms.'),
  ('Machine Learning', 3, 'Introduction to machine learning concepts and techniques.'),
  ('Calculus I', 4, 'Limits, derivatives, and introduction to integration.'),
  ('Calculus II', 4, 'Techniques of integration, sequences, and series.'),
  ('Linear Algebra', 3, 'Vector spaces, linear transformations, and matrices.'),
  ('General Physics I', 4, 'Mechanics, heat, and sound.'),
  ('General Physics II', 4, 'Electricity, magnetism, and light.'),
  ('Introduction to Literature', 3, 'Analysis of fiction, poetry, and drama.'),
  ('Shakespeare', 3, 'A study of Shakespeare''s major plays and sonnets.'),
  ('American Literature', 3, 'Survey of American literature from the colonial period to present.'),
  ('Web Development', 3, 'Client-side and server-side web application development.');

INSERT INTO course_prerequisites (course_id, prerequisite_course_id)
VALUES
  (2, 1),
  (3, 2),
  (4, 2),
  (5, 4),
  (7, 6),
  (8, 6),
  (10, 9),
  (12, 11),
  (13, 11);

INSERT INTO classes (semester, schedule, room, course_id, program_id, professor_id)
VALUES
  -- Semester 2024/2 (Fall 2024) - For 'Passed'/'Failed' grades
  ('2024/2', 'Mon 10-12, Wed 10-12', 'Bldg A, Room 101', 1, 1, 33),
  ('2024/2', 'Tue 14-16, Thu 14-16', 'Bldg B, Room 210', 6, 3, 35),
  ('2024/2', 'Mon 13-15', 'Bldg C, Room 305', 9, 4, 38),
  ('2024/2', 'Fri 09-12', 'Bldg D, Room 150', 11, 5, 39),

  -- Semester 2025/1 (Spring 2025) - For 'Enrolled' grades
  ('2025/1', 'Mon 10-12, Wed 10-12', 'Bldg A, Room 202', 2, 1, 40),
  ('2025/1', 'Tue 14-16, Thu 14-16', 'Bldg B, Room 210', 7, 3, 34),
  ('2025/1', 'Mon 13-15', 'Bldg C, Room 305', 10, 4, 32),
  ('2025/1', 'Fri 09-12', 'Bldg D, Room 150', 12, 5, 37),
  ('2025/1', 'Tue 09-11', 'Bldg A, Room 310', 3, 1, 31),
  ('2025/1', 'Wed 13-15', 'Bldg B, Room 105', 8, 3, 35),
  ('2025/1', 'Thu 11-13', 'Bldg A, Room 401', 5, 2, 36),
  ('2025/1', 'Wed 16-18', 'Bldg A, Room 101', 14, 1, 36);

INSERT INTO enrollments (class_id, student_id, start_date, grade, status, absences)
VALUES
  (1, 1, '2024-08-28', 3.80, 'Passed', 1),
  (5, 1, '2025-01-15', NULL, 'Enrolled', 0),
  (9, 1, '2025-01-15', NULL, 'Enrolled', 0),

  (1, 2, '2024-08-28', 2.50, 'Passed', 4),
  (5, 2, '2025-01-15', NULL, 'Enrolled', 1),
  (12, 2, '2025-01-15', NULL, 'Enrolled', 0),

  (1, 3, '2024-08-28', 1.70, 'Failed', 8),


  (1, 4, '2024-08-28', 4.00, 'Passed', 0),
  (5, 4, '2025-01-15', NULL, 'Enrolled', 0),
  (9, 4, '2025-01-15', NULL, 'Enrolled', 0),
  (12, 4, '2025-01-15', NULL, 'Withdrawn', 2),

  (1, 5, '2024-08-28', 3.30, 'Passed', 2),
  (5, 5, '2025-01-15', NULL, 'Enrolled', 1),


  (2, 6, '2024-08-28', 3.90, 'Passed', 0),
  (6, 6, '2025-01-15', NULL, 'Enrolled', 0),
  (10, 6, '2025-01-15', NULL, 'Enrolled', 0),


  (2, 7, '2024-08-28', 3.10, 'Passed', 3),
  (6, 7, '2025-01-15', NULL, 'Enrolled', 1),


  (2, 8, '2024-08-28', 2.80, 'Passed', 2),
  (6, 8, '2025-01-15', NULL, 'Enrolled', 0),
  (10, 8, '2025-01-15', NULL, 'Enrolled', 2),

  (3, 11, '2024-08-28', 3.60, 'Passed', 1),
  (7, 11, '2025-01-15', NULL, 'Enrolled', 0),
  (2, 11, '2024-08-28', 3.50, 'Passed', 1),
  (6, 11, '2025-01-15', NULL, 'Enrolled', 0),


  (3, 12, '2024-08-28', 2.20, 'Passed', 5),
  (7, 12, '2025-01-15', NULL, 'Enrolled', 1),

  (4, 16, '2024-08-28', 3.70, 'Passed', 0),
  (8, 16, '2025-01-15', NULL, 'Enrolled', 0),


  (4, 17, '2024-08-28', 4.00, 'Passed', 0),
  (8, 17, '2025-01-15', NULL, 'Enrolled', 1),


  (4, 18, '2024-08-28', 1.50, 'Failed', 10),


  (1, 21, '2024-08-28', 3.00, 'Passed', 2),
  (5, 21, '2025-01-15', NULL, 'Enrolled', 0),
  (2, 22, '2024-08-28', 3.20, 'Passed', 1),
  (6, 22, '2025-01-15', NULL, 'Enrolled', 0),
  (3, 23, '2024-08-28', 2.90, 'Passed', 3),
  (7, 23, '2025-01-15', NULL, 'Enrolled', 2),
  (4, 24, '2024-08-28', 3.40, 'Passed', 1),
  (8, 24, '2025-01-15', NULL, 'Enrolled', 0),
  (1, 25, '2024-08-28', 3.80, 'Passed', 0),
  (5, 25, '2025-01-15', NULL, 'Enrolled', 1),
  (9, 25, '2025-01-15', NULL, 'Enrolled', 0),


  (11, 26, '2025-01-15', NULL, 'Enrolled', 0),
  (9, 26, '2025-01-15', NULL, 'Enrolled', 1),

  (11, 27, '2025-01-15', NULL, 'Enrolled', 0),
  (5, 27, '2025-01-15', NULL, 'Enrolled', 0),

  (7, 28, '2025-01-15', NULL, 'Enrolled', 0),
  (10, 28, '2025-01-15', NULL, 'Enrolled', 0),

  (4, 29, '2024-08-28', 3.90, 'Passed', 0),
  (8, 29, '2025-01-15', NULL, 'Enrolled', 0),

  (1, 30, '2024-08-28', 2.10, 'Passed', 6),
  (5, 30, '2025-01-15', NULL, 'Enrolled', 2);



UPDATE students
SET program_id = 1
WHERE student_id IN (1, 2, 3, 4, 5, 21, 25, 30);


UPDATE students
SET program_id = 2
WHERE student_id IN (26, 27);


UPDATE students
SET program_id = 3
WHERE student_id IN (6, 7, 8, 9, 10, 22);


UPDATE students
SET program_id = 4
WHERE student_id IN (11, 12, 13, 14, 15, 23, 28);

UPDATE students
SET program_id = 5
WHERE student_id IN (16, 17, 18, 19, 20, 24, 29);
```

</details>

<br>
- Para garantir um ambiente seguro, é necessário utilizar uma função <b>RPC</b>. Ela deve ser inserida em todos os bancos de dados dos cenários

<br>

<details>
<summary>Clique aqui para expandir o código SQL da função RPC</summary>

```sql
CREATE OR REPLACE FUNCTION rpc_sql(p_query text)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    SET LOCAL statement_timeout = '5s';

    EXECUTE 'SELECT json_agg(t) FROM (' || p_query || ') t'
    INTO result;

    IF result IS NULL THEN
        RETURN '[]'::json;
    END IF;

    RETURN result;

EXCEPTION
    WHEN others THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;
```

</details>

### Questões dos databases

- As questões desenvolvidas estão disponíveis no
  [Notion](https://scalloped-shape-8f7.notion.site/SQL-Trail-3197a6a2836880b0afb2f697513eebdf?source=copy_link)

### Backend

- Garanta que o python e o pip estão instalados

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
flask run
```

### Frontend

- Garanta que o nodejs está instalado

```bash
cd frontend
npm install
npm run dev
```

### Script para a geração do primeiro Admin. (NUNCA USAR EM PRODUÇÃO)

```python
from app import create_app
from app.auth.services import AuthService

def create_first_admin():
    app = create_app()

    with app.app_context():
        print("=== Configuração do Primeiro Administrador ===")

        data = {
            "name": 'admin',
            "email": 'admin@mail.com',
            "password": 'admin'
        }

        success, response = AuthService.create_admin(data)

        if success:
            print(f"\n[SUCESSO] {response['msg']}")

            admin = response.get('admin', {})
            admin_name = admin.name if hasattr(admin, 'name') else admin.get('name', 'Admin')

            print(f"Admin '{admin_name}' criado com sucesso.")
        else:
            print(f"\n[ERRO] {response.get('error', 'Erro desconhecido')}")

if __name__ == "__main__":
    create_first_admin()
```
