/**
 * ATOMIC PRIMITIVE: Statistical Operations
 * Purpose: Handle probability, distributions, and measurements
 * Role: The "endocrine system" - manages probabilistic signals and feedback
 */

export const StatisticalAtoms = {
  /**
   * Computes mean of values
   */
  mean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  },

  /**
   * Computes variance
   */
  variance(values) {
    if (values.length === 0) return 0;
    const m = StatisticalAtoms.mean(values);
    return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  },

  /**
   * Computes standard deviation
   */
  stdDev(values) {
    return Math.sqrt(StatisticalAtoms.variance(values));
  },

  /**
   * Normalizes values to [0, 1] range
   */
  normalize(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (range === 0) return values.map(() => 0.5);
    return values.map(v => (v - min) / range);
  },

  /**
   * Softmax function - converts to probability distribution
   */
  softmax(values, temperature = 1.0) {
    const scaled = values.map(v => v / temperature);
    const maxVal = Math.max(...scaled);
    const exps = scaled.map(v => Math.exp(v - maxVal));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  },

  /**
   * Samples from a probability distribution
   */
  sample(probabilities, random = Math.random()) {
    let cumulative = 0;
    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (random < cumulative) return i;
    }
    return probabilities.length - 1;
  },

  /**
   * Computes entropy of a distribution
   */
  entropy(probabilities) {
    return probabilities.reduce((sum, p) => {
      if (p <= 0) return sum;
      return sum - p * Math.log2(p);
    }, 0);
  },

  /**
   * Kullback-Leibler divergence between two distributions
   */
  klDivergence(p, q) {
    let divergence = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] > 0 && q[i] > 0) {
        divergence += p[i] * Math.log(p[i] / q[i]);
      }
    }
    return divergence;
  },

  /**
   * Cosine similarity between two vectors
   */
  cosineSimilarity(v1, v2) {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    const len = Math.min(v1.length, v2.length);
    for (let i = 0; i < len; i++) {
      dotProduct += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  },

  /**
   * Exponential moving average
   */
  ema(newValue, oldValue, alpha = 0.1) {
    return alpha * newValue + (1 - alpha) * oldValue;
  },

  /**
   * Weighted random selection
   */
  weightedRandom(items, weights, random = Math.random()) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    const index = StatisticalAtoms.sample(normalizedWeights, random);
    return items[index];
  },

  /**
   * Gaussian (normal) distribution value
   */
  gaussian(x, mean = 0, stdDev = 1) {
    const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const exponent = -((x - mean) ** 2) / (2 * stdDev ** 2);
    return coefficient * Math.exp(exponent);
  },

  /**
   * Box-Muller transform for Gaussian random numbers
   */
  randomGaussian(mean = 0, stdDev = 1) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  },

  /**
   * Sigmoid activation function
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  },

  /**
   * Tanh activation function
   */
  tanh(x) {
    return Math.tanh(x);
  },

  /**
   * ReLU activation function
   */
  relu(x) {
    return Math.max(0, x);
  },

  /**
   * Leaky ReLU activation function
   */
  leakyRelu(x, alpha = 0.01) {
    return x > 0 ? x : alpha * x;
  },

  /**
   * Pearson correlation coefficient
   */
  correlation(x, y) {
    const n = Math.min(x.length, y.length);
    const meanX = StatisticalAtoms.mean(x.slice(0, n));
    const meanY = StatisticalAtoms.mean(y.slice(0, n));

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return 0;
    return numerator / Math.sqrt(denomX * denomY);
  }
};
