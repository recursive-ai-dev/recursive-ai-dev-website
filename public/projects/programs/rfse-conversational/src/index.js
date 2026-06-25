/**
 * RFSE CONVERSATIONAL - Main Entry Point
 * Purpose: Export all major components
 */

// Core engine
export { RFSECore } from './orchestration/rfse-core.js';

// Subsystems (for advanced usage)
export * from './primitives/index.js';
export * from './symbolic/index.js';
export * from './axioms/index.js';
export * from './coherence/index.js';
export * from './projection/index.js';
export * from './decomposition/index.js';
export * from './feedback/index.js';
export * from './partition/index.js';
export * from './temporal/index.js';
