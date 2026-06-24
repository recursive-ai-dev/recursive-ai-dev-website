"""P12 — Causal Tracer.

The production spec describes audit-log causal chain tracing. This MVP keeps the
same interface but uses safe local snapshot evidence by default. It can be
extended later with auditd/journal adapters without changing Zone 2.
"""

from __future__ import annotations

from typing import Any

from ..models import Differential


class CausalTracer:
    """Assign likely causal parentage and weight multipliers to differentials."""

    def trace(self, diff: Differential, snapshot: dict[str, Any]) -> Differential:
        key = diff.signal_key
        details = snapshot.get("details", {})
        chain = "unknown"
        confidence = 0.0
        weight = 1.0
        evidence: dict[str, Any] = {}

        if key in {"proc.tmp_exec_indicators", "proc.shell_network_indicators", "proc.deleted_exe_indicators"}:
            chain = "process_execution_risk"
            confidence = 0.70 if key != "proc.deleted_exe_indicators" else 0.82
            weight = 1.60 if key != "proc.deleted_exe_indicators" else 1.90
            evidence = {"suspicious_processes": details.get("proc", {}).get("suspicious_processes", [])[:5]}
        elif key.startswith("net.external") or key.startswith("net.unusual"):
            chain = "network_exposure_shift"
            confidence = 0.58 if key.startswith("net.external") else 0.68
            weight = 1.35 if key.startswith("net.external") else 1.55
            evidence = {
                "external_connections": details.get("network", {}).get("external_connections", [])[:5],
                "listeners": details.get("network", {}).get("listeners", [])[:10],
            }
        elif key.startswith("fs.watch_fingerprint") or key.startswith("fs.watch_missing"):
            chain = "persistence_surface_change"
            confidence = 0.72
            weight = 1.75
            evidence = {"watched_paths": details.get("filesystem", {}).get("watched_paths", {})}
        elif key.startswith("phase."):
            chain = "behavior_phase_shift"
            confidence = 0.50
            weight = 1.25
        elif key.startswith("system."):
            chain = "resource_pressure_change"
            confidence = 0.42
            weight = 1.10
        elif key.startswith("proc."):
            chain = "process_surface_shift"
            confidence = 0.45
            weight = 1.15
        elif key.startswith("net."):
            chain = "network_surface_shift"
            confidence = 0.45
            weight = 1.15

        diff.causal_chain = chain
        diff.causal_confidence = confidence
        diff.causal_weight *= weight
        diff.metadata = dict(diff.metadata)
        diff.metadata.update({"P12": {"chain": chain, "confidence": confidence, "evidence": evidence}})
        return diff
