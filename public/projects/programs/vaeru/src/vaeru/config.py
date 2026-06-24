"""Configuration loading for VAERU.

The project intentionally uses only the Python standard library. Configuration
is TOML and parsed with :mod:`tomllib` on Python 3.11+.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
import os
import tomllib

DEFAULT_CONFIG = """# VAERU default configuration
# Defensive-first, dry-run-by-default runtime profile.

[runtime]
home = ".vaeru"
tick_interval_seconds = 1.0
log_level = "INFO"
snapshot_limit_processes = 2048
threat_cooldown_seconds = 20

[policy]
defensive_active = true
offensive_probe_enabled = false
# dry_run=true means VAERU records recommended actions but only writes safe
# local evidence files. It never blocks, kills, probes, or quarantines.
dry_run = true
allow_alert = true
allow_detection_note = true
allow_network_block = false
allow_process_signal = false
allow_file_quarantine = false
allow_topology_mutation = true
allow_echo_encoding = true
threat_escalation_weight = 0.62
membrane_action_gate = 0.35
protected_process_names = ["systemd", "sshd", "vaeru"]
protected_paths = ["/boot", "/etc", "/opt/vaeru"]
protected_ips = ["127.0.0.1", "::1"]

[decay]
residue_half_life_seconds = 300
prune_threshold = 0.02
accumulation_gain = 0.50

[echo]
min_confidence_to_encode = 0.75
resonance_trigger_threshold = 0.68
max_entries = 1000

[surfaces]
enable_proc = true
enable_network = true
enable_filesystem = true
watch_paths = [
  "/tmp",
  "/var/tmp",
  "/etc/cron.d",
  "/etc/crontab",
  "/etc/systemd/system"
]
common_listening_ports = [22, 25, 53, 80, 123, 443, 631, 3306, 5432, 6379, 8080]
"""


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


@dataclass(slots=True)
class VaeruConfig:
    """Loaded VAERU configuration with convenience helpers."""

    path: Path | None
    data: dict[str, Any]

    @classmethod
    def default(cls, home: str | Path | None = None) -> "VaeruConfig":
        data = tomllib.loads(DEFAULT_CONFIG)
        if home is not None:
            data.setdefault("runtime", {})["home"] = str(home)
        return cls(path=None, data=data)

    @classmethod
    def load(cls, path: str | Path | None = None) -> "VaeruConfig":
        default_data = tomllib.loads(DEFAULT_CONFIG)
        if path is None:
            candidate = Path("vaeru.toml")
            if not candidate.exists():
                return cls(path=None, data=default_data)
            path = candidate
        path = Path(path)
        if not path.exists():
            return cls(path=path, data=default_data)
        with path.open("rb") as handle:
            loaded = tomllib.load(handle)
        return cls(path=path, data=_deep_merge(default_data, loaded))

    @property
    def runtime(self) -> dict[str, Any]:
        return self.data.setdefault("runtime", {})

    @property
    def policy(self) -> dict[str, Any]:
        return self.data.setdefault("policy", {})

    @property
    def decay(self) -> dict[str, Any]:
        return self.data.setdefault("decay", {})

    @property
    def echo(self) -> dict[str, Any]:
        return self.data.setdefault("echo", {})

    @property
    def surfaces(self) -> dict[str, Any]:
        return self.data.setdefault("surfaces", {})

    @property
    def home(self) -> Path:
        raw = str(self.runtime.get("home", ".vaeru"))
        return Path(os.path.expandvars(raw)).expanduser()

    @property
    def state_dir(self) -> Path:
        return self.home / "state"

    @property
    def log_dir(self) -> Path:
        return self.home / "log"

    @property
    def evidence_dir(self) -> Path:
        return self.home / "evidence"

    @property
    def db_path(self) -> Path:
        return self.state_dir / "vaeru.db"

    def get_bool(self, section: str, key: str, default: bool = False) -> bool:
        value = self.data.get(section, {}).get(key, default)
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)

    def get_float(self, section: str, key: str, default: float) -> float:
        value = self.data.get(section, {}).get(key, default)
        try:
            return float(value)
        except (TypeError, ValueError):
            return float(default)

    def get_int(self, section: str, key: str, default: int) -> int:
        value = self.data.get(section, {}).get(key, default)
        try:
            return int(value)
        except (TypeError, ValueError):
            return int(default)

    def ensure_directories(self) -> None:
        for path in (self.home, self.state_dir, self.log_dir, self.evidence_dir):
            path.mkdir(parents=True, exist_ok=True)


def write_default_config(path: str | Path = "vaeru.toml", *, overwrite: bool = False) -> Path:
    """Write the default TOML config to *path* and return the path."""

    out = Path(path)
    if out.exists() and not overwrite:
        return out
    out.write_text(DEFAULT_CONFIG, encoding="utf-8")
    return out
