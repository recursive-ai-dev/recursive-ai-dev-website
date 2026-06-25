/**
 * FEEDBACK COMPONENT: Probability Matrix
 * Purpose: Weight operational sequences based on feedback
 * Role: The "synaptic weights" - strengthened by success, weakened by failure
 */

import { StatisticalAtoms } from '../primitives/statistics.js';

export class ProbabilityMatrix {
  constructor() {
    this.matrix = new Map(); // operation -> next_operation -> probability
    this.operationCounts = new Map(); // operation -> count
    this.feedbackWeights = new Map(); // operation -> weighted feedback sum
    this.learningRate = 0.1;
    this.decayRate = 0.99;
  }

  /**
   * Updates matrix based on operation sequence and feedback
   */
  updateFromSequence(operationSequence, feedback) {
    // Normalize feedback to [0, 1]
    const normalizedFeedback = (feedback + 1) / 2;

    // Update transitions
    for (let i = 0; i < operationSequence.length - 1; i++) {
      const current = operationSequence[i];
      const next = operationSequence[i + 1];

      this._updateTransition(current, next, normalizedFeedback);
    }

    // Update individual operation scores
    for (let op of operationSequence) {
      this._updateOperationScore(op, normalizedFeedback);
    }
  }

  /**
   * Updates transition probability between two operations
   */
  _updateTransition(fromOp, toOp, feedback) {
    if (!this.matrix.has(fromOp)) {
      this.matrix.set(fromOp, new Map());
    }

    const transitions = this.matrix.get(fromOp);
    const currentWeight = transitions.get(toOp) || 0.5;

    // Update using exponential moving average
    const newWeight = StatisticalAtoms.ema(feedback, currentWeight, this.learningRate);
    transitions.set(toOp, newWeight);
  }

  /**
   * Updates individual operation score
   */
  _updateOperationScore(operation, feedback) {
    const currentCount = this.operationCounts.get(operation) || 0;
    const currentWeight = this.feedbackWeights.get(operation) || 0;

    this.operationCounts.set(operation, currentCount + 1);
    this.feedbackWeights.set(operation, currentWeight + feedback);
  }

  /**
   * Gets probability of transition from operation A to operation B
   */
  getTransitionProbability(fromOp, toOp) {
    if (!this.matrix.has(fromOp)) return 0.5;

    const transitions = this.matrix.get(fromOp);
    return transitions.get(toOp) || 0.5;
  }

  /**
   * Gets all possible next operations with probabilities
   */
  getNextOperations(currentOp) {
    if (!this.matrix.has(currentOp)) return [];

    const transitions = this.matrix.get(currentOp);
    const operations = [];

    for (let [op, weight] of transitions.entries()) {
      operations.push({ operation: op, weight });
    }

    operations.sort((a, b) => b.weight - a.weight);
    return operations;
  }

  /**
   * Samples next operation based on probabilities
   */
  sampleNextOperation(currentOp, temperature = 1.0) {
    const nextOps = this.getNextOperations(currentOp);

    if (nextOps.length === 0) return null;

    const weights = nextOps.map(op => op.weight);
    const adjusted = StatisticalAtoms.softmax(weights, temperature);

    const selected = StatisticalAtoms.sample(adjusted);
    return nextOps[selected].operation;
  }

  /**
   * Gets operation score (average feedback)
   */
  getOperationScore(operation) {
    const count = this.operationCounts.get(operation) || 0;
    const weight = this.feedbackWeights.get(operation) || 0;

    if (count === 0) return 0.5;
    return weight / count;
  }

  /**
   * Gets top-N operations by score
   */
  getTopOperations(n = 10) {
    const operations = [];

    for (let [op, count] of this.operationCounts.entries()) {
      if (count > 0) {
        operations.push({
          operation: op,
          score: this.getOperationScore(op),
          count
        });
      }
    }

    operations.sort((a, b) => b.score - a.score);
    return operations.slice(0, n);
  }

  /**
   * Gets operation sequence probability
   */
  getSequenceProbability(operationSequence) {
    if (operationSequence.length === 0) return 0;
    if (operationSequence.length === 1) {
      return this.getOperationScore(operationSequence[0]);
    }

    let totalLogProb = 0;

    for (let i = 0; i < operationSequence.length - 1; i++) {
      const prob = this.getTransitionProbability(
        operationSequence[i],
        operationSequence[i + 1]
      );
      totalLogProb += Math.log(prob + 1e-10);
    }

    return Math.exp(totalLogProb / (operationSequence.length - 1));
  }

  /**
   * Applies decay to all weights (prevents saturation)
   */
  applyDecay() {
    // Decay transition weights
    for (let [fromOp, transitions] of this.matrix.entries()) {
      for (let [toOp, weight] of transitions.entries()) {
        const decayed = weight * this.decayRate + 0.5 * (1 - this.decayRate);
        transitions.set(toOp, decayed);
      }
    }

    // Decay operation counts
    for (let [op, count] of this.operationCounts.entries()) {
      this.operationCounts.set(op, count * this.decayRate);
    }

    for (let [op, weight] of this.feedbackWeights.entries()) {
      this.feedbackWeights.set(op, weight * this.decayRate);
    }
  }

  /**
   * Generates operation sequence based on learned probabilities
   */
  generateSequence(startOp, length = 5, temperature = 1.0) {
    const sequence = [startOp];
    let current = startOp;

    for (let i = 0; i < length - 1; i++) {
      const next = this.sampleNextOperation(current, temperature);
      if (!next) break;

      sequence.push(next);
      current = next;
    }

    return sequence;
  }

  /**
   * Gets transition matrix as 2D structure (for visualization)
   */
  getTransitionMatrix() {
    const allOps = new Set();

    for (let [fromOp, transitions] of this.matrix.entries()) {
      allOps.add(fromOp);
      for (let toOp of transitions.keys()) {
        allOps.add(toOp);
      }
    }

    const operations = Array.from(allOps);
    const matrix = [];

    for (let fromOp of operations) {
      const row = [];
      for (let toOp of operations) {
        row.push(this.getTransitionProbability(fromOp, toOp));
      }
      matrix.push(row);
    }

    return {
      operations,
      matrix
    };
  }

  /**
   * Merges another probability matrix into this one
   */
  merge(otherMatrix, weight = 0.5) {
    // Merge transitions
    for (let [fromOp, transitions] of otherMatrix.matrix.entries()) {
      if (!this.matrix.has(fromOp)) {
        this.matrix.set(fromOp, new Map());
      }

      const myTransitions = this.matrix.get(fromOp);

      for (let [toOp, otherWeight] of transitions.entries()) {
        const myWeight = myTransitions.get(toOp) || 0.5;
        const merged = myWeight * (1 - weight) + otherWeight * weight;
        myTransitions.set(toOp, merged);
      }
    }

    // Merge operation scores
    for (let [op, count] of otherMatrix.operationCounts.entries()) {
      const myCount = this.operationCounts.get(op) || 0;
      this.operationCounts.set(op, myCount + count * weight);
    }

    for (let [op, feedbackWeight] of otherMatrix.feedbackWeights.entries()) {
      const myWeight = this.feedbackWeights.get(op) || 0;
      this.feedbackWeights.set(op, myWeight + feedbackWeight * weight);
    }
  }

  /**
   * Resets all learned probabilities
   */
  reset() {
    this.matrix.clear();
    this.operationCounts.clear();
    this.feedbackWeights.clear();
  }

  /**
   * Gets statistics
   */
  getStatistics() {
    let totalTransitions = 0;
    for (let transitions of this.matrix.values()) {
      totalTransitions += transitions.size;
    }

    return {
      uniqueOperations: this.operationCounts.size,
      totalTransitions,
      avgTransitionsPerOp: totalTransitions / Math.max(1, this.matrix.size)
    };
  }
}
