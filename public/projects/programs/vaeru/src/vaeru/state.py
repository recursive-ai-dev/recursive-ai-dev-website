"""SQLite-backed shared state layer for VAERU."""

from __future__ import annotations

from pathlib import Path
from time import time
from typing import Any, Iterable
import json
import sqlite3

from .models import ActionPlan, Differential, Residue, ThreatObject


def _dumps(value: Any) -> str:
    return json.dumps(value, sort_keys=True, default=str, separators=(",", ":"))


def _loads(value: str | None, default: Any = None) -> Any:
    if value is None:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


SCHEMA: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at REAL NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp REAL NOT NULL,
        snapshot_json TEXT NOT NULL
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(timestamp)",
    """
    CREATE TABLE IF NOT EXISTS differentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp REAL NOT NULL,
        surface TEXT NOT NULL,
        signal_key TEXT NOT NULL,
        magnitude REAL NOT NULL,
        direction INTEGER NOT NULL,
        observed_json TEXT,
        expected_json TEXT,
        causal_weight REAL NOT NULL DEFAULT 1.0,
        causal_chain TEXT NOT NULL DEFAULT 'unknown',
        causal_confidence REAL NOT NULL DEFAULT 0.0,
        processed INTEGER NOT NULL DEFAULT 0,
        resolved INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_differentials_processed ON differentials(processed, resolved)",
    "CREATE INDEX IF NOT EXISTS idx_differentials_signal ON differentials(signal_key)",
    "CREATE INDEX IF NOT EXISTS idx_differentials_ts ON differentials(timestamp)",
    """
    CREATE TABLE IF NOT EXISTS residues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_key TEXT NOT NULL UNIQUE,
        surface TEXT NOT NULL,
        accumulated_weight REAL NOT NULL DEFAULT 0.0,
        first_seen REAL NOT NULL,
        last_updated REAL NOT NULL,
        causal_chain TEXT NOT NULL DEFAULT 'unknown',
        causal_confidence REAL NOT NULL DEFAULT 0.0,
        seen_count INTEGER NOT NULL DEFAULT 0,
        resolved INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_residues_active_weight ON residues(resolved, accumulated_weight)",
    """
    CREATE TABLE IF NOT EXISTS threats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp REAL NOT NULL,
        signal_key TEXT NOT NULL,
        surface TEXT NOT NULL,
        weight REAL NOT NULL,
        coherence_score REAL NOT NULL,
        causal_chain TEXT NOT NULL DEFAULT 'unknown',
        causal_confidence REAL NOT NULL DEFAULT 0.0,
        origin_residue_id INTEGER,
        metadata_json TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_threats_ts ON threats(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_threats_signal ON threats(signal_key, timestamp)",
    """
    CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp REAL NOT NULL,
        threat_id INTEGER,
        action_type TEXT NOT NULL,
        target_json TEXT,
        confidence REAL NOT NULL,
        cost REAL NOT NULL,
        destructive INTEGER NOT NULL DEFAULT 0,
        gated INTEGER NOT NULL DEFAULT 0,
        executed INTEGER NOT NULL DEFAULT 0,
        dry_run INTEGER NOT NULL DEFAULT 1,
        result TEXT,
        rationale TEXT,
        metadata_json TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_actions_ts ON actions(timestamp)",
    """
    CREATE TABLE IF NOT EXISTS echoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state_hash TEXT NOT NULL UNIQUE,
        features_json TEXT NOT NULL,
        confidence REAL NOT NULL,
        surface TEXT NOT NULL,
        encoded_at REAL NOT NULL,
        resonance_count INTEGER NOT NULL DEFAULT 0,
        last_resonated REAL
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_echoes_confidence ON echoes(confidence)",
    """
    CREATE TABLE IF NOT EXISTS topology_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp REAL NOT NULL,
        event_type TEXT NOT NULL,
        details_json TEXT NOT NULL
    )
    """,
)


class StateStore:
    """Shared state database used by all VAERU zones."""

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.ensure_schema()

    def close(self) -> None:
        self.conn.close()

    def ensure_schema(self) -> None:
        for statement in SCHEMA:
            self.conn.execute(statement)
        self.conn.commit()

    def get_kv(self, key: str, default: Any = None) -> Any:
        row = self.conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
        if row is None:
            return default
        return _loads(row["value"], default)

    def set_kv(self, key: str, value: Any) -> None:
        self.conn.execute(
            """
            INSERT INTO kv(key, value, updated_at) VALUES(?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
            """,
            (key, _dumps(value), time()),
        )
        self.conn.commit()

    def insert_snapshot(self, snapshot: dict[str, Any]) -> int:
        timestamp = float(snapshot.get("timestamp", time()))
        cursor = self.conn.execute(
            "INSERT INTO snapshots(timestamp, snapshot_json) VALUES(?, ?)",
            (timestamp, _dumps(snapshot)),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def latest_snapshot(self) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT snapshot_json FROM snapshots ORDER BY timestamp DESC, id DESC LIMIT 1"
        ).fetchone()
        if row is None:
            return None
        return _loads(row["snapshot_json"], None)

    def insert_differential(self, diff: Differential) -> int:
        cursor = self.conn.execute(
            """
            INSERT INTO differentials(
                timestamp, surface, signal_key, magnitude, direction,
                observed_json, expected_json, causal_weight, causal_chain,
                causal_confidence, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                diff.timestamp,
                diff.surface,
                diff.signal_key,
                diff.bounded_magnitude(),
                int(diff.direction),
                _dumps(diff.observed),
                _dumps(diff.expected),
                float(diff.causal_weight),
                diff.causal_chain,
                float(diff.causal_confidence),
                _dumps(diff.metadata),
            ),
        )
        self.conn.commit()
        diff.id = int(cursor.lastrowid)
        return diff.id

    def fetch_unprocessed_differentials(self, limit: int = 500) -> list[Differential]:
        rows = self.conn.execute(
            """
            SELECT * FROM differentials
            WHERE processed = 0 AND resolved = 0
            ORDER BY timestamp ASC, id ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [self._row_to_differential(row) for row in rows]

    def mark_differential_processed(self, diff_id: int) -> None:
        self.conn.execute("UPDATE differentials SET processed = 1 WHERE id = ?", (diff_id,))
        self.conn.commit()

    def resolve_old_differentials(self, older_than: float) -> int:
        cursor = self.conn.execute(
            "UPDATE differentials SET resolved = 1 WHERE timestamp < ? AND resolved = 0",
            (older_than,),
        )
        self.conn.commit()
        return int(cursor.rowcount)

    def upsert_residue_from_differential(self, diff: Differential, *, gain: float) -> Residue:
        now = time()
        row = self.conn.execute(
            "SELECT * FROM residues WHERE signal_key = ?",
            (diff.signal_key,),
        ).fetchone()
        increment = diff.bounded_magnitude() * max(0.1, diff.causal_weight) * gain
        increment = max(0.0, min(1.0, increment))
        if row is None:
            weight = min(1.0, increment)
            cursor = self.conn.execute(
                """
                INSERT INTO residues(
                    signal_key, surface, accumulated_weight, first_seen, last_updated,
                    causal_chain, causal_confidence, seen_count, resolved, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
                """,
                (
                    diff.signal_key,
                    diff.surface,
                    weight,
                    now,
                    now,
                    diff.causal_chain,
                    diff.causal_confidence,
                    _dumps({"last_differential": diff.metadata, "last_observed": diff.observed}),
                ),
            )
            self.conn.commit()
            residue_id = int(cursor.lastrowid)
            return Residue(
                id=residue_id,
                signal_key=diff.signal_key,
                surface=diff.surface,
                accumulated_weight=weight,
                first_seen=now,
                last_updated=now,
                causal_chain=diff.causal_chain,
                causal_confidence=diff.causal_confidence,
                seen_count=1,
                metadata={"last_differential": diff.metadata, "last_observed": diff.observed},
            )

        current = self._row_to_residue(row)
        weight = min(1.0, max(0.0, current.accumulated_weight + increment))
        causal_chain = diff.causal_chain if diff.causal_chain != "unknown" else current.causal_chain
        causal_confidence = max(current.causal_confidence, diff.causal_confidence)
        metadata = dict(current.metadata)
        metadata.update({"last_differential": diff.metadata, "last_observed": diff.observed})
        self.conn.execute(
            """
            UPDATE residues
            SET accumulated_weight = ?, last_updated = ?, causal_chain = ?,
                causal_confidence = ?, seen_count = seen_count + 1,
                resolved = 0, metadata_json = ?
            WHERE id = ?
            """,
            (weight, now, causal_chain, causal_confidence, _dumps(metadata), current.id),
        )
        self.conn.commit()
        current.accumulated_weight = weight
        current.last_updated = now
        current.causal_chain = causal_chain
        current.causal_confidence = causal_confidence
        current.seen_count += 1
        current.resolved = False
        current.metadata = metadata
        return current

    def fetch_residues(self, *, active_only: bool = True, limit: int = 200) -> list[Residue]:
        if active_only:
            rows = self.conn.execute(
                """
                SELECT * FROM residues WHERE resolved = 0
                ORDER BY accumulated_weight DESC, last_updated DESC LIMIT ?
                """,
                (limit,),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM residues ORDER BY last_updated DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._row_to_residue(row) for row in rows]

    def update_residue_weight(self, residue_id: int, weight: float, *, resolved: bool = False) -> None:
        self.conn.execute(
            "UPDATE residues SET accumulated_weight = ?, resolved = ?, last_updated = ? WHERE id = ?",
            (max(0.0, min(1.0, weight)), 1 if resolved else 0, time(), residue_id),
        )
        self.conn.commit()

    def recent_threat_exists(self, signal_key: str, *, seconds: float) -> bool:
        cutoff = time() - seconds
        row = self.conn.execute(
            "SELECT id FROM threats WHERE signal_key = ? AND timestamp >= ? LIMIT 1",
            (signal_key, cutoff),
        ).fetchone()
        return row is not None

    def insert_threat(self, threat: ThreatObject) -> int:
        cursor = self.conn.execute(
            """
            INSERT INTO threats(
                timestamp, signal_key, surface, weight, coherence_score,
                causal_chain, causal_confidence, origin_residue_id, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                threat.timestamp,
                threat.signal_key,
                threat.surface,
                max(0.0, min(1.0, threat.weight)),
                max(0.0, min(1.0, threat.coherence_score)),
                threat.causal_chain,
                threat.causal_confidence,
                threat.origin_residue_id,
                _dumps(threat.metadata),
            ),
        )
        self.conn.commit()
        threat.id = int(cursor.lastrowid)
        return threat.id

    def list_threats(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM threats ORDER BY timestamp DESC, id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) | {"metadata": _loads(row["metadata_json"], {})} for row in rows]

    def insert_action(self, action: ActionPlan, *, threat_id: int | None) -> int:
        cursor = self.conn.execute(
            """
            INSERT INTO actions(
                timestamp, threat_id, action_type, target_json, confidence, cost,
                destructive, gated, executed, dry_run, result, rationale, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                action.timestamp,
                threat_id,
                action.action_type,
                _dumps(action.target),
                action.confidence,
                action.cost,
                1 if action.destructive else 0,
                1 if action.gated else 0,
                1 if action.executed else 0,
                1 if action.dry_run else 0,
                action.result,
                action.rationale,
                _dumps(action.metadata),
            ),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def list_actions(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM actions ORDER BY timestamp DESC, id DESC LIMIT ?", (limit,)
        ).fetchall()
        out: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["target"] = _loads(row["target_json"], {})
            item["metadata"] = _loads(row["metadata_json"], {})
            out.append(item)
        return out

    def store_echo(self, state_hash: str, features: list[float], confidence: float, surface: str) -> None:
        self.conn.execute(
            """
            INSERT OR IGNORE INTO echoes(state_hash, features_json, confidence, surface, encoded_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (state_hash, _dumps(features), confidence, surface, time()),
        )
        self.conn.commit()

    def iter_echoes(self, limit: int = 100) -> Iterable[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM echoes ORDER BY confidence DESC, encoded_at DESC LIMIT ?",
            (limit,),
        ).fetchall()

    def mark_echo_resonated(self, echo_id: int) -> None:
        self.conn.execute(
            """
            UPDATE echoes
            SET resonance_count = resonance_count + 1, last_resonated = ?
            WHERE id = ?
            """,
            (time(), echo_id),
        )
        self.conn.commit()

    def count_echoes(self) -> int:
        return int(self.conn.execute("SELECT COUNT(*) FROM echoes").fetchone()[0])

    def prune_echoes(self, max_entries: int) -> int:
        count = self.count_echoes()
        if count <= max_entries:
            return 0
        remove = count - max_entries
        cursor = self.conn.execute(
            """
            DELETE FROM echoes WHERE id IN (
                SELECT id FROM echoes
                ORDER BY (last_resonated IS NOT NULL) ASC, last_resonated ASC, encoded_at ASC
                LIMIT ?
            )
            """,
            (remove,),
        )
        self.conn.commit()
        return int(cursor.rowcount)

    def insert_topology_event(self, event_type: str, details: dict[str, Any]) -> int:
        cursor = self.conn.execute(
            "INSERT INTO topology_events(timestamp, event_type, details_json) VALUES (?, ?, ?)",
            (time(), event_type, _dumps(details)),
        )
        self.conn.commit()
        return int(cursor.lastrowid)

    def list_topology_events(self, limit: int = 20) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM topology_events ORDER BY timestamp DESC, id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) | {"details": _loads(row["details_json"], {})} for row in rows]

    def status(self) -> dict[str, Any]:
        counts = {}
        for table in ("snapshots", "differentials", "residues", "threats", "actions", "echoes"):
            counts[table] = int(self.conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
        counts["active_residues"] = int(
            self.conn.execute("SELECT COUNT(*) FROM residues WHERE resolved = 0").fetchone()[0]
        )
        counts["unprocessed_differentials"] = int(
            self.conn.execute(
                "SELECT COUNT(*) FROM differentials WHERE processed = 0 AND resolved = 0"
            ).fetchone()[0]
        )
        return {"db_path": str(self.db_path), "counts": counts, "last_phase": self.get_kv("phase")}

    def _row_to_differential(self, row: sqlite3.Row) -> Differential:
        return Differential(
            id=int(row["id"]),
            timestamp=float(row["timestamp"]),
            surface=str(row["surface"]),
            signal_key=str(row["signal_key"]),
            magnitude=float(row["magnitude"]),
            direction=int(row["direction"]),
            observed=_loads(row["observed_json"], None),
            expected=_loads(row["expected_json"], None),
            causal_weight=float(row["causal_weight"]),
            causal_chain=str(row["causal_chain"]),
            causal_confidence=float(row["causal_confidence"]),
            metadata=_loads(row["metadata_json"], {}),
        )

    def _row_to_residue(self, row: sqlite3.Row) -> Residue:
        return Residue(
            id=int(row["id"]),
            signal_key=str(row["signal_key"]),
            surface=str(row["surface"]),
            accumulated_weight=float(row["accumulated_weight"]),
            first_seen=float(row["first_seen"]),
            last_updated=float(row["last_updated"]),
            causal_chain=str(row["causal_chain"]),
            causal_confidence=float(row["causal_confidence"]),
            seen_count=int(row["seen_count"]),
            resolved=bool(row["resolved"]),
            metadata=_loads(row["metadata_json"], {}),
        )
