"""
Integration Tests for Labyr System
"""

import asyncio
import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestHostGuestCommunication:
    @pytest.mark.asyncio
    async def test_api_gateway_message_format(self):
        from host.api_gateway import APIGateway
        from host.audit_logger import AuditLogger

        audit = AuditLogger({"log_path": "/tmp/labyr_test_audit.log"})
        vm_manager = MagicMock()
        vm_manager.get_status = AsyncMock(return_value={"status": "running"})

        gateway = APIGateway(socket_path="/tmp/labyr_test.sock", vm_manager=vm_manager, audit=audit)

        response = await gateway._process_request({"command": "status", "params": {}})
        assert "success" in response
        assert "result" in response

    @pytest.mark.asyncio
    async def test_simulated_explore_response(self):
        from host.api_gateway import APIGateway
        from host.audit_logger import AuditLogger

        audit = AuditLogger({"log_path": "/tmp/labyr_test_audit.log"})
        vm_manager = MagicMock()
        gateway = APIGateway(socket_path="/tmp/labyr_test.sock", vm_manager=vm_manager, audit=audit)

        result = await gateway._simulate_guest_response("explore", {})
        assert result is not None
        assert "name" in result
        assert "description" in result
        assert "exits" in result
        assert "artifacts" in result

    @pytest.mark.asyncio
    async def test_simulated_move_response(self):
        from host.api_gateway import APIGateway
        from host.audit_logger import AuditLogger

        audit = AuditLogger({"log_path": "/tmp/labyr_test_audit.log"})
        vm_manager = MagicMock()
        gateway = APIGateway(socket_path="/tmp/labyr_test.sock", vm_manager=vm_manager, audit=audit)

        result = await gateway._simulate_guest_response("move", {"direction": "north"})
        assert result.get("success") is True
        assert "room" in result

    @pytest.mark.asyncio
    async def test_unknown_command(self):
        from host.api_gateway import APIGateway
        from host.audit_logger import AuditLogger

        audit = AuditLogger({"log_path": "/tmp/labyr_test_audit.log"})
        vm_manager = MagicMock()
        gateway = APIGateway(socket_path="/tmp/labyr_test.sock", vm_manager=vm_manager, audit=audit)

        result = await gateway._simulate_guest_response("nonexistent", {})
        assert "Unknown command" in result.get("message", "")


class TestEndToEndFlows:
    @pytest.mark.asyncio
    async def test_config_injector_creates_files(self):
        from host.config_injector import ConfigInjector

        with tempfile.TemporaryDirectory() as tmpdir:
            rootfs = Path(tmpdir)
            config = {
                "vm": {"memory_mb": 512, "cpus": 2},
                "labyrinth": {"dimensions": 2, "size": [8, 8], "entropy_target": 0.8, "theme": "dark_fantasy"},
                "security": {"enable_seccomp": True},
            }
            injector = ConfigInjector(config)
            await injector.inject(rootfs)

            assert (rootfs / "opt" / "labyr" / "etc" / "vm_config.json").exists()
            assert (rootfs / "opt" / "labyr" / "etc" / "labyrinth_config.json").exists()
            assert (rootfs / "opt" / "labyr" / "etc" / "security_config.json").exists()

    @pytest.mark.asyncio
    async def test_rootfs_builder_creates_structure(self):
        from host.rootfs_builder import RootfsBuilder

        builder = RootfsBuilder({"rootfs_size_mb": 64})
        rootfs = await builder.build()

        try:
            assert rootfs.exists()
            assert (rootfs / "bin").is_dir()
            assert (rootfs / "etc").is_dir()
            assert (rootfs / "sbin" / "init").exists()
            assert (rootfs / "etc" / "init.d" / "rcS").exists()
        finally:
            import shutil
            shutil.rmtree(rootfs, ignore_errors=True)

    def test_diegetic_fs_from_real_path(self):
        from diegetic.filesystem import DiegeticFilesystem

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / "src").mkdir()
            (root / "src" / "main.py").write_text("print('hello')")
            (root / "README.md").write_text("# Test")

            fs = DiegeticFilesystem(seed=42)
            fs.generate_from_path(root)

            room = fs.get_current_room()
            assert room is not None
            assert "name" in room
            assert "artifacts" in room

    def test_audit_logger_writes_entries(self):
        from host.audit_logger import AuditLogger

        with tempfile.TemporaryDirectory() as tmpdir:
            log_path = Path(tmpdir) / "audit.log"
            config = {"log_path": str(log_path), "log_level": "INFO"}
            logger = AuditLogger(config)

            logger.log_event("test_event", {"key": "value"})
            entries = logger.get_recent(10)
            assert len(entries) >= 1
            assert entries[0]["event"] == "test_event"
            assert entries[0]["data"]["key"] == "value"

    def test_labyrinth_generation_integration(self):
        from engine.labyrinth import LabyrinthConfig, LabyrinthGenerator

        config = LabyrinthConfig(dimensions=2, size=[6, 6], entropy_target=0.75, seed=42)
        generator = LabyrinthGenerator(config)
        graph = generator.generate()

        metrics = generator.calculate_metrics()
        assert metrics["nodes"] == 36
        assert metrics["connected"] is True
        assert 0 < metrics["entropy"] <= 1

    def test_desktop_integration_detection(self):
        from desktop.integration import DesktopIntegration

        with patch.dict(os.environ, {"XDG_CURRENT_DESKTOP": "GNOME"}, clear=True):
            integration = DesktopIntegration()
            assert integration.desktop_env == "gnome"

        with patch.dict(os.environ, {"XDG_CURRENT_DESKTOP": "KDE"}, clear=True):
            integration = DesktopIntegration()
            assert integration.desktop_env == "kde"

        with patch.dict(os.environ, {}, clear=True):
            integration = DesktopIntegration()
            assert integration.desktop_env == "unknown"
