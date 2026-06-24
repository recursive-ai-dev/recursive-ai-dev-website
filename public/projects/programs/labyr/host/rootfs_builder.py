"""
Rootfs Builder
==============

Constructs a minimal RAM-based root filesystem for the ephemeral guest VM.
"""

import asyncio
import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger("labyr.host.rootfs")


class RootfsBuilder:
    MINIMAL_PACKAGES = [
        "busybox",
        "musl",
        "libc-utils",
    ]

    REQUIRED_DIRS = [
        "bin", "sbin", "lib", "lib64",
        "etc", "etc/init.d",
        "proc", "sys", "dev", "tmp",
        "var", "var/run", "var/log",
        "opt", "opt/labyr", "opt/labyr/bin",
        "home", "home/guest",
        "mnt", "run",
    ]

    def __init__(self, vm_config: dict):
        self.vm_config = vm_config
        self.rootfs_size_mb = vm_config.get("rootfs_size_mb", 256)

    async def build(self) -> Path:
        rootfs_path = Path(tempfile.mkdtemp(prefix="labyr_rootfs_"))
        logger.info(f"Building rootfs at {rootfs_path}")

        try:
            await self._create_directory_structure(rootfs_path)
            await self._install_base_system(rootfs_path)
            await self._install_labyr_daemon(rootfs_path)
            await self._create_init_scripts(rootfs_path)
            await self._set_permissions(rootfs_path)
            await self._verify_rootfs(rootfs_path)

            logger.info(f"Rootfs built successfully: {rootfs_path}")
            return rootfs_path

        except Exception as e:
            shutil.rmtree(rootfs_path, ignore_errors=True)
            raise RuntimeError(f"Failed to build rootfs: {e}") from e

    async def _create_directory_structure(self, rootfs_path: Path) -> None:
        for dir_path in self.REQUIRED_DIRS:
            full_path = rootfs_path / dir_path
            full_path.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Created directory: {dir_path}")

    async def _install_base_system(self, rootfs_path: Path) -> None:
        bin_dir = rootfs_path / "bin"

        essential_commands = [
            "sh", "ash", "ls", "cat", "echo", "mkdir", "rm",
            "cp", "mv", "ln", "chmod", "chown", "mount", "umount",
            "ps", "kill", "sleep", "true", "false", "test",
            "grep", "sed", "awk", "sort", "uniq", "wc", "head", "tail",
            "dd", "sync", "uname", "hostname", "date",
        ]

        busybox_path = bin_dir / "busybox"
        busybox_path.write_text("#!/bin/sh\n# Placeholder for busybox\n")
        busybox_path.chmod(0o755)

        for cmd in essential_commands:
            cmd_path = bin_dir / cmd
            cmd_path.symlink_to("busybox")

        dev_dir = rootfs_path / "dev"
        await self._create_device_nodes(dev_dir)
        await self._create_etc_files(rootfs_path)

    async def _create_device_nodes(self, dev_dir: Path) -> None:
        devices = [
            ("null", "c 1 3"),
            ("zero", "c 1 5"),
            ("random", "c 1 8"),
            ("urandom", "c 1 9"),
            ("tty", "c 5 0"),
            ("console", "c 5 1"),
        ]

        for name, spec in devices:
            dev_file = dev_dir / name
            dev_file.write_text(f"# Device: {spec}\n")

    async def _create_etc_files(self, rootfs_path: Path) -> None:
        etc_dir = rootfs_path / "etc"

        (etc_dir / "hostname").write_text("labyr-guest\n")

        (etc_dir / "hosts").write_text(
            "127.0.0.1\tlocalhost\n"
            "::1\t\tlocalhost\n"
            "127.0.1.1\tlabyr-guest\n"
        )

        (etc_dir / "passwd").write_text(
            "root:x:0:0:root:/root:/bin/sh\n"
            "guest:x:1000:1000:guest:/home/guest:/bin/sh\n"
        )

        (etc_dir / "group").write_text(
            "root:x:0:\n"
            "guest:x:1000:\n"
        )

        (etc_dir / "fstab").write_text(
            "proc\t/proc\tproc\tdefaults\t0\t0\n"
            "sysfs\t/sys\tsysfs\tdefaults\t0\t0\n"
            "tmpfs\t/tmp\ttmpfs\tdefaults,size=64M\t0\t0\n"
            "tmpfs\t/var/run\ttmpfs\tdefaults,size=16M\t0\t0\n"
        )

    async def _install_labyr_daemon(self, rootfs_path: Path) -> None:
        daemon_dir = rootfs_path / "opt" / "labyr" / "bin"

        daemon_path = daemon_dir / "labyr_daemon"
        daemon_path.write_text("""#!/bin/sh
# Placeholder for labyr_daemon
# In production, this would be the compiled Rust binary
echo "Labyr Daemon starting..."
exec /opt/labyr/bin/labyr_daemon_real "$@"
""")
        daemon_path.chmod(0o755)

        data_dir = rootfs_path / "opt" / "labyr" / "data"
        data_dir.mkdir(parents=True, exist_ok=True)

        import json
        default_config = {
            "dimensions": 3,
            "size": [16, 16, 4],
            "entropy_target": 0.85,
            "theme": "dark_fantasy",
        }
        (data_dir / "default_config.json").write_text(
            json.dumps(default_config, indent=2)
        )

    async def _create_init_scripts(self, rootfs_path: Path) -> None:
        init_d = rootfs_path / "etc" / "init.d"

        rcS = init_d / "rcS"
        rcS.write_text("""#!/bin/sh
# Labyr Guest Init Script

echo "Labyr Guest VM Starting..."

mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
mount -t tmpfs tmpfs /tmp
mount -t tmpfs tmpfs /var/run

mkdir -p /var/run/labyr
mkdir -p /tmp/labyr

hostname -F /etc/hostname

echo "Starting Labyr Daemon..."
/opt/labyr/bin/labyr_daemon &

echo "Labyr Guest VM Ready"
""")
        rcS.chmod(0o755)

        init_path = rootfs_path / "sbin" / "init"
        init_path.write_text("""#!/bin/sh
# Labyr Guest Init

for script in /etc/init.d/S*; do
    if [ -x "$script" ]; then
        "$script" start
    fi
done

if [ -x /etc/init.d/rcS ]; then
    /etc/init.d/rcS
fi

while true; do
    sleep 3600
done
""")
        init_path.chmod(0o755)

    async def _set_permissions(self, rootfs_path: Path) -> None:
        for item in rootfs_path.rglob("*"):
            if item.is_file():
                if item.suffix in (".sh", "") and item.name.startswith("S"):
                    item.chmod(0o755)
                elif item.name not in ("busybox", "labyr_daemon", "init", "rcS"):
                    item.chmod(0o644)

    async def _verify_rootfs(self, rootfs_path: Path) -> None:
        required_files = [
            "sbin/init",
            "etc/init.d/rcS",
            "opt/labyr/bin/labyr_daemon",
            "etc/fstab",
            "etc/hostname",
        ]

        missing = []
        for req_file in required_files:
            if not (rootfs_path / req_file).exists():
                missing.append(req_file)

        if missing:
            raise RuntimeError(f"Rootfs verification failed. Missing: {missing}")

        logger.info("Rootfs verification passed")
