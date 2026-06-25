/**
 * COHERENCE COMPONENT: Fixpoint Engine
 * Purpose: Iteratively refine state until reaching self-consistent fixpoint
 * Role: The "neural oscillation" - rhythmic processing until coherence emerges
 */

import { VectorAtoms } from '../primitives/vector.js';
import { ConvergenceChecker } from './convergence.js';

export class FixpointEngine {
  constructor(config = {}) {
    this.maxIterations = config.maxIterations || 100;
    this.minIterations = config.minIterations || 5;
    this.convergenceThreshold = config.convergenceThreshold || 0.8;
    this.enableDamping = config.enableDamping !== false;
    this.dampingFactor = config.dampingFactor || 0.9;
    this.enableMomentum = config.enableMomentum || false;
    this.momentumFactor = config.momentumFactor || 0.1;
  }

  /**
   * Main fixpoint search: iterate until convergence
   * Returns the stable fixpoint state S*
   */
  findFixpoint(initialState, updateRule, context = {}) {
    const stateHistory = [VectorAtoms.clone(initialState)];
    let currentState = VectorAtoms.clone(initialState);
    let previousState = null;
    let momentum = VectorAtoms.createZero(currentState.length);

    const trace = {
      iterations: 0,
      converged: false,
      convergenceScore: 0,
      energyTrajectory: [],
      divergenceDetected: false
    };

    for (let iter = 0; iter < this.maxIterations; iter++) {
      previousState = VectorAtoms.clone(currentState);

      // Apply update rule
      let nextState = updateRule(currentState, {
        ...context,
        iteration: iter,
        stateHistory
      });

      // Apply damping to prevent overshooting
      if (this.enableDamping && iter > 0) {
        nextState = VectorAtoms.lerp(
          currentState,
          nextState,
          this.dampingFactor
        );
      }

      // Apply momentum
      if (this.enableMomentum && iter > 0) {
        const delta = VectorAtoms.subtract(nextState, currentState);
        momentum = VectorAtoms.add(
          VectorAtoms.scale(momentum, this.momentumFactor),
          delta
        );
        nextState = VectorAtoms.add(nextState, VectorAtoms.scale(momentum, 0.1));
      }

      currentState = nextState;
      stateHistory.push(VectorAtoms.clone(currentState));

      // Track energy
      const energy = VectorAtoms.magnitude(currentState) ** 2;
      trace.energyTrajectory.push(energy);

      // Check for divergence (energy exploding)
      if (energy > 1e6) {
        trace.divergenceDetected = true;
        currentState = VectorAtoms.normalize(currentState);
        break;
      }

      // Check convergence (but enforce minimum iterations)
      if (iter >= this.minIterations) {
        const convergenceResult = ConvergenceChecker.multiCriteriaConvergence(
          currentState,
          previousState,
          stateHistory
        );

        trace.convergenceScore = ConvergenceChecker.convergenceScore(
          currentState,
          previousState,
          stateHistory
        );

        if (convergenceResult.converged || trace.convergenceScore >= this.convergenceThreshold) {
          trace.converged = true;
          trace.iterations = iter + 1;
          trace.convergenceCriteria = convergenceResult.criteria;
          break;
        }
      }

      // Check for oscillation
      if (iter >= 10) {
        if (ConvergenceChecker.oscillationDetection(stateHistory)) {
          // Average the oscillating states to break the cycle
          const recentStates = stateHistory.slice(-4);
          currentState = recentStates.reduce(
            (sum, state) => VectorAtoms.add(sum, state),
            VectorAtoms.createZero(currentState.length)
          );
          currentState = VectorAtoms.scale(currentState, 1 / recentStates.length);

          trace.converged = true;
          trace.iterations = iter + 1;
          trace.oscillationResolved = true;
          break;
        }
      }

      trace.iterations = iter + 1;
    }

    // If max iterations reached without convergence, use current state
    if (!trace.converged) {
      trace.converged = false;
      trace.convergenceScore = ConvergenceChecker.convergenceScore(
        currentState,
        previousState,
        stateHistory
      );
    }

    return {
      fixpoint: currentState,
      trace,
      stateHistory
    };
  }

  /**
   * Finds multiple fixpoints by running from different initial conditions
   */
  findMultipleFixpoints(initialState, updateRule, context = {}, numFixpoints = 3) {
    const fixpoints = [];

    for (let i = 0; i < numFixpoints; i++) {
      // Perturb initial state
      const perturbation = VectorAtoms.createRandom(
        initialState.length,
        Math.random() + i * 0.1
      );
      const perturbedState = VectorAtoms.add(
        initialState,
        VectorAtoms.scale(perturbation, 0.2)
      );

      const result = this.findFixpoint(perturbedState, updateRule, context);
      fixpoints.push(result);
    }

    return fixpoints;
  }

  /**
   * Adaptive fixpoint search with dynamic parameters
   */
  adaptiveFindFixpoint(initialState, updateRule, context = {}) {
    let currentConfig = { ...this };
    let result = this.findFixpoint(initialState, updateRule, context);

    // If didn't converge, try again with adjusted parameters
    if (!result.trace.converged) {
      // Increase damping
      currentConfig.dampingFactor = 0.7;
      currentConfig.maxIterations = 150;

      const engine = new FixpointEngine(currentConfig);
      result = engine.findFixpoint(initialState, updateRule, context);
    }

    // If still diverging, add strong damping
    if (result.trace.divergenceDetected) {
      currentConfig.dampingFactor = 0.5;
      currentConfig.maxIterations = 200;

      const engine = new FixpointEngine(currentConfig);
      result = engine.findFixpoint(initialState, updateRule, context);
    }

    return result;
  }

  /**
   * Hierarchical fixpoint search: coarse-to-fine
   */
  hierarchicalFixpoint(initialState, updateRule, context = {}, levels = 3) {
    let currentState = VectorAtoms.clone(initialState);
    const levelResults = [];

    for (let level = 0; level < levels; level++) {
      // Adjust convergence threshold per level
      const levelConfig = {
        ...this,
        convergenceThreshold: 0.6 + (level * 0.1),
        maxIterations: 30 + (level * 20)
      };

      const engine = new FixpointEngine(levelConfig);
      const result = engine.findFixpoint(currentState, updateRule, {
        ...context,
        hierarchyLevel: level
      });

      levelResults.push(result);
      currentState = result.fixpoint;
    }

    return {
      finalFixpoint: currentState,
      levels: levelResults
    };
  }

  /**
   * Constrained fixpoint search with boundary enforcement
   */
  constrainedFixpoint(initialState, updateRule, constraints, context = {}) {
    const constrainedUpdateRule = (state, ctx) => {
      const updated = updateRule(state, ctx);

      // Enforce constraints
      if (constraints.maxMagnitude) {
        const mag = VectorAtoms.magnitude(updated);
        if (mag > constraints.maxMagnitude) {
          return VectorAtoms.scale(updated, constraints.maxMagnitude / mag);
        }
      }

      if (constraints.bounds) {
        const constrained = new Float64Array(updated.length);
        for (let i = 0; i < updated.length; i++) {
          constrained[i] = Math.max(
            constraints.bounds.min,
            Math.min(constraints.bounds.max, updated[i])
          );
        }
        return constrained;
      }

      return updated;
    };

    return this.findFixpoint(initialState, constrainedUpdateRule, context);
  }
}
