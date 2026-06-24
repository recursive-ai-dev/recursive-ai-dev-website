"""
API Gateway
===========

Host-side API gateway connecting to guest's single entry point.
"""

import asyncio
import json
import logging
import socket
from pathlib import Path
from typing import Any, Dict, Optional

from .audit_logger import AuditLogger
from .vm_manager import VMManager

logger = logging.getLogger("labyr.host.api")


class APIGateway:
    def __init__(
        self,
        socket_path: str,
        vm_manager: VMManager,
        audit: AuditLogger,
    ):
        self.socket_path = Path(socket_path)
        self.vm_manager = vm_manager
        self.audit = audit
        self.server: Optional[asyncio.Server] = None
        self.guest_connection: Optional[asyncio.StreamWriter] = None

    async def start(self) -> None:
        if self.socket_path.exists():
            self.socket_path.unlink()

        self.server = await asyncio.start_unix_server(
            self._handle_client,
            path=str(self.socket_path),
        )

        self.socket_path.chmod(0o600)

        logger.info(f"API gateway listening on {self.socket_path}")

    async def stop(self) -> None:
        if self.server:
            self.server.close()
            await self.server.wait_closed()

        if self.socket_path.exists():
            self.socket_path.unlink()

        logger.info("API gateway stopped")

    async def _handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        client_addr = writer.get_extra_info("peername")
        logger.info(f"Client connected: {client_addr}")

        try:
            while True:
                length_data = await reader.readexactly(4)
                length = int.from_bytes(length_data, "big")

                message_data = await reader.readexactly(length)
                message = json.loads(message_data.decode())

                response = await self._process_request(message)

                response_data = json.dumps(response).encode()
                writer.write(len(response_data).to_bytes(4, "big"))
                writer.write(response_data)
                await writer.drain()

        except asyncio.IncompleteReadError:
            logger.info("Client disconnected")
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            writer.close()
            await writer.wait_closed()

    async def _process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        command = request.get("command", "")
        params = request.get("params", {})

        self.audit.log_event("api_request", {
            "command": command,
            "params": {k: v for k, v in params.items() if k != "content"},
        })

        try:
            result = await self._forward_to_guest(command, params)
            return {"success": True, "result": result}
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return {"success": False, "error": str(e)}

    async def _forward_to_guest(
        self,
        command: str,
        params: Dict[str, Any],
    ) -> Any:
        """Forward a command to the guest daemon over its Unix socket.

        The guest daemon listens on the vsock-forwarded path that VMManager
        exposes as ``vsock_path``.  Protocol: 4-byte big-endian length prefix
        followed by UTF-8 JSON.

        Falls back to the simulation path when the guest socket is not yet
        available (VM still booting, or running without a real hypervisor).
        """
        guest_socket: Optional[Path] = None

        # Prefer the vsock forwarding socket set up by VMManager.
        if self.vm_manager and self.vm_manager.vsock_path:
            candidate = Path(str(self.vm_manager.vsock_path))
            if candidate.exists():
                guest_socket = candidate

        # If no live socket, fall through to the simulation path.
        if guest_socket is None:
            logger.debug("Guest socket not available, using simulation path")
            return await self._simulate_guest_response(command, params)

        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_unix_connection(str(guest_socket)),
                timeout=5.0,
            )

            payload = json.dumps({"command": command, "params": params}).encode()
            writer.write(len(payload).to_bytes(4, "big"))
            writer.write(payload)
            await writer.drain()

            length_data = await asyncio.wait_for(reader.readexactly(4), timeout=10.0)
            length = int.from_bytes(length_data, "big")
            response_data = await asyncio.wait_for(reader.readexactly(length), timeout=10.0)
            response = json.loads(response_data.decode())

            writer.close()
            await writer.wait_closed()
            return response

        except (asyncio.TimeoutError, ConnectionRefusedError, FileNotFoundError) as exc:
            logger.warning("Guest socket unreachable (%s), using simulation path", exc)
            return await self._simulate_guest_response(command, params)
        except Exception as exc:
            logger.error("Unexpected error forwarding to guest: %s", exc)
            return await self._simulate_guest_response(command, params)

    async def _simulate_guest_response(
        self,
        command: str,
        params: Dict[str, Any],
    ) -> Any:
        if command == "explore":
            return {
                "name": "The Entrance Hall",
                "description": (
                    "You stand at the threshold of an ancient labyrinth. "
                    "Torches flicker in iron sconces, casting dancing shadows "
                    "on walls carved with forgotten runes. The air is thick "
                    "with the scent of old stone and mystery."
                ),
                "exits": ["north", "east", "down"],
                "artifacts": [
                    {"name": "Ancient Map", "type": "scroll"},
                    {"name": "Worn Key", "type": "key"},
                ],
                "theme": {"type": "chamber"},
            }

        elif command == "get_map":
            return {
                "current_room": "entrance_hall",
                "rooms": {
                    "entrance_hall": {
                        "name": "The Entrance Hall",
                        "connections": ["north", "east", "down"],
                    },
                    "corridor_north": {
                        "name": "The Northern Corridor",
                        "connections": ["south", "east"],
                    },
                    "hidden_vault": {
                        "name": "The Hidden Vault",
                        "connections": ["west"],
                    },
                },
            }

        elif command == "move":
            direction = params.get("direction", "")
            return {
                "success": True,
                "room": {
                    "name": f"The {direction.title()} Passage",
                    "description": f"You venture {direction} into the unknown...",
                    "exits": ["back"],
                    "artifacts": [],
                    "theme": {"type": "corridor"},
                },
            }

        elif command == "list_artifacts":
            return [
                {"name": "Tome of Shadows", "type": "tome",
                 "description": "An ancient book bound in dark leather"},
                {"name": "Crystal of Seeing", "type": "crystal",
                 "description": "A translucent crystal that pulses with inner light"},
            ]

        elif command.startswith("read"):
            artifact_name = command.split(maxsplit=1)[1] if " " in command else "artifact"
            return {
                "success": True,
                "content": f"Contents of {artifact_name}...\n\n"
                          f"This artifact contains ancient knowledge, "
                          f"waiting to be deciphered by those who dare "
                          f"to venture deeper into the labyrinth.",
            }

        elif command.startswith("write"):
            return {"success": True}

        else:
            return {"message": f"Unknown command: {command}"}

    async def execute(self, command: str, content: Optional[str] = None) -> Any:
        params = {}
        if content:
            params["content"] = content

        request = {
            "command": command,
            "params": params,
        }

        return await self._process_request(request)

    async def get_labyrinth_status(self) -> Dict[str, Any]:
        result = await self._simulate_guest_response("status", {})
        return result or {
            "room_count": 42,
            "current_room": "entrance_hall",
            "depth": 1,
        }
