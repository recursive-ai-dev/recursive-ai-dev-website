"""P9 — Coherence Arbiter."""

from __future__ import annotations

from collections import Counter

from ..models import Residue, ThreatObject


class CoherenceArbiter:
    """Select internally consistent residue interpretations."""

    def classify(self, residues: list[Residue], *, threshold: float) -> list[ThreatObject]:
        active = [r for r in residues if not r.resolved]
        by_surface = Counter(r.surface for r in active)
        threats: list[ThreatObject] = []
        for residue in active:
            surface_count = by_surface[residue.surface]
            support_bonus = min(0.18, max(0, surface_count - 1) * 0.04)
            coherence = min(
                1.0,
                residue.accumulated_weight * 0.82
                + residue.causal_confidence * 0.18
                + support_bonus,
            )
            emission_score = max(residue.accumulated_weight, coherence)
            if emission_score < threshold:
                continue
            threats.append(
                ThreatObject(
                    signal_key=residue.signal_key,
                    surface=residue.surface,
                    weight=min(1.0, emission_score),
                    coherence_score=coherence,
                    causal_chain=residue.causal_chain,
                    causal_confidence=residue.causal_confidence,
                    origin_residue_id=residue.id,
                    metadata={
                        "primitive": "P9",
                        "surface_residue_count": surface_count,
                        "seen_count": residue.seen_count,
                        "residue_weight": residue.accumulated_weight,
                    },
                )
            )
        threats.sort(key=lambda t: (t.weight, t.coherence_score), reverse=True)
        return threats
