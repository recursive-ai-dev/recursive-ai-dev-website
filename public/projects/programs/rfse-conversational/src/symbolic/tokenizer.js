/**
 * SYMBOLIC COMPONENT: Tokenizer
 * Purpose: Break text into meaningful units
 * Role: The "photoreceptors" - first stage of sensory processing
 */

export class Tokenizer {
  /**
   * Breaks text into word tokens
   */
  static tokenizeWords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Breaks text into character tokens
   */
  static tokenizeChars(text) {
    return Array.from(text.toLowerCase());
  }

  /**
   * Breaks text into sentences
   */
  static tokenizeSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Extracts n-grams from tokens
   */
  static extractNgrams(tokens, n) {
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n));
    }
    return ngrams;
  }

  /**
   * Tokenizes with position information
   */
  static tokenizeWithPositions(text) {
    const words = Tokenizer.tokenizeWords(text);
    return words.map((word, index) => ({
      token: word,
      position: index,
      normalizedPosition: index / Math.max(1, words.length - 1)
    }));
  }

  /**
   * Extracts punctuation patterns
   */
  static extractPunctuation(text) {
    const patterns = {
      questions: (text.match(/\?/g) || []).length,
      exclamations: (text.match(/!/g) || []).length,
      commas: (text.match(/,/g) || []).length,
      periods: (text.match(/\./g) || []).length,
      quotes: (text.match(/["']/g) || []).length,
      dashes: (text.match(/[-—]/g) || []).length
    };

    const total = Object.values(patterns).reduce((sum, count) => sum + count, 0);
    const normalized = {};
    for (let [key, count] of Object.entries(patterns)) {
      normalized[key] = total > 0 ? count / total : 0;
    }

    return normalized;
  }

  /**
   * Analyzes capitalization patterns
   */
  static analyzeCapitalization(text) {
    const chars = Array.from(text);
    const letters = chars.filter(c => /[a-zA-Z]/.test(c));
    if (letters.length === 0) return { uppercase: 0, lowercase: 0, mixed: 0 };

    const uppercase = letters.filter(c => c === c.toUpperCase()).length;
    const lowercase = letters.filter(c => c === c.toLowerCase()).length;

    return {
      uppercase: uppercase / letters.length,
      lowercase: lowercase / letters.length,
      mixed: (uppercase > 0 && lowercase > 0) ? 1 : 0
    };
  }

  /**
   * Detects word boundaries and compound structures
   */
  static detectBoundaries(text) {
    const words = Tokenizer.tokenizeWords(text);
    return {
      wordCount: words.length,
      avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / Math.max(1, words.length),
      shortWords: words.filter(w => w.length <= 3).length / Math.max(1, words.length),
      longWords: words.filter(w => w.length >= 8).length / Math.max(1, words.length),
      hyphenated: words.filter(w => w.includes('-')).length / Math.max(1, words.length),
      apostrophes: words.filter(w => w.includes("'")).length / Math.max(1, words.length)
    };
  }
}
