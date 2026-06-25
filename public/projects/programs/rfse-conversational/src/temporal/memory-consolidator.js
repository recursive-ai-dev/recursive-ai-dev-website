/**
 * TEMPORAL COMPONENT: Memory Consolidator
 * Purpose: Moves important information from working to long-term memory
 * Role: The "hippocampus" - consolidates experiences into lasting memories
 */

import { VectorAtoms } from '../primitives/vector.js';
import { StatisticalAtoms } from '../primitives/statistics.js';

export class MemoryConsolidator {
  constructor(config = {}) {
    this.longTermMemory = [];
    this.consolidationThreshold = config.consolidationThreshold || 0.75;
    this.maxLongTermSize = config.maxLongTermSize || 100;
    this.similarityThreshold = config.similarityThreshold || 0.85;
  }

  /**
   * Attempts to consolidate entries from working memory
   */
  consolidate(contextWindow) {
    const candidates = contextWindow.getImportant(this.consolidationThreshold);
    const consolidated = [];

    for (let candidate of candidates) {
      // Check if similar memory already exists
      const similar = this._findSimilarMemory(candidate.state);

      if (similar) {
        // Reinforce existing memory
        this._reinforceMemory(similar, candidate);
      } else {
        // Create new long-term memory
        const memory = this._createMemory(candidate);
        this.longTermMemory.push(memory);
        consolidated.push(memory);
      }
    }

    // Prune if exceeding max size
    if (this.longTermMemory.length > this.maxLongTermSize) {
      this._pruneWeakMemories();
    }

    return consolidated;
  }

  /**
   * Creates new long-term memory
   */
  _createMemory(entry) {
    return {
      id: this._generateMemoryId(),
      state: VectorAtoms.clone(entry.state),
      strength: entry.importance,
      accessCount: 1,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      metadata: { ...entry.metadata }
    };
  }

  /**
   * Finds similar memory in long-term storage
   */
  _findSimilarMemory(state) {
    for (let memory of this.longTermMemory) {
      const similarity = StatisticalAtoms.cosineSimilarity(state, memory.state);
      if (similarity >= this.similarityThreshold) {
        return memory;
      }
    }
    return null;
  }

  /**
   * Reinforces existing memory
   */
  _reinforceMemory(memory, newEntry) {
    // Increase strength
    memory.strength = Math.min(1, memory.strength + newEntry.importance * 0.1);

    // Blend state (moving average)
    memory.state = VectorAtoms.lerp(memory.state, newEntry.state, 0.1);

    // Update access info
    memory.accessCount++;
    memory.lastAccessed = Date.now();
  }

  /**
   * Retrieves memories similar to query state
   */
  retrieve(queryState, topK = 5) {
    const scored = this.longTermMemory.map(memory => {
      const similarity = StatisticalAtoms.cosineSimilarity(queryState, memory.state);

      // Combined score: similarity + strength + recency
      const recencyBonus = this._computeRecencyBonus(memory);
      const score = similarity * 0.6 + memory.strength * 0.3 + recencyBonus * 0.1;

      return { memory, similarity, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Update access counts
    for (let i = 0; i < Math.min(topK, scored.length); i++) {
      scored[i].memory.accessCount++;
      scored[i].memory.lastAccessed = Date.now();
    }

    return scored.slice(0, topK);
  }

  /**
   * Computes recency bonus (recently accessed memories get boost)
   */
  _computeRecencyBonus(memory) {
    const ageInSeconds = (Date.now() - memory.lastAccessed) / 1000;
    return Math.exp(-ageInSeconds / 3600); // Decay over 1 hour
  }

  /**
   * Applies memory decay (forgetting)
   */
  applyDecay(decayRate = 0.99) {
    for (let memory of this.longTermMemory) {
      memory.strength *= decayRate;
    }
  }

  /**
   * Prunes weak memories
   */
  _pruneWeakMemories() {
    // Sort by composite score
    const scored = this.longTermMemory.map(memory => {
      const score = memory.strength * 0.5 +
                    (memory.accessCount / 100) * 0.3 +
                    this._computeRecencyBonus(memory) * 0.2;
      return { memory, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Keep top memories
    const targetSize = Math.floor(this.maxLongTermSize * 0.8);
    this.longTermMemory = scored.slice(0, targetSize).map(item => item.memory);
  }

  /**
   * Computes centroid of all memories
   */
  computeMemoryCentroid() {
    if (this.longTermMemory.length === 0) return null;

    let centroid = VectorAtoms.createZero(this.longTermMemory[0].state.length);
    let totalWeight = 0;

    for (let memory of this.longTermMemory) {
      const weighted = VectorAtoms.scale(memory.state, memory.strength);
      centroid = VectorAtoms.add(centroid, weighted);
      totalWeight += memory.strength;
    }

    if (totalWeight > 0) {
      centroid = VectorAtoms.scale(centroid, 1 / totalWeight);
    }

    return centroid;
  }

  /**
   * Gets strongest memories
   */
  getStrongestMemories(count = 10) {
    const sorted = [...this.longTermMemory].sort((a, b) => b.strength - a.strength);
    return sorted.slice(0, count);
  }

  /**
   * Gets most accessed memories
   */
  getMostAccessedMemories(count = 10) {
    const sorted = [...this.longTermMemory].sort((a, b) => b.accessCount - a.accessCount);
    return sorted.slice(0, count);
  }

  /**
   * Merges similar memories
   */
  mergeSimilarMemories(threshold = 0.95) {
    const merged = [];

    for (let i = 0; i < this.longTermMemory.length; i++) {
      for (let j = i + 1; j < this.longTermMemory.length; j++) {
        const similarity = StatisticalAtoms.cosineSimilarity(
          this.longTermMemory[i].state,
          this.longTermMemory[j].state
        );

        if (similarity >= threshold) {
          // Merge j into i
          const memoryI = this.longTermMemory[i];
          const memoryJ = this.longTermMemory[j];

          memoryI.state = VectorAtoms.lerp(memoryI.state, memoryJ.state, 0.5);
          memoryI.strength = Math.max(memoryI.strength, memoryJ.strength);
          memoryI.accessCount += memoryJ.accessCount;

          merged.push({ from: memoryJ.id, into: memoryI.id });

          // Remove j
          this.longTermMemory.splice(j, 1);
          j--;
        }
      }
    }

    return merged;
  }

  /**
   * Gets memory by ID
   */
  getMemory(memoryId) {
    return this.longTermMemory.find(m => m.id === memoryId);
  }

  /**
   * Clears all memories
   */
  clear() {
    this.longTermMemory = [];
  }

  /**
   * Generates unique memory ID
   */
  _generateMemoryId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets statistics
   */
  getStatistics() {
    if (this.longTermMemory.length === 0) {
      return {
        count: 0,
        avgStrength: 0,
        avgAccessCount: 0,
        oldestMemory: null
      };
    }

    const strengths = this.longTermMemory.map(m => m.strength);
    const accessCounts = this.longTermMemory.map(m => m.accessCount);
    const oldest = Math.min(...this.longTermMemory.map(m => m.createdAt));

    return {
      count: this.longTermMemory.length,
      avgStrength: StatisticalAtoms.mean(strengths),
      avgAccessCount: StatisticalAtoms.mean(accessCounts),
      oldestMemory: oldest,
      memoryAge: (Date.now() - oldest) / 1000 // in seconds
    };
  }
}
