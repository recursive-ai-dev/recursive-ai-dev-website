/**
 * DECOMPOSITION COMPONENT: State Partitioner
 * Purpose: Divide state vectors into self-similar sub-components
 * Role: The "cell division" - creates smaller units from larger structures
 */

import { VectorAtoms } from '../primitives/vector.js';

export class StatePartitioner {
  /**
   * Divides vector into N equal parts
   */
  static equalPartition(state, numPartitions = 2) {
    const partitionSize = Math.ceil(state.length / numPartitions);
    const partitions = [];

    for (let i = 0; i < numPartitions; i++) {
      const start = i * partitionSize;
      const end = Math.min(start + partitionSize, state.length);
      const partition = state.slice(start, end);
      partitions.push(partition);
    }

    return partitions;
  }

  /**
   * Divides vector based on magnitude clusters
   */
  static magnitudePartition(state, numPartitions = 3) {
    // Sort indices by magnitude
    const indexed = Array.from(state).map((val, idx) => ({
      value: Math.abs(val),
      index: idx
    }));

    indexed.sort((a, b) => b.value - a.value);

    // Divide into partitions
    const partitionSize = Math.ceil(indexed.length / numPartitions);
    const partitions = [];

    for (let i = 0; i < numPartitions; i++) {
      const start = i * partitionSize;
      const end = Math.min(start + partitionSize, indexed.length);
      const partitionIndices = indexed.slice(start, end).map(item => item.index);

      // Extract values at these indices
      const partition = new Float64Array(partitionIndices.length);
      partitionIndices.forEach((idx, i) => {
        partition[i] = state[idx];
      });

      partitions.push({
        values: partition,
        indices: partitionIndices
      });
    }

    return partitions;
  }

  /**
   * Divides vector into overlapping windows
   */
  static overlappingPartition(state, windowSize, overlap = 0.5) {
    const stride = Math.floor(windowSize * (1 - overlap));
    const partitions = [];

    for (let start = 0; start < state.length; start += stride) {
      const end = Math.min(start + windowSize, state.length);
      const partition = state.slice(start, end);

      if (partition.length >= windowSize * 0.5) {
        partitions.push({
          values: partition,
          start,
          end
        });
      }
    }

    return partitions;
  }

  /**
   * Divides vector hierarchically (multi-level)
   */
  static hierarchicalPartition(state, levels = 2, branchingFactor = 2) {
    const hierarchy = [{
      level: 0,
      partitions: [state]
    }];

    let currentLevel = [state];

    for (let level = 1; level <= levels; level++) {
      const nextLevel = [];

      for (let partition of currentLevel) {
        const subPartitions = StatePartitioner.equalPartition(partition, branchingFactor);
        nextLevel.push(...subPartitions);
      }

      hierarchy.push({
        level,
        partitions: nextLevel
      });

      currentLevel = nextLevel;
    }

    return hierarchy;
  }

  /**
   * Divides based on value sign (positive/negative/zero)
   */
  static signPartition(state) {
    const positive = [];
    const negative = [];
    const zero = [];

    const positiveIndices = [];
    const negativeIndices = [];
    const zeroIndices = [];

    for (let i = 0; i < state.length; i++) {
      if (state[i] > 0) {
        positive.push(state[i]);
        positiveIndices.push(i);
      } else if (state[i] < 0) {
        negative.push(state[i]);
        negativeIndices.push(i);
      } else {
        zero.push(state[i]);
        zeroIndices.push(i);
      }
    }

    return [
      { values: Float64Array.from(positive), indices: positiveIndices, sign: 'positive' },
      { values: Float64Array.from(negative), indices: negativeIndices, sign: 'negative' },
      { values: Float64Array.from(zero), indices: zeroIndices, sign: 'zero' }
    ].filter(p => p.values.length > 0);
  }

  /**
   * Divides based on frequency components (like FFT)
   */
  static frequencyPartition(state, numBands = 3) {
    const partitions = [];
    const bandSize = Math.ceil(state.length / numBands);

    for (let band = 0; band < numBands; band++) {
      const start = band * bandSize;
      const end = Math.min(start + bandSize, state.length);

      // Extract band and apply frequency-specific weighting
      const partition = new Float64Array(end - start);
      for (let i = start; i < end; i++) {
        // High bands get different weighting
        const weight = Math.cos((i - start) / (end - start) * Math.PI * band);
        partition[i - start] = state[i] * weight;
      }

      partitions.push({
        values: partition,
        band,
        start,
        end
      });
    }

    return partitions;
  }

  /**
   * Adaptive partitioning based on local variance
   */
  static adaptivePartition(state, targetPartitions = 4) {
    // Compute local variance
    const windowSize = 3;
    const variances = [];

    for (let i = 0; i < state.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(state.length, i + Math.floor(windowSize / 2) + 1);
      const window = Array.from(state.slice(start, end));

      const mean = window.reduce((sum, v) => sum + v, 0) / window.length;
      const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / window.length;

      variances.push({ index: i, variance });
    }

    // Find split points at high variance regions
    variances.sort((a, b) => b.variance - a.variance);
    const splitPoints = variances.slice(0, targetPartitions - 1)
      .map(v => v.index)
      .sort((a, b) => a - b);

    // Create partitions
    const partitions = [];
    let prevSplit = 0;

    for (let split of splitPoints) {
      partitions.push(state.slice(prevSplit, split));
      prevSplit = split;
    }
    partitions.push(state.slice(prevSplit));

    return partitions;
  }

  /**
   * Merges partitions back into single vector
   */
  static mergePartitions(partitions) {
    // Determine total length
    let totalLength = 0;
    for (let partition of partitions) {
      const values = partition.values || partition;
      totalLength += values.length;
    }

    // Concatenate
    const merged = new Float64Array(totalLength);
    let offset = 0;

    for (let partition of partitions) {
      const values = partition.values || partition;
      merged.set(values, offset);
      offset += values.length;
    }

    return merged;
  }

  /**
   * Merges with weighted blending at boundaries
   */
  static smoothMerge(partitions, blendWidth = 2) {
    const merged = StatePartitioner.mergePartitions(partitions);

    // Smooth boundaries
    let offset = 0;
    for (let i = 0; i < partitions.length - 1; i++) {
      const values = partitions[i].values || partitions[i];
      offset += values.length;

      // Blend region around boundary
      for (let j = 0; j < blendWidth && offset - blendWidth + j >= 0 && offset + j < merged.length; j++) {
        const weight = j / blendWidth;
        merged[offset + j] = merged[offset - blendWidth + j] * (1 - weight) +
          merged[offset + j] * weight;
      }
    }

    return merged;
  }

  /**
   * Merges indexed partitions (from magnitude or sign partitioning)
   */
  static mergeIndexedPartitions(partitions, originalLength) {
    const merged = new Float64Array(originalLength);

    for (let partition of partitions) {
      for (let i = 0; i < partition.indices.length; i++) {
        const idx = partition.indices[i];
        merged[idx] = partition.values[i];
      }
    }

    return merged;
  }
}
