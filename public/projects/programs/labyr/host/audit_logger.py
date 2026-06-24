"""
Audit Logger
============

Security audit logging for the Labyr system.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("labyr.host.audit")


class AuditLogger:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.log_path = Path(config.get("log_path", "/var/log/labyr/audit.log"))
        self.log_level = config.get("log_level", "INFO")
        self.retain_days = config.get("retain_days", 30)

        self.log_path.parent.mkdir(parents=True, exist_ok=True)

        self._recent_entries: List[Dict[str, Any]] = []
        self._max_recent = 1000

    def log_event(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event": event,
            "data": data or {},
            "pid": os.getpid(),
        }

        self._recent_entries.append(entry)
        if len(self._recent_entries) > self._max_recent:
            self._recent_entries.pop(0)

        try:
            with open(self.log_path, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

        log_msg = f"[AUDIT] {event}: {json.dumps(data or {})}"
        if self.log_level == "DEBUG":
            logger.debug(log_msg)
        else:
            logger.info(log_msg)

    def get_recent(self, count: int = 20) -> List[Dict[str, Any]]:
        return self._recent_entries[-count:]

    def query(
        self,
        event: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        results = []

        try:
            with open(self.log_path, "r") as f:
                for line in f:
                    if not line.strip():
                        continue

                    entry = json.loads(line)

                    if event and entry.get("event") != event:
                        continue

                    if start_time and entry.get("timestamp", "") < start_time:
                        continue
                    if end_time and entry.get("timestamp", "") > end_time:
                        continue

                    results.append(entry)

                    if len(results) >= limit:
                        break

        except FileNotFoundError:
            pass
        except Exception as e:
            logger.error(f"Error querying audit log: {e}")

        return results

    def rotate(self) -> None:
        if not self.log_path.exists():
            return

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        rotated_path = self.log_path.with_suffix(f".{timestamp}.log")

        self.log_path.rename(rotated_path)
        logger.info(f"Rotated audit log to {rotated_path}")
