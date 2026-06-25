/**
 * FEEDBACK COMPONENT: Path Tracker
 * Purpose: Track operational sequences and their outcomes
 * Role: The "episodic memory" - remembers what worked and what didn't
 */

export class PathTracker {
  constructor(maxPathLength = 10) {
    this.maxPathLength = maxPathLength;
    this.paths = []; // Array of path records
    this.currentPath = null;
  }

  /**
   * Starts tracking a new operational path
   */
  startPath(initialState) {
    this.currentPath = {
      id: this._generatePathId(),
      startTime: Date.now(),
      initialState,
      operations: [],
      states: [initialState],
      feedback: null,
      metadata: {}
    };
  }

  /**
   * Records an operation in the current path
   */
  recordOperation(operationName, state, context = {}) {
    if (!this.currentPath) {
      this.startPath(state);
    }

    this.currentPath.operations.push({
      name: operationName,
      timestamp: Date.now(),
      context
    });

    this.currentPath.states.push(state);

    // Limit path length
    if (this.currentPath.operations.length > this.maxPathLength) {
      this.currentPath.operations.shift();
      this.currentPath.states.shift();
    }
  }

  /**
   * Ends current path and stores it
   */
  endPath(finalState, feedback = null) {
    if (!this.currentPath) return null;

    this.currentPath.finalState = finalState;
    this.currentPath.feedback = feedback;
    this.currentPath.endTime = Date.now();
    this.currentPath.duration = this.currentPath.endTime - this.currentPath.startTime;

    this.paths.push(this.currentPath);

    // Limit stored paths
    if (this.paths.length > 1000) {
      this.paths.shift();
    }

    const completedPath = this.currentPath;
    this.currentPath = null;

    return completedPath;
  }

  /**
   * Gets current path
   */
  getCurrentPath() {
    return this.currentPath;
  }

  /**
   * Gets all paths with specific feedback range
   */
  getPathsByFeedback(minFeedback = 0, maxFeedback = 1) {
    return this.paths.filter(path =>
      path.feedback !== null &&
      path.feedback >= minFeedback &&
      path.feedback <= maxFeedback
    );
  }

  /**
   * Gets paths containing specific operation
   */
  getPathsWithOperation(operationName) {
    return this.paths.filter(path =>
      path.operations.some(op => op.name === operationName)
    );
  }

  /**
   * Gets operation sequence from a path
   */
  getOperationSequence(path) {
    return path.operations.map(op => op.name);
  }

  /**
   * Finds similar paths to given operation sequence
   */
  findSimilarPaths(operationSequence, threshold = 0.7) {
    const similar = [];

    for (let path of this.paths) {
      const pathSeq = this.getOperationSequence(path);
      const similarity = this._sequenceSimilarity(operationSequence, pathSeq);

      if (similarity >= threshold) {
        similar.push({
          path,
          similarity
        });
      }
    }

    similar.sort((a, b) => b.similarity - a.similarity);
    return similar;
  }

  /**
   * Gets most successful operation sequences
   */
  getSuccessfulSequences(topN = 10) {
    const pathsWithFeedback = this.paths.filter(p => p.feedback !== null);

    pathsWithFeedback.sort((a, b) => b.feedback - a.feedback);

    return pathsWithFeedback.slice(0, topN).map(path => ({
      sequence: this.getOperationSequence(path),
      feedback: path.feedback,
      pathId: path.id
    }));
  }

  /**
   * Gets operation co-occurrence statistics
   */
  getOperationCooccurrence() {
    const cooccurrence = new Map();

    for (let path of this.paths) {
      const ops = this.getOperationSequence(path);

      for (let i = 0; i < ops.length - 1; i++) {
        const pair = `${ops[i]}->${ops[i + 1]}`;
        const count = cooccurrence.get(pair) || 0;
        cooccurrence.set(pair, count + 1);
      }
    }

    return cooccurrence;
  }

  /**
   * Gets operation success rates
   */
  getOperationSuccessRates() {
    const rates = new Map();

    for (let path of this.paths) {
      if (path.feedback === null) continue;

      for (let op of path.operations) {
        if (!rates.has(op.name)) {
          rates.set(op.name, { total: 0, weightedSum: 0 });
        }

        const stats = rates.get(op.name);
        stats.total++;
        stats.weightedSum += path.feedback;
      }
    }

    // Compute averages
    const successRates = new Map();
    for (let [opName, stats] of rates.entries()) {
      successRates.set(opName, stats.weightedSum / stats.total);
    }

    return successRates;
  }

  /**
   * Computes sequence similarity (Jaccard-like)
   */
  _sequenceSimilarity(seq1, seq2) {
    const set1 = new Set(seq1);
    const set2 = new Set(seq2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Generates unique path ID
   */
  _generatePathId() {
    return `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clears all stored paths
   */
  clear() {
    this.paths = [];
    this.currentPath = null;
  }

  /**
   * Gets summary statistics
   */
  getStatistics() {
    const pathsWithFeedback = this.paths.filter(p => p.feedback !== null);

    if (pathsWithFeedback.length === 0) {
      return {
        totalPaths: this.paths.length,
        avgFeedback: 0,
        bestFeedback: 0,
        worstFeedback: 0
      };
    }

    const feedbacks = pathsWithFeedback.map(p => p.feedback);
    const avgFeedback = feedbacks.reduce((sum, f) => sum + f, 0) / feedbacks.length;
    const bestFeedback = Math.max(...feedbacks);
    const worstFeedback = Math.min(...feedbacks);

    return {
      totalPaths: this.paths.length,
      pathsWithFeedback: pathsWithFeedback.length,
      avgFeedback,
      bestFeedback,
      worstFeedback,
      avgPathLength: this.paths.reduce((sum, p) => sum + p.operations.length, 0) / this.paths.length
    };
  }
}
