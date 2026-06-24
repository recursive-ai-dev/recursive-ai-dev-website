"""
File Manager Plugin
===================

Plugins for Nautilus (GNOME), Dolphin (KDE), and Thunar (XFCE) file managers.
"""

import os
import subprocess
from pathlib import Path
from typing import List, Optional


class FileManagerPlugin:
    def __init__(self):
        self.desktop_env = self._detect_desktop()

    def _detect_desktop(self) -> str:
        desktop = os.environ.get("XDG_CURRENT_DESKTOP", "").lower()
        if "gnome" in desktop:
            return "gnome"
        elif "kde" in desktop:
            return "kde"
        elif "xfce" in desktop:
            return "xfce"
        return "unknown"

    def install_plugins(self) -> List[str]:
        installed = []
        if self.desktop_env == "gnome":
            result = self._install_nautilus_plugin()
            installed.append(f"nautilus: {result}")
        elif self.desktop_env == "kde":
            result = self._install_dolphin_plugin()
            installed.append(f"dolphin: {result}")
        elif self.desktop_env == "xfce":
            result = self._install_thunar_plugin()
            installed.append(f"thunar: {result}")
        return installed

    def _install_nautilus_plugin(self) -> str:
        scripts_dir = Path.home() / ".local/share/nautilus/scripts"
        scripts_dir.mkdir(parents=True, exist_ok=True)

        script = scripts_dir / "Explore in Labyr"
        script.write_text(
            "#!/bin/bash\n"
            "# Nautilus script - Explore selected directory in Labyr\n"
            'if [ -n "$NAUTILUS_SCRIPT_SELECTED_FILE_PATHS" ]; then\n'
            '    while IFS= read -r path; do\n'
            '        if [ -d "$path" ]; then\n'
            '            labyr dev "$path"\n'
            '            exit 0\n'
            '        fi\n'
            "    done <<< \"$NAUTILUS_SCRIPT_SELECTED_FILE_PATHS\"\n"
            "fi\n"
        )
        script.chmod(0o755)

        return f"Installed Nautilus script at {script}"

    def _install_dolphin_plugin(self) -> str:
        services_dir = Path.home() / ".local/share/kio/servicemenus"
        services_dir.mkdir(parents=True, exist_ok=True)

        desktop = services_dir / "labyr-explore.desktop"
        desktop.write_text(
            "[Desktop Entry]\n"
            "Type=Service\n"
            "ServiceTypes=KonqPopupMenu/Plugin\n"
            "MimeType=inode/directory;\n"
            "Actions=exploreInLabyr;\n"
            "\n"
            "[Desktop Action exploreInLabyr]\n"
            "Name=Explore in Labyr\n"
            "Icon=folder-drag-accept\n"
            "Exec=labyr dev %u\n"
        )

        return f"Installed Dolphin service menu at {desktop}"

    def _install_thunar_plugin(self) -> str:
        uca_dir = Path.home() / ".config/Thunar"
        uca_dir.mkdir(parents=True, exist_ok=True)

        uca_file = uca_dir / "uca.xml"
        if uca_file.exists():
            mode = "a"
        else:
            mode = "w"
            uca_file.write_text(
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<actions>\n'
                '</actions>\n'
            )

        import xml.etree.ElementTree as ET
        tree = ET.parse(str(uca_file))
        root = tree.getroot()

        action = ET.SubElement(root, "action")
        if any(
            existing.findtext("name") == "Explore in Labyr"
            for existing in root.findall("action")
        ):
            return f"Thunar custom action already installed at {uca_file}"

        ET.SubElement(action, "icon").text = "folder"
        ET.SubElement(action, "name").text = "Explore in Labyr"
        ET.SubElement(action, "submenu").text = "Labyr"
        ET.SubElement(action, "command").text = "labyr dev %f"
        ET.SubElement(action, "description").text = "Open directory in Labyr diegetic filesystem"
        ET.SubElement(action, "patterns").text = "*"
        ET.SubElement(action, "directories").text = "1"

        tree.write(str(uca_file), encoding="UTF-8", xml_declaration=True)

        return f"Installed Thunar custom action at {uca_file}"

    def explore_directory(self, path: str) -> None:
        target = Path(path).expanduser().resolve()
        if not target.is_dir():
            raise ValueError(f"Not a directory: {target}")

        subprocess.Popen(
            ["labyr", "dev", str(target)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
