"""P5 — Lattice Traverser.

Enumerates valid response paths through a policy constraint graph. This MVP
keeps the graph explicit and human-readable.
"""

from __future__ import annotations

from ..models import ActionPlan, ThreatObject


class LatticeTraverser:
    """Generate prioritized candidate actions for a threat."""

    def __init__(self, policy: dict):
        self.policy = policy

    def traverse(self, threat: ThreatObject) -> list[ActionPlan]:
        actions: list[ActionPlan] = []
        if self.policy.get("allow_alert", True):
            actions.append(
                ActionPlan(
                    action_type="alert",
                    confidence=threat.weight,
                    cost=0.01,
                    target=self._target(threat),
                    rationale="Record and surface the classified threat object.",
                )
            )

        if self.policy.get("allow_detection_note", True):
            actions.append(
                ActionPlan(
                    action_type="write_detection_note",
                    confidence=threat.weight,
                    cost=0.08,
                    target=self._target(threat),
                    rationale="Write local evidence and detection suggestions for operator review.",
                )
            )

        if self.policy.get("defensive_active", True):
            actions.append(
                ActionPlan(
                    action_type="increase_monitoring",
                    confidence=max(0.0, threat.weight - 0.05),
                    cost=0.12,
                    target={"surface": threat.surface, "signal_key": threat.signal_key},
                    rationale="Temporarily increase observation sensitivity for this surface.",
                )
            )

        # Potentially destructive actions are only enumerated when the operator
        # explicitly opts into them. The default config leaves all of these off.
        if threat.surface == "net" and self.policy.get("allow_network_block", False):
            actions.append(
                ActionPlan(
                    action_type="network_block",
                    confidence=threat.weight,
                    cost=0.55,
                    target=self._target(threat),
                    rationale="Candidate network containment. Requires explicit non-dry-run operator policy.",
                    destructive=True,
                )
            )
        if threat.surface == "proc" and self.policy.get("allow_process_signal", False):
            actions.append(
                ActionPlan(
                    action_type="process_signal",
                    confidence=threat.weight,
                    cost=0.70,
                    target=self._target(threat),
                    rationale="Candidate process containment. Requires explicit non-dry-run operator policy.",
                    destructive=True,
                )
            )
        if threat.surface == "fs" and self.policy.get("allow_file_quarantine", False):
            actions.append(
                ActionPlan(
                    action_type="file_quarantine",
                    confidence=threat.weight,
                    cost=0.50,
                    target=self._target(threat),
                    rationale="Candidate file quarantine. Requires explicit non-dry-run operator policy.",
                    destructive=True,
                )
            )

        actions.sort(key=lambda a: (a.confidence / (1.0 + a.cost), -a.cost), reverse=True)
        return actions

    @staticmethod
    def _target(threat: ThreatObject) -> dict:
        return {
            "surface": threat.surface,
            "signal_key": threat.signal_key,
            "causal_chain": threat.causal_chain,
            "origin_residue_id": threat.origin_residue_id,
        }
