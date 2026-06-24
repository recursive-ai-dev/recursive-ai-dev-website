"""Safe action execution layer for VAERU."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os

from .config import VaeruConfig
from .models import ActionPlan, ThreatObject
from .state import StateStore


class ActionExecutor:
    """Execute or record permitted actions.

    Destructive actions are intentionally not implemented in this MVP. They are
    recorded as operator recommendations, preserving the architecture without
    shipping code that blocks networks, kills processes, probes hosts, or moves
    files.
    """

    def __init__(self, config: VaeruConfig):
        self.config = config
        self.dry_run = config.get_bool("policy", "dry_run", True)
        self.evidence_dir = config.evidence_dir
        self.evidence_dir.mkdir(parents=True, exist_ok=True)

    def execute(self, state: StateStore, action: ActionPlan, threat: ThreatObject) -> ActionPlan:
        action.dry_run = self.dry_run
        if not action.gated:
            action.executed = False
            action.result = "blocked by membrane gate"
            return action

        if action.destructive:
            action.executed = False
            action.dry_run = True
            action.result = "recorded only: destructive actions are not implemented in this MVP"
            return action

        if action.action_type == "alert":
            action.executed = True
            action.result = f"alert recorded for {threat.signal_key}"
            return action

        if action.action_type == "write_detection_note":
            path = self._write_detection_note(action, threat)
            action.executed = True
            action.dry_run = False  # Safe local evidence write actually happened.
            action.result = f"detection note written: {path}"
            action.metadata["evidence_path"] = path
            return action

        if action.action_type == "increase_monitoring":
            key = f"monitoring_boost.{threat.surface}"
            state.set_kv(key, {"signal_key": threat.signal_key, "weight": threat.weight, "timestamp": threat.timestamp})
            action.executed = True
            action.result = f"monitoring recommendation recorded in kv:{key}"
            return action

        action.executed = False
        action.result = "unknown action type"
        return action

    def _write_detection_note(self, action: ActionPlan, threat: ThreatObject) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        safe_key = "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "_" for ch in threat.signal_key)
        path = self.evidence_dir / f"{ts}_{safe_key}.json"
        payload = {
            "generated_at": ts,
            "threat": {
                "id": threat.id,
                "signal_key": threat.signal_key,
                "surface": threat.surface,
                "weight": threat.weight,
                "coherence_score": threat.coherence_score,
                "causal_chain": threat.causal_chain,
                "causal_confidence": threat.causal_confidence,
                "metadata": threat.metadata,
            },
            "action": {
                "type": action.action_type,
                "rationale": action.rationale,
                "target": action.target,
                "metadata": action.metadata,
            },
            "operator_note": (
                "This file is evidence and review guidance. VAERU did not perform network probing, "
                "process termination, firewall changes, or file quarantine."
            ),
        }
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        os.replace(tmp, path)
        return str(path)
