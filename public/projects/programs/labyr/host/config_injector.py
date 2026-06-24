"""
Configuration Injector
======================

Injects user and labyrinth configuration into the guest rootfs.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict

import yaml

logger = logging.getLogger("labyr.host.config")


class ConfigInjector:
    def __init__(self, config: Dict[str, Any]):
        self.config = config

    async def inject(self, rootfs_path: Path) -> None:
        logger.info("Injecting configuration into rootfs")

        await self._inject_vm_config(rootfs_path)
        await self._inject_labyrinth_config(rootfs_path)
        await self._inject_security_config(rootfs_path)
        await self._inject_theme_config(rootfs_path)

        logger.info("Configuration injection complete")

    async def _inject_vm_config(self, rootfs_path: Path) -> None:
        vm_config = self.config.get("vm", {})

        config_path = rootfs_path / "opt" / "labyr" / "etc" / "vm_config.json"
        config_path.parent.mkdir(parents=True, exist_ok=True)

        with open(config_path, "w") as f:
            json.dump({
                "memory_mb": vm_config.get("memory_mb", 512),
                "cpus": vm_config.get("cpus", 2),
                "hostname": "labyr-guest",
            }, f, indent=2)

    async def _inject_labyrinth_config(self, rootfs_path: Path) -> None:
        lab_config = self.config.get("labyrinth", {})

        config_path = rootfs_path / "opt" / "labyr" / "etc" / "labyrinth_config.json"
        config_path.parent.mkdir(parents=True, exist_ok=True)

        with open(config_path, "w") as f:
            json.dump({
                "dimensions": lab_config.get("dimensions", 3),
                "size": lab_config.get("size", [16, 16, 4]),
                "entropy_target": lab_config.get("entropy_target", 0.85),
                "seed": lab_config.get("seed"),
                "theme": lab_config.get("theme", "dark_fantasy"),
                "source_path": lab_config.get("source_path"),
            }, f, indent=2)

    async def _inject_security_config(self, rootfs_path: Path) -> None:
        sec_config = self.config.get("security", {})

        config_path = rootfs_path / "opt" / "labyr" / "etc" / "security_config.json"
        config_path.parent.mkdir(parents=True, exist_ok=True)

        with open(config_path, "w") as f:
            json.dump(sec_config, f, indent=2)

    async def _inject_theme_config(self, rootfs_path: Path) -> None:
        theme = self.config.get("labyrinth", {}).get("theme", "dark_fantasy")

        theme_dir = rootfs_path / "opt" / "labyr" / "data" / "themes" / theme
        theme_dir.mkdir(parents=True, exist_ok=True)

        theme_config = self._get_theme_config(theme)
        with open(theme_dir / "theme.json", "w") as f:
            json.dump(theme_config, f, indent=2)

    def _get_theme_config(self, theme: str) -> Dict[str, Any]:
        themes = {
            "dark_fantasy": {
                "name": "Dark Fantasy",
                "description": "A realm of shadow and ancient power",
                "room_types": [
                    "chamber", "corridor", "vault", "shrine",
                    "crypt", "hall", "passage", "sanctum",
                ],
                "room_prefixes": [
                    "Ancient", "Forgotten", "Cursed", "Blessed",
                    "Shadowed", "Illuminated", "Hidden", "Sacred",
                ],
                "room_suffixes": [
                    "Chamber", "Hall", "Vault", "Crypt",
                    "Sanctum", "Passage", "Nexus", "Domain",
                ],
                "artifact_types": [
                    "scroll", "tome", "relic", "key",
                    "potion", "crystal", "rune", "sigil",
                ],
                "descriptors": {
                    "ambient": [
                        "Flickering torchlight dances on ancient stone walls",
                        "A cold draft carries whispers of forgotten ages",
                        "The air shimmers with latent magical energy",
                        "Shadows seem to move of their own accord",
                    ],
                    "discovery": [
                        "You sense a powerful presence nearby",
                        "Ancient runes pulse with faint light",
                        "A hidden mechanism clicks in the darkness",
                        "The path ahead splits into uncertainty",
                    ],
                },
            },
            "cosmic_horror": {
                "name": "Cosmic Horror",
                "description": "Where geometry breaks and sanity frays",
                "room_types": [
                    "void", "nexus", "rift", "sanctum",
                    "chamber", "passage", "threshold", "abyss",
                ],
                "room_prefixes": [
                    "Non-Euclidean", "Impossible", "Eldritch",
                    "Antediluvian", "Cyclopean", "Squamous",
                ],
                "room_suffixes": [
                    "Void", "Nexus", "Rift", "Threshold",
                    "Abyss", "Gateway", "Locus", "Terminus",
                ],
                "artifact_types": [
                    "codex", "artifact", "specimen", "sigil",
                    "glyph", "tablet", "cipher", "manifestation",
                ],
                "descriptors": {
                    "ambient": [
                        "The walls seem to breathe with alien rhythm",
                        "Geometry defies comprehension in every direction",
                        "Colors that shouldn't exist paint the impossible space",
                        "A sound like distant chanting echoes from nowhere",
                    ],
                    "discovery": [
                        "Reality warps around a newly revealed passage",
                        "Your mind recoils from what lies ahead",
                        "The symbols on the wall shift when not observed",
                        "Something vast and aware notices your presence",
                    ],
                },
            },
        }

        return themes.get(theme, themes["dark_fantasy"])
