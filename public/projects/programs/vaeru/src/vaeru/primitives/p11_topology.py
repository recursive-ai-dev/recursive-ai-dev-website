"""P11 — Topology Mutator."""

from __future__ import annotations

from time import time

from ..state import StateStore


class TopologyMutator:
    """Record conservative topology feedback events.

    The MVP does not rewrite code paths at runtime. Instead it records explicit
    sensitivity recommendations that a future daemon can apply safely.
    """

    def __init__(self, enabled: bool = True):
        self.enabled = enabled

    def mutate(self, state: StateStore, *, window_seconds: float = 900.0) -> dict:
        if not self.enabled:
            return {"enabled": False, "mutations": []}
        cutoff = time() - window_seconds
        rows = state.conn.execute(
            """
            SELECT surface, COUNT(*) AS c, AVG(weight) AS w
            FROM threats WHERE timestamp >= ?
            GROUP BY surface
            """,
            (cutoff,),
        ).fetchall()
        mutations = []
        for row in rows:
            count = int(row["c"])
            avg_weight = float(row["w"] or 0.0)
            if count >= 3 and avg_weight >= 0.65:
                mutations.append(
                    {
                        "type": "increase_surface_sensitivity",
                        "surface": row["surface"],
                        "reason": f"{count} recent threats with average weight {avg_weight:.2f}",
                        "window_seconds": window_seconds,
                    }
                )
        for mutation in mutations:
            state.insert_topology_event("recommendation", mutation)
        return {"enabled": True, "mutations": mutations}
