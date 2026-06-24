# VAERU Architecture

VAERU implements a closed loop over four zones and twelve primitives.

```text
Zone 1: Observation Substrate
  P1 Gradient Follower
  P3 Phase Detector
  P12 Causal Tracer
        ↓
  Differential Register
        ↓
Zone 2: Residue Processing Core
  P4 Residue Accumulator
  P10 Decay Scheduler
  P9 Coherence Arbiter
        ↓
  Threat Objects
        ↓
Zone 3: Action Generation Surface
  P5 Lattice Traverser
  P6 Signal Inverter
  P2 Membrane Filter
        ↓
  Safe Action Records / Evidence
        ↓
Zone 4: Systemic Adaptation Layer
  P7 Pressure Distributor
  P8 Echo Encoder
  P11 Topology Mutator
        ↺
  Sensitivity recommendations back to observation
```

## Zone 1 — Observation Substrate

The MVP captures a local snapshot with `sensors.capture_snapshot()`:

- System load and memory from standard Linux interfaces.
- Process counts, root-owned process counts, command entropy, and high-signal suspicious process indicators from `/proc`.
- TCP/UDP socket summaries from `/proc/net/tcp` and `/proc/net/udp`.
- Metadata fingerprints for configured watch paths.

P1 compares the current snapshot to the previous snapshot and emits `Differential` records when a directional state change crosses a threshold. P3 classifies the whole snapshot into a qualitative phase. P12 assigns a causal label and weight multiplier to each differential.

## Zone 2 — Residue Processing Core

The Differential Register is the `differentials` table in SQLite.

P4 reads unprocessed differentials and folds them into the `residues` table. Residues have an accumulated weight, causal chain, confidence, seen count, and decay state.

P10 applies exponential decay. Weak stale residues resolve automatically.

P9 converts coherent high-weight residues into `ThreatObject` rows. Coherence is based on residue weight, causal confidence, and surface support.

## Zone 3 — Action Generation Surface

P5 enumerates policy-valid action paths. In the default defensive profile, these are:

- `alert`
- `write_detection_note`
- `increase_monitoring`

P6 adds defensive complements: practical review prompts and detection ideas derived from the threat structure.

P2 gates actions by confidence and cost. Alert actions always pass, while higher-cost actions must pass the membrane score.

The action executor only performs safe local operations. It writes evidence JSON files and records status in SQLite.

## Zone 4 — Systemic Adaptation Layer

P7 creates pressure redistribution plans when one runtime queue gets too heavy.

P8 stores compact high-confidence threat-state echoes and detects resonance when similar threats recur.

P11 records topology recommendations when a surface repeatedly produces high-confidence threats. The MVP records recommendations instead of rewriting live code paths.

## State database

`state/vaeru.db` contains:

| Table | Purpose |
|---|---|
| `kv` | Runtime key/value state such as current phase |
| `snapshots` | Raw snapshot JSON |
| `differentials` | Differential Register |
| `residues` | Residue Weight Table |
| `threats` | Classified threat objects |
| `actions` | Candidate/executed action records |
| `echoes` | Echo Library |
| `topology_events` | Pressure and topology recommendations |

## Intentional scope reduction from the original draft

The original document described optional offensive probing and active host remediation. This project keeps the structural architecture but narrows implementation to defensive observation, local evidence, and operator recommendations. That makes the project safe to run in a lab and suitable for incremental hardening.
