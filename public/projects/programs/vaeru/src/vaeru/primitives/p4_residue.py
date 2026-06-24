"""P4 — Residue Accumulator."""

from __future__ import annotations

from ..models import Differential, Residue
from ..state import StateStore


class ResidueAccumulator:
    """Convert unresolved differentials into decaying residue memory."""

    def __init__(self, accumulation_gain: float = 0.50):
        self.accumulation_gain = accumulation_gain

    def accumulate(self, state: StateStore, diff: Differential) -> Residue:
        return state.upsert_residue_from_differential(diff, gain=self.accumulation_gain)
