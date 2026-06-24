"""P3 — Phase Detector.

Identifies qualitative phase transitions in a host snapshot. This is not meant
to be a replacement for CPU/memory monitoring; it is a coarse behavior phase
signal used by VAERU's residue loop.
"""

from __future__ import annotations

from enum import IntEnum
from typing import Any

from ..models import Differential


class SystemPhase(IntEnum):
    QUIESCENT = 0
    ACTIVE = 1
    STRESSED = 2
    ANOMALOUS = 3
    CRITICAL = 4

    @classmethod
    def from_name(cls, value: str | None) -> "SystemPhase | None":
        if not value:
            return None
        try:
            return cls[value]
        except KeyError:
            return None


class PhaseDetector:
    """Classify and compare behavior phases."""

    def __init__(self, sensitivity: float = 0.60):
        self.sensitivity = sensitivity

    def classify(self, snapshot: dict[str, Any]) -> SystemPhase:
        metrics = snapshot.get("metrics", {})
        load = float(metrics.get("system.load1_per_cpu", 0.0) or 0.0)
        mem = float(metrics.get("system.mem_used_percent", 0.0) or 0.0)
        suspicious_proc = float(metrics.get("proc.tmp_exec_indicators", 0.0) or 0.0)
        deleted_exe = float(metrics.get("proc.deleted_exe_indicators", 0.0) or 0.0)
        network_external = float(metrics.get("net.external_remote_connections", 0.0) or 0.0)
        unusual_listeners = float(metrics.get("net.unusual_listeners", 0.0) or 0.0)

        risk_score = 0.0
        risk_score += min(1.0, load) * 0.25
        risk_score += min(1.0, mem / 100.0) * 0.20
        risk_score += min(1.0, suspicious_proc / 2.0) * 0.25
        risk_score += min(1.0, deleted_exe) * 0.20
        risk_score += min(1.0, network_external / 10.0) * 0.05
        risk_score += min(1.0, unusual_listeners / 2.0) * 0.05

        if deleted_exe >= 1 or risk_score >= 0.82 or mem >= 97:
            return SystemPhase.CRITICAL
        if suspicious_proc >= 2 or unusual_listeners >= 2 or risk_score >= 0.62:
            return SystemPhase.ANOMALOUS
        if load >= 1.0 or mem >= 85 or network_external >= 20 or risk_score >= 0.40:
            return SystemPhase.STRESSED
        if load >= 0.35 or mem >= 60 or network_external >= 1 or risk_score >= 0.18:
            return SystemPhase.ACTIVE
        return SystemPhase.QUIESCENT

    def detect(self, snapshot: dict[str, Any], previous_phase_name: str | None) -> tuple[str, Differential | None]:
        current = self.classify(snapshot)
        previous = SystemPhase.from_name(previous_phase_name)
        if previous is None:
            return current.name, None
        if previous == current:
            return current.name, None
        distance = int(current) - int(previous)
        magnitude = min(1.0, abs(distance) * 0.25 + 0.25)
        return current.name, Differential(
            surface="phase",
            signal_key=f"phase.{previous.name.lower()}_to_{current.name.lower()}",
            magnitude=magnitude,
            direction=1 if distance > 0 else -1,
            observed=current.name,
            expected=previous.name,
            causal_weight=1.25,
            metadata={"primitive": "P3", "sensitivity": self.sensitivity},
        )
