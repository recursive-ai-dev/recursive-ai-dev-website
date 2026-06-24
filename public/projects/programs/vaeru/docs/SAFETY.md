# Safety Model

VAERU is a dual-use security architecture on paper. This repository implements it with a defensive-first safety model.

## Hard limits in the MVP

The code does **not** implement:

- Offensive probes.
- Payload reflection.
- Exploit generation.
- Remote network scanning.
- Credential attacks.
- Process killing or suspension.
- Firewall changes.
- File quarantine or deletion.
- Packet capture or packet injection.

Potentially destructive action names may appear in the policy lattice only as future placeholders. The `ActionExecutor` records them as recommendations and does not execute them.

## Defaults

Generated config defaults to:

```toml
[policy]
offensive_probe_enabled = false
dry_run = true
allow_network_block = false
allow_process_signal = false
allow_file_quarantine = false
```

## Data handling

VAERU stores local runtime state in SQLite under the configured home directory. Detection notes may contain local command-line snippets and socket metadata. Treat the `.vaeru` directory as sensitive operational evidence.

Recommended local permissions for a shared host:

```bash
chmod 700 .vaeru
chmod 700 .vaeru/state .vaeru/evidence .vaeru/log
```

## Demo mode

`vaeru demo` injects synthetic local-only differentials. It does not touch remote hosts, start processes, open sockets, or modify monitored paths beyond writing VAERU state/evidence files.

## Production hardening checklist

Before using VAERU beyond a lab:

1. Review `vaeru.toml` and keep destructive/offensive settings disabled.
2. Run as a least-privilege service account where possible.
3. Restrict `.vaeru` state and evidence permissions.
4. Add log rotation if daemonized.
5. Tune watched paths to avoid collecting unnecessary sensitive metadata.
6. Validate false-positive behavior in a staging environment.
7. Integrate with existing SIEM/EDR systems through export adapters rather than replacing them.
