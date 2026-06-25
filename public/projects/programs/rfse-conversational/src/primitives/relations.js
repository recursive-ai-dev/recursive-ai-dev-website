/**
 * ATOMIC PRIMITIVE: Relational Operations
 * Purpose: Define how states relate and transform through algebraic properties
 * Role: The "chemical bonds" - how atoms connect and interact
 */

import { VectorAtoms } from './vector.js';

export const RelationalAtoms = {
  /**
   * Identity operation - returns state unchanged
   * Axiom: ∀s: I(s) = s
   */
  identity(state) {
    return VectorAtoms.clone(state);
  },

  /**
   * Commutative relation - order-independent combination
   * Axiom: a ⊕ b = b ⊕ a
   */
  commutativeBlend(s1, s2, weight = 0.5) {
    return VectorAtoms.lerp(s1, s2, weight);
  },

  /**
   * Associative chaining - grouped application yields same result
   * Axiom: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)
   */
  associativeChain(states) {
    if (states.length === 0) return VectorAtoms.createZero(1);
    if (states.length === 1) return VectorAtoms.clone(states[0]);

    let result = VectorAtoms.clone(states[0]);
    for (let i = 1; i < states.length; i++) {
      result = VectorAtoms.add(result, states[i]);
    }
    return VectorAtoms.scale(result, 1 / states.length);
  },

  /**
   * Inverse operation - creates opposite state
   * Axiom: s ⊕ inv(s) = I
   */
  inverse(state) {
    return VectorAtoms.scale(state, -1);
  },

  /**
   * Distributive property - spread operation across components
   * Axiom: a ⊗ (b ⊕ c) = (a ⊗ b) ⊕ (a ⊗ c)
   */
  distribute(state, components) {
    return components.map(comp =>
      VectorAtoms.hadamard(state, comp)
    );
  },

  /**
   * Closure check - ensure result stays within valid domain
   */
  enforceClosure(state, bounds = { min: -1, max: 1 }) {
    const result = new Float64Array(state.length);
    for (let i = 0; i < state.length; i++) {
      result[i] = Math.max(bounds.min, Math.min(bounds.max, state[i]));
    }
    return result;
  },

  /**
   * Homomorphism - structure-preserving transformation
   * Maps operation in one domain to operation in another
   */
  homomorphicMap(state, mappingFn) {
    const result = new Float64Array(state.length);
    for (let i = 0; i < state.length; i++) {
      result[i] = mappingFn(state[i], i);
    }
    return result;
  },

  /**
   * Isomorphism check - bidirectional structure preservation
   */
  isIsomorphic(s1, s2, tolerance = 0.01) {
    if (s1.length !== s2.length) return false;
    const ratio = s1[0] / (s2[0] || 1);
    for (let i = 1; i < s1.length; i++) {
      const currentRatio = s1[i] / (s2[i] || 1);
      if (Math.abs(currentRatio - ratio) > tolerance) return false;
    }
    return true;
  },

  /**
   * Reflection - mirror state across origin
   */
  reflect(state, axis = null) {
    if (axis === null) {
      return VectorAtoms.scale(state, -1);
    }
    // Reflect across specific axis
    const normalized = VectorAtoms.normalize(axis);
    const projection = VectorAtoms.scale(
      normalized,
      2 * VectorAtoms.dot(state, normalized)
    );
    return VectorAtoms.subtract(projection, state);
  },

  /**
   * Rotation in state space - preserves magnitude
   */
  rotate(state, angle) {
    if (state.length < 2) return VectorAtoms.clone(state);
    const result = VectorAtoms.clone(state);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Rotate in 2D planes
    for (let i = 0; i < state.length - 1; i += 2) {
      const x = state[i];
      const y = state[i + 1];
      result[i] = x * cos - y * sin;
      result[i + 1] = x * sin + y * cos;
    }
    return result;
  },

  /**
   * Conjugation - similarity transformation
   * Axiom: conj(s, h) = h ⊕ s ⊕ inv(h)
   */
  conjugate(state, transform) {
    const forward = VectorAtoms.add(transform, state);
    const invTransform = RelationalAtoms.inverse(transform);
    return VectorAtoms.add(forward, invTransform);
  }
};
