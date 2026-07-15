import os
from typing import Any

import psycopg2
import psycopg2.extras

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "schooldb")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = "Test@123"

def _connection_kwargs(dbname: str | None = None) -> dict[str, Any]:
    return {
        "host": DB_HOST,
        "port": DB_PORT,
        "dbname": dbname or DB_NAME,
        "user": DB_USER,
        "password": DB_PASSWORD,

    }


def ensure_database() -> None:
    conn = psycopg2.connect(**_connection_kwargs("postgres"))
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
            if not cur.fetchone():
                cur.execute(f"CREATE DATABASE {DB_NAME}")
    finally:
        conn.close()


def get_connection() -> psycopg2.extensions.connection:
    ensure_database()
    return psycopg2.connect(**_connection_kwargs())


def init_schema() -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    school_name TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schools (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL,
                    name TEXT NOT NULL DEFAULT '',
                    address TEXT,
                    currency TEXT NOT NULL DEFAULT 'Rs.',
                    logo_url TEXT,
                    phone TEXT,
                    email TEXT,
                    website TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS students (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    roll_no TEXT,
                    name TEXT NOT NULL,
                    class_name TEXT,
                    section TEXT,
                    gender TEXT,
                    dob TEXT,
                    guardian_name TEXT,
                    phone TEXT,
                    address TEXT,
                    admission_date TEXT,
                    status TEXT DEFAULT 'Active',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS fee_structures (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    class_name TEXT NOT NULL,
                    items JSONB NOT NULL,
                    total NUMERIC NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS invoices (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    student_id INTEGER NOT NULL,
                    invoice_no TEXT UNIQUE NOT NULL,
                    date TEXT NOT NULL,
                    amount NUMERIC NOT NULL,
                    method TEXT NOT NULL,
                    note TEXT,
                    status TEXT NOT NULL DEFAULT 'Paid',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    student_id INTEGER NOT NULL,
                    invoice_id INTEGER NOT NULL,
                    amount NUMERIC NOT NULL,
                    method TEXT NOT NULL,
                    note TEXT,
                    date TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS exams (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    term TEXT,
                    class_name TEXT NOT NULL,
                    subjects JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS results (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    exam_id INTEGER NOT NULL,
                    student_id INTEGER NOT NULL,
                    marks JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, exam_id, student_id)
                )
                """
            )
        conn.commit()
    finally:
        conn.close()


def create_user(username: str, password_hash: str, school_name: str = "", school_details: dict[str, Any] | None = None) -> dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO users (username, password_hash, school_name) VALUES (%s, %s, %s) RETURNING id, username, school_name, created_at",
                (username, password_hash, school_name),
            )
            row = cur.fetchone()
            user_id = row["id"]
            details = school_details or {}
            cur.execute(
                """
                INSERT INTO schools (user_id, name, address, currency, logo_url, phone, email, website)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    details.get("name") or school_name,
                    details.get("address"),
                    details.get("currency") or "Rs.",
                    details.get("logo_url"),
                    details.get("phone"),
                    details.get("email"),
                    details.get("website"),
                ),
            )
        conn.commit()
        return dict(row)
    finally:
        conn.close()


def get_user_by_username(username: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, username, password_hash, school_name, created_at FROM users WHERE username = %s",
                (username,),
            )
            row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id: str | int) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, username, school_name, created_at FROM users WHERE id = %s",
                (int(user_id),),
            )
            row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_school_for_user(user_id: int | str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, name, address, currency, logo_url, phone, email, website, created_at
                FROM schools WHERE user_id = %s
                """,
                (int(user_id),),
            )
            row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_school_for_user(user_id: int | str, school: dict[str, Any]) -> dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO schools (user_id, name, address, currency, logo_url, phone, email, website)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    address = EXCLUDED.address,
                    currency = EXCLUDED.currency,
                    logo_url = EXCLUDED.logo_url,
                    phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    website = EXCLUDED.website
                RETURNING id, user_id, name, address, currency, logo_url, phone, email, website, created_at
                """,
                (
                    int(user_id),
                    school.get("name"),
                    school.get("address"),
                    school.get("currency") or "Rs.",
                    school.get("logo_url"),
                    school.get("phone"),
                    school.get("email"),
                    school.get("website"),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row)
    finally:
        conn.close()


def update_school_for_user(user_id: int | str, school: dict[str, Any]) -> dict[str, Any] | None:
    return create_school_for_user(user_id, school)


def create_student_for_user(user_id: int | str, student: dict[str, Any]) -> dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO students (
                    user_id, roll_no, name, class_name, section, gender, dob,
                    guardian_name, phone, address, admission_date, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, user_id, roll_no, name, class_name, section, gender, dob,
                guardian_name, phone, address, admission_date, status, created_at
                """,
                (
                    int(user_id),
                    student.get("roll_no"),
                    student.get("name"),
                    student.get("class_name"),
                    student.get("section"),
                    student.get("gender"),
                    student.get("dob"),
                    student.get("guardian_name"),
                    student.get("phone"),
                    student.get("address"),
                    student.get("admission_date"),
                    student.get("status") or "Active",
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row)
    finally:
        conn.close()


def get_students_for_user(user_id: int | str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, roll_no, name, class_name, section, gender, dob,
                guardian_name, phone, address, admission_date, status, created_at
                FROM students WHERE user_id = %s ORDER BY id ASC
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def update_student_for_user(user_id: int | str, student_id: int | str, student: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE students
                SET roll_no = %s, name = %s, class_name = %s, section = %s, gender = %s, dob = %s,
                    guardian_name = %s, phone = %s, address = %s, admission_date = %s, status = %s
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, roll_no, name, class_name, section, gender, dob,
                guardian_name, phone, address, admission_date, status, created_at
                """,
                (
                    student.get("roll_no"),
                    student.get("name"),
                    student.get("class_name"),
                    student.get("section"),
                    student.get("gender"),
                    student.get("dob"),
                    student.get("guardian_name"),
                    student.get("phone"),
                    student.get("address"),
                    student.get("admission_date"),
                    student.get("status") or "Active",
                    int(student_id),
                    int(user_id),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
    finally:
        conn.close()


def delete_student_for_user(user_id: int | str, student_id: int | str) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM students WHERE id = %s AND user_id = %s", (int(student_id), int(user_id)))
            deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()


def create_exam_for_user(user_id: int | str, exam: dict[str, Any]) -> dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO exams (user_id, name, term, class_name, subjects)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, name, term, class_name, subjects, created_at
                """,
                (
                    int(user_id),
                    exam["name"],
                    exam.get("term"),
                    exam.get("class_name") or exam.get("className"),
                    psycopg2.extras.Json(exam.get("subjects", [])),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row)
    finally:
        conn.close()


def get_exams_for_user(user_id: int | str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, name, term, class_name, subjects, created_at
                FROM exams WHERE user_id = %s ORDER BY id ASC
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_exam_by_id_for_user(user_id: int | str, exam_id: int | str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, name, term, class_name, subjects, created_at
                FROM exams WHERE id = %s AND user_id = %s
                """,
                (int(exam_id), int(user_id)),
            )
            row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_exam_for_user(user_id: int | str, exam_id: int | str, exam: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE exams
                SET name = %s, term = %s, class_name = %s, subjects = %s
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, name, term, class_name, subjects, created_at
                """,
                (
                    exam["name"],
                    exam.get("term"),
                    exam.get("class_name") or exam.get("className"),
                    psycopg2.extras.Json(exam.get("subjects", [])),
                    int(exam_id),
                    int(user_id),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
    finally:
        conn.close()


def delete_exam_for_user(user_id: int | str, exam_id: int | str) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM exams WHERE id = %s AND user_id = %s", (int(exam_id), int(user_id)))
            deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()


def get_results_for_user(user_id: int | str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, exam_id, student_id, marks, created_at
                FROM results WHERE user_id = %s ORDER BY id ASC
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_result_for_user(user_id: int | str, exam_id: int | str, student_id: int | str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, exam_id, student_id, marks, created_at
                FROM results WHERE user_id = %s AND exam_id = %s AND student_id = %s
                """,
                (int(user_id), int(exam_id), int(student_id)),
            )
            row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_or_update_result_for_user(user_id: int | str, result: dict[str, Any]) -> dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO results (user_id, exam_id, student_id, marks)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, exam_id, student_id)
                DO UPDATE SET marks = EXCLUDED.marks
                RETURNING id, user_id, exam_id, student_id, marks, created_at
                """,
                (
                    int(user_id),
                    int(result["exam_id"]),
                    int(result["student_id"]),
                    psycopg2.extras.Json(result.get("marks", [])),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row)
    finally:
        conn.close()


def _normalize_decimal_values(row: dict[str, Any]) -> dict[str, Any]:
    for key in ["total", "amount"]:
        if key in row and row[key] is not None:
            row[key] = float(row[key])
    return row


def get_fee_structures_for_user(user_id: int | str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, class_name, items, total, created_at
                FROM fee_structures WHERE user_id = %s ORDER BY class_name ASC
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def create_fee_structure_for_user(user_id: int | str, structure: dict[str, Any]) -> dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO fee_structures (user_id, class_name, items, total)
                VALUES (%s, %s, %s, %s)
                RETURNING id, user_id, class_name, items, total, created_at
                """,
                (
                    int(user_id),
                    structure["class_name"],
                    psycopg2.extras.Json(structure["items"]),
                    structure["total"],
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return _normalize_decimal_values(dict(row))
    finally:
        conn.close()


def update_fee_structure_for_user(user_id: int | str, structure_id: int | str, structure: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE fee_structures
                SET class_name = %s, items = %s, total = %s
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, class_name, items, total, created_at
                """,
                (
                    structure["class_name"],
                    psycopg2.extras.Json(structure["items"]),
                    structure["total"],
                    int(structure_id),
                    int(user_id),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return _normalize_decimal_values(dict(row)) if row else None
    finally:
        conn.close()


def delete_fee_structure_for_user(user_id: int | str, structure_id: int | str) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM fee_structures WHERE id = %s AND user_id = %s", (int(structure_id), int(user_id)))
            deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()


def get_payments_for_user(user_id: int | str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, student_id, invoice_id, amount, method, note, date, created_at
                FROM payments WHERE user_id = %s ORDER BY date DESC, id DESC
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
        return [_normalize_decimal_values(dict(row)) for row in rows]
    finally:
        conn.close()


def get_invoices_for_user(user_id: int | str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, student_id, invoice_no, date, amount, method, note, status, created_at
                FROM invoices WHERE user_id = %s ORDER BY date DESC, id DESC
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
        return [_normalize_decimal_values(dict(row)) for row in rows]
    finally:
        conn.close()


def create_payment_and_invoice(user_id: int | str, payment: dict[str, Any]) -> dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO invoices (user_id, student_id, invoice_no, date, amount, method, note, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, invoice_no, date, amount, method, note, status, created_at
                """,
                (
                    int(user_id),
                    int(payment["student_id"]),
                    "",
                    payment["date"],
                    payment["amount"],
                    payment["method"],
                    payment.get("note"),
                    "Paid",
                ),
            )
            invoice = cur.fetchone()
            invoice_id = invoice["id"]
            invoice_no = f"INV-{invoice_id:04d}"
            cur.execute("UPDATE invoices SET invoice_no = %s WHERE id = %s", (invoice_no, invoice_id))
            cur.execute(
                """
                SELECT id, user_id, student_id, invoice_no, date, amount, method, note, status, created_at
                FROM invoices WHERE id = %s
                """,
                (invoice_id,),
            )
            invoice = cur.fetchone()
            cur.execute(
                """
                INSERT INTO payments (user_id, student_id, invoice_id, amount, method, note, date)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, student_id, invoice_id, amount, method, note, date, created_at
                """,
                (
                    int(user_id),
                    int(payment["student_id"]),
                    invoice_id,
                    payment["amount"],
                    payment["method"],
                    payment.get("note"),
                    payment["date"],
                ),
            )
            payment_row = cur.fetchone()
        conn.commit()
        invoice_dict = _normalize_decimal_values(dict(invoice))
        payment_dict = _normalize_decimal_values(dict(payment_row))
        return {"invoice": invoice_dict, "payment": payment_dict}
    finally:
        conn.close()
