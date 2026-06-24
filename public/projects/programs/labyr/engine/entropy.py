"""
Shannon Entropy Module
======================

Implements Shannon entropy calculations for labyrinth complexity modeling.

References:
    - Shannon, C. E. (1948). A Mathematical Theory of Communication.
    - Cover, T. M., & Thomas, J. A. (2006). Elements of Information Theory.
    - Wolfram, S. (2002). A New Kind of Science.
"""

import math
from collections import Counter
from typing import Any, List, Sequence, Tuple, Union

import numpy as np


class ShannonEntropy:
    @staticmethod
    def discrete(proportions: np.ndarray, base: float = 2.0) -> float:
        p = proportions[proportions > 0]

        if len(p) == 0:
            return 0.0

        if base == 2.0:
            log_func = np.log2
        elif base == math.e:
            log_func = np.log
        elif base == 10.0:
            log_func = np.log10
        else:
            log_func = lambda x: np.log(x) / np.log(base)

        return -np.sum(p * log_func(p))

    @staticmethod
    def from_counts(counts: List[int], base: float = 2.0) -> float:
        total = sum(counts)
        if total == 0:
            return 0.0

        proportions = np.array(counts) / total
        return ShannonEntropy.discrete(proportions, base)

    @staticmethod
    def from_sequence(sequence: Sequence[Any], base: float = 2.0) -> float:
        if not sequence:
            return 0.0

        counts = Counter(sequence)
        return ShannonEntropy.from_counts(list(counts.values()), base)

    @staticmethod
    def joint(
        x: np.ndarray,
        y: np.ndarray,
        base: float = 2.0,
    ) -> float:
        if len(x) != len(y):
            raise ValueError("x and y must have the same length")
        if len(x) == 0:
            return 0.0

        joint_counts = Counter(zip(x, y))
        total = len(x)
        proportions = np.array(list(joint_counts.values())) / total
        return ShannonEntropy.discrete(proportions, base)

    @staticmethod
    def conditional(
        x: np.ndarray,
        y: np.ndarray,
        base: float = 2.0,
    ) -> float:
        h_xy = ShannonEntropy.joint(x, y, base)
        h_y = ShannonEntropy.from_sequence(list(y), base)
        return h_xy - h_y

    @staticmethod
    def mutual_information(
        x: np.ndarray,
        y: np.ndarray,
        base: float = 2.0,
    ) -> float:
        h_x = ShannonEntropy.from_sequence(list(x), base)
        h_y = ShannonEntropy.from_sequence(list(y), base)
        h_xy = ShannonEntropy.joint(x, y, base)
        return h_x + h_y - h_xy

    @staticmethod
    def normalized(
        proportions: np.ndarray,
        base: float = 2.0,
    ) -> float:
        h = ShannonEntropy.discrete(proportions, base)
        n = len(proportions[proportions > 0])

        if n <= 1:
            return 0.0

        if base == 2.0:
            h_max = np.log2(n)
        elif base == math.e:
            h_max = np.log(n)
        else:
            h_max = np.log(n) / np.log(base)

        return h / h_max if h_max > 0 else 0.0

    @staticmethod
    def graph_entropy(
        adjacency_matrix: np.ndarray,
        base: float = 2.0,
    ) -> float:
        degrees = np.sum(adjacency_matrix, axis=1)
        total_degree = np.sum(degrees)

        if total_degree == 0:
            return 0.0

        proportions = degrees / total_degree
        return ShannonEntropy.discrete(proportions, base)

    @staticmethod
    def kolmogorov_complexity_estimate(data: Union[str, List]) -> float:
        import zlib

        if isinstance(data, list):
            data_str = ",".join(str(x) for x in data)
        else:
            data_str = str(data)

        original = data_str.encode()
        compressed = zlib.compress(original, 9)

        return len(compressed) / len(original) if len(original) > 0 else 0.0
