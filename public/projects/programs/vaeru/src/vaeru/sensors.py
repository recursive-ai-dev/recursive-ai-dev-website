"""Host snapshot collection for VAERU.

The collectors are deliberately conservative: they read public/local host state
from procfs and configured path metadata, but do not packet sniff, probe remote
systems, or modify the host.
"""

from __future__ import annotations

from pathlib import Path
from time import time
from typing import Any
import hashlib
import ipaddress
import math
import os
import re
import socket
import struct

from .config import VaeruConfig

SUSPICIOUS_CMD_PATTERNS = (
    re.compile(r"/(tmp|var/tmp|dev/shm)/", re.IGNORECASE),
    re.compile(r"\b(curl|wget)\b.+\b(sh|bash|python|perl)\b", re.IGNORECASE),
    re.compile(r"\b(nc|ncat|socat)\b", re.IGNORECASE),
    re.compile(r"bash\s+-i", re.IGNORECASE),
    re.compile(r"python\s+-c", re.IGNORECASE),
    re.compile(r"perl\s+-e", re.IGNORECASE),
    re.compile(r"base64\s+(-d|--decode)", re.IGNORECASE),
    re.compile(r"chmod\s+\+x", re.IGNORECASE),
)


def shannon_entropy(data: str | bytes) -> float:
    """Return Shannon entropy in bits per symbol."""

    if isinstance(data, str):
        data = data.encode("utf-8", errors="ignore")
    if not data:
        return 0.0
    counts: dict[int, int] = {}
    for byte in data:
        counts[byte] = counts.get(byte, 0) + 1
    length = len(data)
    entropy = 0.0
    for count in counts.values():
        probability = count / length
        entropy -= probability * math.log2(probability)
    return entropy


def _read_text(path: Path, limit: int = 65536) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:limit]
    except (OSError, UnicodeError):
        return ""


def _read_bytes(path: Path, limit: int = 65536) -> bytes:
    try:
        return path.read_bytes()[:limit]
    except OSError:
        return b""


def _parse_status(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        out[key.strip()] = value.strip()
    return out


def _is_suspicious_cmdline(cmdline: str) -> bool:
    return any(pattern.search(cmdline) for pattern in SUSPICIOUS_CMD_PATTERNS)


def _capture_proc(limit: int) -> tuple[dict[str, float], dict[str, Any]]:
    proc = Path("/proc")
    metrics = {
        "proc.count": 0.0,
        "proc.root_count": 0.0,
        "proc.tmp_exec_indicators": 0.0,
        "proc.shell_network_indicators": 0.0,
        "proc.deleted_exe_indicators": 0.0,
        "proc.command_entropy": 0.0,
    }
    details: dict[str, Any] = {"suspicious_processes": []}
    if not proc.exists():
        return metrics, details

    command_blob: list[str] = []
    pids_seen = 0
    for child in proc.iterdir():
        if pids_seen >= limit:
            break
        if not child.name.isdigit():
            continue
        pids_seen += 1
        status = _parse_status(_read_text(child / "status", 8192))
        cmdline_bytes = _read_bytes(child / "cmdline", 8192)
        cmdline = cmdline_bytes.replace(b"\x00", b" ").decode("utf-8", errors="replace").strip()
        name = status.get("Name", child.name)
        if not cmdline:
            cmdline = f"[{name}]"
        command_blob.append(cmdline)
        metrics["proc.count"] += 1.0

        uid_field = status.get("Uid", "")
        uid = uid_field.split()[0] if uid_field else ""
        if uid == "0":
            metrics["proc.root_count"] += 1.0

        suspicious = _is_suspicious_cmdline(cmdline)
        if suspicious:
            metrics["proc.tmp_exec_indicators"] += 1.0
            if any(token in cmdline.lower() for token in ("nc", "ncat", "socat", "curl", "wget", "bash -i")):
                metrics["proc.shell_network_indicators"] += 1.0

        deleted_exe = False
        try:
            exe = os.readlink(child / "exe")
            deleted_exe = "(deleted)" in exe
        except OSError:
            exe = ""
        if deleted_exe:
            metrics["proc.deleted_exe_indicators"] += 1.0
            suspicious = True

        if suspicious and len(details["suspicious_processes"]) < 20:
            details["suspicious_processes"].append(
                {
                    "pid": int(child.name),
                    "name": name,
                    "uid": uid,
                    "cmdline": cmdline[:500],
                    "deleted_exe": deleted_exe,
                }
            )

    blob = "\n".join(command_blob)
    metrics["proc.command_entropy"] = shannon_entropy(blob) / 8.0 if blob else 0.0
    return metrics, details


def _decode_ipv4(hex_ip: str) -> str:
    try:
        packed = struct.pack("<L", int(hex_ip, 16))
        return socket.inet_ntoa(packed)
    except (OSError, ValueError):
        return "0.0.0.0"


def _parse_proc_net_table(path: Path, proto: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    text = _read_text(path, 1024 * 1024)
    if not text:
        return rows
    for line in text.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 4:
            continue
        local_hex, remote_hex, state = parts[1], parts[2], parts[3]
        try:
            local_ip_hex, local_port_hex = local_hex.split(":")
            remote_ip_hex, remote_port_hex = remote_hex.split(":")
            local_ip = _decode_ipv4(local_ip_hex)
            remote_ip = _decode_ipv4(remote_ip_hex)
            local_port = int(local_port_hex, 16)
            remote_port = int(remote_port_hex, 16)
        except ValueError:
            continue
        rows.append(
            {
                "proto": proto,
                "local_ip": local_ip,
                "local_port": local_port,
                "remote_ip": remote_ip,
                "remote_port": remote_port,
                "state": state,
            }
        )
    return rows


def _is_external_ip(ip: str) -> bool:
    try:
        parsed = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (
        parsed.is_loopback
        or parsed.is_private
        or parsed.is_link_local
        or parsed.is_multicast
        or parsed.is_unspecified
        or parsed.is_reserved
    )


def _capture_network(common_ports: set[int]) -> tuple[dict[str, float], dict[str, Any]]:
    metrics = {
        "net.tcp_connections": 0.0,
        "net.udp_sockets": 0.0,
        "net.tcp_listeners": 0.0,
        "net.external_remote_connections": 0.0,
        "net.unusual_listeners": 0.0,
    }
    tcp_rows = _parse_proc_net_table(Path("/proc/net/tcp"), "tcp")
    udp_rows = _parse_proc_net_table(Path("/proc/net/udp"), "udp")
    metrics["net.tcp_connections"] = float(len(tcp_rows))
    metrics["net.udp_sockets"] = float(len(udp_rows))

    listeners: list[dict[str, Any]] = []
    external: list[dict[str, Any]] = []
    for row in tcp_rows:
        if row["state"] == "0A":  # TCP_LISTEN
            metrics["net.tcp_listeners"] += 1.0
            listeners.append(row)
            if int(row["local_port"]) not in common_ports and int(row["local_port"]) >= 1024:
                metrics["net.unusual_listeners"] += 1.0
        elif row["state"] == "01" and _is_external_ip(str(row["remote_ip"])):
            metrics["net.external_remote_connections"] += 1.0
            if len(external) < 20:
                external.append(row)

    details = {
        "listeners": listeners[:50],
        "external_connections": external,
    }
    return metrics, details


def _capture_filesystem(watch_paths: list[str]) -> tuple[dict[str, Any], dict[str, Any]]:
    metrics: dict[str, Any] = {
        "fs.watch_exists_count": 0.0,
        "fs.watch_missing_count": 0.0,
        "fs.watch_fingerprint": "",
    }
    details: dict[str, Any] = {"watched_paths": {}}
    fingerprint_parts: list[str] = []
    for raw_path in watch_paths:
        path = Path(raw_path)
        try:
            stat = path.stat()
        except OSError:
            metrics["fs.watch_missing_count"] += 1.0
            details["watched_paths"][raw_path] = {"exists": False}
            fingerprint_parts.append(f"{raw_path}:missing")
            continue
        metrics["fs.watch_exists_count"] += 1.0
        record = {
            "exists": True,
            "is_dir": path.is_dir(),
            "mode": stat.st_mode,
            "uid": stat.st_uid,
            "gid": stat.st_gid,
            "size": stat.st_size,
            "mtime_ns": stat.st_mtime_ns,
            "ctime_ns": stat.st_ctime_ns,
        }
        details["watched_paths"][raw_path] = record
        fingerprint_parts.append(
            f"{raw_path}:{stat.st_mode}:{stat.st_uid}:{stat.st_gid}:{stat.st_size}:{stat.st_mtime_ns}:{stat.st_ctime_ns}"
        )
    digest = hashlib.sha256("|".join(sorted(fingerprint_parts)).encode()).hexdigest()
    metrics["fs.watch_fingerprint"] = digest
    return metrics, details


def _capture_system_metrics() -> dict[str, float]:
    metrics = {"system.load1_per_cpu": 0.0, "system.mem_used_percent": 0.0}
    try:
        load1, _load5, _load15 = os.getloadavg()
        cpu_count = os.cpu_count() or 1
        metrics["system.load1_per_cpu"] = float(load1) / max(1, cpu_count)
    except OSError:
        pass

    meminfo = _read_text(Path("/proc/meminfo"), 8192)
    values: dict[str, float] = {}
    for line in meminfo.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[1].isdigit():
            values[parts[0].rstrip(":")] = float(parts[1])
    total = values.get("MemTotal", 0.0)
    available = values.get("MemAvailable", values.get("MemFree", 0.0))
    if total > 0:
        metrics["system.mem_used_percent"] = max(0.0, min(100.0, ((total - available) / total) * 100.0))
    return metrics


def capture_snapshot(config: VaeruConfig) -> dict[str, Any]:
    """Capture a single local host snapshot."""

    metrics: dict[str, Any] = {}
    details: dict[str, Any] = {}
    metrics.update(_capture_system_metrics())

    if config.get_bool("surfaces", "enable_proc", True):
        proc_metrics, proc_details = _capture_proc(config.get_int("runtime", "snapshot_limit_processes", 2048))
        metrics.update(proc_metrics)
        details["proc"] = proc_details

    if config.get_bool("surfaces", "enable_network", True):
        common_ports = {int(p) for p in config.surfaces.get("common_listening_ports", [])}
        net_metrics, net_details = _capture_network(common_ports)
        metrics.update(net_metrics)
        details["network"] = net_details

    if config.get_bool("surfaces", "enable_filesystem", True):
        watch_paths = [str(p) for p in config.surfaces.get("watch_paths", [])]
        fs_metrics, fs_details = _capture_filesystem(watch_paths)
        metrics.update(fs_metrics)
        details["filesystem"] = fs_details

    return {
        "timestamp": time(),
        "hostname": socket.gethostname(),
        "metrics": metrics,
        "details": details,
    }
