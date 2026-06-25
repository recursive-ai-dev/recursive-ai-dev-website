/**
 * SYMBOLIC COMPONENT: Structural Analyzer
 * Purpose: Extract syntactic and organizational patterns
 * Role: The "visual cortex" - processes spatial/structural relationships
 */

import { Tokenizer } from './tokenizer.js';

export class StructuralAnalyzer {
  /**
   * Analyzes sentence structure
   */
  static analyzeSentenceStructure(text) {
    const sentences = Tokenizer.tokenizeSentences(text);

    if (sentences.length === 0) {
      return {
        count: 0,
        avgLength: 0,
        lengthVariance: 0,
        complexity: 0
      };
    }

    const lengths = sentences.map(s => Tokenizer.tokenizeWords(s).length);
    const avgLength = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + (l - avgLength) ** 2, 0) / lengths.length;

    return {
      count: sentences.length,
      avgLength: avgLength / 20, // Normalize
      lengthVariance: Math.sqrt(variance) / 10, // Normalize
      complexity: (avgLength * Math.sqrt(variance)) / 50 // Combined metric
    };
  }

  /**
   * Detects parallel structures
   */
  static detectParallelism(text) {
    const sentences = Tokenizer.tokenizeSentences(text);
    if (sentences.length < 2) return { score: 0, patterns: [] };

    const patterns = [];
    for (let i = 0; i < sentences.length - 1; i++) {
      const words1 = Tokenizer.tokenizeWords(sentences[i]);
      const words2 = Tokenizer.tokenizeWords(sentences[i + 1]);

      // Check for similar beginnings
      let commonPrefix = 0;
      const minLen = Math.min(words1.length, words2.length);
      for (let j = 0; j < Math.min(3, minLen); j++) {
        if (words1[j] === words2[j]) commonPrefix++;
        else break;
      }

      if (commonPrefix >= 2) {
        patterns.push({
          sentences: [i, i + 1],
          prefixLength: commonPrefix
        });
      }
    }

    return {
      score: patterns.length / Math.max(1, sentences.length - 1),
      patterns
    };
  }

  /**
   * Analyzes repetition patterns
   */
  static analyzeRepetition(text) {
    const words = Tokenizer.tokenizeWords(text);
    const wordCounts = new Map();

    for (let word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    const repeated = Array.from(wordCounts.values()).filter(count => count > 1);
    const maxRepeat = repeated.length > 0 ? Math.max(...repeated) : 0;
    const uniqueRatio = wordCounts.size / Math.max(1, words.length);

    return {
      uniqueRatio,
      repetitionScore: 1 - uniqueRatio,
      maxRepeat: maxRepeat / Math.max(1, words.length),
      repeatedWords: repeated.length
    };
  }

  /**
   * Analyzes word order patterns
   */
  static analyzeWordOrder(text) {
    const words = Tokenizer.tokenizeWords(text);
    if (words.length < 2) return { transitions: 0, entropy: 0 };

    const transitions = new Map();
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]}_${words[i + 1]}`;
      transitions.set(pair, (transitions.get(pair) || 0) + 1);
    }

    // Calculate transition entropy
    const total = words.length - 1;
    let entropy = 0;
    for (let count of transitions.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return {
      uniqueTransitions: transitions.size,
      transitionDensity: transitions.size / total,
      entropy: entropy / 10 // Normalize
    };
  }

  /**
   * Detects hierarchical depth (nested structures)
   */
  static detectHierarchicalDepth(text) {
    const nestingChars = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'"
    };

    let maxDepth = 0;
    let currentDepth = 0;
    const stack = [];

    for (let char of text) {
      if (nestingChars[char]) {
        stack.push(char);
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (Object.values(nestingChars).includes(char)) {
        if (stack.length > 0) {
          const opener = stack.pop();
          if (nestingChars[opener] === char) {
            currentDepth--;
          }
        }
      }
    }

    return {
      maxDepth,
      avgDepth: maxDepth / 2, // Approximation
      balanced: stack.length === 0 ? 1 : 0
    };
  }

  /**
   * Analyzes phrase boundaries
   */
  static analyzePhraseBoundaries(text) {
    const commas = (text.match(/,/g) || []).length;
    const semicolons = (text.match(/;/g) || []).length;
    const colons = (text.match(/:/g) || []).length;
    const dashes = (text.match(/[-—]/g) || []).length;

    const words = Tokenizer.tokenizeWords(text);
    const wordCount = words.length;

    return {
      commaFrequency: commas / Math.max(1, wordCount),
      semicolonFrequency: semicolons / Math.max(1, wordCount),
      colonFrequency: colons / Math.max(1, wordCount),
      dashFrequency: dashes / Math.max(1, wordCount),
      avgPhraseLength: wordCount / Math.max(1, commas + semicolons + colons + 1)
    };
  }

  /**
   * Extracts structural features as a vector
   */
  static extractFeatures(text) {
    const sentenceStructure = StructuralAnalyzer.analyzeSentenceStructure(text);
    const parallelism = StructuralAnalyzer.detectParallelism(text);
    const repetition = StructuralAnalyzer.analyzeRepetition(text);
    const wordOrder = StructuralAnalyzer.analyzeWordOrder(text);
    const hierarchy = StructuralAnalyzer.detectHierarchicalDepth(text);
    const phrases = StructuralAnalyzer.analyzePhraseBoundaries(text);

    return {
      sentenceCount: Math.min(1, sentenceStructure.count / 10),
      sentenceComplexity: sentenceStructure.complexity,
      parallelismScore: parallelism.score,
      repetitionScore: repetition.repetitionScore,
      uniqueWordRatio: repetition.uniqueRatio,
      transitionEntropy: wordOrder.entropy,
      hierarchicalDepth: hierarchy.maxDepth / 5,
      phraseComplexity: phrases.avgPhraseLength / 10
    };
  }

  /**
   * Computes structural similarity between texts
   */
  static structuralSimilarity(text1, text2) {
    const features1 = StructuralAnalyzer.extractFeatures(text1);
    const features2 = StructuralAnalyzer.extractFeatures(text2);

    const keys = Object.keys(features1);
    let similarity = 0;

    for (let key of keys) {
      const diff = Math.abs(features1[key] - features2[key]);
      similarity += 1 - diff;
    }

    return similarity / keys.length;
  }
}
