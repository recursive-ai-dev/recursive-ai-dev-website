//! Labyrinth Engine
//! 
//! Core maze generation using Shannon entropy for complexity modeling.

use std::collections::{HashMap, HashSet, VecDeque};

use anyhow::{Context, Result};
use petgraph::graph::{NodeIndex, UnGraph};
use rand::prelude::*;
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

use crate::LabyrinthConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub description: String,
    pub room_type: RoomType,
    pub coordinates: Vec<i32>,
    pub connections: Vec<String>,
    pub artifacts: Vec<Artifact>,
    pub visited: bool,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RoomType {
    Chamber,
    Corridor,
    Vault,
    Shrine,
    Crypt,
    Hall,
    Passage,
    Sanctum,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artifact {
    pub id: String,
    pub name: String,
    pub artifact_type: ArtifactType,
    pub description: String,
    pub content: Option<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ArtifactType {
    Scroll,
    Tome,
    Relic,
    Key,
    Potion,
    Crystal,
    Rune,
    Sigil,
}

#[derive(Debug)]
pub struct Labyrinth {
    pub graph: UnGraph<String, ()>,
    pub rooms: HashMap<NodeIndex, Room>,
    pub room_id_to_node: HashMap<String, NodeIndex>,
    pub entrance: NodeIndex,
    pub exit: Option<NodeIndex>,
    pub dimensions: usize,
    pub size: Vec<usize>,
    pub entropy: f64,
}

pub struct LabyrinthEngine {
    config: LabyrinthConfig,
    labyrinth: Option<Labyrinth>,
    rng: ChaCha8Rng,
}

impl LabyrinthEngine {
    pub fn new(config: LabyrinthConfig) -> Result<Self> {
        if config.dimensions == 0 {
            anyhow::bail!("dimensions must be greater than zero");
        }
        if config.size.len() != config.dimensions || config.size.iter().any(|&size| size == 0) {
            anyhow::bail!("size length must match dimensions and contain positive values");
        }
        if !(0.0..=1.0).contains(&config.entropy_target) || config.entropy_target == 0.0 {
            anyhow::bail!("entropy_target must be between 0 and 1");
        }

        let seed = config.seed.unwrap_or_else(|| {
            let mut rng = thread_rng();
            rng.gen()
        });

        let mut engine = Self {
            config,
            labyrinth: None,
            rng: ChaCha8Rng::seed_from_u64(seed),
        };

        engine.generate()?;

        Ok(engine)
    }

    pub fn generate(&mut self) -> Result<()> {
        let dimensions = self.config.dimensions;
        let size = self.config.size.clone();

        let mut graph = UnGraph::new_undirected();
        let mut rooms = HashMap::new();
        let mut room_id_to_node = HashMap::new();
        let mut coordinates_to_node = HashMap::new();

        let total_rooms = size.iter().product::<usize>();
        
        let mut strides = vec![1; dimensions];
        for i in (0..dimensions - 1).rev() {
            strides[i] = strides[i + 1] * size[i + 1];
        }

        for idx in 0..total_rooms {
            let mut coordinates = vec![0; dimensions];
            let mut remaining = idx;
            for (i, &stride) in strides.iter().enumerate() {
                coordinates[i] = remaining / stride;
                remaining %= stride;
            }

            let room_id = format!("room_{}", idx);
            let room = self.generate_room(&room_id, &coordinates);
            let node = graph.add_node(room_id.clone());
            
            rooms.insert(node, room);
            room_id_to_node.insert(room_id.clone(), node);
            coordinates_to_node.insert(coordinates.clone(), node);
        }

        for idx in 0..total_rooms {
            let mut coordinates = vec![0; dimensions];
            let mut remaining = idx;
            for (i, &stride) in strides.iter().enumerate() {
                coordinates[i] = remaining / stride;
                remaining %= stride;
            }

            let current_node = coordinates_to_node[&coordinates];

            for dim in 0..dimensions {
                if coordinates[dim] + 1 < size[dim] {
                    let mut neighbor_coords = coordinates.clone();
                    neighbor_coords[dim] += 1;
                    
                    if let Some(&neighbor_node) = coordinates_to_node.get(&neighbor_coords) {
                        let should_connect = self.rng.gen_bool(
                            0.5 + self.config.entropy_target * 0.5
                        );
                        
                        if should_connect {
                            graph.add_edge(current_node, neighbor_node, ());
                            
                            let current_room = rooms.get_mut(&current_node).unwrap();
                            let neighbor_id = format!("room_{}", 
                                neighbor_coords.iter().enumerate()
                                    .map(|(i, &c)| c * strides[i])
                                    .sum::<usize>()
                            );
                            current_room.connections.push(neighbor_id.clone());

                            let neighbor_room = rooms.get_mut(&neighbor_node).unwrap();
                            let current_id = format!("room_{}", idx);
                            neighbor_room.connections.push(current_id);
                        }
                    }
                }
            }
        }

        self.ensure_connectivity(&mut graph, &mut rooms, &room_id_to_node);

        let entropy = self.calculate_entropy(&graph);

        let entrance = *room_id_to_node.get("room_0").unwrap();
        rooms.get_mut(&entrance).unwrap().name = "The Entrance Hall".to_string();
        rooms.get_mut(&entrance).unwrap().room_type = RoomType::Hall;

        self.labyrinth = Some(Labyrinth {
            graph,
            rooms,
            room_id_to_node,
            entrance,
            exit: None,
            dimensions,
            size,
            entropy,
        });

        Ok(())
    }

    fn generate_room(&mut self, id: &str, coordinates: &[i32]) -> Room {
        let room_types = [
            RoomType::Chamber,
            RoomType::Corridor,
            RoomType::Vault,
            RoomType::Shrine,
            RoomType::Crypt,
            RoomType::Hall,
            RoomType::Passage,
            RoomType::Sanctum,
        ];

        let room_type = room_types[self.rng.gen_range(0..room_types.len())].clone();

        let prefixes = [
            "Ancient", "Forgotten", "Cursed", "Blessed",
            "Shadowed", "Illuminated", "Hidden", "Sacred",
            "Crumbling", "Gleaming", "Whispering", "Echoing",
        ];

        let suffixes = match room_type {
            RoomType::Chamber => ["Chamber", "Room", "Cell", "Hollow"],
            RoomType::Corridor => ["Corridor", "Passage", "Tunnel", "Way"],
            RoomType::Vault => ["Vault", "Treasury", "Cache", "Depository"],
            RoomType::Shrine => ["Shrine", "Altar", "Sanctum", "Hallowed Ground"],
            RoomType::Crypt => ["Crypt", "Tomb", "Sepulcher", "Burial Chamber"],
            RoomType::Hall => ["Hall", "Gallery", "Great Room", "Atrium"],
            RoomType::Passage => ["Passage", "Tunnel", "Corridor", "Path"],
            RoomType::Sanctum => ["Sanctum", "Inner Chamber", "Holy Place", "Retreat"],
        };

        let prefix = prefixes[self.rng.gen_range(0..prefixes.len())];
        let suffix = suffixes[self.rng.gen_range(0..suffixes.len())];

        let description = self.generate_description(&room_type);

        let mut artifacts = Vec::new();
        if self.rng.gen_bool(0.3) {
            artifacts.push(self.generate_artifact());
        }

        Room {
            id: id.to_string(),
            name: format!("{} {}", prefix, suffix),
            description,
            room_type,
            coordinates: coordinates.to_vec(),
            connections: Vec::new(),
            artifacts,
            visited: false,
            metadata: HashMap::new(),
        }
    }

    fn generate_description(&mut self, room_type: &RoomType) -> String {
        let descriptions = match room_type {
            RoomType::Chamber => vec![
                "A circular chamber carved from dark stone, its walls etched with ancient runes.",
                "The room opens before you, shadows dancing in the flickering torchlight.",
                "Stone pillars rise to meet a vaulted ceiling lost in darkness above.",
            ],
            RoomType::Corridor => vec![
                "A narrow passage stretches before you, its end lost in shadow.",
                "The corridor twists and turns, following no clear path.",
                "Cold stone walls press close on either side of this winding passage.",
            ],
            RoomType::Vault => vec![
                "A secure vault, its reinforced door standing ajar.",
                "Shelves line the walls of this treasure room, some still bearing their cargo.",
                "The air shimmers with residual protective magic.",
            ],
            RoomType::Shrine => vec![
                "An altar of polished obsidian dominates this sacred space.",
                "Candles burn with unnatural fire, casting prismatic light.",
                "The air hums with ancient power, the walls covered in devotional script.",
            ],
            RoomType::Crypt => vec![
                "Stone sarcophagi line the walls, their occupants long departed.",
                "The air is thick with the dust of ages and the silence of the dead.",
                "Funeral offerings crumble on carved shelves, undisturbed for millennia.",
            ],
            RoomType::Hall => vec![
                "A great hall stretches before you, its ceiling supported by massive columns.",
                "Echoes of forgotten gatherings linger in this grand space.",
                "Banners hang in tatters from iron rods, their heraldry unrecognizable.",
            ],
            RoomType::Passage => vec![
                "A simple passage connects this place to others beyond.",
                "The worn floor stones speak of countless feet that passed this way.",
                "Drafts from unseen sources carry whispers from distant rooms.",
            ],
            RoomType::Sanctum => vec![
                "A private retreat, shielded from the world by thick walls and powerful wards.",
                "The room radiates an aura of profound peace and ancient power.",
                "Soft light emanates from crystal formations embedded in the walls.",
            ],
        };

        let desc_list = descriptions.get(room_type).unwrap_or(&descriptions[0]);
        desc_list[self.rng.gen_range(0..desc_list.len())].to_string()
    }

    fn generate_artifact(&mut self) -> Artifact {
        let artifact_types = [
            ArtifactType::Scroll,
            ArtifactType::Tome,
            ArtifactType::Relic,
            ArtifactType::Key,
            ArtifactType::Crystal,
            ArtifactType::Rune,
        ];

        let names = [
            "of Shadows", "of Light", "of Forgotten Ages", "of Power",
            "of Wisdom", "of Seeking", "of Binding", "of Revealing",
        ];

        let artifact_type = artifact_types[self.rng.gen_range(0..artifact_types.len())].clone();
        let name_suffix = names[self.rng.gen_range(0..names.len())];

        let base_name = match artifact_type {
            ArtifactType::Scroll => "Scroll",
            ArtifactType::Tome => "Tome",
            ArtifactType::Relic => "Relic",
            ArtifactType::Key => "Key",
            ArtifactType::Crystal => "Crystal",
            ArtifactType::Rune => "Rune Stone",
            _ => "Artifact",
        };

        Artifact {
            id: format!("artifact_{}", self.rng.gen::<u32>()),
            name: format!("{} {}", base_name, name_suffix),
            artifact_type,
            description: format!("A mysterious {} that radiates ancient power.", base_name),
            content: None,
            metadata: HashMap::new(),
        }
    }

    fn ensure_connectivity(
        &self,
        graph: &mut UnGraph<String, ()>,
        rooms: &mut HashMap<NodeIndex, Room>,
        room_id_to_node: &HashMap<String, NodeIndex>,
    ) {
        let entrance = *room_id_to_node.get("room_0").unwrap();
        
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(entrance);
        visited.insert(entrance);

        while let Some(node) = queue.pop_front() {
            for neighbor in graph.neighbors(node) {
                if visited.insert(neighbor) {
                    queue.push_back(neighbor);
                }
            }
        }

        let all_nodes: Vec<NodeIndex> = graph.node_indices().collect();
        let mut components: Vec<Vec<NodeIndex>> = Vec::new();
        let mut processed = HashSet::new();

        for &start in &all_nodes {
            if processed.contains(&start) {
                continue;
            }

            let mut component = Vec::new();
            let mut queue = VecDeque::new();
            queue.push_back(start);
            processed.insert(start);

            while let Some(node) = queue.pop_front() {
                component.push(node);
                for neighbor in graph.neighbors(node) {
                    if processed.insert(neighbor) {
                        queue.push_back(neighbor);
                    }
                }
            }

            components.push(component);
        }

        if components.len() > 1 {
            let main_component = &components[0];
            for component in components.iter().skip(1) {
                let mut best_distance = usize::MAX;
                let mut best_pair = (main_component[0], component[0]);

                for &n1 in main_component {
                    let c1 = &rooms[&n1].coordinates;
                    for &n2 in component {
                        let c2 = &rooms[&n2].coordinates;
                        let distance: usize = c1.iter()
                            .zip(c2.iter())
                            .map(|(&a, &b)| (a as i32 - b as i32).unsigned_abs() as usize)
                            .sum();

                        if distance < best_distance {
                            best_distance = distance;
                            best_pair = (n1, n2);
                        }
                    }
                }

                graph.add_edge(best_pair.0, best_pair.1, ());

                let id0 = rooms[&best_pair.0].id.clone();
                let id1 = rooms[&best_pair.1].id.clone();
                rooms.get_mut(&best_pair.0).unwrap().connections.push(id1);
                rooms.get_mut(&best_pair.1).unwrap().connections.push(id0);
            }
        }
    }

    pub fn calculate_entropy(&self, graph: &UnGraph<String, ()>) -> f64 {
        let node_count = graph.node_count() as f64;
        if node_count == 0.0 {
            return 0.0;
        }

        let mut degree_counts: HashMap<usize, usize> = HashMap::new();
        for node in graph.node_indices() {
            let degree = graph.neighbors(node).count();
            *degree_counts.entry(degree).or_insert(0) += 1;
        }

        let mut entropy = 0.0;
        for &count in degree_counts.values() {
            let p = count as f64 / node_count;
            if p > 0.0 {
                entropy -= p * p.log2();
            }
        }

        let max_entropy = (degree_counts.len() as f64).log2();
        if max_entropy > 0.0 {
            entropy / max_entropy
        } else {
            0.0
        }
    }

    pub fn dimensions(&self) -> usize {
        self.config.dimensions
    }

    pub fn room_count(&self) -> usize {
        self.labyrinth.as_ref()
            .map(|l| l.rooms.len())
            .unwrap_or(0)
    }

    pub fn current_entropy(&self) -> f64 {
        self.labyrinth.as_ref()
            .map(|l| l.entropy)
            .unwrap_or(0.0)
    }

    pub fn labyrinth(&self) -> Option<&Labyrinth> {
        self.labyrinth.as_ref()
    }

    pub fn get_room(&self, room_id: &str) -> Option<&Room> {
        self.labyrinth.as_ref().and_then(|l| {
            l.room_id_to_node.get(room_id)
                .and_then(|&node| l.rooms.get(&node))
        })
    }

    pub fn get_room_by_node(&self, node: NodeIndex) -> Option<&Room> {
        self.labyrinth.as_ref()
            .and_then(|l| l.rooms.get(&node))
    }

    pub fn get_node(&self, room_id: &str) -> Option<NodeIndex> {
        self.labyrinth.as_ref()
            .and_then(|l| l.room_id_to_node.get(room_id).copied())
    }

    pub fn entrance(&self) -> Option<&Room> {
        self.labyrinth.as_ref()
            .and_then(|l| l.rooms.get(&l.entrance))
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.labyrinth = None;
        Ok(())
    }
}
