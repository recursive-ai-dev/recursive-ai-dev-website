"""
Room Mapper Module
==================

Maps filesystem directories to labyrinth rooms.
"""

from enum import Enum
import hashlib
import random
from typing import Any, Dict, List, Optional


class RoomType(Enum):
    CHAMBER = "chamber"
    CORRIDOR = "corridor"
    VAULT = "vault"
    SHRINE = "shrine"
    CRYPT = "crypt"
    HALL = "hall"
    PASSAGE = "passage"
    SANCTUM = "sanctum"


class RoomMapper:
    def __init__(self, theme: str = "dark_fantasy"):
        self.theme = theme
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict[str, Dict]:
        return {
            "dark_fantasy": {
                RoomType.CHAMBER: {
                    "prefixes": ["Ancient", "Forgotten", "Cursed", "Blessed"],
                    "descriptions": [
                        "A circular chamber carved from dark stone, its walls etched with ancient runes.",
                        "Torches flicker in iron sconces, casting dancing shadows.",
                        "Stone pillars rise to meet a vaulted ceiling lost in darkness.",
                    ],
                },
                RoomType.CORRIDOR: {
                    "prefixes": ["Winding", "Narrow", "Twisting", "Endless"],
                    "descriptions": [
                        "A narrow passage stretches before you, its end lost in shadow.",
                        "The corridor twists and turns, following no clear path.",
                        "Cold stone walls press close on either side.",
                    ],
                },
                RoomType.VAULT: {
                    "prefixes": ["Sacred", "Hidden", "Ancient", "Forbidden"],
                    "descriptions": [
                        "A secure vault, its reinforced door standing ajar.",
                        "Shelves line the walls, some still bearing their cargo.",
                        "The air shimmers with residual protective magic.",
                    ],
                },
                RoomType.SHRINE: {
                    "prefixes": ["Hallowed", "Blessed", "Sacred", "Divine"],
                    "descriptions": [
                        "An altar of polished obsidian dominates this sacred space.",
                        "Candles burn with unnatural fire, casting prismatic light.",
                        "The air hums with ancient power.",
                    ],
                },
                RoomType.CRYPT: {
                    "prefixes": ["Silent", "Dusty", "Ancient", "Forgotten"],
                    "descriptions": [
                        "Stone sarcophagi line the walls.",
                        "The air is thick with the dust of ages.",
                        "Funeral offerings crumble on carved shelves.",
                    ],
                },
                RoomType.HALL: {
                    "prefixes": ["Grand", "Vast", "Magnificent", "Imposing"],
                    "descriptions": [
                        "A great hall stretches before you.",
                        "Echoes of forgotten gatherings linger.",
                        "Banners hang in tatters from iron rods.",
                    ],
                },
                RoomType.PASSAGE: {
                    "prefixes": ["Dark", "Hidden", "Secret", "Narrow"],
                    "descriptions": [
                        "A simple passage connects this place to others.",
                        "The worn floor stones speak of countless feet.",
                        "Drafts carry whispers from distant rooms.",
                    ],
                },
                RoomType.SANCTUM: {
                    "prefixes": ["Inner", "Sacred", "Protected", "Hidden"],
                    "descriptions": [
                        "A private retreat, shielded by powerful wards.",
                        "The room radiates an aura of profound peace.",
                        "Soft light emanates from crystal formations.",
                    ],
                },
            }
        }

    def create_room(
        self,
        room_id: str,
        name: str,
        room_type: RoomType,
        path: str,
        artifacts: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        rng = random.Random(hashlib.sha256(room_id.encode()).hexdigest())

        templates = self.templates.get(self.theme, self.templates["dark_fantasy"])
        room_templates = templates.get(room_type, templates[RoomType.CHAMBER])

        prefix = rng.choice(room_templates["prefixes"])
        description = rng.choice(room_templates["descriptions"])

        return {
            "id": room_id,
            "name": f"{prefix} {name}",
            "original_name": name,
            "description": description,
            "room_type": room_type.value,
            "path": path,
            "artifacts": artifacts or [],
            "connections": [],
            "visited": False,
            "metadata": {
                "depth": len(path.split("/")),
                "theme": self.theme,
            },
        }
