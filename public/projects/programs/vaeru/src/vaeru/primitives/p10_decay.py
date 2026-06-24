"""P10 — Decay Scheduler."""

from __future__ import annotations

from math import exp, log
from time import time

from ..state import StateStore


class DecayScheduler:
    """Apply time-weighted relevance decay to active residues."""

    def __init__(self, half_life_seconds: float = 300.0, prune_threshold: float = 0.02):
        self.half_life_seconds = max(1.0, float(half_life_seconds))
        self.prune_threshold = max(0.0, float(prune_threshold))

    def apply(self, state: StateStore) -> int:
        now = time()
        changed = 0
        decay_constant = log(2.0) / self.half_life_seconds
        for residue in state.fetch_residues(active_only=True, limit=1000):
            elapsed = max(0.0, now - residue.last_updated)
            if elapsed <= 0:
                continue
            new_weight = residue.accumulated_weight * exp(-decay_constant * elapsed)
            resolved = new_weight < self.prune_threshold
            state.update_residue_weight(residue.id or 0, new_weight, resolved=resolved)
            changed += 1
        # Differential cleanup is intentionally lazier than residue decay.
        state.resolve_old_differentials(now - (self.half_life_seconds * 10.0))
        return changed
