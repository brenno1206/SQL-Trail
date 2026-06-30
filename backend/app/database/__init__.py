import os
import click
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
from app.database.models import Base, Admin, ScenarioDatabase, Question

# Inicializa a extensão vinculando-a ao metadata dos seus modelos
db = SQLAlchemy(metadata=Base.metadata)

def init_app(app):
    """Inicializa a extensão Flask-SQLAlchemy e registra os comandos CLI locais."""
    app.logger.info("Inicializando conexão SQLite local com Flask-SQLAlchemy...")

    db_path = os.path.join(app.instance_path, 'sql_trail.db')
    os.makedirs(app.instance_path, exist_ok=True)

    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    # =========================================================================
    # REGISTRO DOS COMANDOS CLI (TERMINAL)
    # =========================================================================
    @app.cli.command("create-db")
    def create_db():
        """Cria todas as tabelas do banco de dados SQLite local."""
        with app.app_context():
            db.create_all()
        click.echo("Banco de dados SQLite materializado com sucesso!")

    @app.cli.command("drop-db")
    @click.confirmation_option(prompt="Tem certeza que deseja apagar TUDO do seu SQLite local?")
    def drop_db():
        """Remove todas as tabelas do banco de dados SQLite local."""
        with app.app_context():
            db.drop_all()
        click.echo("Banco de dados SQLite removido com sucesso.")

    @app.cli.command("seed-dev")
    def seed_dev():
        """Popula o banco com administrador, cenários e árvore adaptativa de questões."""
        with app.app_context():
            click.echo("Limpando dados antigos para evitar duplicidade...")
            db.session.query(Question).delete()
            db.session.query(ScenarioDatabase).delete()
            db.session.query(Admin).delete()
            db.session.commit()

            # 1. Criação do Admin Padrão
            click.echo("Criando usuário administrador...")
            admin = Admin(
                name="Administrador Trail",
                email="admin@sqltrail.com",
                password_hash=generate_password_hash("admin123")
            )
            db.session.add(admin)

            # 2. Criação dos Cenários
            click.echo("Inserindo cenários de banco de dados...")
            scenarios_data = [
                {"slug": "universidade", "name": "Universidade", "diagram_url": "/universidade.png"},
                {"slug": "recursos-humanos", "name": "Recursos Humanos", "diagram_url": "/recursos-humanos.png"}
            ]
            
            scenarios_map = {}
            for sc in scenarios_data:
                scenario_obj = ScenarioDatabase(slug=sc["slug"], name=sc["name"], diagram_url=sc["diagram_url"])
                db.session.add(scenario_obj)
                db.session.flush()  # Captura o ID gerado pelo banco antes do commit
                scenarios_map[sc["slug"]] = scenario_obj.id

            # Dificuldades mapeadas: 1 = Fácil, 2 = Médio, 3 = Difícil
            
            # =========================================================================
            # QUESTÕES: RECURSOS HUMANOS
            # =========================================================================
            click.echo("Semeando questões do cenário Recursos Humanos...")
            rh_id = scenarios_map["recursos-humanos"]
            
            rh_questions = [
                # Fáceis (Dificuldade 1)
                {"statement": "Liste o nome de todas as regiões cadastradas no sistema", "query": "SELECT region_name FROM regions", "diff": 1},
                {"statement": "Liste o nome, o sobrenome e o email de todos os empregados", "query": "SELECT first_name, last_name, email FROM employees", "diff": 1},
                {"statement": "Liste todos os países cadastrados no sistema", "query": "SELECT country_name FROM countries", "diff": 1},
                {"statement": "Liste todas as cidades cadastradas no sistema", "query": "SELECT city FROM locations", "diff": 1},
                {"statement": "Liste o nome de todos os departamentos", "query": "SELECT department_name FROM departments", "diff": 1},
                {"statement": "Liste todos os cargos com o salário mínimo maior ou igual a R$3000", "query": "SELECT job_title FROM jobs WHERE min_salary >= 3000", "diff": 1},
                {"statement": "Liste de o nome e o salário de todos os empregados admitidos após 12/11/2007", "query": "SELECT first_name, salary FROM employees WHERE hire_date > '2007-11-12'", "diff": 1},
                {"statement": "Para cada cargo, apresente o salário máximo, o salário mínimo e a diferença entre eles", "query": "SELECT job_title, min_salary, max_salary, (max_salary-min_salary) DIFFERENCE FROM jobs", "diff": 1},
                {"statement": "Liste o nome de todos os funcionários que ganham entre 5000 e 10000", "query": "SELECT first_name FROM employees WHERE salary BETWEEN 5000 AND 10000", "diff": 1},
                {"statement": "Selecione o empregado sem gerente na empresa", "query": "SELECT first_name FROM employees WHERE manager_id is null", "diff": 1},
                
                # Médios (Dificuldade 2)
                {"statement": "Liste todos os empregados que recebem exatamente o salário máximo de seu emprego", "query": "SELECT first_name, salary, job_title FROM employees JOIN jobs USING(job_id) WHERE salary = max_salary", "diff": 2},
                {"statement": "Selecione todas as cidades da região das Américas.", "query": "SELECT city FROM locations JOIN countries USING(country_id) JOIN regions USING(region_id) WHERE region_name='Americas'", "diff": 2},
                {"statement": "Selecione o nome, o sobrenome e o salário de todos os funcionários que recebem mais de 10.000, ordene-os pelo salário do maior para o menor.", "query": "SELECT first_name, last_name, salary FROM employees WHERE salary > 10000 ORDER BY salary DESC", "diff": 2},
                {"statement": "Selecione a localização completa de cada departamento: região, país, estado, cidade e rua.", "query": "SELECT department_name, region_name, country_name, state_province, city, street_address FROM departments JOIN locations USING(location_id) JOIN countries USING(country_id) JOIN regions USING(region_id)", "diff": 2},
                {"statement": "Gere um novo email para cada funcionário no formato nome.sobrenome@business.com em letras minúsculas", "query": "SELECT email, LOWER(first_name) || '.' || LOWER(last_name) || '@business.com' novo_email FROM employees", "diff": 2},
                {"statement": "Liste os empregados que já passaram por mais de um cargo", "query": "SELECT DISTINCT first_name, last_name FROM employees JOIN job_history USING(employee_id)", "diff": 2},
                {"statement": "Liste o nome dos gerentes de departamento, o nome do departamento e o país onde estão localizados.", "query": "SELECT first_name, department_name, country_name FROM departments d JOIN employees e ON d.manager_id = e.employee_id JOIN locations USING(location_id) JOIN countries USING(country_id)", "diff": 2},
                {"statement": "Selecione o nome e o sobrenome do empregado com o melhor salário e o seu emprego", "query": "SELECT first_name, last_name, job_title, salary FROM employees JOIN jobs USING(job_id) ORDER BY 4 DESC LIMIT 1", "diff": 2},
                {"statement": "Mostre a média salarial de cada departamento, exibindo o nome do departamento e o valor da média.", "query": "SELECT d.department_name, ROUND(AVG(e.salary), 2) AS media_salarial FROM departments d JOIN employees e ON d.department_id = e.department_id GROUP BY d.department_name;", "diff": 2},
                {"statement": "Liste os departamentos que possuem mais de 5 funcionários cadastrados.", "query": "SELECT d.department_name, COUNT(e.employee_id) AS total_funcionarios FROM departments d JOIN employees e ON d.department_id = e.department_id GROUP BY d.department_name HAVING COUNT(e.employee_id) > 5;", "diff": 2},
                {"statement": "Conte quantos funcionários cada país possui.", "query": "SELECT c.country_name, COUNT(e.employee_id) AS total_funcionarios FROM countries c LEFT JOIN locations l ON c.country_id = l.country_id LEFT JOIN departments d ON l.location_id = d.location_id LEFT JOIN employees e ON d.department_id = e.department_id GROUP BY c.country_name;", "diff": 2},
                {"statement": "Liste todos os funcionários que trabalham no departamento 'IT' ou 'Sales'.", "query": "SELECT e.first_name || ' ' || e.last_name AS funcionario, d.department_name FROM employees e JOIN departments d ON e.department_id = d.department_id WHERE d.department_name IN ('IT', 'Sales');", "diff": 2},
                {"statement": "Mostre o nome do funcionário e o nome do seu gerente direto", "query": "SELECT e.first_name || ' ' || e.last_name AS funcionario, m.first_name || ' ' || m.last_name AS gerente FROM employees e LEFT JOIN employees m ON e.manager_id = m.employee_id;", "diff": 2},
                {"statement": "Calcule o valor total gasto com comissões pela empresa.", "query": "SELECT SUM(salary * commission_pct) AS valor_total_comissoes FROM employees WHERE commission_pct IS NOT NULL;", "diff": 2},
                {"statement": "Liste os cargos que nunca foram ocupados", "query": "SELECT job_title FROM jobs WHERE job_id NOT IN (SELECT DISTINCT job_id FROM employees) AND job_id NOT IN (SELECT DISTINCT job_id FROM job_history);", "diff": 2},
                {"statement": "Selecione os funcionários que foram contratados no mesmo ano que o seu gerente.", "query": "SELECT e.first_name || ' ' || e.last_name AS funcionario, e.hire_date AS data_contratacao_func, m.first_name || ' ' || m.last_name AS gerente, m.hire_date AS data_contratacao_gerente FROM employees e JOIN employees m ON e.manager_id = m.employee_id WHERE EXTRACT(YEAR FROM e.hire_date) = EXTRACT(YEAR FROM m.hire_date);", "diff": 2},
                {"statement": "Exiba o nome do departamento e o tempo médio (em dias) que os funcionários ficam em cargos nesse depto.", "query": "SELECT d.department_name, ROUND(AVG(jh.end_date - jh.start_date), 0) AS tempo_medio_dias FROM job_history jh JOIN departments d ON jh.department_id = d.department_id GROUP BY d.department_name;", "diff": 2},
                {"statement": "Liste as cidades que não possuem nenhum departamento cadastrado.", "query": "SELECT l.city FROM locations l LEFT JOIN departments d ON l.location_id = d.location_id WHERE d.department_id IS NULL;", "diff": 2},
                {"statement": "Selecione os 3 supervisores com mais subordinados", "query": "SELECT m.first_name, m.last_name, COUNT(e.employee_id) AS total_subordinados FROM employees e JOIN employees m ON e.manager_id = m.employee_id GROUP BY m.first_name, m.last_name ORDER BY total_subordinados DESC LIMIT 3;", "diff": 2},
                {"statement": "Liste o nome do departamento que possui a maior folha de pagamento", "query": "SELECT d.department_name, SUM(e.salary) AS total_payroll FROM departments d JOIN employees e ON d.department_id = e.department_id GROUP BY d.department_name ORDER BY total_payroll DESC LIMIT 1;", "diff": 2},
                
                # Difíceis (Dificuldade 3)
                {"statement": "Selecione os empregados com maior salário por cidade", "query": "SELECT e.first_name, e.salary, l.city FROM employees e JOIN departments d ON e.department_id = d.department_id JOIN locations l ON d.location_id = l.location_id WHERE e.salary = ( SELECT MAX(e2.salary) FROM employees e2 JOIN departments d2 ON e2.department_id = d2.department_id JOIN locations l2 ON d2.location_id = l2.location_id WHERE l2.city = l.city);", "diff": 3},
                {"statement": "Crie um ranking dos funcionários por salário dentro de cada departamento (mostrando Nome, Depto, Salário e a Posição no Ranking).", "query": "SELECT e.first_name || ' ' || e.last_name AS employee_name, d.department_name, e.salary, RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS salary_rank FROM employees e LEFT JOIN departments d ON e.department_id = d.department_id ORDER BY department_name, salary_rank;", "diff": 3},
                {"statement": "Liste o nome de todos os funcionários e o 'Caminho' hierárquico até o CEO (ex: 'Steven -> Neena -> Nancy').", "query": "WITH RECURSIVE EmployeeHierarchy AS ( SELECT employee_id, first_name, manager_id, CAST(first_name AS VARCHAR(1000)) AS hierarchy_path FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.employee_id, e.first_name, e.manager_id, CAST(eh.hierarchy_path || ' -> ' || e.first_name AS VARCHAR(1000)) FROM employees e INNER JOIN EmployeeHierarchy eh ON e.manager_id = eh.employee_id ) SELECT employee_id, hierarchy_path FROM EmployeeHierarchy ORDER BY hierarchy_path;", "diff": 3},
                {"statement": "Liste funcionários que tiveram um aumento salarial superior a 20% ao mudar de cargo", "query": "SELECT e.first_name || ' ' || e.last_name AS employee_name, jh.job_id AS previous_job, pj.min_salary AS prev_min_salary, e.job_id AS current_job, e.salary AS current_salary, ROUND(((e.salary - pj.min_salary) / pj.min_salary) * 100, 2) AS increase_percentage FROM employees e JOIN job_history jh ON e.employee_id = jh.employee_id JOIN jobs pj ON jh.job_id = pj.job_id WHERE e.salary > (pj.min_salary * 1.20);", "diff": 3},
                {"statement": "Liste os departamentos onde o gerente do departamento ganha menos que a média dos funcionários daquele mesmo departamento.", "query": "WITH DeptAvg AS ( SELECT department_id, AVG(salary) AS avg_salary FROM employees GROUP BY department_id ) SELECT d.department_name, m.first_name || ' ' || m.last_name AS manager_name, m.salary AS manager_salary, ROUND(da.avg_salary, 2) AS department_avg_salary FROM departments d JOIN employees m ON d.manager_id = m.employee_id JOIN DeptAvg da ON d.department_id = da.department_id WHERE m.salary < da.avg_salary;", "diff": 3},
                {"statement": "Calcule o percentual representativo da folha de pagamento de cada região em relação ao total da empresa.", "query": "WITH TotalPayroll AS ( SELECT SUM(salary) AS total_salary FROM employees ), RegionPayroll AS ( SELECT r.region_name, SUM(e.salary) AS region_salary FROM employees e JOIN departments d ON e.department_id = d.department_id JOIN locations l ON d.location_id = l.location_id JOIN countries c ON l.location_id = c.country_id JOIN regions r ON c.region_id = r.region_id GROUP BY r.region_name ) SELECT rp.region_name, rp.region_salary, ROUND((rp.region_salary / tp.total_salary) * 100, 2) AS percent_of_total FROM RegionPayroll rp CROSS JOIN TotalPayroll tp;", "diff": 3},
                {"statement": "Selecione os funcionários que ganham mais que a média salarial de seus respectivos departamentos.", "query": "WITH DeptAvg AS ( SELECT department_id, AVG(salary) AS avg_salary FROM employees GROUP BY department_id ) SELECT e.first_name || ' ' || e.last_name AS employee_name, d.department_name, e.salary, ROUND(da.avg_salary, 2) AS dept_avg_salary FROM employees e JOIN DeptAvg da ON e.department_id = da.department_id LEFT JOIN departments d ON e.department_id = d.department_id WHERE e.salary > da.avg_salary;", "diff": 3},
                {"statement": "Crie uma consulta que mostre o histórico de carreira de um funcionário: Cargo Inicial, Cargo Atual e todos os cargos intermediários com as respectivas datas.", "query": "SELECT e.first_name || ' ' || e.last_name AS employee_name, j.job_title AS job_title, jh.start_date, jh.end_date, 'Histórico' AS status FROM job_history jh JOIN employees e ON jh.employee_id = e.employee_id JOIN jobs j ON jh.job_id = j.job_id UNION ALL SELECT e.first_name || ' ' || e.last_name, j.job_title, e.hire_date AS start_date, NULL AS end_date, 'Atual' AS status FROM employees e JOIN jobs j ON e.job_id = j.job_id ORDER BY employee_name, start_date;", "diff": 3},
                {"statement": "Conte quantos funcionários foram contratados por ano, mas exiba os anos como colunas (ex: 2005 | 2006 | 2007).", "query": "SELECT SUM(CASE WHEN EXTRACT(YEAR FROM hire_date) = 2008 THEN 1 ELSE 0 END) AS '2008', SUM(CASE WHEN EXTRACT(YEAR FROM hire_date) = 2009 THEN 1 ELSE 0 END) AS '2009', SUM(CASE WHEN EXTRACT(YEAR FROM hire_date) = 2010 THEN 1 ELSE 0 END) AS '2010', SUM(CASE WHEN EXTRACT(YEAR FROM hire_date) = 2011 THEN 1 ELSE 0 END) AS '2011', SUM(CASE WHEN EXTRACT(YEAR FROM hire_date) = 2012 THEN 1 ELSE 0 END) AS '2012' FROM employees;", "diff": 3},
                {"statement": "Liste o nome do país que possui a maior diversidade de cargos (mais títulos de cargos diferentes presentes em seus departamentos).", "query": "SELECT c.country_name, COUNT(DISTINCT e.job_id) AS distinct_job_titles FROM employees e JOIN departments d ON e.department_id = d.department_id JOIN locations l ON d.location_id = l.location_id JOIN countries c ON l.country_id = c.country_id GROUP BY c.country_name ORDER BY distinct_job_titles DESC LIMIT 1;", "diff": 3}
            ]

            order_counter = 1
            for q in rh_questions:
                q_obj = Question(
                    scenario_database_id=rh_id,
                    statement=q["statement"],
                    expected_query=q["query"],
                    question_order=order_counter,
                    difficulty=q["diff"]
                )
                db.session.add(q_obj)
                order_counter += 1

            # =========================================================================
            # QUESTÕES: UNIVERSIDADE
            # =========================================================================
            click.echo("Semeando questões do cenário Universidade...")
            uni_id = scenarios_map["universidade"]
            
            uni_questions = [
                # Fáceis (Dificuldade 1)
                {"statement": "Liste o nome e a carga horária de todos os cursos cadastrados.", "query": "SELECT course_name, credits FROM courses;", "diff": 1},
                {"statement": "Liste o nome e a sigla de todos os departamentos da universidade.", "query": "SELECT name, abbreviation FROM departments;", "diff": 1},
                {"statement": "Liste o nome, sobrenome e email de todos os membros cadastrados no sistema.", "query": "SELECT first_name, last_name, email FROM members;", "diff": 1},
                {"statement": "Liste o nome de todos os programas que possuem mais de 100 créditos.", "query": "SELECT program_name FROM programs WHERE credits > 100;", "diff": 1},
                {"statement": "Liste o ID e a data de início de todos os alunos que ingressaram após 01/01/2023.", "query": "SELECT student_id, start_date FROM students WHERE start_date > '2023-01-01';", "diff": 1},
                {"statement": "Selecione o ID de todos os professores que possuem o título de PhD,", "query": "SELECT professor_id FROM professors WHERE title = 'PhD';", "diff": 1},
                {"statement": "Liste o nome e sobrenome de todos os membros que nasceram antes do ano 2000.", "query": "SELECT first_name, last_name FROM members WHERE date_of_birth < '2000-01-01';", "diff": 1},
                {"statement": "Liste o semestre e a sala de todas as turmas (classes) cadastradas.", "query": "SELECT semester, room FROM classes;", "diff": 1},
                {"statement": "Liste os nomes das cidades onde os membros residem.", "query": "SELECT DISTINCT city FROM addresses;", "diff": 1},
                {"statement": "Liste o ID do curso e o ID de seu respectivo pré-requisito.", "query": "SELECT course_id, prerequisite_course_id FROM course_prerequisites;", "diff": 1},
                
                # Médios (Dificuldade 2)
                {"statement": "Liste o nome, sobrenome e a data de ingresso de todos os alunos.", "query": "SELECT m.first_name, m.last_name, s.start_date FROM members m JOIN students s ON m.member_id = s.student_id;", "diff": 2},
                {"statement": "Mostre o nome, sobrenome e o nome do departamento de todos os professores.", "query": "SELECT m.first_name, m.last_name, d.name AS department_name FROM members m JOIN professors p ON m.member_id = p.professor_id JOIN departments d ON p.department_id = d.department_id;", "diff": 2},
                {"statement": "Liste o nome do programa e o nome completo de seu coordenador.", "query": "SELECT pr.program_name, m.first_name, m.last_name FROM programs pr JOIN professors p ON pr.coordinator_id = p.professor_id JOIN members m ON p.professor_id = m.member_id;", "diff": 2},
                {"statement": "Selecione o nome do curso e o nome do curso que é seu pré-requisito.", "query": "SELECT c1.course_name AS course, c2.course_name AS prerequisite FROM courses c1 JOIN course_prerequisites cp ON c1.course_id = cp.course_id JOIN courses c2 ON cp.prerequisite_course_id = c2.course_id;", "diff": 2},
                {"statement": "Conte quantos professores existem em cada departamento, listando o nome do departamento e o total.", "query": "SELECT d.name, COUNT(p.professor_id) as total_professors FROM departments d LEFT JOIN professors p ON d.department_id = p.department_id GROUP BY d.name;", "diff": 2},
                {"statement": "Liste as turmas mostrando o nome do curso, o nome do professor e o semestre.", "query": "SELECT c.course_name, m.first_name AS professor_name, cl.semester FROM classes cl JOIN courses c ON cl.course_id = c.course_id JOIN professors p ON cl.professor_id = p.professor_id JOIN members m ON p.professor_id = m.member_id;", "diff": 2},
                {"statement": "Mostre a nota média de cada turma, arredondada para duas casas decimais.", "query": "SELECT class_id, ROUND(AVG(grade), 2) as avg_grade FROM enrollments GROUP BY class_id;", "diff": 2},
                {"statement": "Liste de forma única o nome e sobrenome dos alunos que já foram reprovados em alguma matéria.", "query": "SELECT DISTINCT m.first_name, m.last_name FROM members m JOIN enrollments e ON m.member_id = e.student_id WHERE e.status = 'Failed';", "diff": 2},
                {"statement": "Liste o ID do aluno e o total de faltas que ele acumulou somando todas as suas matrículas.", "query": "SELECT student_id, SUM(absences) as total_absences FROM enrollments GROUP BY student_id;", "diff": 2},
                {"statement": "Gere um email acadêmico padronizado para todos os membros no formato: nome.sobrenome@universidade.edu.", "query": "SELECT LOWER(first_name) || '.' || LOWER(last_name) || '@universidade.edu' AS academic_email FROM members;", "diff": 2},
                {"statement": "Liste o nome dos programas e quantas turmas estão associadas a cada um.", "query": "SELECT p.program_name, COUNT(c.class_id) as total_classes FROM programs p LEFT JOIN classes c ON p.program_id = c.program_id GROUP BY p.program_name;", "diff": 2},
                {"statement": "Selecione o nome do aluno, o nome do curso e a nota do aluno que obteve a maior nota já registrada.", "query": "SELECT m.first_name, c.course_name, e.grade FROM enrollments e JOIN members m ON e.student_id = m.member_id JOIN classes cl ON e.class_id = cl.class_id JOIN courses c ON cl.course_id = c.course_id WHERE e.grade IS NOT NULL ORDER BY e.grade DESC LIMIT 1;", "diff": 2},
                {"statement": "Liste as cidades que possuem mais de 5 membros residindo nelas.", "query": "SELECT a.city, COUNT(m.member_id) as total_members FROM addresses a JOIN members m ON a.address_id = m.address_id GROUP BY a.city HAVING COUNT(m.member_id) > 5;", "diff": 2},
                {"statement": "Mostre o nome e sobrenome dos professores que coordenam programas do tipo 'Masters'.", "query": "SELECT m.first_name, m.last_name FROM members m JOIN professors p ON m.member_id = p.professor_id JOIN programs pr ON p.professor_id = pr.coordinator_id WHERE pr.degree_type = 'Masters';", "diff": 2},
                {"statement": "Liste o quantitativo de alunos matriculados agrupados pelo status de matrícula .", "query": "SELECT status, COUNT(*) as total_students FROM enrollments GROUP BY status;", "diff": 2},
                {"statement": "Selecione os nomes dos cursos que não possuem nenhum pré-requisito.", "query": "SELECT c.course_name FROM courses c LEFT JOIN course_prerequisites cp ON c.course_id = cp.course_id WHERE cp.prerequisite_course_id IS NULL;", "diff": 2},
                {"statement": "Liste o nome, sobrenome e o número de telefone de todos os membros que não cadastraram telefone.", "query": "SELECT first_name, last_name, phone_number FROM members WHERE phone_number IS NULL OR phone_number = '';", "diff": 2},
                {"statement": "Calcule a média de créditos dos cursos, agrupando pelo tipo de graduação dos programas a que pertencem.", "query": "SELECT pr.degree_type, ROUND(AVG(c.credits), 2) as avg_course_credits FROM programs pr JOIN classes cl ON pr.program_id = cl.program_id JOIN courses c ON cl.course_id = c.course_id GROUP BY pr.degree_type;", "diff": 2},
                {"statement": "Liste os semestres e o número total de matrículas de alunos feitas em cada um.", "query": "SELECT cl.semester, COUNT(e.student_id) as total_enrollments FROM classes cl LEFT JOIN enrollments e ON cl.class_id = e.class_id GROUP BY cl.semester;", "diff": 2},
                {"statement": "Liste o nome e sobrenome dos professores que iniciaram suas atividades no ano de 2020.", "query": "SELECT m.first_name, m.last_name FROM members m JOIN professors p ON m.member_id = p.professor_id WHERE EXTRACT(YEAR FROM p.start_date) = 2020;", "diff": 2},
                
                # Difíceis (Dificuldade 3)
                {"statement": "Crie um ranking dos alunos pelas suas notas, particionado por cada turma (mostrando o nome do aluno, ID da turma, nota e a posição no ranking).", "query": "SELECT m.first_name || ' ' || m.last_name AS student_name, e.class_id, e.grade, RANK() OVER (PARTITION BY e.class_id ORDER BY e.grade DESC NULLS LAST) AS grade_rank FROM enrollments e JOIN members m ON e.student_id = m.member_id;", "diff": 3},
                {"statement": "Liste a 'Árvore de Pré-requisitos' de todos os cursos, mostrando o nível de profundidade do pré-requisito.", "query": "WITH RECURSIVE PrerequisiteTree AS ( SELECT c.course_id, c.course_name, cp.prerequisite_course_id, 1 AS level FROM courses c LEFT JOIN course_prerequisites cp ON c.course_id = cp.course_id UNION ALL SELECT pt.course_id, pt.course_name, cp.prerequisite_course_id, pt.level + 1 FROM PrerequisiteTree pt INNER JOIN course_prerequisites cp ON pt.prerequisite_course_id = cp.course_id ) SELECT * FROM PrerequisiteTree ORDER BY course_id, level;", "diff": 3},
                {"statement": "Calcule o percentual de aprovação para cada turma, exibindo o ID da turma, o semestre e a taxa de sucesso.", "query": "SELECT cl.class_id, cl.semester, COUNT(e.student_id) AS total_students, ROUND(SUM(CASE WHEN e.status = 'Passed' THEN 1 ELSE 0 END) * 100.0 / COUNT(e.student_id), 2) AS pass_rate_percentage FROM classes cl LEFT JOIN enrollments e ON cl.class_id = e.class_id GROUP BY cl.class_id, cl.semester;", "diff": 3},
                {"statement": "Para cada semestre, mostre a quantidade de matrículas em cada status.", "query": "SELECT cl.semester, SUM(CASE WHEN e.status = 'Enrolled' THEN 1 ELSE 0 END) AS count_enrolled, SUM(CASE WHEN e.status = 'Passed' THEN 1 ELSE 0 END) AS count_passed, SUM(CASE WHEN e.status = 'Failed' THEN 1 ELSE 0 END) AS count_failed, SUM(CASE WHEN e.status = 'Withdrawn' THEN 1 ELSE 0 END) AS count_withdrawn FROM classes cl JOIN enrollments e ON cl.class_id = e.class_id GROUP BY cl.semester ORDER BY cl.semester;", "diff": 3},
                {"statement": "Identifique se existe algum professor coordenando um programa que pertence a um departamento diferente do departamento no qual o próprio professor está alocado.", "query": "SELECT m.first_name || ' ' || m.last_name AS professor_name, pr.program_name, p.department_id AS prof_dept, pr.department_id AS program_dept FROM professors p JOIN members m ON p.professor_id = m.member_id JOIN programs pr ON p.professor_id = pr.coordinator_id WHERE p.department_id != pr.department_id;", "diff": 3},
                {"statement": "Liste os alunos cuja média de notas geral é estritamente MAIOR que a média de notas de toda a universidade.", "query": "WITH UniversityAvg AS ( SELECT AVG(grade) AS overall_avg FROM enrollments ), StudentAvg AS ( SELECT student_id, AVG(grade) AS std_avg FROM enrollments GROUP BY student_id ) SELECT m.first_name, m.last_name, ROUND(sa.std_avg, 2) AS student_average, ROUND(ua.overall_avg, 2) AS university_average FROM StudentAvg sa JOIN members m ON sa.student_id = m.member_id CROSS JOIN UniversityAvg ua WHERE sa.std_avg > ua.overall_avg;", "diff": 3},
                {"statement": "Mostre o total de créditos que cada aluno tentou cursar em um semestre específico, listando apenas os alunos com mais de 20 créditos no semestre.", "query": "SELECT m.first_name || ' ' || m.last_name AS student_name, SUM(c.credits) AS total_credits_attempted FROM enrollments e JOIN members m ON e.student_id = m.member_id JOIN classes cl ON e.class_id = cl.class_id JOIN courses c ON cl.course_id = c.course_id WHERE cl.semester = '2025/1' AND e.status != 'Withdrawn' GROUP BY e.student_id, m.first_name, m.last_name HAVING SUM(c.credits) > 20;", "diff": 3},
                {"statement": "Identifique os cursos 'Gargalo': Aqueles que são pré-requisitos para 3 ou mais cursos diferentes.", "query": "SELECT c.course_name, COUNT(cp.course_id) AS blocks_other_courses FROM course_prerequisites cp JOIN courses c ON cp.prerequisite_course_id = c.course_id GROUP BY cp.prerequisite_course_id, c.course_name HAVING COUNT(cp.course_id) >= 3 ORDER BY blocks_other_courses DESC;", "diff": 3},
                {"statement": "Descubra qual departamento possui a pior média de notas geral.", "query": "SELECT d.name AS department_name, ROUND(AVG(e.grade), 2) AS average_grade FROM departments d JOIN programs pr ON d.department_id = pr.department_id JOIN classes cl ON pr.program_id = cl.program_id JOIN enrollments e ON cl.class_id = e.class_id GROUP BY d.department_id, d.name ORDER BY average_grade ASC LIMIT 1;", "diff": 3},
                {"statement": "Identifique alunos que têm aulas sobrepostas: Alunos matriculados em mais de uma turma que possui EXATAMENTE o mesmo horário e no mesmo semestre.", "query": "SELECT m.first_name || ' ' || m.last_name AS student_name, cl.semester, cl.schedule, COUNT(e.class_id) as overlapping_classes FROM enrollments e JOIN members m ON e.student_id = m.member_id JOIN classes cl ON e.class_id = cl.class_id GROUP BY e.student_id, m.first_name, m.last_name, cl.semester, cl.schedule HAVING COUNT(e.class_id) > 1;", "diff": 3}
            ]

            order_counter = 1
            for q in uni_questions:
                q_obj = Question(
                    scenario_database_id=uni_id,
                    statement=q["statement"],
                    expected_query=q["query"],
                    question_order=order_counter,
                    difficulty=q["diff"]
                )
                db.session.add(q_obj)
                order_counter += 1

            db.session.commit()
            click.echo("Banco de dados populado com sucesso (80 questões mapeadas)!")