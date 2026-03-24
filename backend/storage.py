import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "resumeiq.db"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS resume_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                score INTEGER NOT NULL,
                analysis_json TEXT NOT NULL,
                optimized_resume TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                latency_ms INTEGER NOT NULL,
                error_message TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.commit()


def create_user(email: str, password_hash: str, role: str = "user") -> dict:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            (email.lower().strip(), password_hash, role, _utc_now()),
        )
        conn.commit()
        user_id = cursor.lastrowid
    return get_user_by_id(user_id)


def get_user_by_email(email: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, role, created_at FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def save_resume_run(
    user_id: int,
    filename: str,
    score: int,
    analysis_payload: dict[str, Any],
    optimized_resume: str,
) -> dict:
    payload_text = json.dumps(analysis_payload)
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO resume_runs (user_id, filename, score, analysis_json, optimized_resume, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, filename, score, payload_text, optimized_resume, _utc_now()),
        )
        conn.commit()
        run_id = cursor.lastrowid

    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, user_id, filename, score, analysis_json, optimized_resume, created_at
            FROM resume_runs
            WHERE id = ?
            """,
            (run_id,),
        ).fetchone()
    data = dict(row)
    data["analysis_json"] = json.loads(data["analysis_json"])
    return data


def list_user_runs(user_id: int, limit: int = 20) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, filename, score, analysis_json, optimized_resume, created_at
            FROM resume_runs
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, max(1, min(100, limit))),
        ).fetchall()

    result = []
    for row in rows:
        item = dict(row)
        item["analysis_json"] = json.loads(item["analysis_json"])
        result.append(item)
    return result


def create_audit_log(
    action: str,
    status: str,
    latency_ms: int,
    user_id: int | None = None,
    error_message: str | None = None,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO audit_logs (user_id, action, status, latency_ms, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, action, status, int(latency_ms), error_message, _utc_now()),
        )
        conn.commit()


def list_audit_logs(limit: int = 100) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, user_id, action, status, latency_ms, error_message, created_at
            FROM audit_logs
            ORDER BY id DESC
            LIMIT ?
            """,
            (max(1, min(500, limit)),),
        ).fetchall()
    return [dict(row) for row in rows]
