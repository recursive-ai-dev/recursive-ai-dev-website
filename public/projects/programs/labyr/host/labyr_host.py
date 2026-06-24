#!/usr/bin/env python3
"""
Labyr Host Launcher
===================

Main entry point for launching ephemeral development VMs with diegetic filesystem.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Optional

import click
import yaml
from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
from rich.table import Table

from .rootfs_builder import RootfsBuilder
from .config_injector import ConfigInjector
from .vm_manager import VMManager, HypervisorType
from .api_gateway import APIGateway
from .audit_logger import AuditLogger
from .security_validator import SecurityValidator

console = Console()
logger = logging.getLogger("labyr.host")

_active_vm: Optional[VMManager] = None
_temp_rootfs: Optional[Path] = None


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True)],
    )


def cleanup_handler(signum=None, frame=None):
    global _active_vm, _temp_rootfs
    logger.info("Initiating cleanup...")

    if _active_vm:
        try:
            asyncio.get_event_loop().run_until_complete(_active_vm.stop())
        except Exception as e:
            logger.error(f"Error stopping VM: {e}")

    if _temp_rootfs and _temp_rootfs.exists():
        try:
            import shutil
            shutil.rmtree(_temp_rootfs)
            logger.info(f"Cleaned up temporary rootfs: {_temp_rootfs}")
        except Exception as e:
            logger.error(f"Error cleaning rootfs: {e}")


class LabyrConfig:
    def __init__(self, config_path: Optional[Path] = None):
        self.config = self._load_config(config_path)

    def _load_config(self, config_path: Optional[Path]) -> dict:
        defaults = {
            "vm": {
                "memory_mb": 512,
                "cpus": 2,
                "hypervisor": "firecracker",
                "kernel_path": None,
                "rootfs_size_mb": 256,
            },
            "security": {
                "enable_seccomp": True,
                "enable_apparmor": True,
                "enable_namespaces": True,
                "enable_cgroups": True,
                "drop_capabilities": True,
            },
            "labyrinth": {
                "dimensions": 3,
                "size": [16, 16, 4],
                "entropy_target": 0.85,
                "seed": None,
                "theme": "dark_fantasy",
            },
            "api": {
                "socket_path": "/tmp/labyr.sock",
                "max_connections": 10,
                "timeout_seconds": 30,
            },
            "audit": {
                "log_path": "/var/log/labyr/audit.log",
                "log_level": "INFO",
                "retain_days": 30,
            },
        }

        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = yaml.safe_load(f)
                return self._deep_merge(defaults, user_config)

        return defaults

    @staticmethod
    def _deep_merge(base: dict, override: dict) -> dict:
        result = base.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = LabyrConfig._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    @property
    def vm_config(self) -> dict:
        return self.config["vm"]

    @property
    def security_config(self) -> dict:
        return self.config["security"]

    @property
    def labyrinth_config(self) -> dict:
        return self.config["labyrinth"]

    @property
    def api_config(self) -> dict:
        return self.config["api"]


class LabyrHost:
    def __init__(self, config: LabyrConfig):
        self.config = config
        self.audit = AuditLogger(config.config.get("audit", {}))
        self.validator = SecurityValidator(config.security_config)
        self.rootfs_builder = RootfsBuilder(config.vm_config)
        self.config_injector = ConfigInjector(config.config)
        self.vm_manager: Optional[VMManager] = None
        self.api_gateway: Optional[APIGateway] = None

    async def initialize(self) -> None:
        global _active_vm, _temp_rootfs

        console.print(Panel.fit(
            "[bold cyan]Labyr Project[/bold cyan]\n"
            "[dim]Ephemeral Development VM with Diegetic Filesystem[/dim]",
            border_style="cyan",
        ))

        console.print("\n[bold]Step 1:[/bold] Validating host security...")
        if not self.validator.validate():
            console.print("[red]✗[/red] Host security validation failed")
            raise RuntimeError("Security validation failed")
        console.print("[green]✓[/green] Host security validated")

        console.print("\n[bold]Step 2:[/bold] Building RAM-based rootfs...")
        rootfs_path = await self.rootfs_builder.build()
        _temp_rootfs = rootfs_path
        console.print(f"[green]✓[/green] Rootfs built at {rootfs_path}")

        console.print("\n[bold]Step 3:[/bold] Injecting configuration...")
        await self.config_injector.inject(rootfs_path)
        console.print("[green]✓[/green] Configuration injected")

        console.print("\n[bold]Step 4:[/bold] Initializing VM manager...")
        hypervisor = HypervisorType(self.config.vm_config.get("hypervisor", "firecracker"))
        self.vm_manager = VMManager(
            hypervisor=hypervisor,
            config=self.config.vm_config,
            rootfs_path=rootfs_path,
        )
        _active_vm = self.vm_manager
        console.print(f"[green]✓[/green] VM manager ready (hypervisor: {hypervisor.value})")

        console.print("\n[bold]Step 5:[/bold] Booting ephemeral VM...")
        await self.vm_manager.start()
        console.print("[green]✓[/green] VM booted successfully")

        console.print("\n[bold]Step 6:[/bold] Establishing API gateway...")
        self.api_gateway = APIGateway(
            socket_path=self.config.api_config["socket_path"],
            vm_manager=self.vm_manager,
            audit=self.audit,
        )
        await self.api_gateway.start()
        console.print("[green]✓[/green] API gateway active")

        self.audit.log_event("system_initialized", {
            "hypervisor": hypervisor.value,
            "memory_mb": self.config.vm_config["memory_mb"],
            "security_profile": self.config.security_config,
        })

    async def run_interactive(self) -> None:
        if not self.api_gateway:
            raise RuntimeError("API gateway not initialized")

        console.print("\n" + "=" * 60)
        console.print("[bold green]Labyr VM Ready[/bold green]")
        console.print("Connected to diegetic filesystem via API gateway")
        console.print("Type 'help' for commands, 'exit' to quit")
        console.print("=" * 60 + "\n")

        while True:
            try:
                command = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: console.input("[bold cyan]labyr>[/bold cyan] ")
                )

                if command.strip().lower() in ("exit", "quit"):
                    break
                elif command.strip().lower() == "help":
                    self._show_help()
                elif command.strip().lower() == "status":
                    await self._show_status()
                elif command.strip().lower() == "explore":
                    await self._explore_labyrinth()
                elif command.strip().lower() == "map":
                    await self._show_map()
                elif command.strip().startswith("cd "):
                    await self._change_room(command[3:].strip())
                elif command.strip().lower() == "ls":
                    await self._list_artifacts()
                elif command.strip().startswith("cat "):
                    await self._read_artifact(command[4:].strip())
                elif command.strip().startswith("write "):
                    await self._write_artifact(command[6:].strip())
                elif command.strip().lower() == "audit":
                    self._show_audit_log()
                else:
                    result = await self.api_gateway.execute(command)
                    console.print(result)

            except (EOFError, KeyboardInterrupt):
                break
            except Exception as e:
                console.print(f"[red]Error:[/red] {e}")
                logger.exception("Command execution error")

        console.print("\n[yellow]Shutting down...[/yellow]")

    def _show_help(self) -> None:
        table = Table(title="Labyr Commands")
        table.add_column("Command", style="cyan")
        table.add_column("Description", style="white")

        commands = [
            ("help", "Show this help message"),
            ("status", "Show VM and labyrinth status"),
            ("explore", "Begin labyrinth exploration"),
            ("map", "Show current labyrinth map"),
            ("cd <room>", "Move to a connected room"),
            ("ls", "List artifacts in current room"),
            ("cat <artifact>", "Read an artifact (file)"),
            ("write <artifact>", "Create/modify an artifact"),
            ("audit", "Show recent audit log entries"),
            ("exit", "Shutdown and exit"),
        ]

        for cmd, desc in commands:
            table.add_row(cmd, desc)

        console.print(table)

    async def _show_status(self) -> None:
        if not self.vm_manager:
            console.print("[red]VM not running[/red]")
            return

        status = await self.vm_manager.get_status()
        table = Table(title="System Status")
        table.add_column("Component", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Details", style="white")

        table.add_row("VM", "Running", f"PID: {status.get('pid', 'N/A')}")
        table.add_row("Memory", f"{status.get('memory_used_mb', 0)} MB",
                      f"Limit: {status.get('memory_limit_mb', 0)} MB")
        table.add_row("API Gateway", "Active",
                      f"Socket: {self.config.api_config['socket_path']}")

        if self.api_gateway:
            labyrinth_status = await self.api_gateway.get_labyrinth_status()
            table.add_row("Labyrinth", "Generated",
                          f"Rooms: {labyrinth_status.get('room_count', 0)}")
            table.add_row("Current Room", labyrinth_status.get('current_room', 'Unknown'),
                          f"Depth: {labyrinth_status.get('depth', 0)}")

        console.print(table)

    async def _explore_labyrinth(self) -> None:
        if not self.api_gateway:
            return

        result = await self.api_gateway.execute("explore")
        self._render_room(result)

    async def _show_map(self) -> None:
        if not self.api_gateway:
            return

        map_data = await self.api_gateway.execute("get_map")
        self._render_map(map_data)

    async def _change_room(self, direction: str) -> None:
        if not self.api_gateway:
            return

        result = await self.api_gateway.execute(f"move {direction}")
        if result.get("success"):
            self._render_room(result.get("room", {}))
        else:
            console.print(f"[red]{result.get('message', 'Cannot move there')}[/red]")

    async def _list_artifacts(self) -> None:
        if not self.api_gateway:
            return

        artifacts = await self.api_gateway.execute("list_artifacts")
        if not artifacts:
            console.print("[dim]The room is empty...[/dim]")
            return

        table = Table(title="Artifacts in Room")
        table.add_column("Name", style="cyan")
        table.add_column("Type", style="magenta")
        table.add_column("Description", style="white")

        for artifact in artifacts:
            table.add_row(
                artifact.get("name", "Unknown"),
                artifact.get("type", "artifact"),
                artifact.get("description", ""),
            )

        console.print(table)

    async def _read_artifact(self, name: str) -> None:
        if not self.api_gateway:
            return

        result = await self.api_gateway.execute(f"read {name}")
        if result.get("success"):
            console.print(Panel(
                result.get("content", ""),
                title=f"📜 {name}",
                border_style="yellow",
            ))
        else:
            console.print(f"[red]{result.get('message', 'Artifact not found')}[/red]")

    async def _write_artifact(self, spec: str) -> None:
        if not self.api_gateway:
            return

        parts = spec.split(maxsplit=1)
        name = parts[0] if parts else spec

        content = await asyncio.get_event_loop().run_in_executor(
            None, lambda: console.input("Enter artifact content (end with empty line):\n")
        )

        lines = [content]
        while True:
            line = await asyncio.get_event_loop().run_in_executor(
                None, lambda: console.input("")
            )
            if not line:
                break
            lines.append(line)

        result = await self.api_gateway.execute(f"write {name}", "\n".join(lines))
        if result.get("success"):
            console.print(f"[green]✓[/green] Artifact '{name}' created")
            self.audit.log_event("artifact_written", {"name": name})
        else:
            console.print(f"[red]{result.get('message', 'Failed to write')}[/red]")

    def _render_room(self, room_data: dict) -> None:
        name = room_data.get("name", "Unknown Chamber")
        description = room_data.get("description", "")
        exits = room_data.get("exits", [])
        artifacts = room_data.get("artifacts", [])
        theme_data = room_data.get("theme", {})

        room_type = theme_data.get("type", "chamber")
        border_chars = {
            "chamber": ("╔", "═", "╗", "║", "╚", "╝"),
            "corridor": ("┌", "─", "┐", "│", "└", "┘"),
            "vault": ("▓", "▓", "▓", "▓", "▓", "▓"),
            "shrine": ("✦", "─", "✦", "│", "✦", "─"),
        }
        chars = border_chars.get(room_type, border_chars["chamber"])

        lines = []
        lines.append(f"{chars[0]}{chars[1] * 50}{chars[2]}")
        lines.append(f"{chars[3]}  [bold]{name}[/bold]{' ' * (48 - len(name))}{chars[3]}")
        lines.append(f"{chars[3]}{' ' * 50}{chars[3]}")

        words = description.split()
        line = f"{chars[3]}  "
        for word in words:
            if len(line) + len(word) > 48:
                lines.append(line + " " * (50 - len(line)) + chars[3])
                line = f"{chars[3]}  "
            line += word + " "
        if line.strip() != chars[3]:
            lines.append(line + " " * (50 - len(line)) + chars[3])

        lines.append(f"{chars[3]}{' ' * 50}{chars[3]}")

        if exits:
            exit_str = "Exits: " + ", ".join(exits)
            lines.append(f"{chars[3]}  [dim]{exit_str}[/dim]{' ' * (48 - len(exit_str))}{chars[3]}")

        if artifacts:
            artifact_str = "Artifacts: " + ", ".join(a.get("name", "") for a in artifacts[:5])
            if len(artifacts) > 5:
                artifact_str += f" (+{len(artifacts) - 5} more)"
            lines.append(f"{chars[3]}  [yellow]{artifact_str}[/yellow]{' ' * max(0, 48 - len(artifact_str))}{chars[3]}")

        lines.append(f"{chars[4]}{chars[1] * 50}{chars[5]}")

        console.print("\n".join(lines))

    def _render_map(self, map_data: dict) -> None:
        if not map_data or not map_data.get("rooms"):
            console.print("[dim]No map data available[/dim]")
            return

        rooms = map_data["rooms"]
        current = map_data.get("current_room", "")

        console.print("\n[bold]═══ Labyrinth Map ═══[/bold]\n")

        for room_id, room in rooms.items():
            marker = "★" if room_id == current else "○"
            connections = room.get("connections", [])
            conn_str = " → ".join(connections[:3])
            if len(connections) > 3:
                conn_str += " ..."

            console.print(
                f"  {marker} [cyan]{room.get('name', room_id)}[/cyan]"
                f" [dim]({conn_str})[/dim]"
            )

    def _show_audit_log(self) -> None:
        entries = self.audit.get_recent(20)
        if not entries:
            console.print("[dim]No audit entries[/dim]")
            return

        table = Table(title="Recent Audit Entries")
        table.add_column("Time", style="dim")
        table.add_column("Event", style="cyan")
        table.add_column("Details", style="white")

        for entry in entries:
            table.add_row(
                entry.get("timestamp", ""),
                entry.get("event", ""),
                json.dumps(entry.get("data", {}), default=str)[:60],
            )

        console.print(table)

    async def shutdown(self) -> None:
        console.print("\n[bold]Shutting down Labyr...[/bold]")

        if self.api_gateway:
            await self.api_gateway.stop()
            console.print("[green]✓[/green] API gateway stopped")

        if self.vm_manager:
            await self.vm_manager.stop()
            console.print("[green]✓[/green] VM stopped")

        self.audit.log_event("system_shutdown", {"status": "graceful"})
        console.print("[green]✓[/green] Shutdown complete")


@click.group()
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
@click.option("--config", "-c", type=click.Path(exists=True), help="Config file path")
@click.pass_context
def cli(ctx, verbose: bool, config: Optional[str]):
    """Labyr - Ephemeral Development VM with Diegetic Filesystem"""
    setup_logging(verbose)
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = Path(config) if config else None


@cli.command()
@click.option("--memory", "-m", default=512, help="VM memory in MB")
@click.option("--cpus", "-p", default=2, help="Number of vCPUs")
@click.option("--hypervisor", type=click.Choice(["firecracker", "qemu"]), default="firecracker")
@click.option("--theme", type=click.Choice(["dark_fantasy", "cosmic_horror"]), default="dark_fantasy")
@click.pass_context
def launch(ctx, memory: int, cpus: int, hypervisor: str, theme: str):
    config = LabyrConfig(ctx.obj.get("config_path"))

    config.config["vm"]["memory_mb"] = memory
    config.config["vm"]["cpus"] = cpus
    config.config["vm"]["hypervisor"] = hypervisor
    config.config["labyrinth"]["theme"] = theme

    host = LabyrHost(config)

    async def run():
        try:
            await host.initialize()
            await host.run_interactive()
        finally:
            await host.shutdown()

    asyncio.run(run())


@cli.command()
@click.argument("project_path", type=click.Path(exists=True))
@click.option("--memory", "-m", default=1024, help="VM memory in MB")
@click.pass_context
def dev(ctx, project_path: str, memory: int):
    config = LabyrConfig(ctx.obj.get("config_path"))
    config.config["vm"]["memory_mb"] = memory
    config.config["labyrinth"]["source_path"] = project_path

    host = LabyrHost(config)

    async def run():
        try:
            await host.initialize()
            await host.run_interactive()
        finally:
            await host.shutdown()

    asyncio.run(run())


@cli.command()
def status():
    console.print("[cyan]Checking Labyr VM status...[/cyan]")
    console.print("[dim]No running VMs found[/dim]")


def main():
    cli()


if __name__ == "__main__":
    main()
