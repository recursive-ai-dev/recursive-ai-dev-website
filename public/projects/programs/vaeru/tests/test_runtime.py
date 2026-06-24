from __future__ import annotations

import tempfile
import unittest

from vaeru.config import VaeruConfig
from vaeru.core import VaeruRuntime


class RuntimeTests(unittest.TestCase):
    def test_demo_tick_emits_threats_and_actions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cfg = VaeruConfig.default(home=tmp)
            cfg.data["runtime"]["threat_cooldown_seconds"] = 0
            runtime = VaeruRuntime(cfg)
            summary = runtime.tick(demo=True)
            self.assertGreater(summary.differentials, 0)
            self.assertGreater(summary.residues_updated, 0)
            self.assertGreater(summary.threats_emitted, 0)
            self.assertGreaterEqual(summary.actions_recorded, summary.threats_emitted)
            status = runtime.state.status()
            self.assertEqual(status["counts"]["unprocessed_differentials"], 0)
            runtime.state.close()

    def test_second_tick_respects_cooldown_when_enabled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cfg = VaeruConfig.default(home=tmp)
            cfg.data["runtime"]["threat_cooldown_seconds"] = 120
            cfg.data["surfaces"]["enable_proc"] = False
            cfg.data["surfaces"]["enable_network"] = False
            cfg.data["surfaces"]["enable_filesystem"] = False
            runtime = VaeruRuntime(cfg)
            first = runtime.tick(demo=True)
            second = runtime.tick(demo=True)
            self.assertGreater(first.threats_emitted, 0)
            self.assertEqual(second.threats_emitted, 0)
            runtime.state.close()


if __name__ == "__main__":
    unittest.main()
