#!/usr/bin/env bash
# Optional VAERU systemd installer.
# Usage: sudo scripts/install-systemd.sh [/opt/vaeru-ai] [/var/lib/vaeru]
#
# This helper installs a conservative unit that runs `vaeru daemon`.
# It does not grant network admin, raw socket, kill, ptrace, or audit control capabilities.

set -euo pipefail

INSTALL_DIR="${1:-/opt/vaeru-ai}"
VAERU_HOME="${2:-/var/lib/vaeru}"
SERVICE_PATH="/etc/systemd/system/vaeru.service"
VAERU_BIN="$(command -v vaeru || true)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root to install a systemd service." >&2
  exit 1
fi

if [[ -z "${VAERU_BIN}" ]]; then
  echo "Could not find 'vaeru' on PATH. Install first with: pip install -e ." >&2
  exit 1
fi

mkdir -p "${VAERU_HOME}/state" "${VAERU_HOME}/evidence" "${VAERU_HOME}/log"
chmod 700 "${VAERU_HOME}" "${VAERU_HOME}/state" "${VAERU_HOME}/evidence" "${VAERU_HOME}/log"

cat > "${SERVICE_PATH}" <<EOF
[Unit]
Description=VAERU defensive host observation engine
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${VAERU_BIN} --home ${VAERU_HOME} daemon --interval 2
Restart=on-failure
RestartSec=10
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=${VAERU_HOME}
CapabilityBoundingSet=
AmbientCapabilities=
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictRealtime=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vaeru.service

echo "Installed ${SERVICE_PATH}"
echo "Start with: systemctl start vaeru"
echo "Inspect with: systemctl status vaeru"
