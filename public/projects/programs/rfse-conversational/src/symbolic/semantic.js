/**
 * SYMBOLIC COMPONENT: Semantic Encoder
 * Purpose: Extract meaning-level features and conceptual fingerprints
 * Role: The "prefrontal cortex" - processes abstract meaning
 */

import { HashAtoms } from '../primitives/hash.js';
import { Tokenizer } from './tokenizer.js';

export class SemanticEncoder {
  /**
   * Creates a semantic fingerprint from text
   */
  static createFingerprint(text) {
    const words = Tokenizer.tokenizeWords(text);

    // Multiple semantic dimensions
    const dimensions = {
      lexicalDiversity: SemanticEncoder.lexicalDiversity(words),
      abstractness: SemanticEncoder.abstractnessScore(words),
      sentiment: SemanticEncoder.sentimentScore(text),
      temporality: SemanticEncoder.temporalityScore(text),
      agency: SemanticEncoder.agencyScore(text),
      modality: SemanticEncoder.modalityScore(text)
    };

    return dimensions;
  }

  /**
   * Computes lexical diversity (type-token ratio)
   */
  static lexicalDiversity(words) {
    if (words.length === 0) return 0;
    const unique = new Set(words);
    return unique.size / words.length;
  }

  /**
   * Estimates abstractness based on word length and frequency patterns
   */
  static abstractnessScore(words) {
    if (words.length === 0) return 0;

    // Longer words tend to be more abstract
    const avgLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

    // More suffixes indicate more abstract concepts
    const abstractSuffixes = ['tion', 'ness', 'ity', 'ism', 'ment', 'ence', 'ance'];
    const abstractWords = words.filter(w =>
      abstractSuffixes.some(suffix => w.endsWith(suffix))
    );

    return {
      lengthScore: Math.min(1, avgLength / 10),
      suffixScore: abstractWords.length / Math.max(1, words.length),
      combined: (avgLength / 10 + abstractWords.length / Math.max(1, words.length)) / 2
    };
  }

  /**
   * Basic sentiment analysis using word valence
   */
  static sentimentScore(text) {
    const positive = ['good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'happy', 'joy',
      'beautiful', 'perfect', 'best', 'fantastic', 'awesome', 'brilliant', 'yes', 'like'];

    const negative = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'sad', 'pain', 'ugly',
      'worst', 'poor', 'disappointing', 'wrong', 'error', 'fail', 'no', 'not'];

    const words = Tokenizer.tokenizeWords(text);

    let positiveCount = 0;
    let negativeCount = 0;

    for (let word of words) {
      if (positive.includes(word)) positiveCount++;
      if (negative.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return { polarity: 0, intensity: 0 };

    const polarity = (positiveCount - negativeCount) / Math.max(1, words.length);
    const intensity = total / Math.max(1, words.length);

    return { polarity, intensity };
  }

  /**
   * Detects temporal language
   */
  static temporalityScore(text) {
    const past = ['was', 'were', 'had', 'did', 'been', 'ago', 'yesterday', 'before', 'earlier'];
    const present = ['is', 'are', 'am', 'do', 'does', 'now', 'today', 'currently'];
    const future = ['will', 'shall', 'going', 'tomorrow', 'later', 'soon', 'next', 'future'];

    const words = Tokenizer.tokenizeWords(text);

    let pastCount = 0;
    let presentCount = 0;
    let futureCount = 0;

    for (let word of words) {
      if (past.includes(word)) pastCount++;
      if (present.includes(word)) presentCount++;
      if (future.includes(word)) futureCount++;
    }

    const total = pastCount + presentCount + futureCount;
    if (total === 0) return { past: 0.33, present: 0.33, future: 0.33 };

    return {
      past: pastCount / total,
      present: presentCount / total,
      future: futureCount / total
    };
  }

  /**
   * Detects agency and perspective
   */
  static agencyScore(text) {
    const firstPerson = ['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours'];
    const secondPerson = ['you', 'your', 'yours'];
    const thirdPerson = ['he', 'she', 'it', 'they', 'him', 'her', 'them', 'his', 'hers', 'their', 'theirs'];

    const words = Tokenizer.tokenizeWords(text);

    let first = 0;
    let second = 0;
    let third = 0;

    for (let word of words) {
      if (firstPerson.includes(word)) first++;
      if (secondPerson.includes(word)) second++;
      if (thirdPerson.includes(word)) third++;
    }

    const total = first + second + third;
    if (total === 0) return { first: 0, second: 0, third: 0, impersonal: 1 };

    return {
      first: first / total,
      second: second / total,
      third: third / total,
      impersonal: 1 - (total / Math.max(1, words.length))
    };
  }

  /**
   * Detects modality (certainty/uncertainty)
   */
  static modalityScore(text) {
    const certain = ['definitely', 'certainly', 'always', 'never', 'must', 'will', 'is', 'are'];
    const uncertain = ['maybe', 'perhaps', 'might', 'could', 'possibly', 'probably', 'sometimes'];
    const questions = (text.match(/\?/g) || []).length;

    const words = Tokenizer.tokenizeWords(text);

    let certainCount = 0;
    let uncertainCount = 0;

    for (let word of words) {
      if (certain.includes(word)) certainCount++;
      if (uncertain.includes(word)) uncertainCount++;
    }

    return {
      certainty: certainCount / Math.max(1, words.length),
      uncertainty: uncertainCount / Math.max(1, words.length),
      interrogative: questions / Math.max(1, words.length * 0.1)
    };
  }

  /**
   * Creates a distributional semantic vector
   */
  static createDistributionalVector(text, dimension = 32) {
    const words = Tokenizer.tokenizeWords(text);
    const vector = new Float64Array(dimension);

    // Hash each word into multiple dimensions
    for (let word of words) {
      const hash = HashAtoms.hashString(word);

      for (let i = 0; i < dimension; i++) {
        const position = (hash + i * 2654435761) % dimension;
        const value = ((hash * (i + 1)) % 1000) / 1000;
        vector[position] += value;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimension; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Computes semantic coherence within text
   */
  static coherenceScore(text) {
    const sentences = Tokenizer.tokenizeSentences(text);
    if (sentences.length < 2) return 1;

    let totalSimilarity = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
      const vec1 = SemanticEncoder.createDistributionalVector(sentences[i], 16);
      const vec2 = SemanticEncoder.createDistributionalVector(sentences[i + 1], 16);

      // Cosine similarity
      let dot = 0;
      let mag1 = 0;
      let mag2 = 0;

      for (let j = 0; j < 16; j++) {
        dot += vec1[j] * vec2[j];
        mag1 += vec1[j] * vec1[j];
        mag2 += vec2[j] * vec2[j];
      }

      const similarity = mag1 > 0 && mag2 > 0 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
      totalSimilarity += similarity;
    }

    return totalSimilarity / (sentences.length - 1);
  }

  /**
   * Extracts all semantic features as structured data
   */
  static extractFeatures(text) {
    const words = Tokenizer.tokenizeWords(text);
    const fingerprint = SemanticEncoder.createFingerprint(text);
    const abstractness = SemanticEncoder.abstractnessScore(words);
    const sentiment = SemanticEncoder.sentimentScore(text);
    const temporality = SemanticEncoder.temporalityScore(text);
    const agency = SemanticEncoder.agencyScore(text);
    const modality = SemanticEncoder.modalityScore(text);
    const coherence = SemanticEncoder.coherenceScore(text);

    return {
      lexicalDiversity: fingerprint.lexicalDiversity,
      abstractness: abstractness.combined,
      sentimentPolarity: sentiment.polarity,
      sentimentIntensity: sentiment.intensity,
      temporalPast: temporality.past,
      temporalPresent: temporality.present,
      temporalFuture: temporality.future,
      firstPerson: agency.first,
      secondPerson: agency.second,
      thirdPerson: agency.third,
      certainty: modality.certainty,
      uncertainty: modality.uncertainty,
      coherence
    };
  }
}
