"""
Diegetic Filesystem
===================

Maps filesystem operations to diegetic exploration mechanics.

The diegetic interface paradigm, borrowed from game design, presents
system interfaces as part of the game world rather than as external
overlays. In this context:

- Folders become Rooms in a labyrinth
- Files become Artifacts within rooms
- Permissions become Keys that unlock access
- Directory depth becomes exploration depth
- File operations become interactions with artifacts
"""

import hashlib
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..engine.labyrinth import LabyrinthConfig, LabyrinthGenerator
from ..engine.entropy import ShannonEntropy
from .rooms import RoomMapper, RoomType
from .artifacts import ArtifactMapper, ArtifactType
from .keys import KeySystem
from .narrative import NarrativeEngine


class DiegeticFilesystem:
    def __init__(
        self,
        source_path: Optional[Path] = None,
        theme: str = "dark_fantasy",
        seed: Optional[int] = None,
    ):
        self.source_path = source_path
        self.theme = theme
        self.seed = seed

        self.room_mapper = RoomMapper(theme)
        self.artifact_mapper = ArtifactMapper(theme)
        self.key_system = KeySystem()
        self.narrative = NarrativeEngine(theme)

        self.labyrinth: Optional[LabyrinthGenerator] = None
        self.rooms: Dict[str, Dict] = {}
        self.current_room_id: Optional[str] = None
        self.visited_rooms: Dict[str, Dict] = {}

        self.path_to_room: Dict[str, str] = {}
        self.room_to_path: Dict[str, str] = {}

    def generate_from_path(self, path: Path) -> None:
        self.source_path = path

        structure = self._analyze_structure(path)

        config = self._create_config(structure)

        self.labyrinth = LabyrinthGenerator(config)
        self.labyrinth.generate()

        self._map_filesystem_to_labyrinth(path, structure)

        self.current_room_id = self._path_to_room_id(path)

    def _analyze_structure(self, path: Path) -> Dict[str, Any]:
        dirs = []
        files = []
        max_depth = 0

        for root, dirnames, filenames in os.walk(path):
            root_path = Path(root)
            rel_path = root_path.relative_to(path)
            depth = len(rel_path.parts)

            max_depth = max(max_depth, depth)

            for dirname in dirnames:
                full_path = root_path / dirname
                dirs.append({
                    "path": str(full_path.relative_to(path)),
                    "depth": depth + 1,
                    "name": dirname,
                })

            for filename in filenames:
                full_path = root_path / filename
                try:
                    size = full_path.stat().st_size
                except OSError:
                    size = 0

                files.append({
                    "path": str(full_path.relative_to(path)),
                    "depth": depth,
                    "name": filename,
                    "size": size,
                })

        return {
            "dirs": dirs,
            "files": files,
            "max_depth": max_depth,
            "total_dirs": len(dirs),
            "total_files": len(files),
        }

    def _create_config(self, structure: Dict) -> LabyrinthConfig:
        total_nodes = structure["total_dirs"] + 1
        dim_size = max(4, int(total_nodes ** 0.5))

        if structure["total_files"] > 0:
            file_depths = [f["depth"] for f in structure["files"]]
            depth_entropy = ShannonEntropy.from_sequence(file_depths)
            entropy_target = min(0.95, max(0.5, depth_entropy / 3))
        else:
            entropy_target = 0.7

        return LabyrinthConfig(
            dimensions=2,
            size=[dim_size, dim_size],
            entropy_target=entropy_target,
            seed=self.seed,
        )

    def _map_filesystem_to_labyrinth(
        self,
        root_path: Path,
        structure: Dict,
    ) -> None:
        if not self.labyrinth or not self.labyrinth.graph:
            return

        nodes = list(self.labyrinth.graph.nodes())
        node_to_room_id: Dict[Tuple, str] = {}

        root_room_id = self._path_to_room_id(root_path)
        node_to_room_id[self._node_tuple(nodes[0])] = root_room_id
        self.path_to_room[str(root_path)] = root_room_id
        self.room_to_path[root_room_id] = str(root_path)

        root_node = nodes[0]
        self.rooms[root_room_id] = self.room_mapper.create_room(
            room_id=root_room_id,
            name="The Entrance Hall",
            room_type=RoomType.HALL,
            path=str(root_path),
            artifacts=self._get_artifacts_for_dir(root_path),
        )
        self.rooms[root_room_id]["metadata"]["node"] = list(root_node)

        node_idx = 1
        for dir_info in structure["dirs"]:
            if node_idx >= len(nodes):
                break

            dir_path = root_path / dir_info["path"]
            room_id = f"room_{nodes[node_idx]}"
            node_to_room_id[self._node_tuple(nodes[node_idx])] = room_id

            self.path_to_room[str(dir_path)] = room_id
            self.room_to_path[room_id] = str(dir_path)

            room_type = self._determine_room_type(dir_path, dir_info)

            self.rooms[room_id] = self.room_mapper.create_room(
                room_id=room_id,
                name=dir_info["name"],
                room_type=room_type,
                path=str(dir_path),
                artifacts=self._get_artifacts_for_dir(dir_path),
            )
            self.rooms[room_id]["metadata"]["node"] = list(nodes[node_idx])

            node_idx += 1

        for u, v in self.labyrinth.graph.edges():
            u_room_id = node_to_room_id.get(self._node_tuple(u))
            v_room_id = node_to_room_id.get(self._node_tuple(v))
            if not u_room_id or not v_room_id:
                continue

            u_room = self.rooms[u_room_id]
            v_room = self.rooms[v_room_id]

            if v_room_id not in u_room["connections"]:
                u_room["connections"].append(v_room_id)
            if u_room_id not in v_room["connections"]:
                v_room["connections"].append(u_room_id)

            direction = self._direction_between(u, v)
            if direction:
                u_room.setdefault("metadata", {}).setdefault("directions", {})[direction] = v_room_id

            reverse_direction = self._direction_between(v, u)
            if reverse_direction:
                v_room.setdefault("metadata", {}).setdefault("directions", {})[reverse_direction] = u_room_id

    def _path_to_room_id(self, path: Path) -> str:
        hash_val = hashlib.md5(str(path).encode()).hexdigest()[:8]
        return f"room_{hash_val}"

    def _determine_room_type(self, path: Path, info: Dict) -> RoomType:
        name = info["name"].lower()

        if name in (".git", ".svn", ".hg"):
            return RoomType.VAULT
        elif name in ("src", "source", "lib", "code"):
            return RoomType.SANCTUM
        elif name in ("test", "tests", "spec", "specs"):
            return RoomType.SHRINE
        elif name in ("doc", "docs", "documentation"):
            return RoomType.CRYPT
        elif name in ("config", "conf", "settings"):
            return RoomType.CHAMBER
        elif name.startswith("."):
            return RoomType.PASSAGE
        else:
            return RoomType.CORRIDOR

    @staticmethod
    def _node_tuple(node: Any) -> Tuple:
        return tuple(node) if isinstance(node, (list, tuple)) else (node,)

    @staticmethod
    def _direction_between(source: Any, destination: Any) -> Optional[str]:
        source_coords = DiegeticFilesystem._node_tuple(source)
        destination_coords = DiegeticFilesystem._node_tuple(destination)

        if len(source_coords) != len(destination_coords):
            return None

        deltas = [
            int(destination_coords[idx]) - int(source_coords[idx])
            for idx in range(len(source_coords))
        ]

        if len(deltas) == 1:
            if deltas[0] == 1:
                return "east"
            if deltas[0] == -1:
                return "west"
        elif len(deltas) == 2:
            if deltas == [-1, 0]:
                return "north"
            if deltas == [1, 0]:
                return "south"
            if deltas == [0, -1]:
                return "west"
            if deltas == [0, 1]:
                return "east"
        elif len(deltas) == 3:
            if deltas[:2] == [-1, 0] and deltas[2] == 0:
                return "north"
            if deltas[:2] == [1, 0] and deltas[2] == 0:
                return "south"
            if deltas[:2] == [0, -1] and deltas[2] == 0:
                return "west"
            if deltas[:2] == [0, 1] and deltas[2] == 0:
                return "east"
            if deltas[2] == 1:
                return "down"
            if deltas[2] == -1:
                return "up"

        return None

    def _get_artifacts_for_dir(self, dir_path: Path) -> List[Dict]:
        artifacts = []

        try:
            for item in dir_path.iterdir():
                if item.is_file():
                    artifact = self.artifact_mapper.create_artifact(
                        name=item.name,
                        path=str(item),
                        size=item.stat().st_size,
                    )
                    artifacts.append(artifact)
        except PermissionError:
            pass

        return artifacts

    def get_current_room(self) -> Optional[Dict]:
        if self.current_room_id and self.current_room_id in self.rooms:
            return self.rooms[self.current_room_id]
        return None

    def move_to(self, direction: str) -> Optional[Dict]:
        if not self.labyrinth or not self.current_room_id:
            return None

        current_room = self.rooms.get(self.current_room_id)
        if not current_room:
            return None

        connections = current_room.get("connections", [])
        directions = current_room.get("metadata", {}).get("directions", {})
        target_room_id = directions.get(direction) or (
            direction if direction in connections else None
        )

        if target_room_id and target_room_id in self.rooms:
            self.current_room_id = target_room_id
            self.visited_rooms[target_room_id] = {
                "first_visit": target_room_id not in self.visited_rooms,
                "artifacts_read": [],
            }
            return self.rooms[target_room_id]

        return None

    def read_artifact(self, artifact_name: str) -> Optional[str]:
        current_room = self.get_current_room()
        if not current_room:
            return None

        for artifact in current_room.get("artifacts", []):
            if artifact["name"] == artifact_name:
                path = artifact.get("path")
                if path:
                    try:
                        with open(path, "r") as f:
                            return f.read()
                    except Exception:
                        return "[Artifact contents inaccessible]"

        return None

    def to_dict(self) -> Dict:
        return {
            "theme": self.theme,
            "current_room_id": self.current_room_id,
            "rooms": self.rooms,
            "visited_rooms": self.visited_rooms,
            "path_to_room": self.path_to_room,
            "room_to_path": self.room_to_path,
        }
