/**
 * SYMBOLIC COMPONENT: Phonetic Analyzer
 * Purpose: Extract sound-based features from text
 * Role: The "auditory cortex" - processes acoustic-like patterns
 */

import { HashAtoms } from '../primitives/hash.js';

export class PhoneticAnalyzer {
  /**
   * Analyzes vowel patterns
   */
  static analyzeVowels(text) {
    const lower = text.toLowerCase();
    const vowels = lower.match(/[aeiou]/g) || [];
    const chars = lower.replace(/[^a-z]/g, '');

    return {
      density: chars.length > 0 ? vowels.length / chars.length : 0,
      aCount: (lower.match(/a/g) || []).length / Math.max(1, vowels.length),
      eCount: (lower.match(/e/g) || []).length / Math.max(1, vowels.length),
      iCount: (lower.match(/i/g) || []).length / Math.max(1, vowels.length),
      oCount: (lower.match(/o/g) || []).length / Math.max(1, vowels.length),
      uCount: (lower.match(/u/g) || []).length / Math.max(1, vowels.length)
    };
  }

  /**
   * Analyzes consonant clusters
   */
  static analyzeConsonantClusters(text) {
    const lower = text.toLowerCase().replace(/[^a-z]/g, '');
    const clusters = lower.match(/[bcdfghjklmnpqrstvwxyz]{2,}/g) || [];

    return {
      count: clusters.length,
      avgLength: clusters.reduce((sum, c) => sum + c.length, 0) / Math.max(1, clusters.length),
      maxLength: clusters.reduce((max, c) => Math.max(max, c.length), 0),
      density: lower.length > 0 ? clusters.join('').length / lower.length : 0
    };
  }

  /**
   * Computes phonetic similarity score
   */
  static phoneticSimilarity(word1, word2) {
    const hash1 = PhoneticAnalyzer.soundexHash(word1);
    const hash2 = PhoneticAnalyzer.soundexHash(word2);

    // Compare phonetic fingerprints
    let matches = 0;
    const len = Math.min(hash1.length, hash2.length);
    for (let i = 0; i < len; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }

    return len > 0 ? matches / len : 0;
  }

  /**
   * Simplified Soundex-like phonetic hash
   */
  static soundexHash(word) {
    const lower = word.toLowerCase();
    const codes = {
      'b': '1', 'f': '1', 'p': '1', 'v': '1',
      'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
      'd': '3', 't': '3',
      'l': '4',
      'm': '5', 'n': '5',
      'r': '6'
    };

    let hash = lower[0] || '';
    let prev = codes[lower[0]] || '';

    for (let i = 1; i < lower.length && hash.length < 6; i++) {
      const code = codes[lower[i]];
      if (code && code !== prev) {
        hash += code;
        prev = code;
      } else if (!code) {
        prev = '';
      }
    }

    return hash;
  }

  /**
   * Analyzes syllable patterns (heuristic)
   */
  static analyzeSyllables(word) {
    const lower = word.toLowerCase();
    // Simple heuristic: count vowel groups
    const syllablePattern = lower.match(/[aeiou]+/g) || [];

    return {
      count: syllablePattern.length,
      structure: syllablePattern.map(s => s.length),
      avgSyllableLength: syllablePattern.reduce((sum, s) => sum + s.length, 0) / Math.max(1, syllablePattern.length)
    };
  }

  /**
   * Analyzes rhyme patterns
   */
  static analyzeRhyme(word) {
    const lower = word.toLowerCase();
    const lastVowelIndex = lower.search(/[aeiou][^aeiou]*$/);

    if (lastVowelIndex === -1) {
      return { ending: '', vowel: '', consonants: '' };
    }

    const ending = lower.slice(lastVowelIndex);
    const vowelMatch = ending.match(/^[aeiou]+/);
    const vowel = vowelMatch ? vowelMatch[0] : '';
    const consonants = ending.slice(vowel.length);

    return { ending, vowel, consonants };
  }

  /**
   * Extracts phonetic features as a vector
   */
  static extractFeatures(text) {
    const vowelAnalysis = PhoneticAnalyzer.analyzeVowels(text);
    const clusterAnalysis = PhoneticAnalyzer.analyzeConsonantClusters(text);

    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const syllables = words.map(w => PhoneticAnalyzer.analyzeSyllables(w));

    const avgSyllables = syllables.reduce((sum, s) => sum + s.count, 0) / Math.max(1, syllables.length);

    return {
      vowelDensity: vowelAnalysis.density,
      vowelDistribution: [
        vowelAnalysis.aCount,
        vowelAnalysis.eCount,
        vowelAnalysis.iCount,
        vowelAnalysis.oCount,
        vowelAnalysis.uCount
      ],
      clusterDensity: clusterAnalysis.density,
      avgClusterLength: clusterAnalysis.avgLength / 5, // Normalize
      avgSyllableCount: avgSyllables / 4, // Normalize
      phoneticComplexity: (clusterAnalysis.avgLength + avgSyllables) / 8
    };
  }

  /**
   * Computes alliteration score
   */
  static alliterationScore(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) return 0;

    let matches = 0;
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i][0] === words[i + 1][0]) {
        matches++;
      }
    }

    return matches / (words.length - 1);
  }

  /**
   * Computes assonance score (vowel repetition)
   */
  static assonanceScore(text) {
    const vowels = text.toLowerCase().match(/[aeiou]/g) || [];
    if (vowels.length < 2) return 0;

    const counts = {};
    for (let v of vowels) {
      counts[v] = (counts[v] || 0) + 1;
    }

    const maxRepeat = Math.max(...Object.values(counts));
    return maxRepeat / vowels.length;
  }
}
