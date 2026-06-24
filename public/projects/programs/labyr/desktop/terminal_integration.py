"""
Terminal Integration
====================

Terminal UI for labyrinth exploration.
"""

import asyncio
import sys
from typing import Optional

from ..diegetic.filesystem import DiegeticFilesystem


class TerminalUI:
    def __init__(self, fs: DiegeticFilesystem):
        self.fs = fs
        self.running = False

    def run(self) -> None:
        self.running = True
        asyncio.run(self._run_async())

    async def _run_async(self) -> None:
        self._print_header()

        while self.running:
            room = self.fs.get_current_room()
            if room:
                self._print_room(room)

            try:
                cmd = await self._get_input("\n> ")
                await self._process_command(cmd)
            except (EOFError, KeyboardInterrupt):
                break

    def _print_header(self) -> None:
        print("\n" + "=" * 60)
        print("  LABYR - Diegetic Filesystem Explorer")
        print("=" * 60)

    def _print_room(self, room: dict) -> None:
        print(f"\n{room.get('name', 'Unknown')}")
        print(f"   {room.get('description', '')}")

        artifacts = room.get("artifacts", [])
        if artifacts:
            print("\n  Artifacts:")
            for artifact in artifacts[:5]:
                print(f"     \u2022 {artifact.get('display_name', artifact.get('name'))}")

        connections = room.get("connections", [])
        if connections:
            print(f"\n  Exits: {', '.join(connections)}")

    async def _get_input(self, prompt: str) -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: input(prompt))

    async def _process_command(self, cmd: str) -> None:
        parts = cmd.strip().split()
        if not parts:
            return

        command = parts[0].lower()
        args = parts[1:]

        if command in ("quit", "exit", "q"):
            self.running = False
        elif command in ("north", "n"):
            self.fs.move_to("north")
        elif command in ("south", "s"):
            self.fs.move_to("south")
        elif command in ("east", "e"):
            self.fs.move_to("east")
        elif command in ("west", "w"):
            self.fs.move_to("west")
        elif command == "read" and args:
            content = self.fs.read_artifact(" ".join(args))
            if content:
                print(f"\n{content}")
            else:
                print("Artifact not found.")
        elif command == "look":
            room = self.fs.get_current_room()
            if room:
                self._print_room(room)
        elif command == "help":
            self._print_help()
        else:
            print(f"Unknown command: {command}")

    def _print_help(self) -> None:
        print("""
Commands:
  north, n    - Move north
  south, s    - Move south
  east, e     - Move east
  west, w     - Move west
  look        - Look around
  read <name> - Read an artifact
  help        - Show this help
  quit, q     - Exit
""")
