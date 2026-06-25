/**
 * ATOMIC PRIMITIVE: Hashing and Encoding
 * Purpose: Convert raw data into numeric representations
 * Role: The "sensory receptors" - translate external stimuli into internal signals
 */

export const HashAtoms = {
  /**
   * Simple string hash (DJB2 algorithm variant)
   */
  hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  },

  /**
   * Character-level phonetic hash
   * Maps similar-sounding characters to similar values
   */
  phoneticHash(char) {
    const lower = char.toLowerCase();
    const code = lower.charCodeAt(0);

    // Vowels cluster together
    if ('aeiou'.includes(lower)) {
      return 0.1 + (code % 5) * 0.02;
    }
    // Consonants by phonetic similarity
    const plosives = 'bpdtkg';
    const fricatives = 'fvszh';
    const nasals = 'mn';
    const liquids = 'rl';

    if (plosives.includes(lower)) return 0.3 + (plosives.indexOf(lower) * 0.01);
    if (fricatives.includes(lower)) return 0.5 + (fricatives.indexOf(lower) * 0.01);
    if (nasals.includes(lower)) return 0.7 + (nasals.indexOf(lower) * 0.01);
    if (liquids.includes(lower)) return 0.85 + (liquids.indexOf(lower) * 0.01);

    return 0.95; // Other characters
  },

  /**
   * Bigram hash - captures character pairs
   */
  bigramHash(str) {
    if (str.length < 2) return HashAtoms.hashString(str) / Number.MAX_SAFE_INTEGER;

    let hash = 0;
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str[i] + str[i + 1];
      hash += HashAtoms.hashString(bigram);
    }
    return (hash / (str.length - 1)) / Number.MAX_SAFE_INTEGER;
  },

  /**
   * Trigram hash - captures three-character patterns
   */
  trigramHash(str) {
    if (str.length < 3) return HashAtoms.bigramHash(str);

    let hash = 0;
    for (let i = 0; i < str.length - 2; i++) {
      const trigram = str[i] + str[i + 1] + str[i + 2];
      hash += HashAtoms.hashString(trigram);
    }
    return (hash / (str.length - 2)) / Number.MAX_SAFE_INTEGER;
  },

  /**
   * Positional hash - emphasizes position in string
   */
  positionalHash(str, position) {
    if (position >= str.length) return 0;
    const char = str[position];
    const weight = 1 - (position / str.length);
    return HashAtoms.phoneticHash(char) * weight;
  },

  /**
   * Rolling hash for substrings (Rabin-Karp style)
   */
  rollingHash(str, windowSize = 3) {
    if (str.length < windowSize) return [HashAtoms.hashString(str) / Number.MAX_SAFE_INTEGER];

    const hashes = [];
    const base = 31;
    const mod = 1e9 + 7;

    let hash = 0;
    let basePower = 1;

    // Initial window
    for (let i = 0; i < windowSize; i++) {
      hash = (hash * base + str.charCodeAt(i)) % mod;
      if (i < windowSize - 1) basePower = (basePower * base) % mod;
    }
    hashes.push(hash / mod);

    // Slide window
    for (let i = windowSize; i < str.length; i++) {
      hash = (hash - str.charCodeAt(i - windowSize) * basePower) % mod;
      hash = (hash * base + str.charCodeAt(i)) % mod;
      hash = (hash + mod) % mod;
      hashes.push(hash / mod);
    }

    return hashes;
  },

  /**
   * Semantic locality hash - maps semantically similar values nearby
   */
  semanticHash(word) {
    const normalized = word.toLowerCase().trim();

    // Multiple hash functions for different semantic aspects
    const aspects = {
      length: normalized.length / 20,
      firstChar: normalized.charCodeAt(0) / 255,
      lastChar: normalized.charCodeAt(normalized.length - 1) / 255,
      vowelDensity: (normalized.match(/[aeiou]/g) || []).length / normalized.length,
      consonantClusters: (normalized.match(/[bcdfghjklmnpqrstvwxyz]{2,}/g) || []).length / 10
    };

    return aspects;
  },

  /**
   * Distributional hash - captures statistical properties
   */
  distributionalHash(str) {
    const charFreq = new Map();
    for (let char of str.toLowerCase()) {
      charFreq.set(char, (charFreq.get(char) || 0) + 1);
    }

    const total = str.length;
    const entropy = Array.from(charFreq.values()).reduce((sum, count) => {
      const p = count / total;
      return sum - p * Math.log2(p);
    }, 0);

    return {
      entropy: entropy / 5, // Normalize to ~[0, 1]
      uniqueChars: charFreq.size / 26,
      avgFreq: total / charFreq.size / 10
    };
  },

  /**
   * Locality-sensitive hash - similar inputs map to similar outputs
   */
  lshHash(vector, numBands = 4, bandSize = 8) {
    const hashes = [];
    for (let band = 0; band < numBands; band++) {
      let hash = 0;
      for (let i = 0; i < bandSize && band * bandSize + i < vector.length; i++) {
        const val = vector[band * bandSize + i];
        hash = ((hash << 5) + hash) + Math.floor(val * 1000);
      }
      hashes.push((Math.abs(hash) % 10000) / 10000);
    }
    return hashes;
  }
};
