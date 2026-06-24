"""P1 — Gradient Follower.

Detects directional change in local host state metrics and emits unresolved
state differentials.
"""

from __future__ import annotations

from typing import Any

from ..models import Differential

ABSOLUTE_INDICATOR_KEYS = {
    "proc.tmp_exec_indicators": 0.90,
    "proc.shell_network_indicators": 1.00,
    "proc.deleted_exe_indicators": 1.00,
    "net.unusual_listeners": 0.80,
    "net.external_remote_connections": 0.55,
}

PER_KEY_THRESHOLDS = {
    "system.load1_per_cpu": 0.35,
    "system.mem_used_percent": 10.0,
    "proc.count": 0.25,
    "proc.root_count": 0.20,
    "proc.tmp_exec_indicators": 0.01,
    "proc.shell_network_indicators": 0.01,
    "proc.deleted_exe_indicators": 0.01,
    "proc.command_entropy": 0.08,
    "net.tcp_connections": 0.30,
    "net.udp_sockets": 0.30,
    "net.tcp_listeners": 0.15,
    "net.external_remote_connections": 0.01,
    "net.unusual_listeners": 0.01,
    "fs.watch_exists_count": 0.01,
    "fs.watch_missing_count": 0.01,
}


class GradientFollower:
    """Compare snapshots and emit directional gradients."""

    def __init__(self, default_threshold: float = 0.15):
        self.default_threshold = default_threshold

    def scan(self, current: dict[str, Any], previous: dict[str, Any] | None) -> list[Differential]:
        current_metrics = current.get("metrics", {})
        previous_metrics = previous.get("metrics", {}) if previous else {}
        differentials: list[Differential] = []

        # Absolute indicators fire even on the first snapshot. This lets VAERU
        # surface high-signal state without requiring a clean baseline.
        for key, base_magnitude in ABSOLUTE_INDICATOR_KEYS.items():
            value = float(current_metrics.get(key, 0.0) or 0.0)
            previous_value = float(previous_metrics.get(key, 0.0) or 0.0)
            if value > 0 and value >= previous_value:
                magnitude = min(1.0, base_magnitude + (value * 0.05))
                differentials.append(
                    Differential(
                        surface=self._surface_for(key),
                        signal_key=key,
                        magnitude=magnitude,
                        direction=1,
                        observed=value,
                        expected=previous_value,
                        metadata={"primitive": "P1", "mode": "absolute_indicator"},
                    )
                )

        if not previous:
            return self._dedupe(differentials)

        for key, current_value in current_metrics.items():
            previous_value = previous_metrics.get(key)
            if previous_value is None:
                continue

            if isinstance(current_value, (int, float)) and isinstance(previous_value, (int, float)):
                diff = self._numeric_diff(key, float(current_value), float(previous_value))
                if diff is not None:
                    differentials.append(diff)
            elif isinstance(current_value, str) and isinstance(previous_value, str):
                if current_value != previous_value:
                    differentials.append(
                        Differential(
                            surface=self._surface_for(key),
                            signal_key=key,
                            magnitude=0.60 if key.startswith("fs.") else 0.35,
                            direction=1,
                            observed=current_value,
                            expected=previous_value,
                            metadata={"primitive": "P1", "mode": "structural_hash_change"},
                        )
                    )

        return self._dedupe(differentials)

    def _numeric_diff(self, key: str, current: float, previous: float) -> Differential | None:
        delta = current - previous
        if delta == 0:
            return None
        threshold = PER_KEY_THRESHOLDS.get(key, self.default_threshold)

        # Percentage-style metrics are compared as absolute point changes.
        if key.endswith("percent") or key == "system.mem_used_percent":
            raw_change = abs(delta)
            passed = raw_change >= threshold
            magnitude = min(1.0, raw_change / 100.0)
        # Entropy is already normalized to 0..1.
        elif key.endswith("entropy"):
            raw_change = abs(delta)
            passed = raw_change >= threshold
            magnitude = min(1.0, raw_change * 2.0)
        else:
            denominator = max(1.0, abs(previous))
            relative_change = abs(delta) / denominator
            passed = relative_change >= threshold
            magnitude = min(1.0, relative_change)

        if not passed:
            return None
        return Differential(
            surface=self._surface_for(key),
            signal_key=key,
            magnitude=magnitude,
            direction=1 if delta > 0 else -1,
            observed=current,
            expected=previous,
            metadata={"primitive": "P1", "mode": "gradient", "delta": delta},
        )

    @staticmethod
    def _surface_for(metric_key: str) -> str:
        return metric_key.split(".", 1)[0] if "." in metric_key else "system"

    @staticmethod
    def _dedupe(differentials: list[Differential]) -> list[Differential]:
        by_key: dict[str, Differential] = {}
        for diff in differentials:
            existing = by_key.get(diff.signal_key)
            if existing is None or diff.magnitude > existing.magnitude:
                by_key[diff.signal_key] = diff
        return list(by_key.values())
