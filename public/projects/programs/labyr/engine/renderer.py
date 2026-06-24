"""
Labyrinth Renderer
==================

Visual representation of labyrinth structures in multiple formats.
"""

from typing import Tuple

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np

from .labyrinth import LabyrinthConfig, LabyrinthGenerator
from .topology import LabyrinthTopology


class LabyrinthRenderer:
    def __init__(self, generator: LabyrinthGenerator):
        self.generator = generator

    def render_matplotlib(self, figsize: Tuple[int, int] = (12, 12)) -> plt.Figure:
        if self.generator.graph is None:
            raise ValueError("Generate labyrinth first")

        G = self.generator.graph
        fig, ax = plt.subplots(1, 1, figsize=figsize)

        if self.generator.config.dimensions == 2:
            pos = {node: (node[1], -node[0]) for node in G.nodes()}
        else:
            pos = nx.spring_layout(G, seed=42)

        nx.draw_networkx_nodes(G, pos, ax=ax, node_size=50, node_color="#1a1a2e")
        nx.draw_networkx_edges(G, pos, ax=ax, edge_color="#4a4a6a", width=1)

        first_node = list(G.nodes())[0]
        nx.draw_networkx_nodes(
            G,
            pos,
            ax=ax,
            nodelist=[first_node],
            node_size=150,
            node_color="#00ff88",
        )

        ax.set_title(
            f"Labyrinth | Entropy: {self.generator.entropy:.3f} | "
            f"Nodes: {G.number_of_nodes()} | Edges: {G.number_of_edges()}",
            fontsize=14, fontweight="bold",
        )
        ax.axis("off")

        return fig

    def render_colored_by_centrality(
        self,
        figsize: Tuple[int, int] = (12, 12),
    ) -> plt.Figure:
        if self.generator.graph is None:
            raise ValueError("Generate labyrinth first")

        G = self.generator.graph
        fig, ax = plt.subplots(1, 1, figsize=figsize)

        centrality = nx.eigenvector_centrality(G, max_iter=1000)
        node_colors = [centrality.get(n, 0) for n in G.nodes()]

        if self.generator.config.dimensions == 2:
            pos = {node: (node[1], -node[0]) for node in G.nodes()}
        else:
            pos = nx.spring_layout(G, seed=42)

        nodes = nx.draw_networkx_nodes(
            G, pos, ax=ax,
            node_size=60, node_color=node_colors,
            cmap=plt.cm.plasma,
        )
        nx.draw_networkx_edges(G, pos, ax=ax, edge_color="#4a4a6a", width=0.5)

        plt.colorbar(nodes, ax=ax, label="Eigenvector Centrality")
        ax.set_title("Labyrinth - Centrality Heatmap", fontsize=14, fontweight="bold")
        ax.axis("off")

        return fig

    def render_degree_histogram(self, figsize: Tuple[int, int] = (8, 5)) -> plt.Figure:
        if self.generator.graph is None:
            raise ValueError("Generate labyrinth first")

        G = self.generator.graph
        degrees = [d for _, d in G.degree()]
        fig, ax = plt.subplots(1, 1, figsize=figsize)

        ax.hist(
            degrees,
            bins=range(min(degrees), max(degrees) + 2),
            alpha=0.7,
            color="#4a4a6a",
            edgecolor="#1a1a2e",
        )

        ax.set_xlabel("Degree")
        ax.set_ylabel("Frequency")
        ax.set_title(f"Degree Distribution | Entropy: {self.generator.entropy:.3f}")

        return fig

    def render_entropy_heatmap(self, figsize: Tuple[int, int] = (10, 8)) -> plt.Figure:
        if self.generator.graph is None:
            raise ValueError("Generate labyrinth first")

        if self.generator.config.dimensions != 2:
            raise ValueError("Heatmap only supports 2D labyrinths")

        G = self.generator.graph
        rows, cols = self.generator.config.size

        heatmap = np.zeros((rows, cols))
        for node in G.nodes():
            r, c = node
            heatmap[r, c] = G.degree(node)

        fig, ax = plt.subplots(1, 1, figsize=figsize)
        im = ax.imshow(heatmap, cmap=plt.cm.inferno, aspect="equal")

        for r in range(rows):
            for c in range(cols):
                ax.text(c, r, int(heatmap[r, c]), ha="center", va="center", color="white", fontsize=8)

        plt.colorbar(im, ax=ax, label="Degree")
        ax.set_title("Labyrinth - Degree Heatmap", fontsize=14, fontweight="bold")

        return fig

    def ascii_map(self) -> str:
        return self.generator.visualize_ascii()

    def metrics_report(self) -> str:
        metrics = self.generator.calculate_metrics()
        lines = [
            "=" * 50,
            "Labyrinth Metrics Report",
            "=" * 50,
            f"  Nodes:           {metrics['nodes']}",
            f"  Edges:           {metrics['edges']}",
            f"  Entropy:         {metrics['entropy']:.4f}",
            f"  Diameter:        {metrics['diameter']}",
            f"  Avg Path Length: {metrics['avg_path_length']:.2f}",
            f"  Clustering:      {metrics['clustering']:.4f}",
            f"  Connected:       {metrics['connected']}",
            f"  Density:         {metrics['density']:.6f}",
            "=" * 50,
        ]
        return "\n".join(lines)
