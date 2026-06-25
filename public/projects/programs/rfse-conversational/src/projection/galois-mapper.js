/**
 * PROJECTION COMPONENT: Galois-style Correspondence Mapper
 * Purpose: Create structure-preserving mappings between domains
 * Role: The "corpus callosum" - enables cross-hemispheric communication
 */

import { VectorAtoms } from '../primitives/vector.js';
import { MatrixAtoms } from '../primitives/matrix.js';
import { RelationalAtoms } from '../primitives/relations.js';

export class GaloisMapper {
  constructor(sourceDimension, targetDimension) {
    this.sourceDimension = sourceDimension;
    this.targetDimension = targetDimension;

    // Initialize projection matrices
    this.forwardMatrix = MatrixAtoms.random(targetDimension, sourceDimension);
    this.backwardMatrix = MatrixAtoms.random(sourceDimension, targetDimension);

    // Learned correspondence rules
    this.correspondenceRules = [];
  }

  /**
   * Projects from source domain (D_S) to target domain (D_T)
   * Preserves internal structural properties
   */
  projectForward(sourceState) {
    // Linear projection
    let projected = MatrixAtoms.vectorMultiply(this.forwardMatrix, sourceState);

    // Apply nonlinear transformation to preserve structure
    projected = this._preserveStructure(projected, 'forward');

    // Normalize to prevent magnitude explosion
    return VectorAtoms.normalize(projected);
  }

  /**
   * Projects from target domain (D_T) back to source domain (D_S)
   */
  projectBackward(targetState) {
    // Linear projection
    let projected = MatrixAtoms.vectorMultiply(this.backwardMatrix, targetState);

    // Apply nonlinear transformation
    projected = this._preserveStructure(projected, 'backward');

    return VectorAtoms.normalize(projected);
  }

  /**
   * Applies structure-preserving transformations
   */
  _preserveStructure(state, direction) {
    // Preserve relative relationships between dimensions
    const mean = state.reduce((sum, v) => sum + v, 0) / state.length;
    const centered = state.map(v => v - mean);

    // Preserve dominant frequencies
    const structured = new Float64Array(state.length);
    for (let i = 0; i < state.length; i++) {
      // Mix with local neighborhood
      let value = centered[i];

      if (i > 0) value += centered[i - 1] * 0.1;
      if (i < state.length - 1) value += centered[i + 1] * 0.1;

      structured[i] = value;
    }

    return Float64Array.from(structured);
  }

  /**
   * Bidirectional projection: project to target and back
   * Creates a "filtered" version of source state
   */
  roundTrip(sourceState) {
    const target = this.projectForward(sourceState);
    const backToSource = this.projectBackward(target);
    return backToSource;
  }

  /**
   * Learns correspondence from example pairs
   * Updates projection matrices based on observed mappings
   */
  learnCorrespondence(sourceSamples, targetSamples, learningRate = 0.1) {
    if (sourceSamples.length !== targetSamples.length) {
      throw new Error('Sample counts must match');
    }

    for (let i = 0; i < sourceSamples.length; i++) {
      const source = sourceSamples[i];
      const target = targetSamples[i];

      // Forward projection error
      const predictedTarget = this.projectForward(source);
      const targetError = VectorAtoms.subtract(target, predictedTarget);

      // Update forward matrix (simplified gradient descent)
      for (let row = 0; row < this.targetDimension; row++) {
        for (let col = 0; col < this.sourceDimension; col++) {
          const gradient = targetError[row] * source[col];
          this.forwardMatrix[row][col] += learningRate * gradient;
        }
      }

      // Backward projection error
      const predictedSource = this.projectBackward(target);
      const sourceError = VectorAtoms.subtract(source, predictedSource);

      // Update backward matrix
      for (let row = 0; row < this.sourceDimension; row++) {
        for (let col = 0; col < this.targetDimension; col++) {
          const gradient = sourceError[row] * target[col];
          this.backwardMatrix[row][col] += learningRate * gradient;
        }
      }
    }
  }

  /**
   * Creates an analogical mapping: A:B :: C:?
   * "source1 is to target1 as source2 is to ?"
   */
  analogicalMapping(source1, target1, source2) {
    // Learn specific correspondence from one example
    const tempMapper = new GaloisMapper(this.sourceDimension, this.targetDimension);
    tempMapper.learnCorrespondence([source1], [target1], 0.5);

    // Apply learned correspondence to new example
    return tempMapper.projectForward(source2);
  }

  /**
   * Interpolates between two projections
   * Creates a blend of two different interpretations
   */
  interpolatedProjection(sourceState, t = 0.5) {
    const forward = this.projectForward(sourceState);
    const roundTrip = this.roundTrip(sourceState);

    // Blend between direct projection and round-trip
    return VectorAtoms.lerp(forward, roundTrip, t);
  }

  /**
   * Multi-hop projection: project through multiple intermediate domains
   */
  multiHopProjection(sourceState, intermediateMappers) {
    let current = sourceState;

    // Forward through all mappers
    current = this.projectForward(current);

    for (let mapper of intermediateMappers) {
      current = mapper.projectForward(current);
    }

    return current;
  }

  /**
   * Preserves specific invariant properties during projection
   */
  invariantPreservingProjection(sourceState, invariantProperty) {
    const target = this.projectForward(sourceState);

    // Compute invariant in both domains
    const sourceInvariant = invariantProperty(sourceState);
    const targetInvariant = invariantProperty(target);

    // If invariant not preserved, adjust target
    if (Math.abs(sourceInvariant - targetInvariant) > 0.1) {
      const scale = sourceInvariant / (targetInvariant || 1);
      return VectorAtoms.scale(target, scale);
    }

    return target;
  }

  /**
   * Gets correspondence quality score
   */
  correspondenceQuality(sourceSamples, targetSamples) {
    let totalError = 0;

    for (let i = 0; i < Math.min(sourceSamples.length, targetSamples.length); i++) {
      const predicted = this.projectForward(sourceSamples[i]);
      const actual = targetSamples[i];
      const error = VectorAtoms.distance(predicted, actual);
      totalError += error;
    }

    const avgError = totalError / Math.min(sourceSamples.length, targetSamples.length);
    return Math.exp(-avgError); // Convert error to quality score [0, 1]
  }
}
