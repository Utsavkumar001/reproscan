import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "history.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                filename  TEXT NOT NULL,
                analyzed_at TEXT NOT NULL,
                total_score REAL NOT NULL,
                result_json TEXT NOT NULL
            )
        """)
        conn.commit()

def save_result(filename: str, total_score: float, result: dict):
    init_db()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO history (filename, analyzed_at, total_score, result_json) VALUES (?, ?, ?, ?)",
            (filename, datetime.now().strftime("%Y-%m-%d %H:%M"), total_score, json.dumps(result))
        )
        conn.commit()

def get_all_history():
    init_db()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, filename, analyzed_at, total_score FROM history ORDER BY id DESC"
        ).fetchall()
    return [dict(r) for r in rows]

def get_result_by_id(history_id: int):
    init_db()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM history WHERE id = ?", (history_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    d["result"] = json.loads(d["result_json"])
    del d["result_json"]
    return d

def delete_history_item(history_id: int):
    init_db()
    with get_conn() as conn:
        conn.execute("DELETE FROM history WHERE id = ?", (history_id,))
        conn.commit()