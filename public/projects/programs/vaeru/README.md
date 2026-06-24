# VAERU AI

**VAERU — Variance-Adaptive Entropic Reasoning Unit** is now a real, runnable project instead of a loose specification draft.

This repository is a **defensive-first MVP** of the attached architecture. It keeps the original twelve-primitive design, but implements it as a safe Python host-observation engine with a CLI, SQLite state layer, local evidence files, tests, and operator documentation.

> Safety stance: VAERU does **not** ship offensive probes, payload reflection, exploit logic, network scanning, process killing, firewall modification, or file quarantine. Potentially destructive actions are represented as operator recommendations only.

## What works today

- Local Linux host snapshot collection from procfs, proc net tables, system load/memory, and configured filesystem path metadata.
- Differential Register backed by SQLite.
- Residue accumulation and active decay.
- Coherence-arbitrated threat object emission.
- Defensive complement generation for operator review.
- Safe action records: alert, detection note, monitoring recommendation.
- Echo library for high-confidence threat-state resonance.
- Topology recommendation events.
- CLI for status, one-shot ticks, demo ticks, daemon mode, threats, residues, actions, and topology events.
- Unit tests with only the Python standard library.

## Quick start

```bash
cd vaeru-ai
python3 -m venv .venv
. .venv/bin/activate
pip install -e .

vaeru init
vaeru demo
vaeru status
vaeru threats
vaeru actions
```

Without installing:

```bash
cd vaeru-ai
PYTHONPATH=src python3 -m vaeru init
PYTHONPATH=src python3 -m vaeru demo
PYTHONPATH=src python3 -m vaeru status
```

Run tests:

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

## Runtime files

By default, `vaeru init` creates:

```text
.vaeru/
├── evidence/       # safe local detection notes
├── log/            # reserved for service logs
└── state/
    └── vaeru.db    # SQLite state: snapshots, differentials, residues, threats, actions, echoes
```

Change the runtime home in `vaeru.toml` or with `--home`:

```bash
vaeru --home /var/lib/vaeru init
vaeru --home /var/lib/vaeru daemon --interval 2
```

## CLI commands

```text
vaeru init       Create config and initialize state
vaeru tick       Run one VAERU cycle
vaeru demo       Run one synthetic local-only demonstration cycle
vaeru daemon     Run continuous cycles
vaeru status     Show database and phase status
vaeru residues   List active residue memory
vaeru threats    List classified threat objects
vaeru actions    List action records
vaeru topology   List topology/pressure recommendations
vaeru explain    Explain the twelve primitives
vaeru doctor     Show environment and safety checks
```

## Project layout

```text
vaeru-ai/
├── config/vaeru.toml           # example config
├── docs/                       # architecture, operations, safety, roadmap, original spec
├── scripts/                    # optional operational helpers
├── src/vaeru/
│   ├── cli.py                  # command line interface
│   ├── core.py                 # closed-loop runtime orchestrator
│   ├── sensors.py              # safe host snapshot collectors
│   ├── state.py                # SQLite shared state layer
│   ├── actions.py              # safe action executor
│   └── primitives/             # P1-P12 implementations
└── tests/                      # unittest suite
```

## Architecture mapping

| Primitive | Implemented as | Current role |
|---|---|---|
| P1 Gradient Follower | `primitives/p1_gradient.py` | Compares snapshots and emits metric/hash differentials |
| P2 Membrane Filter | `primitives/p2_membrane.py` | Gates actions by confidence and cost |
| P3 Phase Detector | `primitives/p3_phase.py` | Converts metrics into behavior phases |
| P4 Residue Accumulator | `primitives/p4_residue.py` | Accumulates unresolved differentials into weighted residues |
| P5 Lattice Traverser | `primitives/p5_lattice.py` | Enumerates policy-valid response actions |
| P6 Signal Inverter | `primitives/p6_inverter.py` | Generates defensive detection complements |
| P7 Pressure Distributor | `primitives/p7_pressure.py` | Produces load redistribution plans |
| P8 Echo Encoder | `primitives/p8_echo.py` | Stores and matches compact threat-state echoes |
| P9 Coherence Arbiter | `primitives/p9_coherence.py` | Emits coherent threat objects from residues |
| P10 Decay Scheduler | `primitives/p10_decay.py` | Decays stale residues and old differentials |
| P11 Topology Mutator | `primitives/p11_topology.py` | Records sensitivity recommendations |
| P12 Causal Tracer | `primitives/p12_tracer.py` | Assigns causal labels and weight multipliers |

## Configuration safety defaults

`config/vaeru.toml` and generated `vaeru.toml` default to:

```toml
[policy]
offensive_probe_enabled = false
dry_run = true
allow_network_block = false
allow_process_signal = false
allow_file_quarantine = false
```

The code also intentionally does not implement destructive execution paths in this MVP.

## Current maturity

This is an **alpha MVP**. It is useful for architecture validation, local lab demonstrations, defensive telemetry experimentation, and future hardening work. It is not yet a replacement for an EDR, SIEM, auditd pipeline, or production incident-response platform.

See `docs/ROADMAP.md` for the next engineering steps.
