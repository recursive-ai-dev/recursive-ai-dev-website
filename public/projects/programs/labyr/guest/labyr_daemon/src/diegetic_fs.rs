//! Diegetic Filesystem Module
//! 
//! Maps filesystem operations to labyrinth exploration mechanics.

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::labyrinth_engine::{Artifact, LabyrinthEngine, Room, RoomType};

pub struct DiegeticFilesystem {
    engine: Arc<RwLock<LabyrinthEngine>>,
    theme: String,
    current_room_id: String,
    visited_rooms: HashMap<String, VisitedRoom>,
    artifact_contents: HashMap<String, String>,
    depth: usize,
}

#[derive(Debug, Clone)]
struct VisitedRoom {
    name: String,
    depth: usize,
    artifacts_read: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RoomDescription {
    pub id: String,
    pub name: String,
    pub description: String,
    pub room_type: String,
    pub exits: Vec<ExitInfo>,
    pub artifacts: Vec<ArtifactInfo>,
    pub theme: ThemeInfo,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExitInfo {
    pub direction: String,
    pub destination: String,
    pub locked: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ArtifactInfo {
    pub name: String,
    pub artifact_type: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ThemeInfo {
    pub room_type: String,
    pub ambient: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MapData {
    pub current_room: String,
    pub rooms: HashMap<String, MapRoom>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MapRoom {
    pub name: String,
    pub connections: Vec<String>,
    pub visited: bool,
}

impl DiegeticFilesystem {
    pub fn new(
        engine: Arc<RwLock<LabyrinthEngine>>,
        theme: String,
    ) -> Result<Self> {
        let engine_guard = engine.try_read()
            .context("Failed to read engine")?;
        
        let entrance = engine_guard.entrance()
            .context("No entrance room")?
            .clone();

        let current_room_id = entrance.id.clone();

        let mut visited_rooms = HashMap::new();
        visited_rooms.insert(
            current_room_id.clone(),
            VisitedRoom {
                name: entrance.name.clone(),
                depth: 0,
                artifacts_read: Vec::new(),
            },
        );

        drop(engine_guard);

        Ok(Self {
            engine,
            theme,
            current_room_id,
            visited_rooms,
            artifact_contents: HashMap::new(),
            depth: 0,
        })
    }

    pub fn current_room_id(&self) -> &str {
        &self.current_room_id
    }

    pub fn current_depth(&self) -> usize {
        self.depth
    }

    pub fn artifacts_visited(&self) -> usize {
        self.artifact_contents.len()
    }

    pub async fn describe_current_room(&self) -> Result<RoomDescription> {
        let engine = self.engine.read().await;
        let room = engine.get_room(&self.current_room_id)
            .context("Current room not found")?;

        let exits = self.get_exits(&engine, room);
        let artifacts = self.get_artifact_info(room);
        let theme = self.get_theme_info(room);

        Ok(RoomDescription {
            id: room.id.clone(),
            name: room.name.clone(),
            description: room.description.clone(),
            room_type: format!("{:?}", room.room_type),
            exits,
            artifacts,
            theme,
        })
    }

    fn get_exits(&self, engine: &LabyrinthEngine, room: &Room) -> Vec<ExitInfo> {
        let mut exits = Vec::new();
        let directions = ["north", "south", "east", "west", "up", "down"];

        for (i, conn_id) in room.connections.iter().enumerate() {
            let direction = if i < directions.len() {
                directions[i].to_string()
            } else {
                format!("passage_{}", i)
            };

            let destination = engine.get_room(conn_id)
                .map(|r| r.name.clone())
                .unwrap_or_else(|| "Unknown".to_string());

            exits.push(ExitInfo {
                direction,
                destination,
                locked: false,
                description: format!("A passage leading to {}", destination),
            });
        }

        exits
    }

    fn get_artifact_info(&self, room: &Room) -> Vec<ArtifactInfo> {
        room.artifacts.iter().map(|a| ArtifactInfo {
            name: a.name.clone(),
            artifact_type: format!("{:?}", a.artifact_type),
            description: a.description.clone(),
        }).collect()
    }

    fn get_theme_info(&self, room: &Room) -> ThemeInfo {
        let ambient = match room.room_type {
            RoomType::Chamber => "Flickering torchlight dances on ancient stone walls",
            RoomType::Corridor => "The passage stretches into shadow",
            RoomType::Vault => "Magical wards shimmer faintly in the air",
            RoomType::Shrine => "Candles burn with unnatural, prismatic flame",
            RoomType::Crypt => "The silence of ages fills this place",
            RoomType::Hall => "Echoes of forgotten gatherings linger here",
            RoomType::Passage => "Drafts carry whispers from distant rooms",
            RoomType::Sanctum => "An aura of profound peace fills the space",
        };

        ThemeInfo {
            room_type: format!("{:?}", room.room_type),
            ambient: ambient.to_string(),
        }
    }

    pub async fn move_to(&mut self, direction: &str) -> Result<RoomDescription> {
        let engine = self.engine.read().await;
        let room = engine.get_room(&self.current_room_id)
            .context("Current room not found")?;

        let directions = ["north", "south", "east", "west", "up", "down"];
        let direction_index = directions.iter()
            .position(|&d| d == direction)
            .context(format!("Invalid direction: {}", direction))?;

        if direction_index >= room.connections.len() {
            return Err(anyhow::anyhow!("No exit in that direction"));
        }

        let destination_id = room.connections[direction_index].clone();
        drop(engine);

        self.current_room_id = destination_id;
        self.depth += 1;

        let engine = self.engine.read().await;
        let new_room = engine.get_room(&self.current_room_id)
            .context("Destination room not found")?;

        self.visited_rooms.insert(
            self.current_room_id.clone(),
            VisitedRoom {
                name: new_room.name.clone(),
                depth: self.depth,
                artifacts_read: Vec::new(),
            },
        );

        drop(engine);

        self.describe_current_room().await
    }

    pub async fn list_artifacts(&self) -> Result<Vec<ArtifactInfo>> {
        let engine = self.engine.read().await;
        let room = engine.get_room(&self.current_room_id)
            .context("Current room not found")?;

        Ok(self.get_artifact_info(room))
    }

    pub async fn read_artifact(&mut self, name: &str) -> Result<String> {
        if let Some(content) = self.artifact_contents.get(name) {
            return Ok(content.clone());
        }

        let engine = self.engine.read().await;
        let room = engine.get_room(&self.current_room_id)
            .context("Current room not found")?;

        let artifact = room.artifacts.iter()
            .find(|a| a.name == name || a.id == name)
            .context(format!("Artifact '{}' not found in room", name))?;

        let content = artifact.content.clone().unwrap_or_else(|| {
            self.generate_artifact_content(artifact)
        });

        drop(engine);

        self.artifact_contents.insert(name.to_string(), content.clone());

        if let Some(visited) = self.visited_rooms.get_mut(&self.current_room_id) {
            visited.artifacts_read.push(name.to_string());
        }

        Ok(content)
    }

    fn generate_artifact_content(&self, artifact: &Artifact) -> String {
        match artifact.artifact_type {
            crate::labyrinth_engine::ArtifactType::Scroll => {
                format!(
                    "=== {} ===\n\n\
                    This ancient scroll bears writing in a language that shifts \
                    before your eyes. As you focus, the words become clear:\n\n\
                    'Seek the heart of the labyrinth, where light and shadow \
                    meet. There lies the truth you seek, guarded by the echoes \
                    of those who came before.'\n\n\
                    The script fades as you finish reading, the parchment \
                    crumbling to dust in your hands.",
                    artifact.name
                )
            }
            crate::labyrinth_engine::ArtifactType::Tome => {
                format!(
                    "=== {} ===\n\n\
                    A heavy tome bound in dark leather, its pages filled with \
                    meticulous illustrations and cramped handwriting.\n\n\
                    Chapter I: On the Nature of the Labyrinth\n\n\
                    The labyrinth is not merely a structure of stone and mortar. \
                    It is a living thing, shaped by the thoughts and fears of \
                    those who walk its halls. To understand the labyrinth is to \
                    understand oneself.\n\n\
                    [The remaining pages are water-damaged and illegible]",
                    artifact.name
                )
            }
            crate::labyrinth_engine::ArtifactType::Key => {
                format!(
                    "=== {} ===\n\n\
                    A key of unusual design, crafted from a metal that seems \
                    to absorb light. Strange symbols are etched along its shaft.\n\n\
                    The key feels warm to the touch, and you sense it resonating \
                    with something deeper within the labyrinth.",
                    artifact.name
                )
            }
            _ => {
                format!(
                    "=== {} ===\n\n\
                    {}",
                    artifact.name, artifact.description
                )
            }
        }
    }

    pub async fn write_artifact(&mut self, name: &str, content: &str) -> Result<()> {
        self.artifact_contents.insert(name.to_string(), content.to_string());
        Ok(())
    }

    pub async fn get_map(&self) -> Result<MapData> {
        let engine = self.engine.read().await;
        let labyrinth = engine.labyrinth()
            .context("No labyrinth")?;

        let mut rooms = HashMap::new();

        for (node, room) in &labyrinth.rooms {
            let visited = self.visited_rooms.contains_key(&room.id);
            
            rooms.insert(
                room.id.clone(),
                MapRoom {
                    name: room.name.clone(),
                    connections: room.connections.clone(),
                    visited,
                },
            );
        }

        Ok(MapData {
            current_room: self.current_room_id.clone(),
            rooms,
        })
    }

    pub async fn search(&self, query: &str) -> Result<Vec<SearchResult>> {
        let engine = self.engine.read().await;
        let labyrinth = engine.labyrinth()
            .context("No labyrinth")?;

        let mut results = Vec::new();
        let query_lower = query.to_lowercase();

        for (_, room) in &labyrinth.rooms {
            if room.name.to_lowercase().contains(&query_lower) ||
               room.description.to_lowercase().contains(&query_lower)
            {
                results.push(SearchResult {
                    result_type: "room".to_string(),
                    name: room.name.clone(),
                    location: room.id.clone(),
                    description: room.description.clone(),
                });
            }

            for artifact in &room.artifacts {
                if artifact.name.to_lowercase().contains(&query_lower) ||
                   artifact.description.to_lowercase().contains(&query_lower)
                {
                    results.push(SearchResult {
                        result_type: "artifact".to_string(),
                        name: artifact.name.clone(),
                        location: room.id.clone(),
                        description: artifact.description.clone(),
                    });
                }
            }
        }

        Ok(results)
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    pub result_type: String,
    pub name: String,
    pub location: String,
    pub description: String,
}
