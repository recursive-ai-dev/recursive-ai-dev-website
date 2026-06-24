"""
Labyrinth Module
================

Core labyrinth generation using entropy-guided algorithms.
"""

import math
from typing import Dict, List, Optional, Tuple

import networkx as nx
import numpy as np

from .entropy import ShannonEntropy
from .topology import LabyrinthTopology


class LabyrinthConfig:
    def __init__(
        self,
        dimensions: int = 2,
        size: Optional[List[int]] = None,
        entropy_target: float = 0.85,
        seed: Optional[int] = None,
        min_connectivity: float = 0.3,
        max_connectivity: float = 0.8,
    ):
        self.dimensions = dimensions
        self.size = list(size or [16, 16])
        self.entropy_target = entropy_target
        self.seed = seed
        self.min_connectivity = min_connectivity
        self.max_connectivity = max_connectivity

        if not isinstance(dimensions, int) or dimensions < 1:
            raise ValueError("Dimensions must be a positive integer")
        if len(self.size) != self.dimensions:
            raise ValueError("Size must match dimensions")
        if any(not isinstance(value, int) or value < 1 for value in self.size):
            raise ValueError("Size values must be positive integers")
        if not 0 < entropy_target <= 1:
            raise ValueError("Entropy target must be in (0, 1]")
        if not 0 <= min_connectivity <= max_connectivity <= 1:
            raise ValueError("Connectivity must be in [0, 1] and min <= max")


class LabyrinthGenerator:
    def __init__(self, config: LabyrinthConfig):
        self.config = config
        self.rng = np.random.default_rng(config.seed)
        self.graph: Optional[nx.Graph] = None
        self.entropy: float = 0.0

    def generate(self) -> nx.Graph:
        G = LabyrinthTopology.create_grid_graph(
            self.config.dimensions,
            self.config.size,
            connectivity=1.0,
        )

        G = self._entropy_guided_pruning(G)

        G = LabyrinthTopology.ensure_connectivity(G)

        adj_matrix = LabyrinthTopology.graph_to_adjacency_matrix(G)
        self.entropy = ShannonEntropy.graph_entropy(adj_matrix)

        self.graph = G
        return G

    def _entropy_guided_pruning(self, G: nx.Graph) -> nx.Graph:
        result = G.copy()
        edges = list(result.edges())
        self.rng.shuffle(edges)

        for u, v in edges:
            result.remove_edge(u, v)

            if not nx.is_connected(result):
                result.add_edge(u, v)
                continue

            adj_matrix = LabyrinthTopology.graph_to_adjacency_matrix(result)
            current_entropy = ShannonEntropy.graph_entropy(adj_matrix)

            if current_entropy < self.config.entropy_target:
                result.add_edge(u, v)

        return result

    def calculate_metrics(self) -> Dict:
        if self.graph is None:
            raise ValueError("Generate labyrinth first")

        G = self.graph
        adj_matrix = LabyrinthTopology.graph_to_adjacency_matrix(G)

        return {
            "nodes": G.number_of_nodes(),
            "edges": G.number_of_edges(),
            "entropy": self.entropy,
            "diameter": LabyrinthTopology.diameter(G),
            "avg_path_length": LabyrinthTopology.average_path_length(G),
            "clustering": LabyrinthTopology.clustering_coefficient(G),
            "connected": nx.is_connected(G),
            "density": nx.density(G),
        }

    def visualize_ascii(self, width: int = 80, height: int = 40) -> str:
        if self.graph is None:
            return "No labyrinth generated"

        if self.config.dimensions != 2:
            return "ASCII visualization only supports 2D labyrinths"

        rows, cols = self.config.size

        cell_h = max(1, height // rows)
        cell_w = max(1, width // cols)

        out_h = rows * (cell_h + 1) + 1
        out_w = cols * (cell_w + 1) + 1
        grid = [[" " for _ in range(out_w)] for _ in range(out_h)]

        for r in range(rows):
            for c in range(cols):
                y = r * (cell_h + 1) + 1
                x = c * (cell_w + 1) + 1

                for dy in range(cell_h):
                    for dx in range(cell_w):
                        if 0 <= y + dy < out_h and 0 <= x + dx < out_w:
                            grid[y + dy][x + dx] = "."

                node = (r, c)

                if c < cols - 1:
                    right_node = (r, c + 1)
                    has_edge = self.graph.has_edge(node, right_node)
                    wall_char = " " if has_edge else "│"
                    for dy in range(cell_h):
                        if 0 <= y + dy < out_h and x + cell_w < out_w:
                            grid[y + dy][x + cell_w] = wall_char

                if r < rows - 1:
                    bottom_node = (r + 1, c)
                    has_edge = self.graph.has_edge(node, bottom_node)
                    wall_char = " " if has_edge else "─"
                    for dx in range(cell_w):
                        if y + cell_h < out_h and 0 <= x + dx < out_w:
                            grid[y + cell_h][x + dx] = wall_char

                if y + cell_h < out_h and x + cell_w < out_w:
                    grid[y + cell_h][x + cell_w] = "+"

        for x in range(out_w):
            if grid[0][x] == " ":
                grid[0][x] = "─"
            if grid[out_h - 1][x] == " ":
                grid[out_h - 1][x] = "─"

        for y in range(out_h):
            if grid[y][0] == " ":
                grid[y][0] = "│"
            if grid[y][out_w - 1] == " ":
                grid[y][out_w - 1] = "│"

        grid[0][0] = "┌"
        grid[0][out_w - 1] = "┐"
        grid[out_h - 1][0] = "└"
        grid[out_h - 1][out_w - 1] = "┘"

        return "\n".join("".join(row) for row in grid)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate labyrinths")
    parser.add_argument("-d", "--dimensions", type=int, default=2)
    parser.add_argument("-s", "--size", type=int, nargs="+", default=[16, 16])
    parser.add_argument("-e", "--entropy", type=float, default=0.85)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--visualize", action="store_true")

    args = parser.parse_args()

    config = LabyrinthConfig(
        dimensions=args.dimensions,
        size=args.size,
        entropy_target=args.entropy,
        seed=args.seed,
    )

    generator = LabyrinthGenerator(config)
    generator.generate()

    metrics = generator.calculate_metrics()
    print("Labyrinth Metrics:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")

    if args.visualize:
        print("\nLabyrinth Visualization:")
        print(generator.visualize_ascii())


if __name__ == "__main__":
    main()
