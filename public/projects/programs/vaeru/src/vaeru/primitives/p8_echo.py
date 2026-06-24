"""P8 — Echo Encoder."""

from __future__ import annotations

from hashlib import sha256
from math import sqrt
import json

from ..models import ThreatObject
from ..state import StateStore


class EchoEncoder:
    """Store compact threat-state echoes and detect structural resonance."""

    def __init__(self, min_confidence: float = 0.75, resonance_threshold: float = 0.68, max_entries: int = 1000):
        self.min_confidence = min_confidence
        self.resonance_threshold = resonance_threshold
        self.max_entries = max_entries

    def features(self, threat: ThreatObject) -> list[float]:
        surface_hash = (sum(ord(c) for c in threat.surface) % 997) / 997.0
        chain_hash = (sum(ord(c) for c in threat.causal_chain) % 997) / 997.0
        return [
            float(threat.weight),
            float(threat.coherence_score),
            float(threat.causal_confidence),
            min(1.0, len(threat.signal_key) / 80.0),
            surface_hash,
            chain_hash,
        ]

    def encode(self, state: StateStore, threat: ThreatObject) -> bool:
        if threat.weight < self.min_confidence:
            return False
        payload = {
            "signal_key": threat.signal_key,
            "surface": threat.surface,
            "causal_chain": threat.causal_chain,
            "features": self.features(threat),
        }
        digest = sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        state.store_echo(digest, self.features(threat), threat.weight, threat.surface)
        state.prune_echoes(self.max_entries)
        return True

    def find_resonance(self, state: StateStore, threat: ThreatObject) -> dict | None:
        current = self.features(threat)
        best: dict | None = None
        best_similarity = 0.0
        for row in state.iter_echoes(limit=100):
            try:
                other = json.loads(row["features_json"])
            except (TypeError, json.JSONDecodeError):
                continue
            similarity = self._cosine(current, other)
            if similarity > best_similarity:
                best_similarity = similarity
                best = {
                    "echo_id": int(row["id"]),
                    "similarity": similarity,
                    "surface": row["surface"],
                    "confidence": float(row["confidence"]),
                }
        if best and best_similarity >= self.resonance_threshold:
            state.mark_echo_resonated(best["echo_id"])
            return best
        return None

    @staticmethod
    def _cosine(a: list[float], b: list[float]) -> float:
        if not a or not b:
            return 0.0
        n = min(len(a), len(b))
        a = a[:n]
        b = b[:n]
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = sqrt(sum(x * x for x in a))
        mag_b = sqrt(sum(y * y for y in b))
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)
