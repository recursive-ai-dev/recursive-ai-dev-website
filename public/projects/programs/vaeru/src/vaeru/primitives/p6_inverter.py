"""P6 — Signal Inverter.

In this project P6 is defensive-only: it emits detection complements and review
prompts, not probes, payloads, exploit logic, or traffic generation.
"""

from __future__ import annotations

from ..models import ThreatObject


class SignalInverter:
    """Generate defensive complements for threat structures."""

    def generate_complements(self, threat: ThreatObject) -> list[str]:
        chain = threat.causal_chain
        key = threat.signal_key
        complements: list[str] = []

        if chain == "process_execution_risk":
            complements.extend(
                [
                    "Watch for executable content launched from /tmp, /var/tmp, or /dev/shm.",
                    "Correlate shell interpreters with immediate outbound network activity.",
                    "Review processes whose executable path has been deleted after start.",
                ]
            )
        elif chain == "network_exposure_shift":
            complements.extend(
                [
                    "Compare new listening ports against the approved service inventory.",
                    "Group outbound connections by destination ASN/domain owner before blocking.",
                    "Review process ownership for new external ESTABLISHED TCP sessions.",
                ]
            )
        elif chain == "persistence_surface_change":
            complements.extend(
                [
                    "Diff cron, systemd unit, timer, and rc.local locations against baseline.",
                    "Check new unit files for network downloaders, shell interpreters, and encoded blobs.",
                    "Verify package ownership for changed persistence-adjacent files.",
                ]
            )
        elif chain == "behavior_phase_shift":
            complements.extend(
                [
                    "Correlate the phase transition with process, network, and filesystem gradients.",
                    "Prefer alert-only handling until a concrete surface residue crosses threshold.",
                ]
            )
        else:
            complements.append(f"Review structural neighbors of signal '{key}' for correlated drift.")

        return complements
