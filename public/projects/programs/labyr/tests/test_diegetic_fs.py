"""
Tests for Diegetic Filesystem
"""

import tempfile
from pathlib import Path

import pytest

from diegetic.filesystem import DiegeticFilesystem


class TestDiegeticFilesystem:
    @pytest.fixture
    def sample_directory(self, tmp_path):
        (tmp_path / "src").mkdir()
        (tmp_path / "docs").mkdir()
        (tmp_path / "tests").mkdir()

        (tmp_path / "README.md").write_text("# Test Project")
        (tmp_path / "src" / "main.py").write_text("print('hello')")
        (tmp_path / "docs" / "guide.md").write_text("# Guide")

        return tmp_path

    def test_generate_from_path(self, sample_directory):
        fs = DiegeticFilesystem(seed=42)
        fs.generate_from_path(sample_directory)

        assert fs.current_room_id is not None
        assert len(fs.rooms) > 0

    def test_get_current_room(self, sample_directory):
        fs = DiegeticFilesystem(seed=42)
        fs.generate_from_path(sample_directory)

        room = fs.get_current_room()
        assert room is not None
        assert "name" in room
        assert "description" in room

    def test_read_artifact(self, sample_directory):
        fs = DiegeticFilesystem(seed=42)
        fs.generate_from_path(sample_directory)

        room = fs.get_current_room()
        if room and room.get("artifacts"):
            artifact = room["artifacts"][0]
            content = fs.read_artifact(artifact["name"])
            assert content is not None

    def test_serialization(self, sample_directory):
        fs = DiegeticFilesystem(seed=42)
        fs.generate_from_path(sample_directory)

        data = fs.to_dict()
        assert "theme" in data
        assert "rooms" in data
        assert "current_room_id" in data
