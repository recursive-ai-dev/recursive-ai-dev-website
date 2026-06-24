"""
Tests for Labyrinth Engine
"""

import pytest

from engine.labyrinth import LabyrinthConfig, LabyrinthGenerator


class TestLabyrinthGenerator:
    def test_generate_small(self):
        config = LabyrinthConfig(
            dimensions=2,
            size=[4, 4],
            entropy_target=0.7,
            seed=42,
        )
        generator = LabyrinthGenerator(config)
        graph = generator.generate()

        assert graph.number_of_nodes() == 16
        assert graph.number_of_edges() > 0

    def test_connectivity(self):
        config = LabyrinthConfig(
            dimensions=2,
            size=[8, 8],
            entropy_target=0.8,
            seed=123,
        )
        generator = LabyrinthGenerator(config)
        graph = generator.generate()

        import networkx as nx
        assert nx.is_connected(graph)

    def test_metrics(self):
        config = LabyrinthConfig(
            dimensions=2,
            size=[6, 6],
            seed=42,
        )
        generator = LabyrinthGenerator(config)
        generator.generate()

        metrics = generator.calculate_metrics()

        assert "nodes" in metrics
        assert "edges" in metrics
        assert "entropy" in metrics
        assert metrics["nodes"] == 36
        assert metrics["connected"] is True

    def test_deterministic(self):
        config1 = LabyrinthConfig(dimensions=2, size=[4, 4], seed=42)
        config2 = LabyrinthConfig(dimensions=2, size=[4, 4], seed=42)

        gen1 = LabyrinthGenerator(config1)
        gen2 = LabyrinthGenerator(config2)

        g1 = gen1.generate()
        g2 = gen2.generate()

        assert g1.number_of_edges() == g2.number_of_edges()

    def test_visualization(self):
        config = LabyrinthConfig(
            dimensions=2,
            size=[4, 4],
            seed=42,
        )
        generator = LabyrinthGenerator(config)
        generator.generate()

        viz = generator.visualize_ascii(width=40, height=20)
        assert len(viz) > 0
        assert "┌" in viz or "│" in viz
