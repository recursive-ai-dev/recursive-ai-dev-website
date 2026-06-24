"""
Security Validator
==================

Pre-launch security validation for the host system.
"""

import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger("labyr.host.security")


class SecurityValidator:
    def __init__(self, config: Dict):
        self.config = config
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate(self) -> bool:
        self.errors.clear()
        self.warnings.clear()

        logger.info("Running security validation...")

        self._check_hypervisor()
        self._check_kvm()
        self._check_permissions()
        self._check_resources()

        if self.config.get("enable_seccomp"):
            self._check_seccomp()
        if self.config.get("enable_namespaces"):
            self._check_namespaces()
        if self.config.get("enable_cgroups"):
            self._check_cgroups()

        if self.errors:
            for error in self.errors:
                logger.error(f"Security validation error: {error}")
            return False

        if self.warnings:
            for warning in self.warnings:
                logger.warning(f"Security validation warning: {warning}")

        logger.info("Security validation passed")
        return True

    def _check_hypervisor(self) -> None:
        if shutil.which("firecracker"):
            logger.info("Firecracker found")
            return

        if shutil.which("qemu-system-x86_64"):
            logger.info("QEMU found")
            return

        self.errors.append("No supported hypervisor found (Firecracker or QEMU)")

    def _check_kvm(self) -> None:
        kvm_path = Path("/dev/kvm")
        if not kvm_path.exists():
            self.warnings.append("KVM not available, falling back to emulation")
            return

        if not os.access(kvm_path, os.R_OK | os.W_OK):
            self.warnings.append(
                "KVM device not accessible, "
                "consider adding user to kvm group"
            )

    def _check_permissions(self) -> None:
        if os.geteuid() == 0:
            self.warnings.append(
                "Running as root is not recommended, "
                "consider using a dedicated user"
            )

        try:
            result = subprocess.run(
                ["capsh", "--print"],
                capture_output=True,
                text=True,
            )
            if "cap_net_admin" not in result.stdout:
                self.warnings.append("Missing cap_net_admin capability")
        except FileNotFoundError:
            pass

    def _check_resources(self) -> None:
        import psutil

        memory = psutil.virtual_memory()
        available_mb = memory.available // (1024 * 1024)
        required_mb = self.config.get("memory_mb", 512) + 256

        if available_mb < required_mb:
            self.errors.append(
                f"Insufficient memory: {available_mb}MB available, "
                f"{required_mb}MB required"
            )

        disk = psutil.disk_usage("/tmp")
        available_mb = disk.free // (1024 * 1024)
        if available_mb < 512:
            self.warnings.append(
                f"Low disk space in /tmp: {available_mb}MB available"
            )

    def _check_seccomp(self) -> None:
        try:
            import seccomp
            logger.info("seccomp module available")
        except ImportError:
            self.warnings.append(
                "python-seccomp not available, "
                "seccomp filtering will be limited"
            )

    def _check_namespaces(self) -> None:
        user_ns_path = Path("/proc/sys/kernel/unprivileged_userns_clone")
        if user_ns_path.exists():
            with open(user_ns_path) as f:
                if f.read().strip() != "1":
                    self.warnings.append(
                        "Unprivileged user namespaces not enabled"
                    )

        if not shutil.which("unshare"):
            self.warnings.append("unshare command not available")

    def _check_cgroups(self) -> None:
        cgroup_path = Path("/sys/fs/cgroup")
        if not cgroup_path.exists():
            self.errors.append("cgroups not available")
            return

        cgroup_v2_path = cgroup_path / "cgroup.controllers"
        if cgroup_v2_path.exists():
            logger.info("cgroups v2 available")
        else:
            if (cgroup_path / "memory").exists():
                logger.info("cgroups v1 available")
            else:
                self.warnings.append("cgroups may not be fully available")
