/**
 * ORCHESTRATION: RFSE Core Engine
 * Purpose: The Relational Fixpoint Synthesis Engine - integrates all subsystems
 * Role: The "central nervous system" - coordinates all cognitive processes
 */

import { SymbolicAbstractionCompiler } from '../symbolic/compiler.js';
import { AxiomComposer } from '../axioms/composer.js';
import { AxiomGenerator } from '../axioms/generator.js';
import { FixpointEngine } from '../coherence/fixpoint-engine.js';
import { ModalOperators } from '../coherence/modal-operators.js';
import { DomainTranslator } from '../projection/domain-translator.js';
import { RecursiveOperator } from '../decomposition/recursive-operator.js';
import { FeedbackWeightedSequenceModifier } from '../feedback/sequence-modifier.js';
import { BoundlessPriorPartitionGenerator } from '../partition/cluster-generator.js';
import { TemporalCapacityEscalator } from '../temporal/capacity-escalator.js';
import { VectorAtoms } from '../primitives/vector.js';

export class RFSECore {
  constructor(config = {}) {
    this.dimension = config.dimension || 64;

    // Initialize all subsystems
    this.symbolicCompiler = new SymbolicAbstractionCompiler(this.dimension);
    this.axiomGenerator = new AxiomGenerator();
    this.axiomComposer = new AxiomComposer(this.axiomGenerator);
    this.fixpointEngine = new FixpointEngine(config.fixpointConfig || {});
    this.domainTranslator = new DomainTranslator(this.dimension);
    this.recursiveOperator = new RecursiveOperator(config.recursiveConfig || {});
    this.feedbackModifier = new FeedbackWeightedSequenceModifier();
    this.clusterGenerator = new BoundlessPriorPartitionGenerator(config.clusterConfig || {});
    this.temporalEscalator = new TemporalCapacityEscalator(config.temporalConfig || {});

    // Register conceptual domains
    this._initializeDomains();

    // System state
    this.currentState = null;
    this.conversationHistory = [];
    this.iterationCount = 0;
  }

  /**
   * Main processing pipeline: Input text → Output text
   */
  async processInput(inputText) {
    console.log('\n=== RFSE Processing:', inputText.substring(0, 50) + '...');

    // STAGE 1: Symbolic Abstraction
    const categoricalVector = this.symbolicCompiler.compile(inputText);
    console.log('→ Compiled to vector, magnitude:', VectorAtoms.magnitude(categoricalVector).toFixed(3));

    // STAGE 2: Retrieve Context
    const context = this.temporalEscalator.retrieveContext(categoricalVector);

    // STAGE 3: Find or create conceptual cluster
    const cluster = this.clusterGenerator.assignToCluster(categoricalVector, {
      text: inputText,
      timestamp: Date.now()
    });
    console.log('→ Assigned to cluster:', cluster.id);

    // STAGE 4: Select and compose axioms
    const selectedAxioms = this.axiomComposer.selectAxiomsForState(categoricalVector, 3);
    const axiomSequence = this.axiomComposer.composeSequence(
      selectedAxioms.map(a => a.name)
    );

    // Start tracking this operation path
    this.feedbackModifier.startTracking(categoricalVector);
    this.feedbackModifier.recordOperation('symbolic_compilation', categoricalVector);

    // STAGE 5: Fixpoint Search
    const modalOperator = ModalOperators.selectModal({ modalMode: 'adaptive' });

    // Create update rule that incorporates axioms
    const updateRule = (state, ctx) => {
      // Cross-domain projection (analogy-driven transition)
      if (ctx.iteration % 3 === 0) {
        const domains = ["semantic", "phonetic", "structural", "emotional"];
        const randomDomain = domains[ctx.iteration % domains.length];
        const projected = this.domainTranslator.translateToDomain(state, randomDomain);
        const backProjected = this.domainTranslator.translateFromDomain(projected, randomDomain);
        state = VectorAtoms.lerp(state, backProjected, 0.2);
        this.feedbackModifier.recordOperation(`projection_${randomDomain}`, state);
      }

      // Apply axioms individually to track them
      let current = state;
      for (const axiom of axiomSequence.operations) {
        current = axiom.operation(current, ctx);
        this.feedbackModifier.recordOperation(axiom.name, current);
      }

      // Apply modal operator
      current = modalOperator(current, ctx);
      this.feedbackModifier.recordOperation('modal_stabilization', current);

      return current;
    };

    const fixpointResult = this.fixpointEngine.findFixpoint(
      categoricalVector,
      updateRule,
      {
        ...context,
        cluster,
        axiomSequence,
        stateHistory: this.conversationHistory.slice(-5).map(h => h.state)
      }
    );

    console.log('→ Fixpoint converged:', fixpointResult.trace.converged,
                'in', fixpointResult.trace.iterations, 'iterations');

    const fixpointState = fixpointResult.fixpoint;

    // STAGE 6: Domain projections for interpretation
    const interpretations = await this._generateInterpretations(fixpointState, context);

    // STAGE 7: Recursive decomposition
    const refinedState = this.recursiveOperator.applyRecursive(
      fixpointState,
      (subState) => VectorAtoms.normalize(subState),
      { depth: 0, maxDepth: 2 }
    );

    // STAGE 8: Synthesize response
    const response = await this._synthesizeResponse(
      refinedState,
      interpretations,
      context,
      inputText
    );

    // STAGE 9: Update temporal memory
    this.temporalEscalator.process(refinedState, {
      importance: 0.7,
      text: response.text,
      inputText
    });

    // STAGE 10: Store in history
    this.conversationHistory.push({
      input: inputText,
      state: refinedState,
      response: response.text,
      timestamp: Date.now(),
      cluster: cluster.id,
      fixpointTrace: fixpointResult.trace
    });

    // Limit history size
    if (this.conversationHistory.length > 100) {
      this.conversationHistory.shift();
    }

    this.currentState = refinedState;
    this.iterationCount++;

    // Periodic maintenance
    if (this.iterationCount % 10 === 0) {
      this.performMaintenance();
    }

    console.log('→ Generated response:', response.text.substring(0, 50) + '...\n');

    return {
      text: response.text,
      state: refinedState,
      metadata: {
        cluster: cluster.id,
        converged: fixpointResult.trace.converged,
        iterations: fixpointResult.trace.iterations,
        interpretationCount: interpretations.length
      }
    };
  }

  /**
   * Generates multiple interpretations through domain projections
   */
  async _generateInterpretations(state, context) {
    const interpretations = [];

    // Try different domains
    const domains = ['semantic', 'phonetic', 'structural', 'emotional'];

    for (let domainName of domains) {
      const translated = this.domainTranslator.translateToDomain(state, domainName);
      const backTranslated = this.domainTranslator.translateFromDomain(translated, domainName);

      interpretations.push({
        domain: domainName,
        state: backTranslated,
        novelty: VectorAtoms.distance(state, backTranslated)
      });
    }

    // Sort by novelty (prefer diverse interpretations)
    interpretations.sort((a, b) => b.novelty - a.novelty);

    return interpretations.slice(0, 2); // Keep top 2
  }

  /**
   * Synthesizes natural language response from state
   */
  async _synthesizeResponse(state, interpretations, context, inputText) {
    // Enhanced synthesis: emergent response from state features and interpretations

    const stateInfo = this.symbolicCompiler.decompile(state);
    const similar = this._findSimilarHistoricalResponses(state, 3);

    // Fragment libraries for emergent synthesis
    const fragments = {
      phonetic: {
        high: ["a resonant harmonic pattern", "a rhythmic cadence", "a phonetic symmetry"],
        med: ["some interesting tonal qualities", "a certain vocal texture", "a sound-based relationship"],
        low: ["a subtle acoustic shift", "a faint echo of form", "a minor resonance"]
      },
      structural: {
        high: ["a deeply nested logical architecture", "a complex fractal organization", "a rigid axiomatic framework"],
        med: ["an organized conceptual schema", "a balanced structural motif", "a coherent systemic arrangement"],
        low: ["a loose skeletal arrangement", "a simple linear progression", "a nascent organizational pattern"]
      },
      semantic: {
        high: ["a profound abstract essence", "a core ontological truth", "a dense layer of meaning"],
        med: ["a clear conceptual direction", "a meaningful symbolic link", "a relevant semantic cluster"],
        low: ["a slight shift in perspective", "a marginal conceptual nuance", "a minor thematic variance"]
      }
    };

    // Helper to pick fragment based on intensity
    const pickFragment = (dimension, intensity) => {
      const level = intensity > 0.7 ? 'high' : (intensity > 0.3 ? 'med' : 'low');
      const list = fragments[dimension][level];
      return list[Math.floor(Math.random() * list.length)];
    };

    // Build base response reflecting the state's multidimensional nature
    let responseText = "I sense ";
    responseText += pickFragment('semantic', stateInfo.semanticIntensity);
    responseText += " within ";
    responseText += pickFragment('structural', stateInfo.structuralIntensity);
    responseText += ", manifesting as ";
    responseText += pickFragment('phonetic', stateInfo.phoneticIntensity) + ".";

    // Incorporate domain interpretations for "cross-domain" insight
    if (interpretations.length > 0) {
      const bestInterp = interpretations[0];
      const secondInterp = interpretations[1];

      const interpFragments = {
        semantic: "reveals latent conceptual depths",
        phonetic: "uncovers hidden rhythmic structures",
        structural: "exposes the underlying formal logic",
        emotional: "resonates with a specific affective frequency"
      };

      responseText += ` Examining this through a ${bestInterp.domain} lens ${interpFragments[bestInterp.domain] || 'provides a unique perspective'}.`;

      if (secondInterp && secondInterp.novelty > 0.5) {
        responseText += ` Interestingly, projecting onto the ${secondInterp.domain} domain suggests a radical analogy.`;
      }
    }

    // Historical connection
    if (similar.length > 0 && Math.random() > 0.6) {
      responseText += " This further stabilizes the pattern we established previously.";
    }

    return {
      text: responseText,
      confidence: 0.85,
      stateInfo,
      interpretations: interpretations.map(i => i.domain)
    };
  }

  /**
   * Finds similar historical responses
   */
  _findSimilarHistoricalResponses(state, count = 3) {
    if (this.conversationHistory.length === 0) return [];

    const scored = this.conversationHistory.map(entry => ({
      entry,
      similarity: VectorAtoms.dot(
        VectorAtoms.normalize(state),
        VectorAtoms.normalize(entry.state)
      )
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, count).map(s => s.entry);
  }

  /**
   * Processes feedback signal
   */
  provideFeedback(feedbackSignal) {
    const result = this.feedbackModifier.processFeedback(feedbackSignal);

    // Update axiom scores
    if (this.conversationHistory.length > 0) {
      const lastEntry = this.conversationHistory[this.conversationHistory.length - 1];
      // Boost importance of successful states
      if (feedbackSignal > 0) {
        this.temporalEscalator.reinforcePattern(
          entry => VectorAtoms.distance(entry.state, lastEntry.state) < 0.2,
          feedbackSignal * 0.3
        );
      }
    }

    // Automated axiom generation from successful patterns
    if (feedbackSignal > 0.7) {
      const successfulPatterns = this.feedbackModifier.getSuccessfulPatterns(5);
      for (const pattern of successfulPatterns) {
        // Look for axiom pairs in the sequence
        for (let i = 0; i < pattern.sequence.length - 1; i++) {
          const axiom1 = pattern.sequence[i];
          const axiom2 = pattern.sequence[i + 1];

          // Basic filter for base axioms
          const baseNames = ['identity', 'commutativeBlend', 'associativeReduction', 'inverseReflection',
                            'rotation', 'normalization', 'amplification', 'damping', 'sigmoidCompression',
                            'tanhActivation', 'reluThreshold', 'gaussianNoise', 'softmaxDistribution',
                            'crossProductBlend', 'interpolation', 'reflection'];

          if (baseNames.includes(axiom1) && baseNames.includes(axiom2)) {
             this.axiomGenerator.composeAxioms(axiom1, axiom2, 'sequential');
             console.log(`→ Learned new composed axiom: ${axiom1} + ${axiom2}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Initializes conceptual domains
   */
  _initializeDomains() {
    this.domainTranslator.registerDomain('semantic', this.dimension);
    this.domainTranslator.registerDomain('phonetic', this.dimension);
    this.domainTranslator.registerDomain('structural', this.dimension);
    this.domainTranslator.registerDomain('emotional', this.dimension);
    this.domainTranslator.registerDomain('temporal', this.dimension);
  }

  /**
   * Performs system maintenance
   */
  performMaintenance() {
    console.log('→ Performing system maintenance...');

    // Temporal system maintenance
    this.temporalEscalator.performMaintenance();

    // Cluster maintenance
    this.clusterGenerator.mergeSimilarClusters(0.92);
    this.clusterGenerator.pruneWeakClusters();

    // Domain maintenance
    this.domainTranslator.pruneDomains(2);

    // Axiom usage decay
    this.axiomComposer.decayUsageCounts();

    // Learning from history: create axioms from most frequent successful transitions
    const stats = this.feedbackModifier.getOperationStatistics();
    if (stats.recentSuccessRate > 0.6) {
       this.feedbackModifier.adaptBehavior();
    }
  }

  /**
   * Gets comprehensive system statistics
   */
  getStatistics() {
    return {
      iteration: this.iterationCount,
      conversationLength: this.conversationHistory.length,
      temporal: this.temporalEscalator.getStatistics(),
      clusters: this.clusterGenerator.getGlobalStatistics(),
      domains: this.domainTranslator.getDomainStatistics(),
      feedback: this.feedbackModifier.getOperationStatistics(),
      axioms: {
        topOperations: this.axiomComposer.getBestAxioms(5),
        generatedCount: this.axiomGenerator.getAllGeneratedAxioms().length
      }
    };
  }

  /**
   * Resets the system
   */
  reset() {
    this.currentState = null;
    this.conversationHistory = [];
    this.iterationCount = 0;
    this.temporalEscalator.reset();
    this.clusterGenerator.reset();
    this.feedbackModifier.reset();
    this.axiomComposer.reset();
    this._initializeDomains();
  }

  /**
   * Exports system state
   */
  export() {
    return {
      dimension: this.dimension,
      currentState: this.currentState,
      conversationHistory: this.conversationHistory.slice(-20), // Recent history
      temporalState: this.temporalEscalator.export(),
      clusters: this.clusterGenerator.getAllClusters(),
      feedbackState: this.feedbackModifier.saveState(),
      iterationCount: this.iterationCount
    };
  }

  /**
   * Imports system state
   */
  import(data) {
    if (data.dimension) this.dimension = data.dimension;
    if (data.currentState) this.currentState = data.currentState;
    if (data.conversationHistory) this.conversationHistory = data.conversationHistory;
    if (data.temporalState) this.temporalEscalator.import(data.temporalState);
    if (data.feedbackState) this.feedbackModifier.loadState(data.feedbackState);
    if (data.iterationCount) this.iterationCount = data.iterationCount;
  }
}
