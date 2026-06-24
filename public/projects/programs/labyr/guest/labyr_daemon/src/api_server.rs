//! API Server Module
//! 
//! Provides the single entry point API via Unix socket.

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{Context, Result};
use log::{error, info};
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{UnixListener, UnixStream};

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ApiRequest {
    pub id: String,
    pub command: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub id: String,
    pub success: bool,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub struct ApiServer {
    socket_path: PathBuf,
    state: Arc<AppState>,
}

impl ApiServer {
    pub fn new(socket_path: PathBuf, state: Arc<AppState>) -> Self {
        Self {
            socket_path,
            state,
        }
    }

    pub async fn run(&self) -> Result<()> {
        if self.socket_path.exists() {
            tokio::fs::remove_file(&self.socket_path).await?;
        }

        let listener = UnixListener::bind(&self.socket_path)
            .context("Failed to bind Unix socket")?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o600);
            std::fs::set_permissions(&self.socket_path, perms)?;
        }

        info!("API server listening on {:?}", self.socket_path);

        loop {
            match listener.accept().await {
                Ok((stream, _)) => {
                    let state = self.state.clone();
                    tokio::spawn(async move {
                        if let Err(e) = handle_connection(stream, state).await {
                            error!("Connection error: {}", e);
                        }
                    });
                }
                Err(e) => {
                    error!("Accept error: {}", e);
                }
            }
        }

        Ok(())
    }
}

async fn handle_connection(
    mut stream: UnixStream,
    state: Arc<AppState>,
) -> Result<()> {
    loop {
        let mut length_buf = [0u8; 4];
        match stream.read_exact(&mut length_buf).await {
            Ok(_) => {}
            Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => {
                break;
            }
            Err(e) => return Err(e.into()),
        }

        let length = u32::from_be_bytes(length_buf) as usize;
        if length > 10 * 1024 * 1024 {
            return Err(anyhow::anyhow!("Message too large: {} bytes", length));
        }

        let mut message_buf = vec![0u8; length];
        stream.read_exact(&mut message_buf).await?;

        let request: ApiRequest = serde_json::from_slice(&message_buf)
            .context("Failed to parse request")?;

        info!("API request: {} - {}", request.id, request.command);

        let response = process_request(request, &state).await;

        let response_bytes = serde_json::to_vec(&response)?;
        stream.write_all(&(response_bytes.len() as u32).to_be_bytes()).await?;
        stream.write_all(&response_bytes).await?;
        stream.flush().await?;
    }

    Ok(())
}

async fn process_request(
    request: ApiRequest,
    state: &AppState,
) -> ApiResponse {
    let result = match request.command.as_str() {
        "status" => handle_status(state).await,
        "explore" => handle_explore(state).await,
        "get_map" => handle_get_map(state).await,
        "move" => handle_move(state, &request.params).await,
        "list_artifacts" => handle_list_artifacts(state).await,
        "read" => handle_read(state, &request.params).await,
        "write" => handle_write(state, &request.params).await,
        "search" => handle_search(state, &request.params).await,
        _ => Err(anyhow::anyhow!("Unknown command: {}", request.command)),
    };

    match result {
        Ok(data) => ApiResponse {
            id: request.id,
            success: true,
            result: Some(data),
            error: None,
        },
        Err(e) => ApiResponse {
            id: request.id,
            success: false,
            result: None,
            error: Some(e.to_string()),
        },
    }
}

async fn handle_status(state: &AppState) -> Result<serde_json::Value> {
    let labyrinth = state.labyrinth.read().await;
    let filesystem = state.filesystem.read().await;

    Ok(serde_json::json!({
        "status": "running",
        "labyrinth": {
            "dimensions": labyrinth.dimensions(),
            "room_count": labyrinth.room_count(),
            "entropy": labyrinth.current_entropy(),
        },
        "filesystem": {
            "current_room": filesystem.current_room_id(),
            "depth": filesystem.current_depth(),
            "artifacts_visited": filesystem.artifacts_visited(),
        },
    }))
}

async fn handle_explore(state: &AppState) -> Result<serde_json::Value> {
    let filesystem = state.filesystem.read().await;
    let room = filesystem.describe_current_room().await?;
    Ok(serde_json::to_value(room)?)
}

async fn handle_get_map(state: &AppState) -> Result<serde_json::Value> {
    let filesystem = state.filesystem.read().await;
    let map = filesystem.get_map().await?;
    Ok(serde_json::to_value(map)?)
}

async fn handle_move(
    state: &AppState,
    params: &serde_json::Value,
) -> Result<serde_json::Value> {
    let direction = params.get("direction")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Missing 'direction' parameter"))?;

    let mut filesystem = state.filesystem.write().await;
    let room = filesystem.move_to(direction).await?;
    Ok(serde_json::to_value(room)?)
}

async fn handle_list_artifacts(state: &AppState) -> Result<serde_json::Value> {
    let filesystem = state.filesystem.read().await;
    let artifacts = filesystem.list_artifacts().await?;
    Ok(serde_json::to_value(artifacts)?)
}

async fn handle_read(
    state: &AppState,
    params: &serde_json::Value,
) -> Result<serde_json::Value> {
    let name = params.get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Missing artifact name"))?;

    let filesystem = state.filesystem.read().await;
    let content = filesystem.read_artifact(name).await?;
    Ok(serde_json::json!({
        "success": true,
        "content": content,
    }))
}

async fn handle_write(
    state: &AppState,
    params: &serde_json::Value,
) -> Result<serde_json::Value> {
    let name = params.get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Missing artifact name"))?;

    let content = params.get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let mut filesystem = state.filesystem.write().await;
    filesystem.write_artifact(name, content).await?;
    Ok(serde_json::json!({"success": true}))
}

async fn handle_search(
    state: &AppState,
    params: &serde_json::Value,
) -> Result<serde_json::Value> {
    let query = params.get("query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Missing search query"))?;

    let filesystem = state.filesystem.read().await;
    let results = filesystem.search(query).await?;
    Ok(serde_json::to_value(results)?)
}
