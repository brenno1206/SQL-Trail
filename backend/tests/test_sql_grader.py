from app.services.sql_grader import SQLGrader, analyze_sql, top_level_order_by


def res(columns, rows):
    return {'data': {'columns': columns, 'rows': rows, 'total': len(rows)}, 'error': None}


def test_comments_are_removed_and_trailing_comment_is_ok():
    ok, msg, cleaned = SQLGrader.is_safe_query("SELECT 1 -- comentário final")
    assert ok, msg
    assert '--' not in cleaned
    ok, msg, cleaned = SQLGrader.is_safe_query("-- consulta 1\nSELECT * FROM t;")
    assert ok and cleaned == 'SELECT * FROM t'


def test_semicolon_and_keywords_inside_literals_are_allowed():
    ok, msg, _ = SQLGrader.is_safe_query("SELECT * FROM d WHERE name = 'Update; Team'")
    assert ok, msg
    ok, msg, _ = SQLGrader.is_safe_query('SELECT 1 AS "delete"')
    assert ok, msg


def test_dangerous_statements_are_blocked():
    assert not SQLGrader.is_safe_query("SELECT 1; DROP TABLE x")[0]
    assert not SQLGrader.is_safe_query("DELETE FROM x")[0]
    assert not SQLGrader.is_safe_query("WITH a AS (DELETE FROM x RETURNING *) SELECT * FROM a")[0]
    assert not SQLGrader.is_safe_query("SELECT pg_sleep(10)")[0]
    assert not SQLGrader.is_safe_query("SELECT setval('s', 1)")[0]
    assert not SQLGrader.is_safe_query("SELECT 'a")[0]


def test_order_by_only_top_level():
    assert top_level_order_by("SELECT a FROM t ORDER BY a")
    assert not top_level_order_by("SELECT RANK() OVER (PARTITION BY a ORDER BY b) FROM t")
    assert not top_level_order_by("SELECT * FROM (SELECT a FROM t ORDER BY a LIMIT 3) x")
    assert top_level_order_by("WITH x AS (SELECT 1) SELECT * FROM x ORDER BY 1")
    assert not analyze_sql("SELECT 'ORDER BY' FROM t").top_level_order_by


def test_level1_exact_and_int_float_equivalence():
    ok, _ = SQLGrader.compare("SELECT", "", res(['a'], [[24000], [None]]), res(['b'], [[24000.0], [None]]))
    assert ok


def test_level2_unordered():
    base = res(['a'], [[1], [2]])
    stu = res(['a'], [[2], [1]])
    assert SQLGrader.compare("SELECT a FROM t", "", base, stu)[0]
    ok, msg = SQLGrader.compare("SELECT a FROM t ORDER BY a", "", base, stu)
    assert not ok and 'ordem' in msg


def test_level3_extra_and_reordered_columns():
    base = res(['nome'], [['Ana'], ['Bia']])
    stu = res(['id', 'first_name'], [[1, 'Ana'], [2, 'Bia']])
    ok, msg = SQLGrader.compare("SELECT nome FROM t", "", base, stu)
    assert ok, msg
    base = res(['a', 'b'], [[1, 'x'], [2, 'y']])
    stu = res(['b', 'a'], [['x', 1], ['y', 2]])
    assert SQLGrader.compare("SELECT a, b FROM t", "", base, stu)[0]


def test_level3_no_substring_false_positive():
    base = res(['id'], [[1], [2]])
    stu = res(['n'], [[10], [12]])
    assert not SQLGrader.compare("SELECT id FROM t", "", base, stu)[0]
    base = res(['a', 'b'], [[1, 'x'], [2, 'y']])
    stu = res(['a', 'b'], [[1, 'y'], [2, 'x']])  # colunas certas, linhas trocadas
    assert not SQLGrader.compare("SELECT a, b FROM t", "", base, stu)[0]


def test_row_count_and_missing_columns():
    ok, msg = SQLGrader.compare("SELECT", "", res(['a'], [[1]]), res(['a'], [[1], [2]]))
    assert not ok and 'linhas' in msg
    ok, msg = SQLGrader.compare("SELECT", "", res(['a', 'b'], [[1, 2]]), res(['a'], [[1]]))
    assert not ok and 'colunas' in msg.lower()
