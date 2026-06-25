/**
 * COHERENCE COMPONENT: Modal Operators
 * Purpose: Define update rules for state transitions during fixpoint search
 * Role: The "synaptic transmission rules" - how signals propagate
 */

import { VectorAtoms } from '../primitives/vector.js';
import { RelationalAtoms } from '../primitives/relations.js';
import { StatisticalAtoms } from '../primitives/statistics.js';

export class ModalOperators {
  /**
   * Simple modal operator: normalize and blend with history
   */
  static simpleModal(state, context) {
    const normalized = VectorAtoms.normalize(state);

    if (context.stateHistory && context.stateHistory.length > 1) {
      const previous = context.stateHistory[context.stateHistory.length - 2];
      return VectorAtoms.lerp(normalized, previous, 0.3);
    }

    return normalized;
  }

  /**
   * Coherence-seeking modal: maximize internal consistency
   */
  static coherenceModal(state, context) {
    // Measure self-similarity across dimensions
    const dimension = state.length;
    const coherenceVector = new Float64Array(dimension);

    for (let i = 0; i < dimension; i++) {
      // Each dimension influenced by neighbors
      let influence = state[i];
      let neighborCount = 1;

      // Left neighbor
      if (i > 0) {
        influence += state[i - 1] * 0.3;
        neighborCount += 0.3;
      }

      // Right neighbor
      if (i < dimension - 1) {
        influence += state[i + 1] * 0.3;
        neighborCount += 0.3;
      }

      coherenceVector[i] = influence / neighborCount;
    }

    // Blend with original
    return VectorAtoms.lerp(state, coherenceVector, 0.6);
  }

  /**
   * Stabilizing modal: push toward stable attractors
   */
  static stabilizingModal(state, context) {
    // Apply sigmoid to push values toward -1, 0, or 1
    const stabilized = RelationalAtoms.homomorphicMap(state, (val) => {
      const magnitude = Math.abs(val);
      if (magnitude < 0.3) return val * 0.5; // Push toward zero
      return StatisticalAtoms.tanh(val * 2); // Push toward ±1
    });

    return VectorAtoms.lerp(state, stabilized, 0.5);
  }

  /**
   * Exploratory modal: add controlled randomness
   */
  static exploratoryModal(state, context) {
    const exploration = context?.explorationRate || 0.1;
    const noise = new Float64Array(state.length);

    for (let i = 0; i < state.length; i++) {
      noise[i] = StatisticalAtoms.randomGaussian(0, exploration);
    }

    const noisy = VectorAtoms.add(state, noise);
    return VectorAtoms.normalize(noisy);
  }

  /**
   * Memory-based modal: influenced by recent history
   */
  static memoryModal(state, context) {
    if (!context.stateHistory || context.stateHistory.length < 3) {
      return VectorAtoms.normalize(state);
    }

    const recentStates = context.stateHistory.slice(-5);
    const memoryBlend = RelationalAtoms.associativeChain(recentStates);

    return VectorAtoms.lerp(state, memoryBlend, 0.4);
  }

  /**
   * Momentum modal: continues recent direction of change
   */
  static momentumModal(state, context) {
    if (!context.stateHistory || context.stateHistory.length < 2) {
      return state;
    }

    const previous = context.stateHistory[context.stateHistory.length - 2];
    const delta = VectorAtoms.subtract(state, previous);
    const momentumState = VectorAtoms.add(state, VectorAtoms.scale(delta, 0.2));

    return momentumState;
  }

  /**
   * Attractor modal: pull toward specific attractor points
   */
  static attractorModal(state, context) {
    const attractors = context?.attractors || [
      VectorAtoms.createZero(state.length),
      VectorAtoms.scale(VectorAtoms.createRandom(state.length), 0.5)
    ];

    // Find nearest attractor
    let nearestAttractor = attractors[0];
    let minDistance = VectorAtoms.distance(state, attractors[0]);

    for (let attractor of attractors) {
      const distance = VectorAtoms.distance(state, attractor);
      if (distance < minDistance) {
        minDistance = distance;
        nearestAttractor = attractor;
      }
    }

    // Pull toward nearest attractor
    const pullStrength = 0.3;
    return VectorAtoms.lerp(state, nearestAttractor, pullStrength);
  }

  /**
   * Contractive modal: reduce magnitude gradually
   */
  static contractiveModal(state, context) {
    const contractionRate = context?.contractionRate || 0.95;
    return VectorAtoms.scale(state, contractionRate);
  }

  /**
   * Expansive modal: increase magnitude gradually
   */
  static expansiveModal(state, context) {
    const expansionRate = context?.expansionRate || 1.05;
    const expanded = VectorAtoms.scale(state, expansionRate);

    // Bound to prevent explosion
    const magnitude = VectorAtoms.magnitude(expanded);
    if (magnitude > 10) {
      return VectorAtoms.scale(expanded, 10 / magnitude);
    }

    return expanded;
  }

  /**
   * Rotational modal: continuously rotate in state space
   */
  static rotationalModal(state, context) {
    const angle = context?.rotationSpeed || (Math.PI / 16);
    return RelationalAtoms.rotate(state, angle);
  }

  /**
   * Oscillatory modal: creates periodic patterns
   */
  static oscillatoryModal(state, context) {
    const iteration = context?.iteration || 0;
    const frequency = context?.oscillationFrequency || 0.2;

    const phase = iteration * frequency;
    const oscillation = Math.sin(phase);

    return VectorAtoms.scale(state, 1 + oscillation * 0.2);
  }

  /**
   * Adaptive modal: changes behavior based on convergence
   */
  static adaptiveModal(state, context) {
    const iteration = context?.iteration || 0;
    const maxIterations = context?.maxIterations || 100;
    const progress = iteration / maxIterations;

    // Early iterations: explore
    // Late iterations: exploit (stabilize)
    if (progress < 0.3) {
      return ModalOperators.exploratoryModal(state, {
        explorationRate: 0.2 * (1 - progress / 0.3)
      });
    } else if (progress < 0.7) {
      return ModalOperators.coherenceModal(state, context);
    } else {
      return ModalOperators.stabilizingModal(state, context);
    }
  }

  /**
   * Compositional modal: combines multiple operators
   */
  static compositionalModal(state, context) {
    // Apply multiple operators in sequence
    let result = state;

    result = ModalOperators.coherenceModal(result, context);
    result = ModalOperators.memoryModal(result, context);
    result = ModalOperators.stabilizingModal(result, context);

    return result;
  }

  /**
   * Context-sensitive modal: behavior depends on state properties
   */
  static contextSensitiveModal(state, context) {
    const magnitude = VectorAtoms.magnitude(state);

    if (magnitude < 0.1) {
      // Small magnitude: amplify
      return ModalOperators.expansiveModal(state, context);
    } else if (magnitude > 2.0) {
      // Large magnitude: contract
      return ModalOperators.contractiveModal(state, context);
    } else {
      // Medium magnitude: seek coherence
      return ModalOperators.coherenceModal(state, context);
    }
  }

  /**
   * Creates a custom modal operator from axiom sequence
   */
  static createAxiomModal(axiomSequence) {
    return (state, context) => {
      let current = state;

      for (let axiom of axiomSequence) {
        current = axiom.operation(current, context);
      }

      return current;
    };
  }

  /**
   * Selects appropriate modal operator based on context
   */
  static selectModal(context) {
    const mode = context?.modalMode || 'adaptive';

    const modalMap = {
      'simple': ModalOperators.simpleModal,
      'coherence': ModalOperators.coherenceModal,
      'stabilizing': ModalOperators.stabilizingModal,
      'exploratory': ModalOperators.exploratoryModal,
      'memory': ModalOperators.memoryModal,
      'momentum': ModalOperators.momentumModal,
      'attractor': ModalOperators.attractorModal,
      'contractive': ModalOperators.contractiveModal,
      'expansive': ModalOperators.expansiveModal,
      'rotational': ModalOperators.rotationalModal,
      'oscillatory': ModalOperators.oscillatoryModal,
      'adaptive': ModalOperators.adaptiveModal,
      'compositional': ModalOperators.compositionalModal,
      'contextSensitive': ModalOperators.contextSensitiveModal
    };

    return modalMap[mode] || ModalOperators.adaptiveModal;
  }
}
