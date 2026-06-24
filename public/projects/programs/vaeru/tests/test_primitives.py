from __future__ import annotations

import tempfile
import unittest

from vaeru.config import VaeruConfig
from vaeru.models import ActionPlan, Differential, ThreatObject
from vaeru.primitives import GradientFollower, MembraneFilter, SignalInverter
from vaeru.state import StateStore


class PrimitiveTests(unittest.TestCase):
    def test_gradient_follower_emits_numeric_delta(self) -> None:
        p1 = GradientFollower()
        previous = {"metrics": {"proc.count": 10.0, "fs.watch_fingerprint": "a"}}
        current = {"metrics": {"proc.count": 20.0, "fs.watch_fingerprint": "b"}}
        diffs = p1.scan(current, previous)
        keys = {d.signal_key for d in diffs}
        self.assertIn("proc.count", keys)
        self.assertIn("fs.watch_fingerprint", keys)

    def test_membrane_always_allows_alert(self) -> None:
        membrane = MembraneFilter(base_threshold=0.95)
        action = ActionPlan(action_type="alert", confidence=0.1, cost=0.01)
        self.assertTrue(membrane.gate(action))
        self.assertTrue(action.gated)

    def test_signal_inverter_is_defensive_text_only(self) -> None:
        threat = ThreatObject(
            signal_key="proc.tmp_exec_indicators",
            surface="proc",
            weight=0.9,
            coherence_score=0.8,
            causal_chain="process_execution_risk",
        )
        complements = SignalInverter().generate_complements(threat)
        self.assertTrue(complements)
        joined = " ".join(complements).lower()
        self.assertIn("watch", joined)
        self.assertNotIn("payload", joined)

    def test_state_accumulates_residue(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cfg = VaeruConfig.default(home=tmp)
            state = StateStore(cfg.db_path)
            diff = Differential(
                surface="proc",
                signal_key="proc.tmp_exec_indicators",
                magnitude=1.0,
                direction=1,
                causal_weight=1.5,
                causal_chain="process_execution_risk",
                causal_confidence=0.7,
            )
            residue = state.upsert_residue_from_differential(diff, gain=0.5)
            self.assertGreaterEqual(residue.accumulated_weight, 0.75)
            state.close()


if __name__ == "__main__":
    unittest.main()
