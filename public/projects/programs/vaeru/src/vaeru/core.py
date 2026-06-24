"""VAERU runtime orchestrator."""

from __future__ import annotations

from time import sleep, time
from typing import Any
import logging

from .actions import ActionExecutor
from .config import VaeruConfig
from .models import Differential, TickSummary
from .sensors import capture_snapshot
from .state import StateStore
from .primitives import (
    CausalTracer,
    CoherenceArbiter,
    DecayScheduler,
    EchoEncoder,
    GradientFollower,
    LatticeTraverser,
    MembraneFilter,
    PhaseDetector,
    PressureDistributor,
    ResidueAccumulator,
    SignalInverter,
    TopologyMutator,
)

log = logging.getLogger(__name__)


class VaeruRuntime:
    """Closed-loop VAERU runtime.

    One call to :meth:`tick` performs the observation, residue, action, and
    adaptation cycle once. The CLI daemon simply repeats this method.
    """

    def __init__(self, config: VaeruConfig, state: StateStore | None = None):
        self.config = config
        self.config.ensure_directories()
        self.state = state or StateStore(config.db_path)

        self.p1 = GradientFollower()
        self.p2 = MembraneFilter(config.get_float("policy", "membrane_action_gate", 0.35))
        self.p3 = PhaseDetector()
        self.p4 = ResidueAccumulator(config.get_float("decay", "accumulation_gain", 0.50))
        self.p5 = LatticeTraverser(config.policy)
        self.p6 = SignalInverter()
        self.p7 = PressureDistributor()
        self.p8 = EchoEncoder(
            min_confidence=config.get_float("echo", "min_confidence_to_encode", 0.75),
            resonance_threshold=config.get_float("echo", "resonance_trigger_threshold", 0.68),
            max_entries=config.get_int("echo", "max_entries", 1000),
        )
        self.p9 = CoherenceArbiter()
        self.p10 = DecayScheduler(
            half_life_seconds=config.get_float("decay", "residue_half_life_seconds", 300.0),
            prune_threshold=config.get_float("decay", "prune_threshold", 0.02),
        )
        self.p11 = TopologyMutator(enabled=config.get_bool("policy", "allow_topology_mutation", True))
        self.p12 = CausalTracer()
        self.executor = ActionExecutor(config)

    def tick(self, *, demo: bool = False) -> TickSummary:
        notes: list[str] = []
        previous_snapshot = self.state.latest_snapshot()
        snapshot = capture_snapshot(self.config)
        snapshot_id = self.state.insert_snapshot(snapshot)

        differentials = self.p1.scan(snapshot, previous_snapshot)
        previous_phase = self.state.get_kv("phase")
        current_phase, phase_diff = self.p3.detect(snapshot, previous_phase)
        self.state.set_kv("phase", current_phase)
        if phase_diff is not None:
            differentials.append(phase_diff)

        if demo:
            demo_diffs = self._demo_differentials()
            differentials.extend(demo_diffs)
            notes.append(f"demo injected {len(demo_diffs)} synthetic local differentials")

        for diff in differentials:
            traced = self.p12.trace(diff, snapshot)
            self.state.insert_differential(traced)

        residues_updated = 0
        for diff in self.state.fetch_unprocessed_differentials(limit=500):
            self.p4.accumulate(self.state, diff)
            if diff.id is not None:
                self.state.mark_differential_processed(diff.id)
            residues_updated += 1

        self.p10.apply(self.state)

        threshold = self.config.get_float("policy", "threat_escalation_weight", 0.62)
        cooldown = self.config.get_float("runtime", "threat_cooldown_seconds", 20.0)
        active_residues = self.state.fetch_residues(active_only=True, limit=500)
        candidate_threats = self.p9.classify(active_residues, threshold=threshold)

        threats_emitted = 0
        actions_recorded = 0
        for threat in candidate_threats:
            if self.state.recent_threat_exists(threat.signal_key, seconds=cooldown):
                continue

            resonance = self.p8.find_resonance(self.state, threat)
            complements = self.p6.generate_complements(threat)
            threat.metadata = dict(threat.metadata)
            threat.metadata.update({"echo_resonance": resonance, "defensive_complements": complements})
            threat_id = self.state.insert_threat(threat)
            threats_emitted += 1

            actions = self.p5.traverse(threat)
            gated_actions = []
            for action in actions:
                # Attach P6 output so detection notes are immediately useful.
                action.metadata["defensive_complements"] = complements
                if self.p2.gate(action):
                    gated_actions.append(action)
                else:
                    action.result = "blocked by membrane gate"
                    self.state.insert_action(action, threat_id=threat_id)
                    actions_recorded += 1

            for action in gated_actions:
                completed = self.executor.execute(self.state, action, threat)
                self.p2.update(completed.cost, completed.executed)
                self.state.insert_action(completed, threat_id=threat_id)
                actions_recorded += 1

            if self.config.get_bool("policy", "allow_echo_encoding", True):
                self.p8.encode(self.state, threat)

        load_plan = self.p7.redistribute(
            {
                "differentials": min(1.0, len(differentials) / 100.0),
                "residues": min(1.0, len(active_residues) / 500.0),
                "threats": min(1.0, max(1, len(candidate_threats)) / 100.0),
            }
        )
        if load_plan:
            self.state.insert_topology_event("pressure_redistribution", load_plan)

        mutation_result = self.p11.mutate(self.state)
        if mutation_result.get("mutations"):
            notes.append(f"topology recommendations: {len(mutation_result['mutations'])}")

        return TickSummary(
            timestamp=time(),
            snapshot_id=snapshot_id,
            differentials=len(differentials),
            residues_updated=residues_updated,
            threats_emitted=threats_emitted,
            actions_recorded=actions_recorded,
            demo=demo,
            notes=notes,
        )

    def run_forever(self, *, interval: float | None = None, demo: bool = False) -> None:
        interval = interval if interval is not None else self.config.get_float("runtime", "tick_interval_seconds", 1.0)
        log.info("VAERU daemon loop started interval=%s demo=%s", interval, demo)
        while True:
            summary = self.tick(demo=demo)
            log.info("tick summary: %s", summary.as_dict())
            sleep(max(0.1, interval))

    @staticmethod
    def _demo_differentials() -> list[Differential]:
        """Synthetic local-only differentials used by `vaeru demo`.

        These do not touch the network, processes, or filesystem beyond VAERU's
        own state database/evidence directory.
        """

        return [
            Differential(
                surface="proc",
                signal_key="proc.tmp_exec_indicators",
                magnitude=0.96,
                direction=1,
                observed=1,
                expected=0,
                metadata={"primitive": "demo", "description": "simulated executable launched from temporary path"},
            ),
            Differential(
                surface="net",
                signal_key="net.external_remote_connections",
                magnitude=0.96,
                direction=1,
                observed=8,
                expected=0,
                metadata={"primitive": "demo", "description": "simulated external connection burst"},
            ),
        ]
