/**
 * AXIOM COMPONENT: Base Axiom Library
 * Purpose: Fundamental operations that define state transformations
 * Role: The "genetic code" - defines available operations
 */

import { VectorAtoms } from '../primitives/vector.js';
import { RelationalAtoms } from '../primitives/relations.js';
import { StatisticalAtoms } from '../primitives/statistics.js';

/**
 * Axiom: A named operation that transforms states
 * Each axiom has:
 * - name: identifier
 * - operation: function that transforms state
 * - properties: algebraic properties (commutative, associative, etc.)
 * - complexity: computational cost
 */

export const BaseAxioms = {
  /**
   * IDENTITY AXIOM: Return state unchanged
   * Property: ∀s: I(s) = s
   */
  identity: {
    name: 'identity',
    operation: (state) => RelationalAtoms.identity(state),
    properties: ['identity'],
    complexity: 0.1
  },

  /**
   * COMMUTATIVE BLEND: Symmetric combination
   * Property: blend(a, b) = blend(b, a)
   */
  commutativeBlend: {
    name: 'commutativeBlend',
    operation: (state, context = null) => {
      if (context && context.alternateState) {
        return RelationalAtoms.commutativeBlend(state, context.alternateState, 0.5);
      }
      return VectorAtoms.scale(state, 0.95);
    },
    properties: ['commutative', 'continuous'],
    complexity: 0.3
  },

  /**
   * ASSOCIATIVE REDUCTION: Collapse multiple states
   * Property: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)
   */
  associativeReduction: {
    name: 'associativeReduction',
    operation: (state, context = null) => {
      if (context && context.stateHistory && context.stateHistory.length > 0) {
        const recent = context.stateHistory.slice(-3);
        return RelationalAtoms.associativeChain([state, ...recent]);
      }
      return VectorAtoms.normalize(state);
    },
    properties: ['associative', 'reductive'],
    complexity: 0.5
  },

  /**
   * INVERSE REFLECTION: Create opposite state
   * Property: s ⊕ inv(s) = I
   */
  inverseReflection: {
    name: 'inverseReflection',
    operation: (state) => RelationalAtoms.inverse(state),
    properties: ['invertible'],
    complexity: 0.2
  },

  /**
   * ROTATION: Preserve magnitude, change direction
   * Property: ||rotate(s)|| = ||s||
   */
  rotation: {
    name: 'rotation',
    operation: (state, context = null) => {
      const angle = context?.rotationAngle || (Math.PI / 4);
      return RelationalAtoms.rotate(state, angle);
    },
    properties: ['isometric', 'continuous'],
    complexity: 0.4
  },

  /**
   * NORMALIZATION: Scale to unit magnitude
   * Property: ||normalize(s)|| = 1
   */
  normalization: {
    name: 'normalization',
    operation: (state) => VectorAtoms.normalize(state),
    properties: ['idempotent', 'continuous'],
    complexity: 0.3
  },

  /**
   * AMPLIFICATION: Increase magnitude
   */
  amplification: {
    name: 'amplification',
    operation: (state, context = null) => {
      const factor = context?.amplificationFactor || 1.2;
      return VectorAtoms.scale(state, factor);
    },
    properties: ['monotonic'],
    complexity: 0.2
  },

  /**
   * DAMPING: Decrease magnitude
   */
  damping: {
    name: 'damping',
    operation: (state, context = null) => {
      const factor = context?.dampingFactor || 0.8;
      return VectorAtoms.scale(state, factor);
    },
    properties: ['monotonic', 'contractive'],
    complexity: 0.2
  },

  /**
   * SIGMOID COMPRESSION: Nonlinear scaling toward bounds
   */
  sigmoidCompression: {
    name: 'sigmoidCompression',
    operation: (state) => {
      return RelationalAtoms.homomorphicMap(state, (val) =>
        StatisticalAtoms.sigmoid(val)
      );
    },
    properties: ['bounded', 'continuous'],
    complexity: 0.5
  },

  /**
   * TANH ACTIVATION: Bounded symmetric transformation
   */
  tanhActivation: {
    name: 'tanhActivation',
    operation: (state) => {
      return RelationalAtoms.homomorphicMap(state, (val) =>
        StatisticalAtoms.tanh(val)
      );
    },
    properties: ['bounded', 'continuous', 'symmetric'],
    complexity: 0.5
  },

  /**
   * RELU THRESHOLD: Zero out negative values
   */
  reluThreshold: {
    name: 'reluThreshold',
    operation: (state) => {
      return RelationalAtoms.homomorphicMap(state, (val) =>
        StatisticalAtoms.relu(val)
      );
    },
    properties: ['piecewise', 'monotonic'],
    complexity: 0.3
  },

  /**
   * GAUSSIAN NOISE: Add random perturbation
   */
  gaussianNoise: {
    name: 'gaussianNoise',
    operation: (state, context = null) => {
      const stdDev = context?.noiseLevel || 0.1;
      const noise = new Float64Array(state.length);
      for (let i = 0; i < state.length; i++) {
        noise[i] = StatisticalAtoms.randomGaussian(0, stdDev);
      }
      return VectorAtoms.add(state, noise);
    },
    properties: ['stochastic'],
    complexity: 0.4
  },

  /**
   * SOFTMAX DISTRIBUTION: Convert to probability distribution
   */
  softmaxDistribution: {
    name: 'softmaxDistribution',
    operation: (state, context = null) => {
      const temperature = context?.temperature || 1.0;
      const probabilities = StatisticalAtoms.softmax(Array.from(state), temperature);
      return Float64Array.from(probabilities);
    },
    properties: ['bounded', 'normalized'],
    complexity: 0.6
  },

  /**
   * CROSS PRODUCT BLEND: Combine orthogonal components
   */
  crossProductBlend: {
    name: 'crossProductBlend',
    operation: (state, context = null) => {
      if (context?.alternateState) {
        return VectorAtoms.hadamard(state, context.alternateState);
      }
      return VectorAtoms.hadamard(state, state);
    },
    properties: ['bilinear'],
    complexity: 0.4
  },

  /**
   * INTERPOLATION: Linear blend between states
   */
  interpolation: {
    name: 'interpolation',
    operation: (state, context = null) => {
      if (context?.targetState) {
        const t = context.interpolationFactor || 0.5;
        return VectorAtoms.lerp(state, context.targetState, t);
      }
      return state;
    },
    properties: ['continuous', 'convex'],
    complexity: 0.3
  },

  /**
   * REFLECTION: Mirror across hyperplane
   */
  reflection: {
    name: 'reflection',
    operation: (state, context = null) => {
      if (context?.reflectionAxis) {
        return RelationalAtoms.reflect(state, context.reflectionAxis);
      }
      return RelationalAtoms.reflect(state);
    },
    properties: ['isometric', 'involutive'],
    complexity: 0.5
  }
};

/**
 * Get all axiom names
 */
export function getAllAxiomNames() {
  return Object.keys(BaseAxioms);
}

/**
 * Get axiom by name
 */
export function getAxiom(name) {
  return BaseAxioms[name];
}

/**
 * Get axioms by property
 */
export function getAxiomsByProperty(property) {
  return Object.values(BaseAxioms).filter(axiom =>
    axiom.properties.includes(property)
  );
}

/**
 * Get axioms below complexity threshold
 */
export function getSimpleAxioms(maxComplexity = 0.5) {
  return Object.values(BaseAxioms).filter(axiom =>
    axiom.complexity <= maxComplexity
  );
}
