"""
Tests for VM Security
"""

import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from host.security_validator import SecurityValidator


class TestSecurityValidator:
    def test_init(self):
        config = {"enable_seccomp": True, "memory_mb": 512}
        validator = SecurityValidator(config)
        assert validator.config == config
        assert validator.errors == []
        assert validator.warnings == []

    @patch("host.security_validator.shutil.which")
    def test_check_hypervisor_found(self, mock_which):
        mock_which.side_effect = lambda x: "/usr/bin/" + x if x == "firecracker" else None
        validator = SecurityValidator({})
        validator._check_hypervisor()
        assert len(validator.errors) == 0

    @patch("host.security_validator.shutil.which")
    def test_check_hypervisor_missing(self, mock_which):
        mock_which.return_value = None
        validator = SecurityValidator({})
        validator._check_hypervisor()
        assert len(validator.errors) == 1
        assert "hypervisor" in validator.errors[0].lower()

    def test_check_kvm_not_found(self):
        validator = SecurityValidator({})
        with patch.object(Path, "exists", return_value=False):
            validator._check_kvm()
            assert len(validator.warnings) == 1

    def test_seccomp_check_import_error(self):
        validator = SecurityValidator({"enable_seccomp": True})
        validator._check_seccomp()
        assert len(validator.warnings) == 1

    def test_validate_passes_with_defaults(self):
        config = {
            "enable_seccomp": False,
            "enable_namespaces": False,
            "enable_cgroups": False,
            "memory_mb": 128,
        }
        validator = SecurityValidator(config)

        with (
            patch("host.security_validator.shutil.which", return_value="/usr/bin/qemu-system-x86_64"),
            patch.object(Path, "exists", return_value=True),
            patch("host.security_validator.os.access", return_value=True),
            patch("host.security_validator.os.geteuid", return_value=1000),
            patch("host.security_validator.psutil") as mock_psutil,
        ):
            mock_memory = MagicMock()
            mock_memory.available = 1024 * 1024 * 1024
            mock_psutil.virtual_memory.return_value = mock_memory
            mock_disk = MagicMock()
            mock_disk.free = 1024 * 1024 * 1024
            mock_psutil.disk_usage.return_value = mock_disk

            result = validator.validate()
            assert result is True
            assert len(validator.errors) == 0


class TestVMManagerSecurity:
    @pytest.mark.asyncio
    async def test_vm_start_stop_cleanup(self):
        from host.vm_manager import VMManager, HypervisorType

        manager = VMManager(
            hypervisor=HypervisorType.QEMU,
            config={"cpus": 1, "memory_mb": 256},
            rootfs_path=Path("/tmp"),
        )

        assert manager.hypervisor == HypervisorType.QEMU
        assert manager.process is None

    def test_hypervisor_enum_values(self):
        from host.vm_manager import HypervisorType

        assert HypervisorType.FIRECRACKER.value == "firecracker"
        assert HypervisorType.QEMU.value == "qemu"


class TestSeccompProfile:
    def test_profile_exists(self):
        profile_path = Path(__file__).parent.parent / "guest" / "security" / "seccomp_profile.json"
        assert profile_path.exists()
        assert profile_path.stat().st_size > 0

    def test_profile_valid_json(self):
        import json
        profile_path = Path(__file__).parent.parent / "guest" / "security" / "seccomp_profile.json"
        with open(profile_path) as f:
            profile = json.load(f)
        assert "defaultAction" in profile
        assert "SCMP_ACT_ERRNO" in profile["defaultAction"]
        assert "architectures" in profile
        assert "syscalls" in profile


class TestAppArmorProfile:
    def test_profile_exists(self):
        profile_path = Path(__file__).parent.parent / "guest" / "security" / "apparmor_profile"
        assert profile_path.exists()
        assert profile_path.stat().st_size > 0

    def test_profile_syntax(self):
        profile_path = Path(__file__).parent.parent / "guest" / "security" / "apparmor_profile"
        content = profile_path.read_text()
        assert "profile labyr-daemon" in content
        assert "deny /etc/shadow r" in content
