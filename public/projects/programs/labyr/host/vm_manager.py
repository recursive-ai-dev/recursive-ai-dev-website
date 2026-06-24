"""
VM Manager
==========

Manages VM lifecycle using QEMU/KVM or Firecracker hypervisors.
"""

import asyncio
import json
import logging
import os
import signal
import socket
import subprocess
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger("labyr.host.vm")


class HypervisorType(Enum):
    FIRECRACKER = "firecracker"
    QEMU = "qemu"


class VMManager:
    def __init__(
        self,
        hypervisor: HypervisorType,
        config: Dict[str, Any],
        rootfs_path: Path,
    ):
        self.hypervisor = hypervisor
        self.config = config
        self.rootfs_path = rootfs_path
        self.process: Optional[asyncio.subprocess.Process] = None
        self.api_socket: Optional[Path] = None
        self.vsock_path: Optional[Path] = None

    async def start(self) -> None:
        logger.info(f"Starting VM with {self.hypervisor.value}")

        if self.hypervisor == HypervisorType.FIRECRACKER:
            await self._start_firecracker()
        else:
            await self._start_qemu()

        await self._wait_for_ready()

    async def _start_firecracker(self) -> None:
        socket_path = Path("/tmp") / f"labyr_fc_{os.getpid()}.sock"
        self.api_socket = socket_path

        vsock_path = Path("/tmp") / f"labyr_vsock_{os.getpid()}.sock"
        self.vsock_path = vsock_path

        fc_config = {
            "boot-source": {
                "kernel_image_path": str(self.config.get("kernel_path", "/boot/vmlinux")),
                "boot_args": "console=ttyS0 reboot=k panic=1 pci=off init=/sbin/init",
            },
            "drives": [
                {
                    "drive_id": "rootfs",
                    "path_on_host": str(self.rootfs_path / "rootfs.ext4"),
                    "is_root_device": True,
                    "is_read_only": False,
                }
            ],
            "machine-config": {
                "vcpu_count": self.config.get("cpus", 2),
                "mem_size_mib": self.config.get("memory_mb", 512),
                "ht_enabled": False,
            },
            "vsock": {
                "guest_cid": 3,
                "uds_path": str(vsock_path),
            },
        }

        fc_config_path = Path("/tmp") / f"labyr_fc_config_{os.getpid()}.json"
        with open(fc_config_path, "w") as f:
            json.dump(fc_config, f)

        cmd = [
            "firecracker",
            "--api-sock", str(socket_path),
            "--config-file", str(fc_config_path),
        ]

        logger.info(f"Starting Firecracker: {' '.join(cmd)}")

        self.process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

    async def _start_qemu(self) -> None:
        monitor_path = Path("/tmp") / f"labyr_qemu_mon_{os.getpid()}.sock"
        self.api_socket = monitor_path

        cmd = [
            "qemu-system-x86_64",
            "-enable-kvm",
            "-machine", "pc,accel=kvm",
            "-cpu", "host",
            "-smp", str(self.config.get("cpus", 2)),
            "-m", str(self.config.get("memory_mb", 512)),
            "-nographic",
            "-no-reboot",
            "-kernel", str(self.config.get("kernel_path", "/boot/vmlinuz")),
            "-initrd", str(self.rootfs_path / "initramfs.cpio.gz"),
            "-append", "console=ttyS0 reboot=k panic=1 init=/sbin/init",
            "-monitor", f"unix:{monitor_path},server,nowait",
            "-serial", "stdio",
            "-nodefaults",
        ]

        logger.info(f"Starting QEMU: {' '.join(cmd)}")

        self.process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

    async def stop(self) -> None:
        if not self.process:
            return

        logger.info("Stopping VM...")

        try:
            self.process.terminate()

            try:
                await asyncio.wait_for(self.process.wait(), timeout=10)
            except asyncio.TimeoutError:
                logger.warning("VM did not stop gracefully, forcing kill")
                self.process.kill()
                await self.process.wait()

        except Exception as e:
            logger.error(f"Error stopping VM: {e}")

        if self.api_socket and self.api_socket.exists():
            self.api_socket.unlink()
        if self.vsock_path and self.vsock_path.exists():
            self.vsock_path.unlink()

        logger.info("VM stopped")

    async def get_status(self) -> Dict[str, Any]:
        if not self.process:
            return {"status": "not_running"}

        if self.process.returncode is not None:
            return {"status": "stopped", "exit_code": self.process.returncode}

        memory_used = 0
        try:
            import psutil
            proc = psutil.Process(self.process.pid)
            memory_used = proc.memory_info().rss // (1024 * 1024)
        except Exception:
            pass

        return {
            "status": "running",
            "pid": self.process.pid,
            "memory_used_mb": memory_used,
            "memory_limit_mb": self.config.get("memory_mb", 512),
            "hypervisor": self.hypervisor.value,
        }

    async def _wait_for_ready(self, timeout: int = 30) -> None:
        logger.info("Waiting for VM to be ready...")

        start_time = asyncio.get_event_loop().time()
        while (asyncio.get_event_loop().time() - start_time) < timeout:
            if self.process and self.process.returncode is not None:
                raise RuntimeError(f"VM exited with code {self.process.returncode}")

            if self.vsock_path and self.vsock_path.exists():
                logger.info("VM ready (vsock available)")
                return

            await asyncio.sleep(1)
            logger.debug("Still waiting for VM...")

        raise TimeoutError("VM did not become ready in time")
