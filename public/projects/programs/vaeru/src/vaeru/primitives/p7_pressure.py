"""P7 — Pressure Distributor."""

from __future__ import annotations


class PressureDistributor:
    """Simple load redistribution planner for runtime queues."""

    def redistribute(self, loads: dict[str, float], threshold: float = 0.80) -> dict[str, dict[str, float | str]]:
        overloaded = {k: v for k, v in loads.items() if v > threshold}
        underloaded = {k: v for k, v in loads.items() if v < threshold * 0.5}
        if not overloaded or not underloaded:
            return {}
        plan: dict[str, dict[str, float | str]] = {}
        for source, load in overloaded.items():
            target = min(underloaded, key=underloaded.get)
            shed = (load - threshold) * 0.5
            plan[source] = {"target": target, "shed_load": shed}
            underloaded[target] += shed
        return plan
