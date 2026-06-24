"""P2 — Membrane Filter."""

from __future__ import annotations

from collections import deque

from ..models import ActionPlan


class MembraneFilter:
    """Gate actions by confidence, cost, and stability policy."""

    def __init__(self, base_threshold: float = 0.35, window_size: int = 100):
        self.base_threshold = max(0.0, min(1.0, base_threshold))
        self.threshold = self.base_threshold
        self.history: deque[tuple[float, bool]] = deque(maxlen=window_size)

    def gate(self, action: ActionPlan) -> bool:
        if action.action_type == "alert":
            action.gated = True
            action.metadata["membrane_score"] = 1.0
            action.metadata["membrane_threshold"] = self.threshold
            return True

        score = action.confidence / (1.0 + action.cost)
        permitted = score >= self.threshold
        action.gated = permitted
        action.metadata["membrane_score"] = score
        action.metadata["membrane_threshold"] = self.threshold
        return permitted

    def update(self, action_cost: float, success: bool) -> None:
        self.history.append((action_cost, success))
        if len(self.history) < 5:
            return
        avg_cost = sum(cost for cost, _ in self.history) / len(self.history)
        success_rate = sum(1 for _, ok in self.history if ok) / len(self.history)
        adjustment = (avg_cost - 0.25) * 0.10 - (success_rate - 0.50) * 0.05
        self.threshold = max(0.15, min(0.95, self.base_threshold + adjustment))
