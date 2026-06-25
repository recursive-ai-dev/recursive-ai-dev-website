/**
 * ATOMIC PRIMITIVE: Matrix Operations
 * Purpose: Linear transformations and state space mappings
 * Role: The "skeletal structure" - provides rigid transformations for state spaces
 */

import { VectorAtoms } from './vector.js';

export const MatrixAtoms = {
  /**
   * Creates an identity matrix
   */
  identity(size) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
      const row = new Float64Array(size);
      row[i] = 1;
      matrix.push(row);
    }
    return matrix;
  },

  /**
   * Creates a zero matrix
   */
  zero(rows, cols) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
      matrix.push(new Float64Array(cols));
    }
    return matrix;
  },

  /**
   * Creates a random matrix
   */
  random(rows, cols, seed = Math.random()) {
    const matrix = [];
    let state = seed;
    for (let i = 0; i < rows; i++) {
      const row = new Float64Array(cols);
      for (let j = 0; j < cols; j++) {
        state = (state * 9301 + 49297) % 233280;
        row[j] = (state / 233280) * 2 - 1; // Range [-1, 1]
      }
      matrix.push(row);
    }
    return matrix;
  },

  /**
   * Matrix-vector multiplication
   */
  vectorMultiply(matrix, vector) {
    const result = new Float64Array(matrix.length);
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < Math.min(matrix[i].length, vector.length); j++) {
        sum += matrix[i][j] * vector[j];
      }
      result[i] = sum;
    }
    return result;
  },

  /**
   * Matrix-matrix multiplication
   */
  multiply(m1, m2) {
    const rows = m1.length;
    const cols = m2[0].length;
    const inner = m2.length;

    const result = MatrixAtoms.zero(rows, cols);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < inner; k++) {
          sum += m1[i][k] * m2[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  },

  /**
   * Matrix transpose
   */
  transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = MatrixAtoms.zero(cols, rows);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j];
      }
    }
    return result;
  },

  /**
   * Frobenius norm (matrix magnitude)
   */
  frobeniusNorm(matrix) {
    let sum = 0;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        sum += matrix[i][j] ** 2;
      }
    }
    return Math.sqrt(sum);
  },

  /**
   * Hadamard (element-wise) product
   */
  hadamard(m1, m2) {
    const rows = Math.min(m1.length, m2.length);
    const cols = Math.min(m1[0].length, m2[0].length);
    const result = MatrixAtoms.zero(rows, cols);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] = m1[i][j] * m2[i][j];
      }
    }
    return result;
  },

  /**
   * Scalar multiplication
   */
  scale(matrix, scalar) {
    return matrix.map(row =>
      row.map(val => val * scalar)
    );
  },

  /**
   * Matrix addition
   */
  add(m1, m2) {
    const rows = Math.min(m1.length, m2.length);
    const cols = Math.min(m1[0].length, m2[0].length);
    const result = MatrixAtoms.zero(rows, cols);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] = m1[i][j] + m2[i][j];
      }
    }
    return result;
  },

  /**
   * Rotation matrix in 2D
   */
  rotation2D(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      Float64Array.from([cos, -sin]),
      Float64Array.from([sin, cos])
    ];
  },

  /**
   * Creates a projection matrix onto subspace
   */
  projection(basis) {
    // Simplified projection for computational efficiency
    const dim = basis[0].length;
    const result = MatrixAtoms.zero(dim, dim);

    for (let basisVec of basis) {
      const normalized = VectorAtoms.normalize(basisVec);
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          result[i][j] += normalized[i] * normalized[j];
        }
      }
    }
    return result;
  },

  /**
   * Applies a function element-wise to matrix
   */
  map(matrix, fn) {
    return matrix.map((row, i) =>
      Float64Array.from(row.map((val, j) => fn(val, i, j)))
    );
  },

  /**
   * Extracts diagonal as vector
   */
  diagonal(matrix) {
    const size = Math.min(matrix.length, matrix[0].length);
    const result = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = matrix[i][i];
    }
    return result;
  },

  /**
   * Creates diagonal matrix from vector
   */
  diagonalMatrix(vector) {
    const size = vector.length;
    const result = MatrixAtoms.zero(size, size);
    for (let i = 0; i < size; i++) {
      result[i][i] = vector[i];
    }
    return result;
  },

  /**
   * Simplified eigenvalue approximation (power iteration for dominant eigenvalue)
   */
  dominantEigenvalue(matrix, iterations = 20) {
    const size = matrix.length;
    let vector = VectorAtoms.createRandom(size);
    vector = VectorAtoms.normalize(vector);

    for (let iter = 0; iter < iterations; iter++) {
      vector = MatrixAtoms.vectorMultiply(matrix, vector);
      vector = VectorAtoms.normalize(vector);
    }

    // Rayleigh quotient
    const numerator = VectorAtoms.dot(
      MatrixAtoms.vectorMultiply(matrix, vector),
      vector
    );
    const denominator = VectorAtoms.dot(vector, vector);

    return numerator / denominator;
  }
};
