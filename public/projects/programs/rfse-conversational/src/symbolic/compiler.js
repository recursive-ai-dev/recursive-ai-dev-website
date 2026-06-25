/**
 * SYMBOLIC COMPONENT: Abstraction Compiler
 * Purpose: Synthesize all symbolic analyses into categorical vector
 * Role: The "thalamus" - integration hub for sensory information
 */

import { VectorAtoms } from '../primitives/vector.js';
import { HashAtoms } from '../primitives/hash.js';
import { Tokenizer } from './tokenizer.js';
import { PhoneticAnalyzer } from './phonetic.js';
import { StructuralAnalyzer } from './structural.js';
import { SemanticEncoder } from './semantic.js';

export class SymbolicAbstractionCompiler {
  constructor(vectorDimension = 64) {
    this.dimension = vectorDimension;
  }

  /**
   * Main compilation function: text → categorical vector
   */
  compile(inputText) {
    if (!inputText || inputText.trim().length === 0) {
      return VectorAtoms.createZero(this.dimension);
    }

    // Extract features from all analysis layers
    const phoneticFeatures = PhoneticAnalyzer.extractFeatures(inputText);
    const structuralFeatures = StructuralAnalyzer.extractFeatures(inputText);
    const semanticFeatures = SemanticEncoder.extractFeatures(inputText);

    // Create distributional vector
    const distributionalVector = SemanticEncoder.createDistributionalVector(
      inputText,
      Math.floor(this.dimension / 2)
    );

    // Build categorical vector by weaving all features together
    const categoricalVector = this._weaveFeatures(
      phoneticFeatures,
      structuralFeatures,
      semanticFeatures,
      distributionalVector
    );

    return categoricalVector;
  }

  /**
   * Weaves multiple feature types into a unified vector
   */
  _weaveFeatures(phonetic, structural, semantic, distributional) {
    const vector = new Float64Array(this.dimension);

    // Phonetic features → first quarter
    const phoneticSlice = this._flattenObject(phonetic);
    for (let i = 0; i < Math.floor(this.dimension / 4); i++) {
      vector[i] = phoneticSlice[i % phoneticSlice.length] || 0;
    }

    // Structural features → second quarter
    const structuralSlice = this._flattenObject(structural);
    const structuralStart = Math.floor(this.dimension / 4);
    for (let i = 0; i < Math.floor(this.dimension / 4); i++) {
      vector[structuralStart + i] = structuralSlice[i % structuralSlice.length] || 0;
    }

    // Semantic features → third quarter
    const semanticSlice = this._flattenObject(semantic);
    const semanticStart = Math.floor(this.dimension / 2);
    for (let i = 0; i < Math.floor(this.dimension / 4); i++) {
      vector[semanticStart + i] = semanticSlice[i % semanticSlice.length] || 0;
    }

    // Distributional vector → last quarter
    const distributionalStart = Math.floor(3 * this.dimension / 4);
    for (let i = 0; i < distributional.length && distributionalStart + i < this.dimension; i++) {
      vector[distributionalStart + i] = distributional[i];
    }

    return vector;
  }

  /**
   * Flattens nested object into array
   */
  _flattenObject(obj) {
    const result = [];

    const flatten = (item) => {
      if (typeof item === 'number') {
        result.push(item);
      } else if (Array.isArray(item)) {
        item.forEach(flatten);
      } else if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach(flatten);
      }
    };

    flatten(obj);
    return result;
  }

  /**
   * Compiles with contextual memory
   * Uses previous states to influence current compilation
   */
  compileWithContext(inputText, previousStates = []) {
    const baseVector = this.compile(inputText);

    if (previousStates.length === 0) {
      return baseVector;
    }

    // Blend with recent context (exponential decay)
    let contextualVector = VectorAtoms.clone(baseVector);

    for (let i = 0; i < Math.min(previousStates.length, 5); i++) {
      const state = previousStates[previousStates.length - 1 - i];
      const weight = Math.exp(-i * 0.5); // Exponential decay
      const weighted = VectorAtoms.scale(state, weight);
      contextualVector = VectorAtoms.add(contextualVector, weighted);
    }

    // Normalize
    return VectorAtoms.normalize(contextualVector);
  }

  /**
   * Inverse operation: attempts to describe what a vector represents
   * Used for interpretability
   */
  decompile(vector) {
    const phoneticSlice = Array.from(vector.slice(0, Math.floor(this.dimension / 4)));
    const structuralSlice = Array.from(vector.slice(
      Math.floor(this.dimension / 4),
      Math.floor(this.dimension / 2)
    ));
    const semanticSlice = Array.from(vector.slice(
      Math.floor(this.dimension / 2),
      Math.floor(3 * this.dimension / 4)
    ));

    const phoneticIntensity = phoneticSlice.reduce((sum, v) => sum + Math.abs(v), 0) / phoneticSlice.length;
    const structuralIntensity = structuralSlice.reduce((sum, v) => sum + Math.abs(v), 0) / structuralSlice.length;
    const semanticIntensity = semanticSlice.reduce((sum, v) => sum + Math.abs(v), 0) / semanticSlice.length;

    return {
      phoneticIntensity,
      structuralIntensity,
      semanticIntensity,
      dominantDimension: this._getDominantDimension(
        phoneticIntensity,
        structuralIntensity,
        semanticIntensity
      )
    };
  }

  /**
   * Determines which dimension is most active
   */
  _getDominantDimension(phonetic, structural, semantic) {
    const max = Math.max(phonetic, structural, semantic);
    if (max === phonetic) return 'phonetic';
    if (max === structural) return 'structural';
    return 'semantic';
  }

  /**
   * Computes similarity between two texts via their compiled vectors
   */
  textSimilarity(text1, text2) {
    const vec1 = this.compile(text1);
    const vec2 = this.compile(text2);

    return VectorAtoms.dot(
      VectorAtoms.normalize(vec1),
      VectorAtoms.normalize(vec2)
    );
  }
}
