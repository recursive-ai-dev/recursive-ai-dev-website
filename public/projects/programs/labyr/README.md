# Labyr Project

Ephemeral VM with Diegetic Dark Fantasy Filesystem

## Architecture

```
HOST SYSTEM
  ┌─────────────────────────────────────────────┐
  │ labyr_host.py (Python Launcher)             │
  │  • rootfs Build  • Config Inject           │
  │  • VM Lifecycle  • API Gateway             │
  │  • Audit Logger  • Security Validator      │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │ HYPERVISOR LAYER                             │
  │ Firecracker (primary) / QEMU-KVM (fallback) │
  └──────────────────┬──────────────────────────┘
                     ▼
GUEST VM (RAM-ONLY)
  ┌─────────────────────────────────────────────┐
  │ INITRAMFS (Read-Only)                        │
  │  busybox / init / rcS                       │
  ├─────────────────────────────────────────────┤
  │ TMPFS OVERLAY (Writable, Ephemeral)          │
  │  /var/run  /tmp  /home/guest               │
  ├─────────────────────────────────────────────┤
  │ SINGLE ENTRY PROCESS: labyr_daemon (Rust)   │
  │  • Labyrinth Engine (Shannon Entropy Maze)  │
  │  • Diegetic Filesystem Adapter              │
  │  • API Server (Unix Socket)                 │
  └─────────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone and setup
git clone https://github.com/your-org/labyr-project.git
cd labyr-project

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Build Rust daemon
cd guest/labyr_daemon
cargo build --release
cd ../..

# Run tests
make test

# Generate demo labyrinth
make demo

# Launch VM (requires appropriate permissions)
labyr launch --memory 512 --cpus 2 --theme dark_fantasy
```

## Project Structure

```
labyr-project/
├── host/              # Host-side Python launcher
├── guest/             # Guest-side initramfs + Rust daemon
├── engine/            # Labyrinth math engine (Python)
├── diegetic/          # Diegetic filesystem framework
├── desktop/           # Desktop environment integration
└── tests/             # Test suite
```

## Security

Multiple isolation layers: namespaces, seccomp, AppArmor, capability dropping, cgroups.
