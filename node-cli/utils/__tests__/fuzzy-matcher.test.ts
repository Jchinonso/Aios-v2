/**
 * @fileoverview FuzzyMatcher Comprehensive Test Suite
 * @description Tests for Levenshtein distance-based fuzzy string matching
 */

import { FuzzyMatcher } from '../fuzzy-matcher.js';

describe('FuzzyMatcher', () => {
  let matcher: FuzzyMatcher;

  beforeEach(() => {
    matcher = new FuzzyMatcher();
  });

  describe('findBestMatch', () => {
    describe('Basic Functionality', () => {
      it('should find exact match with confidence 1.0', () => {
        const result = matcher.findBestMatch('vercel', ['vercel', 'netlify', 'railway']);

        expect(result).toEqual({
          match: 'vercel',
          confidence: 1.0,
          distance: 0,
        });
      });

      it('should find close match with typo (1 character)', () => {
        const result = matcher.findBestMatch('verc', ['vercel', 'netlify']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('vercel');
        expect(result!.distance).toBe(2); // 'el' missing
        expect(result!.confidence).toBeGreaterThan(0.6);
      });

      it('should find close match with typo (2 characters)', () => {
        const result = matcher.findBestMatch('netlfy', ['vercel', 'netlify']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('netlify');
        expect(result!.distance).toBeLessThanOrEqual(2);
      });

      it('should return null when no match within threshold', () => {
        const result = matcher.findBestMatch('xyz', ['vercel', 'netlify'], 2);

        expect(result).toBeNull();
      });

      it('should return null for empty input', () => {
        const result = matcher.findBestMatch('', ['vercel', 'netlify']);

        expect(result).toBeNull();
      });

      it('should return null for empty candidates', () => {
        const result = matcher.findBestMatch('vercel', []);

        expect(result).toBeNull();
      });
    });

    describe('Unicode Normalization', () => {
      it('should match accented characters to non-accented', () => {
        const result = matcher.findBestMatch('cafe', ['café', 'coffee']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('café');
        expect(result!.distance).toBe(0); // After normalization they match
      });

      it('should handle multiple diacritics', () => {
        const result = matcher.findBestMatch('resume', ['résumé', 'document']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('résumé');
      });

      it('should normalize unicode decomposed characters', () => {
        // 'é' can be represented as 'e' + combining accent
        const result = matcher.findBestMatch('eté', ['été', 'winter']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('été');
      });
    });

    describe('Case Insensitivity', () => {
      it('should match regardless of case', () => {
        const result = matcher.findBestMatch('VERCEL', ['vercel', 'netlify']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('vercel');
        expect(result!.confidence).toBe(1.0);
      });

      it('should match mixed case', () => {
        const result = matcher.findBestMatch('VeRcEl', ['vercel', 'netlify']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('vercel');
      });
    });

    describe('Whitespace Handling', () => {
      it('should ignore whitespace in matching', () => {
        const result = matcher.findBestMatch('ver cel', ['vercel', 'netlify']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('vercel');
        expect(result!.distance).toBe(0);
      });

      it('should normalize multiple spaces', () => {
        const result = matcher.findBestMatch('ver   cel', ['vercel', 'netlify']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('vercel');
      });
    });

    describe('Empty Normalized Candidates', () => {
      it('should reject candidates that normalize to empty', () => {
        const result = matcher.findBestMatch('test', ['!!!', 'test', '@@@']);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('test');
        // '!!!' and '@@@' should be filtered out
      });

      it('should return null when all candidates normalize to empty', () => {
        const result = matcher.findBestMatch('test', ['!!!', '@@@', '###']);

        expect(result).toBeNull();
      });

      it('should handle input that normalizes to empty', () => {
        const result = matcher.findBestMatch('!!!', ['vercel', 'netlify']);

        expect(result).toBeNull();
      });
    });

    describe('Custom Max Distance', () => {
      it('should respect custom max distance threshold', () => {
        const result = matcher.findBestMatch('ver', ['vercel'], 1);

        expect(result).toBeNull(); // 'cel' is 3 chars away
      });

      it('should find match with higher threshold', () => {
        const result = matcher.findBestMatch('ver', ['vercel'], 5);

        expect(result).not.toBeNull();
        expect(result!.match).toBe('vercel');
      });
    });
  });

  describe('levenshteinDistance', () => {
    describe('Basic Distance Calculation', () => {
      it('should return 0 for identical strings', () => {
        expect(matcher.levenshteinDistance('test', 'test')).toBe(0);
      });

      it('should return string length for empty comparison', () => {
        expect(matcher.levenshteinDistance('test', '')).toBe(4);
        expect(matcher.levenshteinDistance('', 'test')).toBe(4);
      });

      it('should calculate single character difference', () => {
        expect(matcher.levenshteinDistance('cat', 'bat')).toBe(1);
      });

      it('should calculate multiple differences', () => {
        expect(matcher.levenshteinDistance('kitten', 'sitting')).toBe(3);
      });

      it('should handle insertion operations', () => {
        expect(matcher.levenshteinDistance('cat', 'cats')).toBe(1);
      });

      it('should handle deletion operations', () => {
        expect(matcher.levenshteinDistance('cats', 'cat')).toBe(1);
      });

      it('should handle substitution operations', () => {
        expect(matcher.levenshteinDistance('cat', 'cut')).toBe(1);
      });
    });

    describe('DoS Protection', () => {
      it('should throw error for strings exceeding MAX_STRING_LENGTH', () => {
        const longString = 'a'.repeat(1001);

        expect(() => {
          matcher.levenshteinDistance(longString, 'test');
        }).toThrow('String length exceeds maximum');
      });

      it('should throw error when matrix size exceeds limit', () => {
        const str1 = 'a'.repeat(1000);
        const str2 = 'b'.repeat(1000);

        // Matrix would be 1001 x 1001 = 1,002,001 > 1,000,000
        expect(() => {
          matcher.levenshteinDistance(str1, str2);
        }).toThrow('Matrix size would exceed safe limit');
      });

      it('should accept strings at maximum length', () => {
        const maxString = 'a'.repeat(1000);

        // Should not throw
        expect(() => {
          matcher.levenshteinDistance(maxString, 'b');
        }).not.toThrow();
      });
    });

    describe('Type Validation', () => {
      it('should throw TypeError for non-string first argument', () => {
        expect(() => {
          matcher.levenshteinDistance(123 as any, 'test');
        }).toThrow(TypeError);
      });

      it('should throw TypeError for non-string second argument', () => {
        expect(() => {
          matcher.levenshteinDistance('test', 123 as any);
        }).toThrow(TypeError);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty strings', () => {
        expect(matcher.levenshteinDistance('', '')).toBe(0);
      });

      it('should handle single character strings', () => {
        expect(matcher.levenshteinDistance('a', 'b')).toBe(1);
        expect(matcher.levenshteinDistance('a', 'a')).toBe(0);
      });

      it('should handle completely different strings', () => {
        const distance = matcher.levenshteinDistance('abc', 'xyz');
        expect(distance).toBe(3); // All substitutions
      });
    });
  });

  describe('findAllMatches', () => {
    describe('Multiple Matches', () => {
      it('should return all matches within threshold', () => {
        const results = matcher.findAllMatches('ver', ['vercel', 'verge', 'netlify'], 3);

        expect(results).toHaveLength(2);
        // Both vercel and verge match 'ver', sorted by confidence
        expect(['vercel', 'verge']).toContain(results[0]!.match);
        expect(['vercel', 'verge']).toContain(results[1]!.match);
      });

      it('should sort results by confidence (descending)', () => {
        const results = matcher.findAllMatches('test', ['test', 'tester', 'testing'], 5);

        expect(results[0]!.match).toBe('test'); // Exact match first
        expect(results[0]!.confidence).toBe(1.0);
        expect(results[0]!.confidence).toBeGreaterThan(results[1]!.confidence);
      });

      it('should filter by max distance', () => {
        const results = matcher.findAllMatches('ver', ['vercel', 'netlify'], 1);

        expect(results).toHaveLength(0); // 'vercel' distance > 1
      });
    });

    describe('Empty Results', () => {
      it('should return empty array when no matches', () => {
        const results = matcher.findAllMatches('xyz', ['vercel', 'netlify'], 2);

        expect(results).toEqual([]);
      });

      it('should return empty array for empty input', () => {
        const results = matcher.findAllMatches('', ['vercel', 'netlify']);

        expect(results).toEqual([]);
      });

      it('should return empty array for empty candidates', () => {
        const results = matcher.findAllMatches('vercel', []);

        expect(results).toEqual([]);
      });
    });

    describe('Empty Normalized Candidates', () => {
      it('should filter out candidates that normalize to empty', () => {
        const results = matcher.findAllMatches('test', ['test', '!!!', '@@@'], 5);

        expect(results).toHaveLength(1);
        expect(results[0]!.match).toBe('test');
      });

      it('should return empty array when all candidates normalize to empty', () => {
        const results = matcher.findAllMatches('test', ['!!!', '@@@', '###']);

        expect(results).toEqual([]);
      });
    });

    describe('Confidence Calculation', () => {
      it('should calculate confidence correctly for exact match', () => {
        const results = matcher.findAllMatches('test', ['test']);

        expect(results[0]!.confidence).toBe(1.0);
      });

      it('should calculate confidence based on relative distance', () => {
        const results = matcher.findAllMatches('test', ['tester'], 5);

        expect(results[0]!.confidence).toBeGreaterThan(0);
        expect(results[0]!.confidence).toBeLessThan(1.0);
      });
    });
  });

  describe('matches', () => {
    it('should return true when match exists', () => {
      expect(matcher.matches('verc', ['vercel', 'netlify'])).toBe(true);
    });

    it('should return false when no match exists', () => {
      expect(matcher.matches('xyz', ['vercel', 'netlify'])).toBe(false);
    });

    it('should respect custom max distance', () => {
      expect(matcher.matches('ver', ['vercel'], 1)).toBe(false);
      expect(matcher.matches('ver', ['vercel'], 5)).toBe(true);
    });

    it('should return false for empty input', () => {
      expect(matcher.matches('', ['vercel'])).toBe(false);
    });

    it('should return false for empty candidates', () => {
      expect(matcher.matches('vercel', [])).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should match common provider typos', () => {
      const providers = ['vercel', 'netlify', 'railway', 'aws', 'heroku'];

      expect(matcher.findBestMatch('verc', providers)!.match).toBe('vercel');
      expect(matcher.findBestMatch('netlfy', providers)!.match).toBe('netlify');
      expect(matcher.findBestMatch('railwy', providers)!.match).toBe('railway');
    });

    it('should match environment typos', () => {
      const environments = ['development', 'staging', 'production', 'preview'];

      // 'dev' is too different from 'development' (distance > 2 with default threshold)
      // Test with explicit threshold
      expect(matcher.findBestMatch('development', environments)!.match).toBe('development');
      expect(matcher.findBestMatch('product', environments, 3)!.match).toBe('production');
      expect(matcher.findBestMatch('stag', environments, 3)!.match).toBe('staging');
    });

    it('should handle command typos', () => {
      const commands = ['deploy', 'status', 'logs', 'scale', 'rollback'];

      expect(matcher.findBestMatch('deply', commands)!.match).toBe('deploy');
      expect(matcher.findBestMatch('stat', commands)!.match).toBe('status');
      expect(matcher.findBestMatch('log', commands)!.match).toBe('logs');
    });
  });

  describe('Performance', () => {
    it('should handle reasonable string lengths efficiently', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        matcher.levenshteinDistance('testing string', 'another string');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle large candidate lists efficiently', () => {
      const candidates = Array.from({ length: 100 }, (_, i) => `candidate${i}`);

      const start = Date.now();
      matcher.findBestMatch('candidate50', candidates);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });
  });
});
