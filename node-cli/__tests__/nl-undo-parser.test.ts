/**
 * @fileoverview Tests for Natural Language Undo Parser
 */

import { NaturalLanguageUndoParser } from '../services/nl-undo-parser.js';
import { UndoQueryType, UndoableActionType } from '../services/undo.types.js';

describe('NaturalLanguageUndoParser - TDD', () => {
  let parser: NaturalLanguageUndoParser;

  beforeEach(() => {
    parser = new NaturalLanguageUndoParser();
  });

  describe('Basic Undo Commands', () => {
    it('should parse simple "undo"', () => {
      const result = parser.parse('undo');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBe(1.0);
    });

    it('should parse "undo last"', () => {
      const result = parser.parse('undo last');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBe(1.0);
    });

    it('should parse "undo that"', () => {
      const result = parser.parse('undo that');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBe(1.0);
    });

    it('should parse "undo it"', () => {
      const result = parser.parse('undo it');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBe(1.0);
    });

    it('should handle case insensitivity', () => {
      const result = parser.parse('UNDO');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBe(1.0);
    });

    it('should handle extra whitespace', () => {
      const result = parser.parse('  undo   ');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Type-Specific Undo', () => {
    it('should parse "undo deployment"', () => {
      const result = parser.parse('undo deployment');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.query.actionType).toBe(UndoableActionType.DEPLOY);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should parse "undo the deployment"', () => {
      const result = parser.parse('undo the deployment');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.query.actionType).toBe(UndoableActionType.DEPLOY);
    });

    it('should parse "undo last deployment"', () => {
      const result = parser.parse('undo last deployment');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.query.actionType).toBe(UndoableActionType.DEPLOY);
    });

    it('should parse "undo scaling"', () => {
      const result = parser.parse('undo scaling');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.query.actionType).toBe(UndoableActionType.SCALE);
    });

    it('should parse "undo scale"', () => {
      const result = parser.parse('undo scale');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.query.actionType).toBe(UndoableActionType.SCALE);
    });

    it('should parse "undo env"', () => {
      const result = parser.parse('undo env');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.query.actionType).toBe(UndoableActionType.SET_ENV);
    });

    it('should parse "undo environment"', () => {
      const result = parser.parse('undo environment');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.query.actionType).toBe(UndoableActionType.SET_ENV);
    });
  });

  describe('Time-Based Undo', () => {
    it('should parse "undo 5 minutes ago"', () => {
      const result = parser.parse('undo 5 minutes ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
      expect(result.query.timeAgo).toBe(5 * 60 * 1000);
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should parse "undo 1 hour ago"', () => {
      const result = parser.parse('undo 1 hour ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
      expect(result.query.timeAgo).toBe(60 * 60 * 1000);
    });

    it('should parse "undo 30 seconds ago"', () => {
      const result = parser.parse('undo 30 seconds ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
      expect(result.query.timeAgo).toBe(30 * 1000);
    });

    it('should parse "undo 2 days ago"', () => {
      const result = parser.parse('undo 2 days ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
      expect(result.query.timeAgo).toBe(2 * 24 * 60 * 60 * 1000);
    });

    it('should parse "undo what I did 10 minutes ago"', () => {
      const result = parser.parse('undo what I did 10 minutes ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
      expect(result.query.timeAgo).toBe(10 * 60 * 1000);
    });

    it('should handle singular units', () => {
      const result = parser.parse('undo 1 minute ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
      expect(result.query.timeAgo).toBe(60 * 1000);
    });
  });

  describe('Rollback/Revert Synonyms', () => {
    it('should parse "rollback"', () => {
      const result = parser.parse('rollback');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should parse "revert"', () => {
      const result = parser.parse('revert');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should parse "rollback last"', () => {
      const result = parser.parse('rollback last');

      expect(result.query.type).toBe(UndoQueryType.LAST);
    });
  });

  describe('Cancel Synonym', () => {
    it('should parse "cancel deployment"', () => {
      const result = parser.parse('cancel deployment');

      expect(result.query.type).toBe(UndoQueryType.LAST);
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should parse "cancel last action"', () => {
      const result = parser.parse('cancel last action');

      expect(result.query.type).toBe(UndoQueryType.LAST);
    });

    it('should parse "cancel the deployment"', () => {
      const result = parser.parse('cancel the deployment');

      expect(result.query.type).toBe(UndoQueryType.LAST);
    });
  });

  describe('List/Show Commands', () => {
    it('should parse "what can I undo?"', () => {
      const result = parser.parse('what can I undo?');

      expect(result.query.type).toBe(UndoQueryType.ALL);
      expect(result.query.maxResults).toBe(10);
      expect(result.confidence).toBe(1.0);
    });

    it('should parse "show undo history"', () => {
      const result = parser.parse('show undo history');

      expect(result.query.type).toBe(UndoQueryType.ALL);
      expect(result.query.maxResults).toBe(10);
    });

    it('should parse "list undoable actions"', () => {
      const result = parser.parse('list undoable actions');

      expect(result.query.type).toBe(UndoQueryType.ALL);
    });

    it('should parse "view undo-able"', () => {
      const result = parser.parse('view undo-able');

      expect(result.query.type).toBe(UndoQueryType.ALL);
    });
  });

  describe('Environment-Specific Undo', () => {
    it('should parse "undo in production"', () => {
      const result = parser.parse('undo in production');

      expect(result.query.type).toBe(UndoQueryType.ALL);
      expect(result.query.environment).toBe('production');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse "undo to staging"', () => {
      const result = parser.parse('undo to staging');

      expect(result.query.type).toBe(UndoQueryType.ALL);
      expect(result.query.environment).toBe('staging');
    });

    it('should parse "undo development"', () => {
      const result = parser.parse('undo development');

      expect(result.query.type).toBe(UndoQueryType.ALL);
      expect(result.query.environment).toBe('development');
    });
  });

  describe('Unrecognized Input', () => {
    it('should handle unrecognized input gracefully', () => {
      const result = parser.parse('make me a sandwich');

      expect(result.confidence).toBe(0.0);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should suggest alternatives for unrecognized input', () => {
      const result = parser.parse('xyz');

      expect(result.suggestions).toContain('undo');
    });

    it('should default to ALL query for unrecognized input', () => {
      const result = parser.parse('asdfghjkl');

      expect(result.query.type).toBe(UndoQueryType.ALL);
    });
  });

  describe('isUndoCommand()', () => {
    it('should detect "undo" as undo command', () => {
      expect(parser.isUndoCommand('undo')).toBe(true);
    });

    it('should detect "rollback" as undo command', () => {
      expect(parser.isUndoCommand('rollback')).toBe(true);
    });

    it('should detect "revert" as undo command', () => {
      expect(parser.isUndoCommand('revert')).toBe(true);
    });

    it('should detect "undo" in longer sentence', () => {
      expect(parser.isUndoCommand('please undo that deployment')).toBe(true);
    });

    it('should reject non-undo commands', () => {
      expect(parser.isUndoCommand('deploy to production')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(parser.isUndoCommand('')).toBe(false);
    });
  });

  describe('Explanations', () => {
    it('should generate explanation for LAST query', () => {
      const result = parser.parse('undo');

      expect(result.explanation).toContain('last action');
    });

    it('should generate explanation for LAST_OF_TYPE query', () => {
      const result = parser.parse('undo deployment');

      expect(result.explanation).toContain('deploy');
    });

    it('should generate explanation for BY_TIME query', () => {
      const result = parser.parse('undo 5 minutes ago');

      expect(result.explanation).toContain('5 minute');
    });

    it('should generate explanation for ALL query', () => {
      const result = parser.parse('what can I undo?');

      expect(result.explanation).toContain('all');
    });

    it('should generate environment-specific explanation', () => {
      const result = parser.parse('undo in production');

      expect(result.explanation).toContain('production');
    });
  });

  describe('getAllExamples()', () => {
    it('should return all pattern examples', () => {
      const examples = parser.getAllExamples();

      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0]).toHaveProperty('description');
      expect(examples[0]).toHaveProperty('examples');
    });

    it('should include examples for each pattern', () => {
      const examples = parser.getAllExamples();

      examples.forEach(({ examples: exampleList }) => {
        expect(exampleList.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = parser.parse('');

      expect(result.confidence).toBe(0.0);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle whitespace-only input', () => {
      const result = parser.parse('   ');

      expect(result.confidence).toBe(0.0);
    });

    it('should handle mixed case with symbols', () => {
      const result = parser.parse('UnDo!!!');

      expect(result.query.type).toBe(UndoQueryType.LAST);
    });

    it('should reject very long time amounts', () => {
      // Now we validate and reject unreasonable times (max 30 days)
      expect(() => {
        parser.parse('undo 999 days ago');
      }).toThrow('Time range too large');
    });

    it('should accept time amounts within limit', () => {
      const result = parser.parse('undo 29 days ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
      expect(result.query.timeAgo).toBe(29 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Pattern Specificity', () => {
    it('should prefer more specific patterns', () => {
      // "undo deployment" should match type-specific, not generic undo
      const result = parser.parse('undo deployment');

      expect(result.query.type).toBe(UndoQueryType.LAST_OF_TYPE);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should match time-based over generic', () => {
      const result = parser.parse('undo 5 minutes ago');

      expect(result.query.type).toBe(UndoQueryType.BY_TIME);
    });

    it('should match list commands precisely', () => {
      const result = parser.parse('what can I undo?');

      expect(result.query.type).toBe(UndoQueryType.ALL);
      expect(result.confidence).toBe(1.0);
    });
  });
});
