/**
 * TEMPORAL COMPONENT: Capacity Escalator
 * Purpose: Manages expansion and contraction of temporal context
 * Role: The "attention controller" - dynamically adjusts working memory size
 */

import { VectorAtoms } from '../primitives/vector.js';
import { StatisticalAtoms } from '../primitives/statistics.js';
import { ContextWindow } from './context-window.js';
import { MemoryConsolidator } from './memory-consolidator.js';

export class TemporalCapacityEscalator {
  constructor(config = {}) {
    this.contextWindow = new ContextWindow({
      maxSize: config.initialWindowSize || 20,
      compressionThreshold: config.compressionThreshold || 0.8,
      retentionRate: config.retentionRate || 0.7
    });

    this.memoryConsolidator = new MemoryConsolidator({
      consolidationThreshold: config.consolidationThreshold || 0.75,
      maxLongTermSize: config.maxLongTermSize || 100,
      similarityThreshold: config.similarityThreshold || 0.85
    });

    this.minCapacity = config.minCapacity || 10;
    this.maxCapacity = config.maxCapacity || 50;
    this.currentCapacity = config.initialWindowSize || 20;

    this.cognitiveLoad = 0;
    this.loadThreshold = config.loadThreshold || 0.8;
  }

  /**
   * Processes new state and manages capacity
   */
  process(state, metadata = {}) {
    // Add to context window
    const entry = this.contextWindow.add(state, metadata);

    // Update cognitive load
    this._updateCognitiveLoad();

    // Adjust capacity based on load
    this._adjustCapacity();

    // Consolidate if needed
    if (this._shouldConsolidate()) {
      const consolidated = this.memoryConsolidator.consolidate(this.contextWindow);

      if (consolidated.length > 0) {
        // Reduce working memory importance for consolidated items
        this.contextWindow.boostMatching(
          entry => consolidated.some(mem =>
            VectorAtoms.distance(entry.state, mem.state) < 0.1
          ),
          -0.3
        );
      }
    }

    // Apply temporal decay
    this.contextWindow.applyTemporalDecay();
    this.memoryConsolidator.applyDecay();

    return {
      entry,
      currentCapacity: this.currentCapacity,
      cognitiveLoad: this.cognitiveLoad
    };
  }

  /**
   * Retrieves relevant context for current state
   */
  retrieveContext(queryState, options = {}) {
    const workingMemoryCount = options.workingMemoryCount || 5;
    const longTermMemoryCount = options.longTermMemoryCount || 5;

    // Get from working memory
    const workingMemory = this.contextWindow.findMostSimilar(queryState);

    // Get from long-term memory
    const longTermMemory = this.memoryConsolidator.retrieve(queryState, longTermMemoryCount);

    // Combine and weight
    const context = {
      immediate: this.contextWindow.getRecent(3),
      workingMemory: workingMemory ? [workingMemory.entry] : [],
      longTermMemory: longTermMemory.map(item => item.memory),
      synthesized: this._synthesizeContext(queryState, longTermMemory)
    };

    return context;
  }

  /**
   * Synthesizes context from multiple sources
   */
  _synthesizeContext(queryState, longTermMemories) {
    if (longTermMemories.length === 0) {
      return queryState;
    }

    // Weighted blend of query and relevant memories
    let synthesized = VectorAtoms.scale(queryState, 0.5);

    for (let item of longTermMemories) {
      const weighted = VectorAtoms.scale(item.memory.state, item.score * 0.1);
      synthesized = VectorAtoms.add(synthesized, weighted);
    }

    return VectorAtoms.normalize(synthesized);
  }

  /**
   * Updates cognitive load based on context coherence and diversity
   */
  _updateCognitiveLoad() {
    const windowStats = this.contextWindow.getStatistics();

    // High load if:
    // - Window is near capacity
    // - Low coherence (disparate states)
    // - High diversity

    const capacityLoad = windowStats.size / this.currentCapacity;
    const coherenceLoad = 1 - windowStats.coherence;
    const importanceLoad = windowStats.avgImportance;

    this.cognitiveLoad = (capacityLoad * 0.4 + coherenceLoad * 0.4 + importanceLoad * 0.2);
  }

  /**
   * Adjusts capacity based on cognitive load
   */
  _adjustCapacity() {
    if (this.cognitiveLoad > this.loadThreshold) {
      // Increase capacity
      this.currentCapacity = Math.min(
        this.maxCapacity,
        Math.ceil(this.currentCapacity * 1.1)
      );
      this.contextWindow.maxSize = this.currentCapacity;
    } else if (this.cognitiveLoad < this.loadThreshold * 0.5) {
      // Decrease capacity
      this.currentCapacity = Math.max(
        this.minCapacity,
        Math.floor(this.currentCapacity * 0.9)
      );
      this.contextWindow.maxSize = this.currentCapacity;
    }
  }

  /**
   * Determines if consolidation should occur
   */
  _shouldConsolidate() {
    // Consolidate if:
    // - Working memory is near capacity
    // - High importance items exist
    // - Periodic consolidation interval reached

    const windowStats = this.contextWindow.getStatistics();
    const important = this.contextWindow.getImportant(0.75);

    return (
      windowStats.size >= this.currentCapacity * 0.8 ||
      important.length >= 5 ||
      windowStats.span > 60 // 60 seconds
    );
  }

  /**
   * Expands capacity temporarily for high-load situations
   */
  temporaryExpansion(factor = 1.5, duration = 30000) {
    const originalCapacity = this.currentCapacity;
    this.currentCapacity = Math.min(
      this.maxCapacity,
      Math.floor(this.currentCapacity * factor)
    );
    this.contextWindow.maxSize = this.currentCapacity;

    // Schedule restoration
    setTimeout(() => {
      this.currentCapacity = originalCapacity;
      this.contextWindow.maxSize = originalCapacity;
    }, duration);
  }

  /**
   * Contracts capacity for low-load maintenance
   */
  maintenanceContraction() {
    this.currentCapacity = this.minCapacity;
    this.contextWindow.maxSize = this.minCapacity;

    // Force consolidation
    this.memoryConsolidator.consolidate(this.contextWindow);

    // Clear low-importance items from working memory
    this.contextWindow.window = this.contextWindow.getImportant(0.5);
  }

  /**
   * Gets temporal trajectory (recent state sequence)
   */
  getTemporalTrajectory(length = 10) {
    const recent = this.contextWindow.getRecent(length);
    return recent.map(entry => entry.state);
  }

  /**
   * Computes temporal coherence across all memory systems
   */
  computeGlobalCoherence() {
    const windowCoherence = this.contextWindow.computeCoherence();

    // Check coherence between working and long-term memory
    const workingAvg = this.contextWindow.computeWeightedAverage();
    const longTermCentroid = this.memoryConsolidator.computeMemoryCentroid();

    let crossSystemCoherence = 0;
    if (workingAvg && longTermCentroid) {
      crossSystemCoherence = StatisticalAtoms.cosineSimilarity(workingAvg, longTermCentroid);
    }

    return {
      workingMemory: windowCoherence,
      crossSystem: crossSystemCoherence,
      overall: (windowCoherence * 0.6 + crossSystemCoherence * 0.4)
    };
  }

  /**
   * Boosts importance of states matching criteria
   */
  reinforcePattern(criteriaFn, boostAmount = 0.3) {
    // Boost in working memory
    this.contextWindow.boostMatching(criteriaFn, boostAmount);

    // Boost in long-term memory
    for (let memory of this.memoryConsolidator.longTermMemory) {
      if (criteriaFn({ state: memory.state, metadata: memory.metadata })) {
        memory.strength = Math.min(1, memory.strength + boostAmount);
      }
    }
  }

  /**
   * Performs periodic maintenance
   */
  performMaintenance() {
    // Merge similar long-term memories
    this.memoryConsolidator.mergeSimilarMemories();

    // Apply decay
    this.contextWindow.applyTemporalDecay();
    this.memoryConsolidator.applyDecay();

    // Adjust capacity
    this._updateCognitiveLoad();
    this._adjustCapacity();
  }

  /**
   * Gets comprehensive statistics
   */
  getStatistics() {
    const windowStats = this.contextWindow.getStatistics();
    const memoryStats = this.memoryConsolidator.getStatistics();
    const coherence = this.computeGlobalCoherence();

    return {
      currentCapacity: this.currentCapacity,
      cognitiveLoad: this.cognitiveLoad,
      workingMemory: windowStats,
      longTermMemory: memoryStats,
      coherence,
      totalStates: windowStats.size + memoryStats.count
    };
  }

  /**
   * Resets all temporal systems
   */
  reset() {
    this.contextWindow.clear();
    this.memoryConsolidator.clear();
    this.currentCapacity = 20;
    this.cognitiveLoad = 0;
  }

  /**
   * Exports state for persistence
   */
  export() {
    return {
      contextWindow: {
        window: this.contextWindow.window,
        maxSize: this.contextWindow.maxSize
      },
      longTermMemory: this.memoryConsolidator.longTermMemory,
      currentCapacity: this.currentCapacity,
      cognitiveLoad: this.cognitiveLoad
    };
  }

  /**
   * Imports previously exported state
   */
  import(data) {
    if (data.contextWindow) {
      this.contextWindow.window = data.contextWindow.window;
      this.contextWindow.maxSize = data.contextWindow.maxSize;
    }

    if (data.longTermMemory) {
      this.memoryConsolidator.longTermMemory = data.longTermMemory;
    }

    if (data.currentCapacity !== undefined) {
      this.currentCapacity = data.currentCapacity;
    }

    if (data.cognitiveLoad !== undefined) {
      this.cognitiveLoad = data.cognitiveLoad;
    }
  }
}
