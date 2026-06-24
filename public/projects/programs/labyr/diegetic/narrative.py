"""
Narrative Engine
================

Generates atmospheric narrative for exploration.
"""

import random
from typing import Any, Dict, List, Optional


class NarrativeEngine:
    def __init__(self, theme: str = "dark_fantasy"):
        self.theme = theme
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict[str, Any]:
        return {
            "dark_fantasy": {
                "arrival": [
                    "You step into {room_name}. {description}",
                    "Before you lies {room_name}. {description}",
                    "You find yourself in {room_name}. {description}",
                ],
                "discovery": [
                    "Your eyes are drawn to {artifact_name}.",
                    "Something catches your attention: {artifact_name}.",
                    "Among the shadows, you notice {artifact_name}.",
                ],
                "movement": [
                    "You proceed {direction}.",
                    "Moving {direction}, you enter a new area.",
                    "The path leads you {direction}.",
                ],
                "blocked": [
                    "The way {direction} is blocked.",
                    "You cannot proceed {direction}.",
                    "An obstacle bars your path {direction}.",
                ],
                "ambient": [
                    "Flickering torchlight dances on ancient stone walls.",
                    "A cold draft carries whispers of forgotten ages.",
                    "The air shimmers with latent magical energy.",
                    "Shadows seem to move of their own accord.",
                    "Dust motes drift through beams of dim light.",
                    "The stones beneath your feet are worn smooth by time.",
                ],
                "transition": [
                    "You feel the atmosphere change as you move deeper.",
                    "The air grows heavier with each step.",
                    "A sense of anticipation builds within you.",
                    "Something guides you onward.",
                ],
            }
        }

    def generate_arrival(self, room: Dict) -> str:
        templates = self.templates[self.theme]["arrival"]
        template = random.choice(templates)
        return template.format(
            room_name=room.get("name", "an unknown chamber"),
            description=room.get("description", ""),
        )

    def generate_discovery(self, artifact: Dict) -> str:
        templates = self.templates[self.theme]["discovery"]
        template = random.choice(templates)
        return template.format(
            artifact_name=artifact.get("display_name", artifact.get("name", "something"))
        )

    def generate_movement(self, direction: str) -> str:
        templates = self.templates[self.theme]["movement"]
        template = random.choice(templates)
        return template.format(direction=direction)

    def generate_blocked(self, direction: str) -> str:
        templates = self.templates[self.theme]["blocked"]
        template = random.choice(templates)
        return template.format(direction=direction)

    def generate_ambient(self) -> str:
        templates = self.templates[self.theme]["ambient"]
        return random.choice(templates)

    def generate_transition(self) -> str:
        templates = self.templates[self.theme]["transition"]
        return random.choice(templates)

    def generate_room_narrative(self, room: Dict) -> str:
        parts = []

        parts.append(self.generate_arrival(room))

        parts.append(self.generate_ambient())

        artifacts = room.get("artifacts", [])
        if artifacts:
            parts.append("")
            for artifact in artifacts[:3]:
                parts.append(self.generate_discovery(artifact))

        return "\n".join(parts)
