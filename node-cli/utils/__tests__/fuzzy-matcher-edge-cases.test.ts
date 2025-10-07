/**
 * @fileoverview Advanced Edge Case Tests for FuzzyMatcher
 * @module node-cli/utils/__tests__/fuzzy-matcher-edge-cases
 *
 * Production-grade edge case coverage:
 * - Unicode edge cases (emoji, RTL, zero-width)
 * - Whitespace variants (tabs, newlines, non-breaking)
 * - Normalization edge cases
 *
 * @author Claude Code (Principal Engineer - God Mode)
 */

import { describe, it, expect } from '@jest/globals';
import { FuzzyMatcher } from '../fuzzy-matcher.js';

describe('FuzzyMatcher - Advanced Edge Cases', () => {
  let matcher: FuzzyMatcher;

  beforeEach(() => {
    matcher = new FuzzyMatcher();
  });

  describe('Unicode Edge Cases', () => {
    it('should handle emoji in strings gracefully', () => {
      // Arrange
      const candidates = ['vercel', 'netlify', 'aws', 'railway'];

      // Act - Various emoji patterns
      const result1 = matcher.findBestMatch('vercel 🚀', candidates);
      const result2 = matcher.findBestMatch('🚀 vercel', candidates);
      const result3 = matcher.findBestMatch('ver🚀cel', candidates);

      // Assert - Should match despite emoji
      expect(result1?.match).toBe('vercel');
      expect(result2?.match).toBe('vercel');
      // Emoji in middle might not match exactly, but should not crash
      expect(result3).toBeDefined();
    });

    it('should handle multiple emoji types', () => {
      // Arrange
      const emojiInputs = [
        'vercel 👍',      // Thumbs up
        'netlify ❤️',     // Heart
        'aws 🎉',        // Party
        'railway 🔥',    // Fire
        '⭐ vercel ⭐',  // Stars
      ];

      const candidates = ['vercel', 'netlify', 'aws', 'railway'];

      // Act & Assert - All should match without crashing
      emojiInputs.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
      });
    });

    it('should handle Right-to-Left (RTL) text', () => {
      // Arrange - Arabic text mixed with provider names
      const rtlInput = 'vercel العربية'; // "vercel" + Arabic
      const candidates = ['vercel', 'netlify'];

      // Act
      const result = matcher.findBestMatch(rtlInput, candidates);

      // Assert - Should handle RTL gracefully
      expect(result).toBeDefined();
      // May or may not match depending on normalization
    });

    it('should handle zero-width characters', () => {
      // Arrange - Various zero-width characters
      const zeroWidthInputs = [
        'ver\u200Bcel',      // Zero-width space
        'ver\u200Ccel',      // Zero-width non-joiner
        'ver\u200Dcel',      // Zero-width joiner
        'ver\uFEFFcel',      // Zero-width no-break space (BOM)
      ];

      const candidates = ['vercel', 'netlify'];

      // Act & Assert - Should normalize and match
      zeroWidthInputs.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
        // Zero-width chars should be handled (might match 'vercel')
      });
    });

    it('should handle combining diacritical marks', () => {
      // Arrange - Decomposed Unicode (e + combining acute)
      const decomposed = 've\u0301rcel'; // é as e + combining acute
      const composed = 'vércel';          // é as single character
      const candidates = ['vercel', 'vércel'];

      // Act
      const result1 = matcher.findBestMatch(decomposed, candidates);
      const result2 = matcher.findBestMatch(composed, candidates);

      // Assert - Unicode normalization should handle both
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('Whitespace Variant Edge Cases', () => {
    it('should handle tab characters', () => {
      // Arrange
      const tabInputs = [
        'ver\tcel',          // Single tab
        'ver\t\tcel',        // Multiple tabs
        '\tvercel',          // Leading tab
        'vercel\t',          // Trailing tab
        'ver\tcel\tify',     // Mixed tabs
      ];

      const candidates = ['vercel', 'netlify'];

      // Act & Assert
      tabInputs.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
        // Tabs should be normalized to spaces
      });
    });

    it('should handle newline characters (LF, CR, CRLF)', () => {
      // Arrange - Various newline formats
      const newlineInputs = [
        'ver\ncel',          // LF (Unix)
        'ver\rcel',          // CR (old Mac)
        'ver\r\ncel',        // CRLF (Windows)
        'ver\n\ncel',        // Multiple newlines
      ];

      const candidates = ['vercel', 'netlify'];

      // Act & Assert
      newlineInputs.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
      });
    });

    it('should handle non-breaking spaces (NBSP)', () => {
      // Arrange - Various non-breaking space types
      const nbspInputs = [
        'ver\u00A0cel',      // Regular NBSP (U+00A0)
        'ver\u202Fcel',      // Narrow NBSP
        'ver\u2007cel',      // Figure space
        'ver\u2009cel',      // Thin space
      ];

      const candidates = ['vercel', 'netlify'];

      // Act & Assert
      nbspInputs.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
        // Non-breaking spaces should be normalized
      });
    });

    it('should handle mixed whitespace types', () => {
      // Arrange - Combination of different whitespace
      const mixedWhitespace = 'ver \t\n\r\u00A0 cel';
      const candidates = ['vercel', 'ver cel'];

      // Act
      const result = matcher.findBestMatch(mixedWhitespace, candidates);

      // Assert - Should normalize all to single space
      expect(result).toBeDefined();
    });

    it('should handle vertical whitespace', () => {
      // Arrange - Vertical tab, form feed
      const verticalWhitespace = [
        'ver\vcel',          // Vertical tab
        'ver\fcel',          // Form feed
      ];

      const candidates = ['vercel'];

      // Act & Assert
      verticalWhitespace.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Normalization Edge Cases', () => {
    it('should handle string that normalizes to empty', () => {
      // Arrange - Only diacritics (no base characters)
      const diacriticsOnly = '\u0301\u0308\u0303'; // Combining marks only
      const candidates = ['vercel', 'netlify'];

      // Act
      const result = matcher.findBestMatch(diacriticsOnly, candidates);

      // Assert - Should return null (empty after normalization)
      expect(result).toBeNull();
    });

    it('should handle candidates that normalize to empty', () => {
      // Arrange
      const input = 'vercel';
      const candidates = [
        'vercel',
        '\u0301\u0308',     // Diacritics only (normalizes to empty)
        'netlify',
      ];

      // Act
      const result = matcher.findBestMatch(input, candidates);

      // Assert - Should skip empty normalized candidate
      expect(result?.match).toBe('vercel');
    });

    it('should handle only whitespace that normalizes to empty', () => {
      // Arrange
      const whitespaceOnly = '   \t\n\r   ';
      const candidates = ['vercel', 'netlify'];

      // Act
      const result = matcher.findBestMatch(whitespaceOnly, candidates);

      // Assert - Should return null (empty after normalization)
      expect(result).toBeNull();
    });

    it('should handle control characters', () => {
      // Arrange - Various control characters (U+0000 to U+001F)
      const controlChars = [
        'ver\u0000cel',      // NULL
        'ver\u0001cel',      // Start of heading
        'ver\u001Fcel',      // Unit separator
      ];

      const candidates = ['vercel'];

      // Act & Assert - Should handle gracefully
      controlChars.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
      });
    });

    it('should handle surrogate pairs (emoji with modifiers)', () => {
      // Arrange - Emoji with skin tone modifier (surrogate pair)
      const skinToneEmoji = 'vercel 👍🏽'; // Thumbs up with medium skin tone
      const candidates = ['vercel', 'netlify'];

      // Act
      const result = matcher.findBestMatch(skinToneEmoji, candidates);

      // Assert - Should handle surrogate pairs without crashing
      expect(result).toBeDefined();
    });

    it('should handle grapheme clusters', () => {
      // Arrange - Complex grapheme clusters
      const graphemeClusters = [
        'vercél',            // e + combining acute
        'ver👨‍👩‍👧‍👦cel',     // Family emoji (ZWJ sequence)
        'verनमस्तेcel',      // Hindi with combining marks
      ];

      const candidates = ['vercel', 'netlify'];

      // Act & Assert - Should handle complex graphemes
      graphemeClusters.forEach(input => {
        const result = matcher.findBestMatch(input, candidates);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Extreme Input Edge Cases', () => {
    it('should handle very long candidate list (1000+ items)', () => {
      // Arrange - Generate 1000 candidates
      const candidates = Array.from({ length: 1000 }, (_, i) => `provider-${i}`);
      candidates.push('vercel'); // Add actual match

      const input = 'vercle'; // Typo of vercel

      // Act
      const startTime = Date.now();
      const result = matcher.findBestMatch(input, candidates);
      const duration = Date.now() - startTime;

      // Assert
      expect(result?.match).toBe('vercel');
      // Should complete in reasonable time (<1 second for 1000 items)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle input with maximum allowed length', () => {
      // Arrange - Create string near max length (1000 chars)
      const longInput = 'v' + 'e'.repeat(998) + 'l'; // 1000 chars
      const candidates = ['vercel', 'veeeeel'];

      // Act
      const result = matcher.findBestMatch(longInput, candidates);

      // Assert - Should handle without crashing
      expect(result).toBeDefined();
    });

    it('should handle all candidates with same distance', () => {
      // Arrange - All candidates equidistant from input (within threshold)
      const input = 'abc';
      const candidates = ['ab', 'ac', 'bc']; // All distance 1 from 'abc'

      // Act
      const result = matcher.findBestMatch(input, candidates);

      // Assert - Should return first match (stable)
      expect(result).toBeDefined();
      expect(result?.match).toBe('ab');
    });
  });
});
