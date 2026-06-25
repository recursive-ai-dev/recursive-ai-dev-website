/**
 * ATOMIC PRIMITIVE: Vector Operations
 * Purpose: Fundamental mathematical operations on state vectors
 * Role: The "atoms" - building blocks for all higher operations
 */

export const VectorAtoms = {
  /**
   * Creates a zero-initialized vector of specified dimension
   */
  createZero(dimension) {
    return new Float64Array(dimension);
  },

  /**
   * Creates a random vector with values in [0, 1]
   */
  createRandom(dimension, seed = Math.random()) {
    const vec = new Float64Array(dimension);
    let state = seed;
    for (let i = 0; i < dimension; i++) {
      state = (state * 9301 + 49297) % 233280;
      vec[i] = state / 233280;
    }
    return vec;
  },

  /**
   * Creates a vector from array-like data
   */
  fromArray(arr) {
    return Float64Array.from(arr);
  },

  /**
   * Copies a vector
   */
  clone(vec) {
    return new Float64Array(vec);
  },

  /**
   * Computes L2 norm (magnitude)
   */
  magnitude(vec) {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
      sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
  },

  /**
   * Normalizes vector to unit length
   */
  normalize(vec) {
    const mag = VectorAtoms.magnitude(vec);
    if (mag === 0) return VectorAtoms.clone(vec);
    const result = new Float64Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      result[i] = vec[i] / mag;
    }
    return result;
  },

  /**
   * Computes dot product
   */
  dot(v1, v2) {
    let sum = 0;
    const len = Math.min(v1.length, v2.length);
    for (let i = 0; i < len; i++) {
      sum += v1[i] * v2[i];
    }
    return sum;
  },

  /**
   * Element-wise addition
   */
  add(v1, v2) {
    const len = Math.max(v1.length, v2.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = (v1[i] || 0) + (v2[i] || 0);
    }
    return result;
  },

  /**
   * Element-wise subtraction
   */
  subtract(v1, v2) {
    const len = Math.max(v1.length, v2.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = (v1[i] || 0) - (v2[i] || 0);
    }
    return result;
  },

  /**
   * Scalar multiplication
   */
  scale(vec, scalar) {
    const result = new Float64Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      result[i] = vec[i] * scalar;
    }
    return result;
  },

  /**
   * Element-wise multiplication (Hadamard product)
   */
  hadamard(v1, v2) {
    const len = Math.min(v1.length, v2.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = v1[i] * v2[i];
    }
    return result;
  },

  /**
   * Computes distance between two vectors
   */
  distance(v1, v2) {
    return VectorAtoms.magnitude(VectorAtoms.subtract(v1, v2));
  },

  /**
   * Linear interpolation between two vectors
   */
  lerp(v1, v2, t) {
    const result = new Float64Array(v1.length);
    for (let i = 0; i < v1.length; i++) {
      result[i] = v1[i] * (1 - t) + (v2[i] || 0) * t;
    }
    return result;
  },

  /**
   * Checks if two vectors are equal within epsilon
   */
  equals(v1, v2, epsilon = 1e-10) {
    if (v1.length !== v2.length) return false;
    for (let i = 0; i < v1.length; i++) {
      if (Math.abs(v1[i] - v2[i]) > epsilon) return false;
    }
    return true;
  }
};
