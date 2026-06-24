"""
Artifact Mapper Module
======================

Maps files to themed artifacts.
"""

from enum import Enum
import hashlib
import os
import random
from typing import Any, Dict, Optional


class ArtifactType(Enum):
    SCROLL = "scroll"
    TOME = "tome"
    RELIC = "relic"
    KEY = "key"
    POTION = "potion"
    CRYSTAL = "crystal"
    RUNE = "rune"
    SIGIL = "sigil"


EXTENSION_MAP = {
    ".txt": ArtifactType.SCROLL,
    ".md": ArtifactType.SCROLL,
    ".rst": ArtifactType.SCROLL,
    ".doc": ArtifactType.SCROLL,
    ".docx": ArtifactType.SCROLL,
    ".pdf": ArtifactType.TOME,
    ".py": ArtifactType.RUNE,
    ".js": ArtifactType.RUNE,
    ".ts": ArtifactType.RUNE,
    ".rs": ArtifactType.RUNE,
    ".go": ArtifactType.RUNE,
    ".c": ArtifactType.RUNE,
    ".cpp": ArtifactType.RUNE,
    ".h": ArtifactType.SIGIL,
    ".json": ArtifactType.CRYSTAL,
    ".yaml": ArtifactType.CRYSTAL,
    ".yml": ArtifactType.CRYSTAL,
    ".toml": ArtifactType.CRYSTAL,
    ".xml": ArtifactType.CRYSTAL,
    ".key": ArtifactType.KEY,
    ".pem": ArtifactType.KEY,
    ".env": ArtifactType.KEY,
    ".secret": ArtifactType.KEY,
    ".sh": ArtifactType.POTION,
    ".bash": ArtifactType.POTION,
    ".bat": ArtifactType.POTION,
    ".ps1": ArtifactType.POTION,
}


class ArtifactMapper:
    def __init__(self, theme: str = "dark_fantasy"):
        self.theme = theme
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict[str, Dict]:
        return {
            "dark_fantasy": {
                ArtifactType.SCROLL: {
                    "prefixes": ["Ancient", "Weathered", "Faded", "Mysterious"],
                    "descriptions": [
                        "A scroll bearing faded script.",
                        "Parchment covered in tiny, precise handwriting.",
                        "A rolled scroll sealed with dark wax.",
                    ],
                },
                ArtifactType.TOME: {
                    "prefixes": ["Weighty", "Forbidden", "Sacred", "Cursed"],
                    "descriptions": [
                        "A heavy tome bound in dark leather.",
                        "Pages filled with meticulous illustrations.",
                        "A book that seems to hum with power.",
                    ],
                },
                ArtifactType.RUNE: {
                    "prefixes": ["Inscribed", "Glowing", "Ancient", "Powerful"],
                    "descriptions": [
                        "A stone bearing glowing runes.",
                        "Symbols carved with supernatural precision.",
                        "Runes that shift when not directly observed.",
                    ],
                },
                ArtifactType.CRYSTAL: {
                    "prefixes": ["Luminous", "Pulsing", "Clear", "Dark"],
                    "descriptions": [
                        "A crystal that pulses with inner light.",
                        "A perfectly clear stone containing swirling mist.",
                        "A dark crystal that seems to absorb light.",
                    ],
                },
                ArtifactType.KEY: {
                    "prefixes": ["Ornate", "Rusted", "Golden", "Shadow"],
                    "descriptions": [
                        "A key of unusual design.",
                        "A key bearing strange symbols.",
                        "A key that feels warm to the touch.",
                    ],
                },
                ArtifactType.POTION: {
                    "prefixes": ["Bubbling", "Glowing", "Dark", "Iridescent"],
                    "descriptions": [
                        "A vial containing luminous liquid.",
                        "A bottle that seems to contain captured starlight.",
                        "A potion that changes color when observed.",
                    ],
                },
                ArtifactType.SIGIL: {
                    "prefixes": ["Warding", "Binding", "Seeing", "Veiled"],
                    "descriptions": [
                        "A sigil etched into the surface.",
                        "A protective ward drawn in silver.",
                        "A symbol of power and protection.",
                    ],
                },
                ArtifactType.RELIC: {
                    "prefixes": ["Holy", "Ancient", "Powerful", "Cursed"],
                    "descriptions": [
                        "An ancient relic of great power.",
                        "An object that radiates forgotten magic.",
                        "A remnant of a lost civilization.",
                    ],
                },
            }
        }

    def create_artifact(
        self,
        name: str,
        path: str,
        size: int = 0,
    ) -> Dict[str, Any]:
        ext = os.path.splitext(name)[1].lower()
        artifact_type = EXTENSION_MAP.get(ext, ArtifactType.RELIC)

        rng = random.Random(hashlib.sha256(path.encode()).hexdigest())

        templates = self.templates.get(self.theme, self.templates["dark_fantasy"])
        type_templates = templates.get(artifact_type, templates[ArtifactType.RELIC])

        prefix = rng.choice(type_templates["prefixes"])
        description = rng.choice(type_templates["descriptions"])

        return {
            "name": name,
            "display_name": f"{prefix} {name}",
            "artifact_type": artifact_type.value,
            "path": path,
            "size": size,
            "description": description,
            "metadata": {
                "extension": ext,
                "theme": self.theme,
            },
        }
