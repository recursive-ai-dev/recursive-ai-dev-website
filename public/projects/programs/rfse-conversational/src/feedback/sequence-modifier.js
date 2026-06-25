/**
 * FEEDBACK COMPONENT: Sequence Modifier
 * Purpose: Modify operational sequences based on feedback
 * Role: The "behavior adaptation" - learns from outcomes
 */

import { PathTracker } from './path-tracker.js';
import { ProbabilityMatrix } from './probability-matrix.js';

export class FeedbackWeightedSequenceModifier {
  constructor() {
    this.pathTracker = new PathTracker();
    this.probabilityMatrix = new ProbabilityMatrix();
    this.feedbackHistory = [];
    this.explorationRate = 0.2;
    this.minExplorationRate = 0.05;
    this.explorationDecay = 0.995;
  }

  /**
   * Processes feedback signal σ ∈ [-1, 1]
   */
  processFeedback(feedbackSignal) {
    // Validate feedback range
    const sigma = Math.max(-1, Math.min(1, feedbackSignal));

    // End current path with feedback
    const completedPath = this.pathTracker.endPath(null, sigma);

    if (completedPath) {
      // Extract operation sequence
      const operationSequence = this.pathTracker.getOperationSequence(completedPath);

      // Update probability matrix
      this.probabilityMatrix.updateFromSequence(operationSequence, sigma);

      // Store in history
      this.feedbackHistory.push({
        timestamp: Date.now(),
        signal: sigma,
        pathId: completedPath.id,
        operationCount: operationSequence.length
      });

      // Limit history size
      if (this.feedbackHistory.length > 1000) {
        this.feedbackHistory.shift();
      }
    }

    // Decay exploration rate
    this.explorationRate = Math.max(
      this.minExplorationRate,
      this.explorationRate * this.explorationDecay
    );

    return {
      sigma,
      completedPath,
      currentExplorationRate: this.explorationRate
    };
  }

  /**
   * Suggests next operation based on learned probabilities
   */
  suggestNextOperation(currentOperation, temperature = 1.0) {
    // Exploration vs exploitation
    if (Math.random() < this.explorationRate) {
      // Explore: suggest random or least-used operation
      const leastUsed = this._getLeastUsedOperations(3);
      return leastUsed[Math.floor(Math.random() * leastUsed.length)];
    }

    // Exploit: use learned probabilities
    return this.probabilityMatrix.sampleNextOperation(currentOperation, temperature);
  }

  /**
   * Suggests operation sequence
   */
  suggestSequence(startOperation, length = 5, temperature = 1.0) {
    return this.probabilityMatrix.generateSequence(startOperation, length, temperature);
  }

  /**
   * Evaluates quality of proposed sequence
   */
  evaluateSequence(operationSequence) {
    return this.probabilityMatrix.getSequenceProbability(operationSequence);
  }

  /**
   * Gets best operation to start with
   */
  getBestStartOperation() {
    const topOps = this.probabilityMatrix.getTopOperations(5);

    if (topOps.length === 0) return null;

    // Balance between score and usage
    const balanced = topOps.map(op => ({
      operation: op.operation,
      score: op.score * 0.7 + (1 / (1 + op.count * 0.1)) * 0.3
    }));

    balanced.sort((a, b) => b.score - a.score);
    return balanced[0].operation;
  }

  /**
   * Starts tracking new operational path
   */
  startTracking(initialState) {
    this.pathTracker.startPath(initialState);
  }

  /**
   * Records operation in current path
   */
  recordOperation(operationName, state, context = {}) {
    this.pathTracker.recordOperation(operationName, state, context);
  }

  /**
   * Gets recent success rate
   */
  getRecentSuccessRate(windowSize = 10) {
    if (this.feedbackHistory.length === 0) return 0.5;

    const recent = this.feedbackHistory.slice(-windowSize);
    const avgFeedback = recent.reduce((sum, f) => sum + f.signal, 0) / recent.length;

    // Map [-1, 1] to [0, 1]
    return (avgFeedback + 1) / 2;
  }

  /**
   * Gets successful patterns
   */
  getSuccessfulPatterns(topN = 10) {
    return this.pathTracker.getSuccessfulSequences(topN);
  }

  /**
   * Gets operation statistics
   */
  getOperationStatistics() {
    const matrixStats = this.probabilityMatrix.getStatistics();
    const pathStats = this.pathTracker.getStatistics();
    const successRate = this.getRecentSuccessRate();

    return {
      ...matrixStats,
      ...pathStats,
      recentSuccessRate: successRate,
      explorationRate: this.explorationRate,
      feedbackHistorySize: this.feedbackHistory.length
    };
  }

  /**
   * Adapts behavior based on recent performance
   */
  adaptBehavior() {
    const successRate = this.getRecentSuccessRate(20);

    // If doing poorly, increase exploration
    if (successRate < 0.3) {
      this.explorationRate = Math.min(0.5, this.explorationRate * 1.1);
    }

    // If doing well, decrease exploration
    if (successRate > 0.7) {
      this.explorationRate = Math.max(
        this.minExplorationRate,
        this.explorationRate * 0.9
      );
    }

    // Apply decay to probability matrix
    this.probabilityMatrix.applyDecay();
  }

  /**
   * Gets least-used operations
   */
  _getLeastUsedOperations(n = 5) {
    const operations = [];

    for (let [op, count] of this.probabilityMatrix.operationCounts.entries()) {
      operations.push({ operation: op, count });
    }

    operations.sort((a, b) => a.count - b.count);

    return operations.slice(0, n).map(op => op.operation);
  }

  /**
   * Reinforces specific path
   */
  reinforcePath(pathId, bonusFeedback = 0.5) {
    const path = this.pathTracker.paths.find(p => p.id === pathId);

    if (path) {
      const sequence = this.pathTracker.getOperationSequence(path);
      const adjustedFeedback = Math.min(1, (path.feedback || 0) + bonusFeedback);
      this.probabilityMatrix.updateFromSequence(sequence, adjustedFeedback);
    }
  }

  /**
   * Resets learning (keeps structure, clears weights)
   */
  reset() {
    this.probabilityMatrix.reset();
    this.pathTracker.clear();
    this.feedbackHistory = [];
    this.explorationRate = 0.2;
  }

  /**
   * Saves state (for serialization)
   */
  saveState() {
    return {
      probabilityMatrix: {
        matrix: Array.from(this.probabilityMatrix.matrix.entries()),
        operationCounts: Array.from(this.probabilityMatrix.operationCounts.entries()),
        feedbackWeights: Array.from(this.probabilityMatrix.feedbackWeights.entries())
      },
      explorationRate: this.explorationRate,
      feedbackHistory: this.feedbackHistory.slice(-100) // Save recent history
    };
  }

  /**
   * Loads state (from serialization)
   */
  loadState(state) {
    if (state.probabilityMatrix) {
      this.probabilityMatrix.matrix = new Map(state.probabilityMatrix.matrix.map(
        ([key, value]) => [key, new Map(value)]
      ));
      this.probabilityMatrix.operationCounts = new Map(state.probabilityMatrix.operationCounts);
      this.probabilityMatrix.feedbackWeights = new Map(state.probabilityMatrix.feedbackWeights);
    }

    if (state.explorationRate !== undefined) {
      this.explorationRate = state.explorationRate;
    }

    if (state.feedbackHistory) {
      this.feedbackHistory = state.feedbackHistory;
    }
  }
}
