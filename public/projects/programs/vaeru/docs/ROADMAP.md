# Roadmap

## 0.1 — Current MVP

- Standard-library Python package.
- SQLite state layer.
- Local snapshot sensors.
- P1-P12 primitive modules.
- Safe CLI and demo mode.
- Unit tests.
- Defensive-only action executor.

## 0.2 — Better host telemetry

- Optional auditd reader adapter for P12.
- Optional journald/syslog reader adapter.
- More stable process identity model.
- Configurable per-surface thresholds.
- Export to JSONL for SIEM ingestion.

## 0.3 — Operator workflow

- HTML or TUI report view.
- Threat detail command showing full residue history.
- Evidence bundle export.
- Baseline capture and comparison commands.
- False-positive annotation workflow.

## 0.4 — Service hardening

- Dedicated service account profile.
- SELinux/AppArmor notes.
- Logrotate templates.
- Systemd watchdog support.
- Database backup/compaction command.

## 0.5 — Adaptation experiments

- Apply P11 sensitivity recommendations at runtime.
- Surface-specific cooldowns.
- Echo-aware response acceleration.
- Flow telemetry for P7 pressure calculations.

## Out of scope for this repository

- Offensive probing.
- Exploit or payload generation.
- Credential attacks.
- Unauthorized scanning.
- Autonomous destructive remediation.

The original spec contains dual-use ideas. This implementation is intentionally scoped to defensive monitoring and safe evidence generation.
