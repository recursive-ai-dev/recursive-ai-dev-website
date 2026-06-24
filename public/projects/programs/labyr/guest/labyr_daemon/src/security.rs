//! Security Module
//! 
//! Applies security restrictions to the daemon process.

use anyhow::{Context, Result};
use log::{info, warn};

pub struct SecurityContext;

impl SecurityContext {
    pub fn initialize() -> Result<Self> {
        info!("Initializing security context...");

        Self::apply_seccomp()?;
        Self::drop_capabilities()?;
        Self::apply_limits()?;

        info!("Security context initialized");

        Ok(Self)
    }

    fn apply_seccomp() -> Result<()> {
        info!("Applying seccomp filter...");

        #[cfg(target_os = "linux")]
        {
            info!("Seccomp filter would be applied here (linux)");
        }

        #[cfg(not(target_os = "linux"))]
        {
            warn!("Seccomp not available on this platform");
        }

        Ok(())
    }

    fn drop_capabilities() -> Result<()> {
        info!("Dropping capabilities...");

        #[cfg(target_os = "linux")]
        {
            use caps::{CapSet, Capability, Current};

            let caps_to_drop = [
                Capability::CAP_SYS_ADMIN,
                Capability::CAP_SYS_PTRACE,
                Capability::CAP_SYS_MODULE,
                Capability::CAP_SYS_RAWIO,
                Capability::CAP_SYS_BOOT,
                Capability::CAP_SYS_TIME,
                Capability::CAP_SYS_NICE,
                Capability::CAP_SYS_RESOURCE,
                Capability::CAP_MKNOD,
                Capability::CAP_AUDIT_WRITE,
                Capability::CAP_AUDIT_CONTROL,
                Capability::CAP_SETFCAP,
                Capability::CAP_MAC_OVERRIDE,
                Capability::CAP_MAC_ADMIN,
                Capability::CAP_NET_ADMIN,
                Capability::CAP_NET_RAW,
                Capability::CAP_IPC_LOCK,
                Capability::CAP_IPC_OWNER,
                Capability::CAP_LEASE,
                Capability::CAP_DAC_OVERRIDE,
                Capability::CAP_DAC_READ_SEARCH,
                Capability::CAP_FOWNER,
                Capability::CAP_FSETID,
                Capability::CAP_KILL,
                Capability::CAP_SETGID,
                Capability::CAP_SETUID,
                Capability::CAP_SETPCAP,
                Capability::CAP_LINUX_IMMUTABLE,
                Capability::CAP_NET_BROADCAST,
                Capability::CAP_SYS_CHROOT,
                Capability::CAP_BLOCK_SUSPEND,
                Capability::CAP_WAKE_ALARM,
            ];

            for cap in caps_to_drop {
                if let Err(e) = caps::drop(None, CapSet::Effective, cap) {
                    warn!("Failed to drop capability {}: {}", cap, e);
                }
            }

            let remaining = caps::read(None, CapSet::Effective)
                .unwrap_or_default();
            info!("Remaining capabilities: {:?}", remaining);
        }

        #[cfg(not(target_os = "linux"))]
        {
            warn!("Capability dropping not available on this platform");
        }

        Ok(())
    }

    fn apply_limits() -> Result<()> {
        info!("Applying resource limits...");

        #[cfg(target_os = "linux")]
        {
            use nix::sys::resource::{setrlimit, Resource};

            setrlimit(Resource::RLIMIT_AS, 512 * 1024 * 1024, 512 * 1024 * 1024)
                .context("Failed to set RLIMIT_AS")?;

            setrlimit(Resource::RLIMIT_NOFILE, 64, 64)
                .context("Failed to set RLIMIT_NOFILE")?;

            setrlimit(Resource::RLIMIT_NPROC, 1, 1)
                .context("Failed to set RLIMIT_NPROC")?;

            setrlimit(Resource::RLIMIT_CORE, 0, 0)
                .context("Failed to set RLIMIT_CORE")?;

            info!("Resource limits applied");
        }

        Ok(())
    }
}
