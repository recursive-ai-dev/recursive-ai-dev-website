//! Labyr Daemon - Single Entry Process
//! 
//! This is the sole entry point for the ephemeral VM guest.
//! It provides a controlled API via Unix socket with full audit logging.

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{Context, Result};
use clap::Parser;
use log::{error, info, warn};
use tokio::signal;
use tokio::sync::RwLock;

mod api_server;
mod diegetic_fs;
mod labyrinth_engine;
mod security;

use api_server::ApiServer;
use diegetic_fs::DiegeticFilesystem;
use labyrinth_engine::LabyrinthEngine;
use security::SecurityContext;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(short, long, default_value = "/var/run/labyr/api.sock")]
    socket: PathBuf,

    #[arg(short, long, default_value = "/opt/labyr/etc/labyrinth_config.json")]
    config: PathBuf,

    #[arg(short, long, default_value = "/opt/labyr/data")]
    data_dir: PathBuf,

    #[arg(short, long)]
    debug: bool,
}

pub struct AppState {
    pub labyrinth: Arc<RwLock<LabyrinthEngine>>,
    pub filesystem: Arc<RwLock<DiegeticFilesystem>>,
    pub security: Arc<SecurityContext>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    let log_level = if args.debug { "debug" } else { "info" };
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or(log_level)
    ).init();

    info!("Labyr Daemon starting...");
    info!("Socket: {:?}", args.socket);
    info!("Config: {:?}", args.config);
    info!("Data dir: {:?}", args.data_dir);

    let security = Arc::new(
        SecurityContext::initialize()
            .context("Failed to initialize security context")?
    );
    info!("Security context initialized");

    let config = load_config(&args.config).await?;
    info!("Configuration loaded: {:?}", config);

    let labyrinth = Arc::new(RwLock::new(
        LabyrinthEngine::new(config.clone())
            .context("Failed to initialize labyrinth engine")?
    ));
    info!("Labyrinth engine initialized");

    let filesystem = Arc::new(RwLock::new(
        DiegeticFilesystem::new(
            labyrinth.clone(),
            config.theme.clone(),
        ).context("Failed to initialize diegetic filesystem")?
    ));
    info!("Diegetic filesystem initialized");

    let state = Arc::new(AppState {
        labyrinth,
        filesystem,
        security,
    });

    let server = ApiServer::new(args.socket.clone(), state.clone());
    info!("Starting API server on {:?}", args.socket);

    tokio::select! {
        result = server.run() => {
            if let Err(e) = result {
                error!("API server error: {}", e);
            }
        }
        _ = signal::ctrl_c() => {
            info!("Received shutdown signal");
        }
    }

    info!("Shutting down...");
    state.labyrinth.write().await.shutdown().await?;
    
    info!("Labyr Daemon stopped");
    Ok(())
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct LabyrinthConfig {
    pub dimensions: usize,
    pub size: Vec<usize>,
    pub entropy_target: f64,
    pub seed: Option<u64>,
    pub theme: String,
}

async fn load_config(path: &PathBuf) -> Result<LabyrinthConfig> {
    let content = tokio::fs::read_to_string(path)
        .await
        .context("Failed to read config file")?;
    
    serde_json::from_str(&content)
        .context("Failed to parse config file")
}
