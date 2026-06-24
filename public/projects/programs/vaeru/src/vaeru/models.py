"""Core dataclasses used by the VAERU runtime."""

from __future__ import annotations

from dataclasses import dataclass, field
from time import time
from typing import Any

JsonDict = dict[str, Any]


@dataclass(slots=True)
class Differential:
    """A measured unresolved difference between expected and observed state."""

    surface: str
    signal_key: str
    magnitude: float
    direction: int
    observed: Any = None
    expected: Any = None
    causal_weight: float = 1.0
    causal_chain: str = "unknown"
    causal_confidence: float = 0.0
    timestamp: float = field(default_factory=time)
    metadata: JsonDict = field(default_factory=dict)
    id: int | None = None

    def bounded_magnitude(self) -> float:
        return max(0.0, min(1.0, float(self.magnitude)))


@dataclass(slots=True)
class Residue:
    """Accumulated memory of unresolved differentials."""

    id: int | None
    signal_key: str
    surface: str
    accumulated_weight: float
    first_seen: float
    last_updated: float
    causal_chain: str = "unknown"
    causal_confidence: float = 0.0
    seen_count: int = 0
    resolved: bool = False
    metadata: JsonDict = field(default_factory=dict)


@dataclass(slots=True)
class ThreatObject:
    """A coherence-arbitrated threat object emitted by Zone 2."""

    signal_key: str
    surface: str
    weight: float
    coherence_score: float
    causal_chain: str = "unknown"
    causal_confidence: float = 0.0
    origin_residue_id: int | None = None
    timestamp: float = field(default_factory=time)
    metadata: JsonDict = field(default_factory=dict)
    id: int | None = None


@dataclass(slots=True)
class ActionPlan:
    """A candidate or executed response action."""

    action_type: str
    confidence: float
    cost: float
    target: JsonDict = field(default_factory=dict)
    rationale: str = ""
    destructive: bool = False
    gated: bool = False
    executed: bool = False
    dry_run: bool = True
    result: str = "pending"
    timestamp: float = field(default_factory=time)
    metadata: JsonDict = field(default_factory=dict)


@dataclass(slots=True)
class TickSummary:
    """Human and machine readable summary of one VAERU runtime cycle."""

    timestamp: float
    snapshot_id: int | None
    differentials: int
    residues_updated: int
    threats_emitted: int
    actions_recorded: int
    demo: bool = False
    notes: list[str] = field(default_factory=list)

    def as_dict(self) -> JsonDict:
        return {
            "timestamp": self.timestamp,
            "snapshot_id": self.snapshot_id,
            "differentials": self.differentials,
            "residues_updated": self.residues_updated,
            "threats_emitted": self.threats_emitted,
            "actions_recorded": self.actions_recorded,
            "demo": self.demo,
            "notes": self.notes,
        }
