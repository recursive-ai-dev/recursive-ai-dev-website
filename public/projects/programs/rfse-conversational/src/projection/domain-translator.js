/**
 * PROJECTION COMPONENT: Domain Translator
 * Purpose: High-level orchestration of cross-domain translations
 * Role: The "association cortex" - integrates multiple mappings
 */

import { VectorAtoms } from '../primitives/vector.js';
import { GaloisMapper } from './galois-mapper.js';

export class DomainTranslator {
  constructor(primaryDimension) {
    this.primaryDimension = primaryDimension;
    this.domains = new Map(); // Map of domain name -> mapper
    this.domainHistory = []; // Track domain transitions
  }

  /**
   * Registers a new conceptual domain
   */
  registerDomain(domainName, dimension = null) {
    const targetDimension = dimension || this.primaryDimension;
    const mapper = new GaloisMapper(this.primaryDimension, targetDimension);

    this.domains.set(domainName, {
      mapper,
      dimension: targetDimension,
      activationCount: 0,
      lastActivation: null
    });

    return mapper;
  }

  /**
   * Translates state into specified domain
   */
  translateToDomain(state, domainName) {
    const domain = this.domains.get(domainName);

    if (!domain) {
      // Auto-register unknown domains
      this.registerDomain(domainName);
      return this.translateToDomain(state, domainName);
    }

    // Update domain statistics
    domain.activationCount++;
    domain.lastActivation = Date.now();

    // Project to domain
    const translated = domain.mapper.projectForward(state);

    // Record transition
    this.domainHistory.push({
      from: 'primary',
      to: domainName,
      timestamp: Date.now()
    });

    return translated;
  }

  /**
   * Translates from domain back to primary
   */
  translateFromDomain(state, domainName) {
    const domain = this.domains.get(domainName);

    if (!domain) {
      throw new Error(`Unknown domain: ${domainName}`);
    }

    return domain.mapper.projectBackward(state);
  }

  /**
   * Translates between two non-primary domains
   */
  translateBetweenDomains(state, fromDomain, toDomain) {
    // Route through primary domain
    const primaryState = this.translateFromDomain(state, fromDomain);
    return this.translateToDomain(primaryState, toDomain);
  }

  /**
   * Creates a novel interpretation by projecting through random domain
   */
  novelInterpretation(state, explorationFactor = 0.5) {
    const domainNames = Array.from(this.domains.keys());

    if (domainNames.length === 0) {
      // Create temporary exploration domain
      const explorationDomain = `exploration_${Date.now()}`;
      this.registerDomain(explorationDomain, this.primaryDimension);
      domainNames.push(explorationDomain);
    }

    // Select domain based on exploration factor
    let selectedDomain;
    if (Math.random() < explorationFactor) {
      // Explore: choose random domain
      selectedDomain = domainNames[Math.floor(Math.random() * domainNames.length)];
    } else {
      // Exploit: choose least-used domain
      selectedDomain = this._getLeastUsedDomain();
    }

    // Project to domain and back
    const domainState = this.translateToDomain(state, selectedDomain);
    const interpreted = this.translateFromDomain(domainState, selectedDomain);

    return {
      interpretation: interpreted,
      domain: selectedDomain,
      originalState: state
    };
  }

  /**
   * Multi-domain synthesis: blend interpretations from multiple domains
   */
  multiDomainSynthesis(state, domainNames = null) {
    const domains = domainNames || Array.from(this.domains.keys());

    if (domains.length === 0) {
      return state;
    }

    const interpretations = domains.map(domainName => {
      const translated = this.translateToDomain(state, domainName);
      return this.translateFromDomain(translated, domainName);
    });

    // Blend all interpretations
    let synthesis = VectorAtoms.createZero(state.length);
    for (let interpretation of interpretations) {
      synthesis = VectorAtoms.add(synthesis, interpretation);
    }

    synthesis = VectorAtoms.scale(synthesis, 1 / interpretations.length);

    return {
      synthesis,
      interpretations,
      domains
    };
  }

  /**
   * Analogical reasoning: A is to B as C is to ?
   */
  solveAnalogy(stateA, stateB, stateC, domainName = null) {
    // Use specific domain or auto-select
    const targetDomain = domainName || this._selectAnalogicalDomain();

    // Project A and B to domain
    const domainA = this.translateToDomain(stateA, targetDomain);
    const domainB = this.translateToDomain(stateB, targetDomain);

    // Compute transformation in domain space
    const transformation = VectorAtoms.subtract(domainB, domainA);

    // Apply transformation to C in domain space
    const domainC = this.translateToDomain(stateC, targetDomain);
    const domainD = VectorAtoms.add(domainC, transformation);

    // Project back to primary
    const stateD = this.translateFromDomain(domainD, targetDomain);

    return {
      result: stateD,
      domain: targetDomain,
      transformation
    };
  }

  /**
   * Conceptual blending: merge two concepts via domain translation
   */
  conceptualBlending(state1, state2, blendFactor = 0.5) {
    // Create temporary blend domain
    const blendDomain = `blend_${Date.now()}`;
    this.registerDomain(blendDomain, this.primaryDimension);

    // Project both states to blend domain
    const domain1 = this.translateToDomain(state1, blendDomain);
    const domain2 = this.translateToDomain(state2, blendDomain);

    // Blend in domain space
    const blended = VectorAtoms.lerp(domain1, domain2, blendFactor);

    // Project back
    const result = this.translateFromDomain(blended, blendDomain);

    // Clean up temporary domain
    this.domains.delete(blendDomain);

    return result;
  }

  /**
   * Domain cascading: iteratively project through multiple domains
   */
  domainCascade(state, domainSequence) {
    let current = state;

    for (let domainName of domainSequence) {
      // Project to domain
      const domainState = this.translateToDomain(current, domainName);

      // Project back (creates filtered version)
      current = this.translateFromDomain(domainState, domainName);
    }

    return current;
  }

  /**
   * Learns domain correspondence from examples
   */
  learnDomainMapping(domainName, sourceSamples, targetSamples) {
    const domain = this.domains.get(domainName);

    if (!domain) {
      this.registerDomain(domainName);
      return this.learnDomainMapping(domainName, sourceSamples, targetSamples);
    }

    domain.mapper.learnCorrespondence(sourceSamples, targetSamples);
  }

  /**
   * Gets domain usage statistics
   */
  getDomainStatistics() {
    const stats = [];

    for (let [name, domain] of this.domains.entries()) {
      stats.push({
        name,
        activationCount: domain.activationCount,
        lastActivation: domain.lastActivation,
        dimension: domain.dimension
      });
    }

    stats.sort((a, b) => b.activationCount - a.activationCount);
    return stats;
  }

  /**
   * Gets least-used domain (for diversity)
   */
  _getLeastUsedDomain() {
    let minCount = Infinity;
    let leastUsed = null;

    for (let [name, domain] of this.domains.entries()) {
      if (domain.activationCount < minCount) {
        minCount = domain.activationCount;
        leastUsed = name;
      }
    }

    return leastUsed || Array.from(this.domains.keys())[0];
  }

  /**
   * Selects appropriate domain for analogical reasoning
   */
  _selectAnalogicalDomain() {
    const domains = Array.from(this.domains.keys());

    if (domains.length === 0) {
      const newDomain = 'analogical_0';
      this.registerDomain(newDomain);
      return newDomain;
    }

    // Prefer medium-used domains (not too common, not too rare)
    const stats = this.getDomainStatistics();
    const midIndex = Math.floor(stats.length / 2);
    return stats[midIndex].name;
  }

  /**
   * Prunes rarely-used domains (garbage collection)
   */
  pruneDomains(thresholdCount = 5) {
    for (let [name, domain] of this.domains.entries()) {
      if (domain.activationCount < thresholdCount) {
        this.domains.delete(name);
      }
    }
  }
}
