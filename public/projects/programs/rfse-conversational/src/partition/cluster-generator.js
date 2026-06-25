/**
 * PARTITION COMPONENT: Cluster Generator
 * Purpose: Create unbounded conceptual categories dynamically
 * Role: The "concept formation" - emergence of new categories
 */

import { VectorAtoms } from '../primitives/vector.js';
import { StatisticalAtoms } from '../primitives/statistics.js';

export class BoundlessPriorPartitionGenerator {
  constructor(config = {}) {
    this.clusters = []; // Array of cluster objects
    this.alpha = config.alpha || 1.0; // Concentration parameter (higher = more new clusters)
    this.similarityThreshold = config.similarityThreshold || 0.7;
    this.minClusterSize = config.minClusterSize || 3;
    this.nextClusterId = 0;
  }

  /**
   * Assigns instance to cluster (creates new cluster if needed)
   * Implements Chinese Restaurant Process logic
   */
  assignToCluster(instance, metadata = {}) {
    if (this.clusters.length === 0) {
      return this._createNewCluster(instance, metadata);
    }

    // Compute probabilities for existing clusters
    const clusterProbs = this.clusters.map(cluster =>
      this._computeClusterProbability(instance, cluster)
    );

    // Probability of creating new cluster
    const newClusterProb = this.alpha / (this.alpha + this._totalInstances());

    // Normalize probabilities
    const allProbs = [...clusterProbs, newClusterProb];
    const sum = allProbs.reduce((a, b) => a + b, 0);
    const normalized = allProbs.map(p => p / sum);

    // Sample cluster assignment
    const selected = StatisticalAtoms.sample(normalized);

    if (selected === this.clusters.length) {
      // Create new cluster
      return this._createNewCluster(instance, metadata);
    } else {
      // Add to existing cluster
      return this._addToCluster(instance, this.clusters[selected], metadata);
    }
  }

  /**
   * Computes probability of instance belonging to cluster
   */
  _computeClusterProbability(instance, cluster) {
    // Base probability: proportional to cluster size
    const sizeTerm = cluster.members.length / (this.alpha + this._totalInstances());

    // Similarity term: how similar is instance to cluster center
    const similarity = this._computeSimilarity(instance, cluster.center);
    const similarityTerm = similarity;

    return sizeTerm * similarityTerm;
  }

  /**
   * Computes similarity between instance and cluster center
   */
  _computeSimilarity(instance, center) {
    return StatisticalAtoms.cosineSimilarity(instance, center);
  }

  /**
   * Creates new cluster
   */
  _createNewCluster(instance, metadata) {
    const cluster = {
      id: `K_${this.nextClusterId++}`,
      center: VectorAtoms.clone(instance),
      members: [{ instance, metadata, timestamp: Date.now() }],
      createdAt: Date.now(),
      properties: {}
    };

    this.clusters.push(cluster);
    return cluster;
  }

  /**
   * Adds instance to existing cluster
   */
  _addToCluster(instance, cluster, metadata) {
    cluster.members.push({
      instance,
      metadata,
      timestamp: Date.now()
    });

    // Update cluster center (running average)
    const newCenter = VectorAtoms.add(
      VectorAtoms.scale(cluster.center, cluster.members.length - 1),
      instance
    );
    cluster.center = VectorAtoms.scale(newCenter, 1 / cluster.members.length);

    return cluster;
  }

  /**
   * Gets total number of instances across all clusters
   */
  _totalInstances() {
    return this.clusters.reduce((sum, cluster) => sum + cluster.members.length, 0);
  }

  /**
   * Finds nearest cluster to instance
   */
  findNearestCluster(instance) {
    if (this.clusters.length === 0) return null;

    let nearestCluster = this.clusters[0];
    let maxSimilarity = this._computeSimilarity(instance, this.clusters[0].center);

    for (let i = 1; i < this.clusters.length; i++) {
      const similarity = this._computeSimilarity(instance, this.clusters[i].center);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        nearestCluster = this.clusters[i];
      }
    }

    return {
      cluster: nearestCluster,
      similarity: maxSimilarity
    };
  }

  /**
   * Gets cluster by ID
   */
  getCluster(clusterId) {
    return this.clusters.find(c => c.id === clusterId);
  }

  /**
   * Gets all clusters
   */
  getAllClusters() {
    return this.clusters;
  }

  /**
   * Gets cluster statistics
   */
  getClusterStatistics(clusterId) {
    const cluster = this.getCluster(clusterId);
    if (!cluster) return null;

    return {
      id: cluster.id,
      size: cluster.members.length,
      age: Date.now() - cluster.createdAt,
      centerMagnitude: VectorAtoms.magnitude(cluster.center),
      avgMemberSimilarity: this._computeAvgMemberSimilarity(cluster)
    };
  }

  /**
   * Computes average similarity of members to center
   */
  _computeAvgMemberSimilarity(cluster) {
    if (cluster.members.length === 0) return 0;

    const similarities = cluster.members.map(member =>
      this._computeSimilarity(member.instance, cluster.center)
    );

    return StatisticalAtoms.mean(similarities);
  }

  /**
   * Merges similar clusters
   */
  mergeSimilarClusters(threshold = 0.9) {
    const merged = [];

    for (let i = 0; i < this.clusters.length; i++) {
      for (let j = i + 1; j < this.clusters.length; j++) {
        const similarity = this._computeSimilarity(
          this.clusters[i].center,
          this.clusters[j].center
        );

        if (similarity > threshold) {
          // Merge j into i
          const newCenter = VectorAtoms.lerp(
            this.clusters[i].center,
            this.clusters[j].center,
            0.5
          );

          this.clusters[i].center = newCenter;
          this.clusters[i].members.push(...this.clusters[j].members);

          merged.push({
            clusterId1: this.clusters[i].id,
            clusterId2: this.clusters[j].id,
            newId: this.clusters[i].id
          });

          // Remove cluster j
          this.clusters.splice(j, 1);
          j--;
        }
      }
    }

    return merged;
  }

  /**
   * Removes small or old clusters (garbage collection)
   */
  pruneWeakClusters(minSize = null, maxAge = null) {
    const minSizeThreshold = minSize || this.minClusterSize;
    const pruned = [];

    this.clusters = this.clusters.filter(cluster => {
      // Check size
      if (cluster.members.length < minSizeThreshold) {
        pruned.push({ id: cluster.id, reason: 'too_small' });
        return false;
      }

      // Check age (if specified)
      if (maxAge !== null) {
        const age = Date.now() - cluster.createdAt;
        if (age > maxAge && cluster.members.length < minSizeThreshold * 2) {
          pruned.push({ id: cluster.id, reason: 'too_old' });
          return false;
        }
      }

      return true;
    });

    return pruned;
  }

  /**
   * Splits large heterogeneous clusters
   */
  splitHeterogeneousClusters(maxHeterogeneity = 0.5) {
    const newClusters = [];

    for (let cluster of this.clusters) {
      const avgSimilarity = this._computeAvgMemberSimilarity(cluster);

      if (avgSimilarity < maxHeterogeneity && cluster.members.length >= this.minClusterSize * 2) {
        // Split cluster using k-means-like approach
        const subClusters = this._splitCluster(cluster, 2);
        newClusters.push(...subClusters);

        // Remove original cluster
        const idx = this.clusters.indexOf(cluster);
        this.clusters.splice(idx, 1);
      }
    }

    this.clusters.push(...newClusters);
    return newClusters.map(c => c.id);
  }

  /**
   * Splits a cluster into k sub-clusters
   */
  _splitCluster(cluster, k = 2) {
    if (cluster.members.length < k) return [cluster];

    // Initialize k centers randomly from members
    const centers = [];
    const usedIndices = new Set();

    for (let i = 0; i < k; i++) {
      let idx;
      do {
        idx = Math.floor(Math.random() * cluster.members.length);
      } while (usedIndices.has(idx));

      usedIndices.add(idx);
      centers.push(VectorAtoms.clone(cluster.members[idx].instance));
    }

    // Assign members to nearest center
    const assignments = new Array(k).fill(null).map(() => []);

    for (let member of cluster.members) {
      let nearestIdx = 0;
      let maxSim = this._computeSimilarity(member.instance, centers[0]);

      for (let i = 1; i < k; i++) {
        const sim = this._computeSimilarity(member.instance, centers[i]);
        if (sim > maxSim) {
          maxSim = sim;
          nearestIdx = i;
        }
      }

      assignments[nearestIdx].push(member);
    }

    // Create new clusters
    const subClusters = [];
    for (let i = 0; i < k; i++) {
      if (assignments[i].length > 0) {
        subClusters.push({
          id: `K_${this.nextClusterId++}`,
          center: centers[i],
          members: assignments[i],
          createdAt: Date.now(),
          properties: { parentCluster: cluster.id }
        });
      }
    }

    return subClusters;
  }

  /**
   * Gets global statistics
   */
  getGlobalStatistics() {
    return {
      totalClusters: this.clusters.length,
      totalInstances: this._totalInstances(),
      avgClusterSize: this._totalInstances() / Math.max(1, this.clusters.length),
      largestCluster: Math.max(...this.clusters.map(c => c.members.length), 0),
      smallestCluster: Math.min(...this.clusters.map(c => c.members.length), Infinity),
      alpha: this.alpha
    };
  }

  /**
   * Resets all clusters
   */
  reset() {
    this.clusters = [];
    this.nextClusterId = 0;
  }
}
