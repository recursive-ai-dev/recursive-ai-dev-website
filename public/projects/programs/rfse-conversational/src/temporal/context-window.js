/**
 * TEMPORAL COMPONENT: Context Window Manager
 * Purpose: Manages sliding window of recent states with importance-based retention
 * Role: The "working memory" - keeps relevant recent information accessible
 */

import { VectorAtoms } from '../primitives/vector.js';
import { StatisticalAtoms } from '../primitives/statistics.js';

export class ContextWindow {
  constructor(config = {}) {
    this.maxSize = config.maxSize || 20;
    this.window = [];
    this.importanceScores = [];
    this.compressionThreshold = config.compressionThreshold || 0.8;
    this.retentionRate = config.retentionRate || 0.7;
  }

  /**
   * Adds new state to window
   */
  add(state, metadata = {}) {
    const entry = {
      state: VectorAtoms.clone(state),
      timestamp: Date.now(),
      importance: metadata.importance || 0.5,
      metadata
    };

    this.window.push(entry);
    this.importanceScores.push(entry.importance);

    // If window exceeds max size, compress or remove old entries
    if (this.window.length > this.maxSize) {
      this._compress();
    }

    return entry;
  }

  /**
   * Gets recent entries
   */
  getRecent(count = 5) {
    const startIndex = Math.max(0, this.window.length - count);
    return this.window.slice(startIndex);
  }

  /**
   * Gets all entries
   */
  getAll() {
    return this.window;
  }

  /**
   * Gets entries above importance threshold
   */
  getImportant(threshold = 0.7) {
    return this.window.filter(entry => entry.importance >= threshold);
  }

  /**
   * Compresses window by removing least important entries
   */
  _compress() {
    // Keep entries based on importance
    const targetSize = Math.floor(this.maxSize * this.retentionRate);

    // Sort by importance
    const sorted = this.window
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => b.entry.importance - a.entry.importance);

    // Keep top entries
    const kept = sorted.slice(0, targetSize);

    // Restore temporal order
    kept.sort((a, b) => a.index - b.index);

    this.window = kept.map(item => item.entry);
    this.importanceScores = this.window.map(e => e.importance);
  }

  /**
   * Updates importance score for recent entry
   */
  updateImportance(index, newImportance) {
    if (index >= 0 && index < this.window.length) {
      this.window[index].importance = newImportance;
      this.importanceScores[index] = newImportance;
    }
  }

  /**
   * Boosts importance of entries matching criteria
   */
  boostMatching(criteriaFn, boostAmount = 0.2) {
    for (let i = 0; i < this.window.length; i++) {
      if (criteriaFn(this.window[i])) {
        this.window[i].importance = Math.min(1, this.window[i].importance + boostAmount);
        this.importanceScores[i] = this.window[i].importance;
      }
    }
  }

  /**
   * Decays importance over time
   */
  applyTemporalDecay(decayRate = 0.95) {
    const now = Date.now();

    for (let i = 0; i < this.window.length; i++) {
      const age = now - this.window[i].timestamp;
      const ageInSeconds = age / 1000;

      // Exponential decay based on age
      const decay = Math.exp(-ageInSeconds / 100);
      this.window[i].importance *= decay * decayRate;
      this.importanceScores[i] = this.window[i].importance;
    }
  }

  /**
   * Computes average state across window
   */
  computeAverageState() {
    if (this.window.length === 0) return null;

    const states = this.window.map(entry => entry.state);
    let sum = VectorAtoms.createZero(states[0].length);

    for (let state of states) {
      sum = VectorAtoms.add(sum, state);
    }

    return VectorAtoms.scale(sum, 1 / states.length);
  }

  /**
   * Computes weighted average based on importance
   */
  computeWeightedAverage() {
    if (this.window.length === 0) return null;

    let weighted = VectorAtoms.createZero(this.window[0].state.length);
    let totalWeight = 0;

    for (let entry of this.window) {
      const contribution = VectorAtoms.scale(entry.state, entry.importance);
      weighted = VectorAtoms.add(weighted, contribution);
      totalWeight += entry.importance;
    }

    if (totalWeight > 0) {
      weighted = VectorAtoms.scale(weighted, 1 / totalWeight);
    }

    return weighted;
  }

  /**
   * Gets state trajectory (sequence of states)
   */
  getTrajectory() {
    return this.window.map(entry => entry.state);
  }

  /**
   * Computes coherence across window
   */
  computeCoherence() {
    if (this.window.length < 2) return 1;

    let totalSimilarity = 0;
    for (let i = 0; i < this.window.length - 1; i++) {
      const sim = StatisticalAtoms.cosineSimilarity(
        this.window[i].state,
        this.window[i + 1].state
      );
      totalSimilarity += sim;
    }

    return totalSimilarity / (this.window.length - 1);
  }

  /**
   * Finds most similar entry to given state
   */
  findMostSimilar(targetState) {
    if (this.window.length === 0) return null;

    let bestEntry = this.window[0];
    let maxSimilarity = StatisticalAtoms.cosineSimilarity(
      targetState,
      this.window[0].state
    );

    for (let i = 1; i < this.window.length; i++) {
      const sim = StatisticalAtoms.cosineSimilarity(targetState, this.window[i].state);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        bestEntry = this.window[i];
      }
    }

    return { entry: bestEntry, similarity: maxSimilarity };
  }

  /**
   * Clears window
   */
  clear() {
    this.window = [];
    this.importanceScores = [];
  }

  /**
   * Gets statistics
   */
  getStatistics() {
    if (this.window.length === 0) {
      return {
        size: 0,
        avgImportance: 0,
        coherence: 0,
        span: 0
      };
    }

    const avgImportance = StatisticalAtoms.mean(this.importanceScores);
    const coherence = this.computeCoherence();
    const span = this.window[this.window.length - 1].timestamp - this.window[0].timestamp;

    return {
      size: this.window.length,
      avgImportance,
      coherence,
      span: span / 1000 // in seconds
    };
  }
}
