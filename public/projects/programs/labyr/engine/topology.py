"""
Topology Module
===============

Graph-theoretic foundations for labyrinth structure.
"""

from typing import Any, Dict, List, Optional, Tuple

import networkx as nx
import numpy as np


class LabyrinthTopology:
    @staticmethod
    def create_grid_graph(
        dimensions: int,
        size: List[int],
        connectivity: float = 1.0,
    ) -> nx.Graph:
        if dimensions == 1:
            G = nx.path_graph(size[0])
        elif dimensions == 2:
            G = nx.grid_2d_graph(size[0], size[1])
        else:
            G = nx.path_graph(size[0])
            for dim_size in size[1:]:
                H = nx.path_graph(dim_size)
                G = nx.cartesian_product(G, H)

        if connectivity < 1.0:
            edges_to_remove = []
            for u, v in G.edges():
                if np.random.random() > connectivity:
                    edges_to_remove.append((u, v))

            G.remove_edges_from(edges_to_remove)

        return G

    @staticmethod
    def ensure_connectivity(G: nx.Graph) -> nx.Graph:
        if nx.is_connected(G):
            return G

        components = list(nx.connected_components(G))
        result = G.copy()

        for i in range(len(components) - 1):
            comp1 = components[i]
            comp2 = components[i + 1]

            best_pair: Optional[Tuple[Any, Any]] = None
            best_distance = float("inf")

            for u in sorted(comp1, key=repr):
                for v in sorted(comp2, key=repr):
                    dist = LabyrinthTopology._node_distance(u, v)
                    if dist < best_distance:
                        best_distance = dist
                        best_pair = (u, v)

            if best_pair is not None:
                result.add_edge(best_pair[0], best_pair[1])

        return result

    @staticmethod
    def _node_distance(u: Any, v: Any) -> float:
        if isinstance(u, tuple) and isinstance(v, tuple) and len(u) == len(v):
            try:
                return sum(abs(int(a) - int(b)) for a, b in zip(u, v))
            except (TypeError, ValueError):
                pass

        fallback = repr((u, v)).encode()
        return float(sum((idx + 1) * value for idx, value in enumerate(fallback)))

    @staticmethod
    def diameter(G: nx.Graph) -> float:
        if not nx.is_connected(G):
            return float("inf")

        return nx.diameter(G)

    @staticmethod
    def average_path_length(G: nx.Graph) -> float:
        if not nx.is_connected(G):
            return float("inf")

        return nx.average_shortest_path_length(G)

    @staticmethod
    def clustering_coefficient(G: nx.Graph) -> float:
        return nx.average_clustering(G)

    @staticmethod
    def betweenness_centrality(G: nx.Graph) -> Dict[Any, float]:
        return nx.betweenness_centrality(G)

    @staticmethod
    def find_central_nodes(G: nx.Graph, k: int = 1) -> List[Any]:
        centrality = nx.eigenvector_centrality(G, max_iter=1000)
        sorted_nodes = sorted(centrality.items(), key=lambda x: x[1], reverse=True)
        return [node for node, _ in sorted_nodes[:k]]

    @staticmethod
    def hamiltonian_path_approximation(G: nx.Graph) -> Optional[List]:
        try:
            return nx.approximation.traveling_salesman_problem(G, cycle=False)
        except nx.NetworkXError:
            return None

    @staticmethod
    def graph_to_adjacency_matrix(G: nx.Graph) -> np.ndarray:
        return nx.to_numpy_array(G)

    @staticmethod
    def adjacency_matrix_to_graph(matrix: np.ndarray) -> nx.Graph:
        return nx.from_numpy_array(matrix)
