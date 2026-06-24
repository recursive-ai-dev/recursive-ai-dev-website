"""Command line interface for VAERU."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from pathlib import Path
import argparse
import json
import platform
import sys

from . import __version__
from .config import VaeruConfig, write_default_config
from .core import VaeruRuntime
from .state import StateStore


def _dt(timestamp: float | None) -> str:
    if not timestamp:
        return "-"
    return datetime.fromtimestamp(float(timestamp)).strftime("%Y-%m-%d %H:%M:%S")


def _print_json(value) -> None:
    print(json.dumps(value, indent=2, sort_keys=True, default=str))


def _load_config(args: argparse.Namespace) -> VaeruConfig:
    cfg = VaeruConfig.load(args.config)
    if getattr(args, "home", None):
        cfg.data.setdefault("runtime", {})["home"] = args.home
    return cfg


def cmd_init(args: argparse.Namespace) -> int:
    config_path = Path(args.config or "vaeru.toml")
    wrote_config = args.force or not config_path.exists()
    if wrote_config:
        write_default_config(config_path, overwrite=args.force)
        if args.home:
            text = config_path.read_text(encoding="utf-8")
            text = text.replace('home = ".vaeru"', f'home = "{args.home}"', 1)
            config_path.write_text(text, encoding="utf-8")
    cfg = VaeruConfig.load(config_path)
    if args.home:
        cfg.data.setdefault("runtime", {})["home"] = args.home
    cfg.ensure_directories()
    state = StateStore(cfg.db_path)
    status = state.status()
    state.close()
    if args.json:
        _print_json({"config": str(config_path), "home": str(cfg.home), "status": status})
    else:
        print("VAERU initialized")
        print(f"  config: {config_path}")
        print(f"  home:   {cfg.home}")
        print(f"  db:     {cfg.db_path}")
        print("Next: vaeru demo  # run a synthetic local-only demonstration tick")
    return 0


def cmd_tick(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    runtime = VaeruRuntime(cfg)
    summary = runtime.tick(demo=args.demo)
    if args.json:
        _print_json(summary.as_dict())
    else:
        print("VAERU tick complete")
        for key, value in summary.as_dict().items():
            print(f"  {key}: {value}")
    runtime.state.close()
    return 0


def cmd_demo(args: argparse.Namespace) -> int:
    args.demo = True
    return cmd_tick(args)


def cmd_daemon(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    runtime = VaeruRuntime(cfg)
    try:
        runtime.run_forever(interval=args.interval, demo=args.demo)
    except KeyboardInterrupt:
        print("\nVAERU daemon stopped")
    finally:
        runtime.state.close()
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    cfg.ensure_directories()
    state = StateStore(cfg.db_path)
    status = state.status()
    if args.json:
        _print_json(status)
    else:
        print("VAERU STATUS")
        print(f"  version: {__version__}")
        print(f"  home:    {cfg.home}")
        print(f"  db:      {status['db_path']}")
        print(f"  phase:   {status.get('last_phase')}")
        for key, value in status["counts"].items():
            print(f"  {key}: {value}")
    state.close()
    return 0


def cmd_residues(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    state = StateStore(cfg.db_path)
    residues = state.fetch_residues(active_only=not args.all, limit=args.limit)
    if args.json:
        _print_json([asdict(r) for r in residues])
    else:
        print(f"ACTIVE RESIDUES ({len(residues)})" if not args.all else f"RESIDUES ({len(residues)})")
        print(f"{'ID':>4} {'WEIGHT':>7} {'SURFACE':<8} {'CHAIN':<28} SIGNAL")
        for r in residues:
            print(f"{r.id or 0:>4} {r.accumulated_weight:>7.3f} {r.surface:<8} {r.causal_chain:<28} {r.signal_key}")
    state.close()
    return 0


def cmd_threats(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    state = StateStore(cfg.db_path)
    threats = state.list_threats(limit=args.limit)
    if args.json:
        _print_json(threats)
    else:
        print(f"THREATS ({len(threats)})")
        print(f"{'ID':>4} {'TIME':<19} {'WEIGHT':>7} {'SURFACE':<8} {'CHAIN':<28} SIGNAL")
        for t in threats:
            print(
                f"{t['id']:>4} {_dt(t['timestamp']):<19} {float(t['weight']):>7.3f} "
                f"{t['surface']:<8} {t['causal_chain']:<28} {t['signal_key']}"
            )
    state.close()
    return 0


def cmd_actions(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    state = StateStore(cfg.db_path)
    actions = state.list_actions(limit=args.limit)
    if args.json:
        _print_json(actions)
    else:
        print(f"ACTIONS ({len(actions)})")
        print(f"{'ID':>4} {'TIME':<19} {'TYPE':<22} {'GATE':<5} {'EXEC':<5} RESULT")
        for a in actions:
            print(
                f"{a['id']:>4} {_dt(a['timestamp']):<19} {a['action_type']:<22} "
                f"{bool(a['gated'])!s:<5} {bool(a['executed'])!s:<5} {a['result']}"
            )
    state.close()
    return 0


def cmd_topology(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    state = StateStore(cfg.db_path)
    events = state.list_topology_events(limit=args.limit)
    if args.json:
        _print_json(events)
    else:
        print(f"TOPOLOGY EVENTS ({len(events)})")
        for event in events:
            print(f"[{_dt(event['timestamp'])}] {event['event_type']}: {event['details']}")
    state.close()
    return 0


def cmd_explain(args: argparse.Namespace) -> int:
    primitives = [
        ("P1", "Gradient Follower", "emits directional metric differentials"),
        ("P2", "Membrane Filter", "gates actions by confidence/cost/stability"),
        ("P3", "Phase Detector", "detects qualitative behavior phase shifts"),
        ("P4", "Residue Accumulator", "turns differentials into weighted memory"),
        ("P5", "Lattice Traverser", "enumerates policy-valid response paths"),
        ("P6", "Signal Inverter", "generates defensive detection complements"),
        ("P7", "Pressure Distributor", "plans load redistribution"),
        ("P8", "Echo Encoder", "stores high-confidence threat-state echoes"),
        ("P9", "Coherence Arbiter", "selects internally consistent threat objects"),
        ("P10", "Decay Scheduler", "actively forgets weak stale residues"),
        ("P11", "Topology Mutator", "records conservative sensitivity recommendations"),
        ("P12", "Causal Tracer", "assigns causal parentage and weight multipliers"),
    ]
    if args.json:
        _print_json([{"id": p, "name": n, "role": r} for p, n, r in primitives])
    else:
        print("VAERU PRIMITIVES")
        for pid, name, role in primitives:
            print(f"  {pid:<4} {name:<22} {role}")
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    cfg = _load_config(args)
    checks = {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "config_path": str(args.config or "<default>"),
        "home": str(cfg.home),
        "procfs_available": Path("/proc").exists(),
        "dry_run": cfg.get_bool("policy", "dry_run", True),
        "offensive_probe_enabled": cfg.get_bool("policy", "offensive_probe_enabled", False),
    }
    if args.json:
        _print_json(checks)
    else:
        print("VAERU DOCTOR")
        for key, value in checks.items():
            print(f"  {key}: {value}")
        if checks["offensive_probe_enabled"]:
            print("  warning: offensive_probe_enabled is true in config, but this MVP does not implement probes.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vaeru", description="VAERU defensive host observation engine")
    parser.add_argument("--config", help="Path to vaeru.toml (default: ./vaeru.toml if present, else built-in defaults)")
    parser.add_argument("--home", help="Override runtime home directory")
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("init", help="Create config and initialize the state database")
    p.add_argument("--force", action="store_true", help="Overwrite existing config")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("tick", help="Run one observation/processing/action cycle")
    p.add_argument("--demo", action="store_true", help="Inject synthetic local-only demonstration differentials")
    p.set_defaults(func=cmd_tick)

    p = sub.add_parser("demo", help="Run one synthetic local-only demonstration tick")
    p.set_defaults(func=cmd_demo)

    p = sub.add_parser("daemon", help="Run continuous tick loop")
    p.add_argument("--interval", type=float, default=None, help="Seconds between ticks")
    p.add_argument("--demo", action="store_true", help="Inject demo signals every tick (for lab use only)")
    p.set_defaults(func=cmd_daemon)

    sub.add_parser("status", help="Show runtime status").set_defaults(func=cmd_status)

    p = sub.add_parser("residues", help="List residues")
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--all", action="store_true", help="Include resolved residues")
    p.set_defaults(func=cmd_residues)

    p = sub.add_parser("threats", help="List classified threat objects")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_threats)

    p = sub.add_parser("actions", help="List action records")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_actions)

    p = sub.add_parser("topology", help="List topology/pressure events")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_topology)

    sub.add_parser("explain", help="Explain the twelve primitives").set_defaults(func=cmd_explain)
    sub.add_parser("doctor", help="Run environment checks").set_defaults(func=cmd_doctor)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
