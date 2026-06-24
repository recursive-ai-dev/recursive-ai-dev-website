"""
Key System Module
=================

Maps filesystem permissions to key/lock mechanics.
"""

import os
import stat
from typing import Any, Dict, List, Optional


class KeyType:
    MASTER = "master"
    READER = "reader"
    WRITER = "writer"
    EXPLORER = "explorer"
    OBSERVER = "observer"


class KeySystem:
    def __init__(self):
        self.keys: Dict[str, Dict] = {}
        self.locks: Dict[str, Dict] = {}

    def analyze_permissions(self, path: str) -> Dict[str, Any]:
        try:
            st = os.stat(path)
            mode = st.st_mode

            return {
                "owner_read": bool(mode & stat.S_IRUSR),
                "owner_write": bool(mode & stat.S_IWUSR),
                "owner_execute": bool(mode & stat.S_IXUSR),
                "group_read": bool(mode & stat.S_IRGRP),
                "group_write": bool(mode & stat.S_IWGRP),
                "group_execute": bool(mode & stat.S_IXGRP),
                "other_read": bool(mode & stat.S_IROTH),
                "other_write": bool(mode & stat.S_IWOTH),
                "other_execute": bool(mode & stat.S_IXOTH),
                "is_directory": stat.S_ISDIR(mode),
                "is_symlink": stat.S_ISLNK(mode),
                "required_key": self._determine_required_key(mode),
            }
        except OSError:
            return {"error": "Cannot access", "required_key": KeyType.MASTER}

    def _determine_required_key(self, mode: int) -> str:
        if mode & stat.S_IRUSR:
            return KeyType.READER
        elif mode & stat.S_IRGRP:
            return KeyType.READER
        elif mode & stat.S_IROTH:
            return KeyType.READER
        else:
            return KeyType.MASTER

    def create_key(self, key_type: str, name: str) -> Dict[str, Any]:
        import hashlib
        import time

        key_id = hashlib.sha256(
            f"{key_type}:{name}:{time.time()}".encode()
        ).hexdigest()[:16]

        key = {
            "id": key_id,
            "type": key_type,
            "name": name,
            "created": time.time(),
        }

        self.keys[key_id] = key
        return key

    def check_access(
        self,
        key_id: str,
        path: str,
        operation: str,
    ) -> bool:
        key = self.keys.get(key_id)
        if not key:
            return False

        lock = self.analyze_permissions(path)
        required_key = lock.get("required_key", KeyType.MASTER)

        key_hierarchy = {
            KeyType.MASTER: 4,
            KeyType.WRITER: 3,
            KeyType.READER: 2,
            KeyType.EXPLORER: 1,
            KeyType.OBSERVER: 0,
        }

        key_level = key_hierarchy.get(key["type"], 0)
        required_level = key_hierarchy.get(required_key, 4)

        return key_level >= required_level
