"""
Desktop Integration
===================

Main integration module for desktop environment hooks.
"""

import os
from pathlib import Path
from typing import Optional

from ..diegetic.filesystem import DiegeticFilesystem


class DesktopIntegration:
    def __init__(self, theme: str = "dark_fantasy"):
        self.theme = theme
        self.fs: Optional[DiegeticFilesystem] = None
        self.desktop_env = self._detect_desktop()

    def _detect_desktop(self) -> str:
        desktop = os.environ.get("XDG_CURRENT_DESKTOP", "").lower()

        if "gnome" in desktop:
            return "gnome"
        elif "kde" in desktop:
            return "kde"
        elif "xfce" in desktop:
            return "xfce"
        elif "mate" in desktop:
            return "mate"
        else:
            return "unknown"

    def integrate(self, path: Path) -> None:
        self.fs = DiegeticFilesystem(path, self.theme)
        self.fs.generate_from_path(path)

        self._register_desktop_integration()

    def _register_desktop_integration(self) -> None:
        if self.desktop_env == "gnome":
            self._register_gnome()
        elif self.desktop_env == "kde":
            self._register_kde()

    def _register_gnome(self) -> None:
        script_dir = Path.home() / ".local/share/nautilus/scripts"
        script_dir.mkdir(parents=True, exist_ok=True)

        script_path = script_dir / "Explore in Labyrinth"
        script_path.write_text("""#!/bin/bash
# Nautilus script for Labyr integration
labyr dev "$NAUTILUS_SCRIPT_CURRENT_URI"
""")
        script_path.chmod(0o755)

    def _register_kde(self) -> None:
        service_dir = Path.home() / ".local/share/kservices5/ServiceMenus"
        service_dir.mkdir(parents=True, exist_ok=True)

        menu_path = service_dir / "labyr.desktop"
        menu_path.write_text("""[Desktop Entry]
Type=Service
ServiceTypes=KonqPopupMenu/Plugin
MimeType=inode/directory;
Actions=exploreInLabyrinth;

[Desktop Action exploreInLabyrinth]
Name=Explore in Labyrinth
Icon=folder
Exec=labyr dev %u
""")
