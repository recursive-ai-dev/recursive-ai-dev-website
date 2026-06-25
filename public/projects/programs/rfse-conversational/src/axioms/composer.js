/**
 * AXIOM COMPONENT: Axiom Composer
 * Purpose: Select and orchestrate axioms for specific contexts
 * Role: The "gene expression" - decides which genes activate
 */

import { BaseAxioms, getAllAxiomNames, getAxiom } from './base-axioms.js';
import { StatisticalAtoms } from '../primitives/statistics.js';
import { VectorAtoms } from '../primitives/vector.js';

export class AxiomComposer {
  constructor(generator = null) {
    this.generator = generator;
    this.axiomScores = new Map(); // Track axiom performance
    this.axiomUsageCounts = new Map(); // Track how often each is used
  }

  /**
   * Selects appropriate axioms for a given state
   */
  selectAxiomsForState(state, count = 5) {
    const magnitude = VectorAtoms.magnitude(state);

    // Combine base axioms and generated axioms
    const baseNames = getAllAxiomNames();
    const generatedAxioms = this.generator ? this.generator.getAllGeneratedAxioms() : [];

    const baseScored = baseNames.map(name => {
      const axiom = getAxiom(name);
      const score = this._scoreAxiomForState(axiom, state, magnitude);
      return { name, axiom, score };
    });

    const generatedScored = generatedAxioms.map(axiom => {
      const score = this._scoreAxiomForState(axiom, state, magnitude);
      return { name: axiom.name, axiom, score };
    });

    const allScored = [...baseScored, ...generatedScored];

    // Sort by score and take top N
    allScored.sort((a, b) => b.score - a.score);
    return allScored.slice(0, count);
  }

  /**
   * Scores an axiom's appropriateness for a state
   */
  _scoreAxiomForState(axiom, state, magnitude) {
    let score = 0;

    // Prefer simpler axioms for small magnitude states
    if (magnitude < 0.5) {
      score += (1 - axiom.complexity);
    } else {
      score += axiom.complexity * 0.5;
    }

    // Historical performance
    const historicalScore = this.axiomScores.get(axiom.name) || 0.5;
    score += historicalScore;

    // Diversity bonus (prefer less-used axioms)
    const usageCount = this.axiomUsageCounts.get(axiom.name) || 0;
    const diversityBonus = 1 / (1 + usageCount * 0.1);
    score += diversityBonus * 0.3;

    // Property bonuses
    if (axiom.properties.includes('continuous')) score += 0.2;
    if (axiom.properties.includes('bounded')) score += 0.1;

    return score;
  }

  /**
   * Creates an axiom sequence (pipeline of operations)
   */
  composeSequence(axiomNames) {
    const axioms = axiomNames.map(name => {
      // Try base axioms first, then generated
      let axiom = getAxiom(name);
      if (!axiom && this.generator) {
        axiom = this.generator.getGeneratedAxiom(name);
      }
      return axiom;
    }).filter(a => a);

    return {
      name: `sequence_${axiomNames.join('_')}`,
      operations: axioms,
      execute: (state, context) => {
        let current = state;
        for (let axiom of axioms) {
          current = axiom.operation(current, context);
        }
        return current;
      },
      complexity: axioms.reduce((sum, a) => sum + a.complexity, 0)
    };
  }

  /**
   * Creates a probabilistic axiom mixture
   */
  composeMixture(axiomNames, weights = null) {
    const axioms = axiomNames.map(name => {
      let axiom = getAxiom(name);
      if (!axiom && this.generator) {
        axiom = this.generator.getGeneratedAxiom(name);
      }
      return axiom;
    }).filter(a => a);

    // Default to uniform weights
    if (!weights) {
      weights = new Array(axioms.length).fill(1 / axioms.length);
    }

    return {
      name: `mixture_${axiomNames.join('_')}`,
      operations: axioms,
      weights,
      execute: (state, context) => {
        // Randomly select based on weights
        const selected = StatisticalAtoms.weightedRandom(axioms, weights);
        return selected.operation(state, context);
      },
      complexity: axioms.reduce((sum, a, i) => sum + a.complexity * weights[i], 0)
    };
  }

  /**
   * Creates a conditional axiom composition
   */
  composeConditional(conditionFn, trueAxiomName, falseAxiomName) {
    const trueAxiom = getAxiom(trueAxiomName) || (this.generator && this.generator.getGeneratedAxiom(trueAxiomName));
    const falseAxiom = getAxiom(falseAxiomName) || (this.generator && this.generator.getGeneratedAxiom(falseAxiomName));

    return {
      name: `conditional_${trueAxiomName}_${falseAxiomName}`,
      execute: (state, context) => {
        if (conditionFn(state, context)) {
          return trueAxiom.operation(state, context);
        } else {
          return falseAxiom.operation(state, context);
        }
      },
      complexity: (trueAxiom.complexity + falseAxiom.complexity) / 2 + 0.2
    };
  }

  /**
   * Creates an axiom ensemble (apply all and aggregate)
   */
  composeEnsemble(axiomNames, aggregationMethod = 'average') {
    const axioms = axiomNames.map(name => {
      let axiom = getAxiom(name);
      if (!axiom && this.generator) {
        axiom = this.generator.getGeneratedAxiom(name);
      }
      return axiom;
    }).filter(a => a);

    return {
      name: `ensemble_${axiomNames.join('_')}`,
      operations: axioms,
      execute: (state, context) => {
        const results = axioms.map(axiom =>
          axiom.operation(VectorAtoms.clone(state), context)
        );

        switch (aggregationMethod) {
          case 'average':
            return RelationalAtoms.associativeChain(results);

          case 'max':
            // Element-wise maximum
            const maxResult = new Float64Array(state.length);
            for (let i = 0; i < state.length; i++) {
              maxResult[i] = Math.max(...results.map(r => r[i]));
            }
            return maxResult;

          case 'min':
            // Element-wise minimum
            const minResult = new Float64Array(state.length);
            for (let i = 0; i < state.length; i++) {
              minResult[i] = Math.min(...results.map(r => r[i]));
            }
            return minResult;

          case 'median':
            // Element-wise median
            const medianResult = new Float64Array(state.length);
            for (let i = 0; i < state.length; i++) {
              const values = results.map(r => r[i]).sort((a, b) => a - b);
              medianResult[i] = values[Math.floor(values.length / 2)];
            }
            return medianResult;

          default:
            return RelationalAtoms.associativeChain(results);
        }
      },
      complexity: axioms.reduce((sum, a) => sum + a.complexity, 0) / axioms.length + 0.4
    };
  }

  /**
   * Updates axiom scores based on feedback
   */
  updateAxiomScore(axiomName, feedback) {
    const currentScore = this.axiomScores.get(axiomName) || 0.5;
    const alpha = 0.1; // Learning rate
    const newScore = StatisticalAtoms.ema(feedback, currentScore, alpha);
    this.axiomScores.set(axiomName, newScore);
  }

  /**
   * Records axiom usage
   */
  recordAxiomUsage(axiomName) {
    const count = this.axiomUsageCounts.get(axiomName) || 0;
    this.axiomUsageCounts.set(axiomName, count + 1);
  }

  /**
   * Gets the best-performing axioms
   */
  getBestAxioms(count = 5) {
    const scored = Array.from(this.axiomScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);

    return scored.map(([name, score]) => {
      let axiom = getAxiom(name);
      if (!axiom && this.generator) {
        axiom = this.generator.getGeneratedAxiom(name);
      }
      return {
        name,
        score,
        axiom
      };
    });
  }

  /**
   * Gets least-used axioms (for diversity)
   */
  getLeastUsedAxioms(count = 5) {
    const baseNames = getAllAxiomNames();
    const generatedNames = this.generator ? this.generator.getAllGeneratedAxioms().map(a => a.name) : [];
    const allNames = [...baseNames, ...generatedNames];

    const scored = allNames.map(name => ({
      name,
      usage: this.axiomUsageCounts.get(name) || 0
    }));

    scored.sort((a, b) => a.usage - b.usage);
    return scored.slice(0, count).map(item => {
      let axiom = getAxiom(item.name);
      if (!axiom && this.generator) {
        axiom = this.generator.getGeneratedAxiom(item.name);
      }
      return {
        name: item.name,
        axiom
      };
    });
  }

  /**
   * Decays usage counts over time (prevents stagnation)
   */
  decayUsageCounts(decayRate = 0.95) {
    for (let [name, count] of this.axiomUsageCounts.entries()) {
      this.axiomUsageCounts.set(name, count * decayRate);
    }
  }

  /**
   * Resets all scores and counts
   */
  reset() {
    this.axiomScores.clear();
    this.axiomUsageCounts.clear();
  }
}
