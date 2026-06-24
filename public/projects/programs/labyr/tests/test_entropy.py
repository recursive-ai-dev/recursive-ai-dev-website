"""
Tests for Shannon Entropy Module
"""

import numpy as np
import pytest

from engine.entropy import ShannonEntropy


class TestShannonEntropy:
    def test_uniform_distribution(self):
        p = np.array([0.5, 0.5])
        entropy = ShannonEntropy.discrete(p)
        assert abs(entropy - 1.0) < 1e-10

    def test_certain_outcome(self):
        p = np.array([1.0, 0.0])
        entropy = ShannonEntropy.discrete(p)
        assert entropy == 0.0

    def test_three_way_uniform(self):
        p = np.array([1/3, 1/3, 1/3])
        entropy = ShannonEntropy.discrete(p)
        expected = np.log2(3)
        assert abs(entropy - expected) < 1e-10

    def test_natural_log(self):
        p = np.array([0.5, 0.5])
        entropy = ShannonEntropy.discrete(p, base=np.e)
        assert abs(entropy - np.log(2)) < 1e-10

    def test_from_counts(self):
        counts = [50, 50]
        entropy = ShannonEntropy.from_counts(counts)
        assert abs(entropy - 1.0) < 1e-10

    def test_from_sequence(self):
        sequence = ['A', 'B', 'A', 'B', 'A', 'B']
        entropy = ShannonEntropy.from_sequence(sequence)
        assert abs(entropy - 1.0) < 1e-10

    def test_normalized_entropy(self):
        p = np.array([0.5, 0.5])
        norm_entropy = ShannonEntropy.normalized(p)
        assert abs(norm_entropy - 1.0) < 1e-10

    def test_graph_entropy(self):
        adj = np.array([
            [0, 1, 1],
            [1, 0, 1],
            [1, 1, 0],
        ])
        entropy = ShannonEntropy.graph_entropy(adj)
        assert entropy > 0

    def test_empty_distribution(self):
        p = np.array([])
        entropy = ShannonEntropy.discrete(p)
        assert entropy == 0.0

    def test_mutual_information(self):
        x = np.array([0, 0, 1, 1])
        y = np.array([0, 1, 0, 1])
        mi = ShannonEntropy.mutual_information(x, y)
        assert mi >= 0
