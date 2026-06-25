/**
 * COHERENCE COMPONENT: Convergence Checkers
 * Purpose: Determine when state has reached fixpoint (stability)
 * Role: The "inhibitory neurons" - signal when to stop iterating
 */

import { VectorAtoms } from '../primitives/vector.js';
import { StatisticalAtoms } from '../primitives/statistics.js';

export class ConvergenceChecker {
  /**
   * Checks if two states are identical within epsilon
   */
  static exactConvergence(state1, state2, epsilon = 1e-6) {
    return VectorAtoms.equals(state1, state2, epsilon);
  }

  /**
   * Checks if state magnitude change is below threshold
   */
  static magnitudeConvergence(state1, state2, threshold = 1e-4) {
    const diff = VectorAtoms.subtract(state1, state2);
    const changeMagnitude = VectorAtoms.magnitude(diff);
    return changeMagnitude < threshold;
  }

  /**
   * Checks if state direction has stabilized
   */
  static directionalConvergence(state1, state2, threshold = 0.99) {
    const normalized1 = VectorAtoms.normalize(state1);
    const normalized2 = VectorAtoms.normalize(state2);
    const similarity = StatisticalAtoms.cosineSimilarity(normalized1, normalized2);
    return similarity > threshold;
  }

  /**
   * Checks if rate of change is decreasing
   */
  static accelerationConvergence(stateHistory, threshold = 1e-5) {
    if (stateHistory.length < 3) return false;

    const recent = stateHistory.slice(-3);
    const change1 = VectorAtoms.distance(recent[0], recent[1]);
    const change2 = VectorAtoms.distance(recent[1], recent[2]);

    const acceleration = Math.abs(change2 - change1);
    return acceleration < threshold;
  }

  /**
   * Checks if state is oscillating (periodic pattern)
   */
  static oscillationDetection(stateHistory, windowSize = 4) {
    if (stateHistory.length < windowSize * 2) return false;

    const recent = stateHistory.slice(-windowSize * 2);

    // Check if pattern repeats
    for (let period = 2; period <= windowSize; period++) {
      let isOscillating = true;

      for (let i = 0; i < period; i++) {
        const state1 = recent[recent.length - period + i];
        const state2 = recent[recent.length - i - 1];

        if (!VectorAtoms.equals(state1, state2, 1e-3)) {
          isOscillating = false;
          break;
        }
      }

      if (isOscillating) return true;
    }

    return false;
  }

  /**
   * Checks convergence across multiple criteria
   */
  static multiCriteriaConvergence(state1, state2, stateHistory) {
    const criteria = {
      exact: ConvergenceChecker.exactConvergence(state1, state2, 1e-5),
      magnitude: ConvergenceChecker.magnitudeConvergence(state1, state2, 1e-3),
      directional: ConvergenceChecker.directionalConvergence(state1, state2, 0.98),
      acceleration: ConvergenceChecker.accelerationConvergence(stateHistory, 1e-4)
    };

    // Require at least 2 criteria to be met
    const metCount = Object.values(criteria).filter(v => v).length;
    return {
      converged: metCount >= 2,
      criteria,
      metCount
    };
  }

  /**
   * Adaptive convergence threshold based on iteration count
   */
  static adaptiveConvergence(state1, state2, iterationCount, maxIterations = 100) {
    // Relax threshold as iterations progress
    const progress = iterationCount / maxIterations;
    const adaptiveThreshold = 1e-6 + progress * 1e-3;

    return ConvergenceChecker.magnitudeConvergence(state1, state2, adaptiveThreshold);
  }

  /**
   * Statistical convergence: variance across recent states is low
   */
  static statisticalConvergence(stateHistory, windowSize = 5, threshold = 0.01) {
    if (stateHistory.length < windowSize) return false;

    const recent = stateHistory.slice(-windowSize);

    // Compute variance for each dimension
    const dimension = recent[0].length;
    let totalVariance = 0;

    for (let d = 0; d < dimension; d++) {
      const values = recent.map(state => state[d]);
      const variance = StatisticalAtoms.variance(values);
      totalVariance += variance;
    }

    const avgVariance = totalVariance / dimension;
    return avgVariance < threshold;
  }

  /**
   * Energy-based convergence: total "energy" of system stabilizes
   */
  static energyConvergence(state1, state2, threshold = 0.001) {
    const energy1 = VectorAtoms.magnitude(state1) ** 2;
    const energy2 = VectorAtoms.magnitude(state2) ** 2;
    const energyChange = Math.abs(energy2 - energy1);

    return energyChange < threshold;
  }

  /**
   * Composite convergence score (0 to 1)
   */
  static convergenceScore(state1, state2, stateHistory) {
    let score = 0;
    let totalWeight = 0;

    // Exact convergence (weight: 0.3)
    if (ConvergenceChecker.exactConvergence(state1, state2, 1e-5)) {
      score += 0.3;
    } else {
      // Partial credit based on distance
      const distance = VectorAtoms.distance(state1, state2);
      score += 0.3 * Math.exp(-distance * 10);
    }
    totalWeight += 0.3;

    // Directional convergence (weight: 0.25)
    const normalized1 = VectorAtoms.normalize(state1);
    const normalized2 = VectorAtoms.normalize(state2);
    const similarity = StatisticalAtoms.cosineSimilarity(normalized1, normalized2);
    score += 0.25 * similarity;
    totalWeight += 0.25;

    // Statistical convergence (weight: 0.25)
    if (stateHistory.length >= 5) {
      const isStatConverged = ConvergenceChecker.statisticalConvergence(stateHistory);
      score += isStatConverged ? 0.25 : 0;
    }
    totalWeight += 0.25;

    // Energy convergence (weight: 0.2)
    if (ConvergenceChecker.energyConvergence(state1, state2)) {
      score += 0.2;
    }
    totalWeight += 0.2;

    return score / totalWeight;
  }
}
