/**
 * DECOMPOSITION COMPONENT: Recursive Operator
 * Purpose: Apply operations recursively to decomposed state structures
 * Role: The "fractal processor" - self-similar operations at all scales
 */

import { VectorAtoms } from '../primitives/vector.js';
import { StatePartitioner } from './partitioner.js';

export class RecursiveOperator {
  constructor(config = {}) {
    this.maxDepth = config.maxDepth || 3;
    this.minPartitionSize = config.minPartitionSize || 4;
    this.partitionStrategy = config.partitionStrategy || 'equal';
    this.branchingFactor = config.branchingFactor || 2;
  }

  /**
   * Applies operation recursively to state and its partitions
   */
  applyRecursive(state, operation, context = {}, currentDepth = 0) {
    // Base case: max depth reached or partition too small
    if (currentDepth >= this.maxDepth || state.length <= this.minPartitionSize) {
      return operation(state, context);
    }

    // Partition the state
    const partitions = this._partition(state);

    // Recursively apply operation to each partition
    const processedPartitions = partitions.map((partition, idx) => {
      const partitionContext = {
        ...context,
        depth: currentDepth,
        partitionIndex: idx,
        totalPartitions: partitions.length
      };

      const values = partition.values || partition;

      return this.applyRecursive(
        values,
        operation,
        partitionContext,
        currentDepth + 1
      );
    });

    // Merge results
    const merged = this._merge(processedPartitions, partitions);

    // Apply operation to merged result (bottom-up)
    return operation(merged, {
      ...context,
      depth: currentDepth,
      bottomUp: true
    });
  }

  /**
   * Parallel decomposition: process all partitions "simultaneously"
   */
  applyParallel(state, operation, context = {}) {
    const partitions = this._partition(state);

    // Process all partitions independently
    const results = partitions.map((partition, idx) => {
      const values = partition.values || partition;
      return operation(values, {
        ...context,
        partitionIndex: idx
      });
    });

    // Merge results
    return this._merge(results, partitions);
  }

  /**
   * Hierarchical decomposition: process at multiple scales
   */
  applyHierarchical(state, operation, context = {}) {
    const hierarchy = StatePartitioner.hierarchicalPartition(
      state,
      this.maxDepth,
      this.branchingFactor
    );

    // Process from finest to coarsest level
    const processedLevels = [];

    for (let level = hierarchy.length - 1; level >= 0; level--) {
      const levelPartitions = hierarchy[level].partitions;

      const processedPartitions = levelPartitions.map((partition, idx) => {
        return operation(partition, {
          ...context,
          level: hierarchy[level].level,
          partitionIndex: idx
        });
      });

      processedLevels.unshift({
        level: hierarchy[level].level,
        partitions: processedPartitions
      });
    }

    // Return the coarsest (merged) result
    return processedLevels[0].partitions[0];
  }

  /**
   * Divide-and-conquer with cross-partition communication
   */
  applyWithCommunication(state, operation, context = {}) {
    const partitions = this._partition(state);

    // Initial independent processing
    let results = partitions.map((partition, idx) => {
      const values = partition.values || partition;
      return operation(values, {
        ...context,
        partitionIndex: idx,
        phase: 'local'
      });
    });

    // Communication phase: share information between partitions
    const communicatedResults = results.map((result, idx) => {
      // Get neighboring partitions
      const neighbors = [];
      if (idx > 0) neighbors.push(results[idx - 1]);
      if (idx < results.length - 1) neighbors.push(results[idx + 1]);

      // Blend with neighbors
      if (neighbors.length > 0) {
        let blended = VectorAtoms.clone(result);
        for (let neighbor of neighbors) {
          // Ensure same length
          const minLen = Math.min(blended.length, neighbor.length);
          for (let i = 0; i < minLen; i++) {
            blended[i] = (blended[i] + neighbor[i] * 0.2);
          }
        }
        return blended;
      }

      return result;
    });

    return this._merge(communicatedResults, partitions);
  }

  /**
   * Adaptive recursive depth based on partition characteristics
   */
  applyAdaptive(state, operation, context = {}) {
    return this._applyAdaptiveRecursive(state, operation, context, 0);
  }

  _applyAdaptiveRecursive(state, operation, context, depth) {
    // Compute partition complexity
    const complexity = this._computeComplexity(state);

    // Decide whether to recurse based on complexity
    const shouldRecurse = complexity > 0.5 && depth < this.maxDepth && state.length > this.minPartitionSize;

    if (!shouldRecurse) {
      return operation(state, context);
    }

    // Recurse
    const partitions = this._partition(state);
    const processedPartitions = partitions.map((partition, idx) => {
      const values = partition.values || partition;
      return this._applyAdaptiveRecursive(
        values,
        operation,
        { ...context, partitionIndex: idx },
        depth + 1
      );
    });

    return this._merge(processedPartitions, partitions);
  }

  /**
   * Wavefront processing: process partitions in sequence with dependencies
   */
  applyWavefront(state, operation, context = {}) {
    const partitions = this._partition(state);
    const results = [];

    for (let idx = 0; idx < partitions.length; idx++) {
      const values = partitions[idx].values || partitions[idx];

      // Include previous results in context
      const wavefrontContext = {
        ...context,
        partitionIndex: idx,
        previousResults: results
      };

      const result = operation(values, wavefrontContext);
      results.push(result);
    }

    return this._merge(results, partitions);
  }

  /**
   * Computes complexity score for a partition
   */
  _computeComplexity(partition) {
    // Measure variance as complexity proxy
    const mean = partition.reduce((sum, v) => sum + v, 0) / partition.length;
    const variance = partition.reduce((sum, v) => sum + (v - mean) ** 2, 0) / partition.length;

    // Normalized complexity score
    return Math.min(1, variance * 10);
  }

  /**
   * Partitions state using configured strategy
   */
  _partition(state) {
    switch (this.partitionStrategy) {
      case 'equal':
        return StatePartitioner.equalPartition(state, this.branchingFactor);

      case 'magnitude':
        return StatePartitioner.magnitudePartition(state, this.branchingFactor);

      case 'adaptive':
        return StatePartitioner.adaptivePartition(state, this.branchingFactor);

      case 'sign':
        return StatePartitioner.signPartition(state);

      case 'overlapping':
        return StatePartitioner.overlappingPartition(state, Math.floor(state.length / this.branchingFactor), 0.5);

      default:
        return StatePartitioner.equalPartition(state, this.branchingFactor);
    }
  }

  /**
   * Merges processed partitions
   */
  _merge(processedPartitions, originalPartitions) {
    // Check if indexed partitions
    if (originalPartitions[0] && originalPartitions[0].indices) {
      // Calculate original length
      let maxIndex = 0;
      for (let partition of originalPartitions) {
        for (let idx of partition.indices) {
          maxIndex = Math.max(maxIndex, idx);
        }
      }

      return StatePartitioner.mergeIndexedPartitions(
        processedPartitions.map((values, i) => ({
          values,
          indices: originalPartitions[i].indices
        })),
        maxIndex + 1
      );
    }

    // Regular merge
    return StatePartitioner.smoothMerge(processedPartitions);
  }

  /**
   * Sets new configuration
   */
  configure(config) {
    if (config.maxDepth !== undefined) this.maxDepth = config.maxDepth;
    if (config.minPartitionSize !== undefined) this.minPartitionSize = config.minPartitionSize;
    if (config.partitionStrategy !== undefined) this.partitionStrategy = config.partitionStrategy;
    if (config.branchingFactor !== undefined) this.branchingFactor = config.branchingFactor;
  }
}
