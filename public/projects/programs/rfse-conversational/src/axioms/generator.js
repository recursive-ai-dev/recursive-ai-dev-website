/**
 * AXIOM COMPONENT: Axiom Generator
 * Purpose: Create new axioms dynamically from learned patterns
 * Role: The "DNA transcription" - generates new genetic instructions
 */

import { VectorAtoms } from '../primitives/vector.js';
import { RelationalAtoms } from '../primitives/relations.js';
import { MatrixAtoms } from '../primitives/matrix.js';
import { BaseAxioms } from './base-axioms.js';

export class AxiomGenerator {
  constructor() {
    this.generatedAxioms = new Map();
    this.axiomIdCounter = 0;
  }

  /**
   * Generates a new axiom by composing existing axioms
   */
  composeAxioms(axiom1Name, axiom2Name, compositionType = 'sequential') {
    const axiom1 = BaseAxioms[axiom1Name];
    const axiom2 = BaseAxioms[axiom2Name];

    if (!axiom1 || !axiom2) return null;

    const newAxiomId = `composed_${this.axiomIdCounter++}`;

    let operation;
    let properties = [];
    let complexity;

    switch (compositionType) {
      case 'sequential':
        // Apply axiom1 then axiom2
        operation = (state, context) => {
          const intermediate = axiom1.operation(state, context);
          return axiom2.operation(intermediate, context);
        };
        properties = [...new Set([...axiom1.properties, ...axiom2.properties])];
        complexity = axiom1.complexity + axiom2.complexity;
        break;

      case 'parallel':
        // Apply both and blend results
        operation = (state, context) => {
          const result1 = axiom1.operation(state, context);
          const result2 = axiom2.operation(state, context);
          return VectorAtoms.lerp(result1, result2, 0.5);
        };
        properties = ['continuous'];
        complexity = Math.max(axiom1.complexity, axiom2.complexity) + 0.2;
        break;

      case 'conditional':
        // Apply axiom1 if condition, else axiom2
        operation = (state, context) => {
          const magnitude = VectorAtoms.magnitude(state);
          if (magnitude > 0.5) {
            return axiom1.operation(state, context);
          } else {
            return axiom2.operation(state, context);
          }
        };
        properties = ['piecewise'];
        complexity = (axiom1.complexity + axiom2.complexity) / 2 + 0.3;
        break;

      case 'weighted':
        // Weighted blend based on state properties
        operation = (state, context) => {
          const result1 = axiom1.operation(state, context);
          const result2 = axiom2.operation(state, context);
          const magnitude = VectorAtoms.magnitude(state);
          const weight = Math.min(1, magnitude);
          return VectorAtoms.lerp(result1, result2, weight);
        };
        properties = ['continuous', 'adaptive'];
        complexity = axiom1.complexity + axiom2.complexity + 0.2;
        break;
    }

    const newAxiom = {
      name: newAxiomId,
      operation,
      properties,
      complexity,
      parentAxioms: [axiom1Name, axiom2Name],
      compositionType
    };

    this.generatedAxioms.set(newAxiomId, newAxiom);
    return newAxiom;
  }

  /**
   * Generates a parametric axiom family
   * Creates multiple axioms with varying parameters
   */
  generateParametricFamily(baseAxiomName, parameterRange) {
    const baseAxiom = BaseAxioms[baseAxiomName];
    if (!baseAxiom) return [];

    const family = [];

    for (let param of parameterRange) {
      const axiomId = `${baseAxiomName}_p${param.toFixed(2)}`;

      const newAxiom = {
        name: axiomId,
        operation: (state, context) => {
          const modifiedContext = { ...context, parameter: param };
          return baseAxiom.operation(state, modifiedContext);
        },
        properties: [...baseAxiom.properties, 'parametric'],
        complexity: baseAxiom.complexity + 0.1,
        baseAxiom: baseAxiomName,
        parameter: param
      };

      this.generatedAxioms.set(axiomId, newAxiom);
      family.push(newAxiom);
    }

    return family;
  }

  /**
   * Generates an axiom from a transformation matrix
   * Learned from successful state transitions
   */
  generateFromMatrix(transformMatrix, name = null) {
    const axiomId = name || `matrix_${this.axiomIdCounter++}`;

    const newAxiom = {
      name: axiomId,
      operation: (state) => {
        return MatrixAtoms.vectorMultiply(transformMatrix, state);
      },
      properties: ['linear', 'learned'],
      complexity: 0.7,
      transformMatrix
    };

    this.generatedAxioms.set(axiomId, newAxiom);
    return newAxiom;
  }

  /**
   * Generates an axiom that combines multiple base axioms with learned weights
   */
  generateWeightedCombination(axiomNames, weights) {
    const axiomId = `weighted_combo_${this.axiomIdCounter++}`;

    const axioms = axiomNames.map(name => BaseAxioms[name]).filter(a => a);

    const newAxiom = {
      name: axiomId,
      operation: (state, context) => {
        let result = VectorAtoms.createZero(state.length);

        for (let i = 0; i < axioms.length; i++) {
          const transformed = axioms[i].operation(state, context);
          const weighted = VectorAtoms.scale(transformed, weights[i]);
          result = VectorAtoms.add(result, weighted);
        }

        return result;
      },
      properties: ['composite', 'weighted', 'learned'],
      complexity: axioms.reduce((sum, a) => sum + a.complexity, 0) / axioms.length + 0.3,
      components: axiomNames,
      weights
    };

    this.generatedAxioms.set(axiomId, newAxiom);
    return newAxiom;
  }

  /**
   * Generates an adaptive axiom that modifies behavior based on history
   */
  generateAdaptiveAxiom(baseAxiomName) {
    const baseAxiom = BaseAxioms[baseAxiomName];
    if (!baseAxiom) return null;

    const axiomId = `adaptive_${baseAxiomName}`;

    const newAxiom = {
      name: axiomId,
      operation: (state, context) => {
        // Adapt based on recent success
        const successRate = context?.recentSuccessRate || 0.5;

        if (successRate > 0.7) {
          // High success: amplify the operation
          const result = baseAxiom.operation(state, context);
          return VectorAtoms.scale(result, 1.2);
        } else if (successRate < 0.3) {
          // Low success: dampen the operation
          const result = baseAxiom.operation(state, context);
          return VectorAtoms.scale(result, 0.8);
        } else {
          // Medium success: apply normally
          return baseAxiom.operation(state, context);
        }
      },
      properties: [...baseAxiom.properties, 'adaptive', 'meta'],
      complexity: baseAxiom.complexity + 0.4,
      baseAxiom: baseAxiomName
    };

    this.generatedAxioms.set(axiomId, newAxiom);
    return newAxiom;
  }

  /**
   * Generates a recursive axiom that applies itself multiple times
   */
  generateRecursiveAxiom(baseAxiomName, depth = 3) {
    const baseAxiom = BaseAxioms[baseAxiomName];
    if (!baseAxiom) return null;

    const axiomId = `recursive_${baseAxiomName}_d${depth}`;

    const newAxiom = {
      name: axiomId,
      operation: (state, context) => {
        let current = state;
        for (let i = 0; i < depth; i++) {
          current = baseAxiom.operation(current, context);
        }
        return current;
      },
      properties: [...baseAxiom.properties, 'recursive'],
      complexity: baseAxiom.complexity * depth + 0.2,
      baseAxiom: baseAxiomName,
      depth
    };

    this.generatedAxioms.set(axiomId, newAxiom);
    return newAxiom;
  }

  /**
   * Generates an axiom with memory that depends on previous applications
   */
  generateMemoryAxiom(baseAxiomName) {
    const baseAxiom = BaseAxioms[baseAxiomName];
    if (!baseAxiom) return null;

    const axiomId = `memory_${baseAxiomName}`;
    const memory = { previousStates: [] };

    const newAxiom = {
      name: axiomId,
      operation: (state, context) => {
        const result = baseAxiom.operation(state, context);

        // Store in memory
        memory.previousStates.push(VectorAtoms.clone(state));
        if (memory.previousStates.length > 5) {
          memory.previousStates.shift();
        }

        // Blend with memory
        if (memory.previousStates.length > 1) {
          const memoryVector = RelationalAtoms.associativeChain(memory.previousStates);
          return VectorAtoms.lerp(result, memoryVector, 0.2);
        }

        return result;
      },
      properties: [...baseAxiom.properties, 'stateful', 'temporal'],
      complexity: baseAxiom.complexity + 0.5,
      baseAxiom: baseAxiomName,
      memory
    };

    this.generatedAxioms.set(axiomId, newAxiom);
    return newAxiom;
  }

  /**
   * Gets a generated axiom by ID
   */
  getGeneratedAxiom(axiomId) {
    return this.generatedAxioms.get(axiomId);
  }

  /**
   * Gets all generated axioms
   */
  getAllGeneratedAxioms() {
    return Array.from(this.generatedAxioms.values());
  }

  /**
   * Clears generated axioms (garbage collection)
   */
  clearGeneratedAxioms() {
    this.generatedAxioms.clear();
    this.axiomIdCounter = 0;
  }
}
