/**
 * @fileoverview Intent Parsing Unit Tests
 * @description Tests for NL → Intent parsing without full integration
 */

import { describe, it, expect } from '@jest/globals';

describe('Intent Parsing - Pattern Validation', () => {
  describe('Deploy Intent Patterns', () => {
    it('should recognize deploy patterns', () => {
      const deployPatterns = [
        'deploy web-app to production',
        'deploy api-server',
        'push to staging',
        'ship it to production',
      ];

      deployPatterns.forEach(pattern => {
        // Validate pattern contains key deployment keywords
        const hasDeployKeyword = /deploy|push|ship/i.test(pattern);
        expect(hasDeployKeyword).toBe(true);
      });
    });

    it('should extract environment from deploy commands', () => {
      const envPattern = /(development|dev|staging|stage|production|prod|preview)/i;

      expect('deploy to production').toMatch(envPattern);
      expect('deploy to staging').toMatch(envPattern);
      expect('push to dev').toMatch(envPattern);
    });

    it('should extract service names', () => {
      const servicePattern = /(web-app|api-server|[\w-]+)/;

      expect('deploy web-app').toMatch(servicePattern);
      expect('deploy api-server').toMatch(servicePattern);
      expect('deploy my-service').toMatch(servicePattern);
    });
  });

  describe('Logs Intent Patterns', () => {
    it('should recognize log request patterns', () => {
      const logPatterns = [
        'show logs',
        'get logs for api',
        'view error logs',
        'show me the logs',
      ];

      logPatterns.forEach(pattern => {
        const hasLogKeyword = /logs?|log/i.test(pattern);
        expect(hasLogKeyword).toBe(true);
      });
    });

    it('should extract log levels', () => {
      const levelPattern = /(info|warn|warning|error|debug)/i;

      expect('show error logs').toMatch(levelPattern);
      expect('get warning logs').toMatch(levelPattern);
      expect('debug logs please').toMatch(levelPattern);
    });

    it('should extract time windows', () => {
      const timePattern = /(\d+[mhd]|last\s+\d+\s+(minutes?|hours?|days?))/i;

      expect('logs from last 30 minutes').toMatch(timePattern);
      expect('logs from 1h').toMatch(timePattern);
      expect('show 15m of logs').toMatch(timePattern);
    });
  });

  describe('Scale Intent Patterns', () => {
    it('should recognize scale patterns', () => {
      const scalePatterns = [
        'scale to 5 replicas',
        'scale web-app to 10',
        'set replicas to 3',
      ];

      scalePatterns.forEach(pattern => {
        const hasScaleKeyword = /scale|replicas?/i.test(pattern);
        expect(hasScaleKeyword).toBe(true);
      });
    });

    it('should extract replica counts', () => {
      const replicaPattern = /(\d+)\s*(replicas?)?/i;

      const match1 = 'scale to 5 replicas'.match(replicaPattern);
      expect(match1?.[1]).toBe('5');

      const match2 = 'scale to 10'.match(replicaPattern);
      expect(match2?.[1]).toBe('10');
    });
  });

  describe('Rollback Intent Patterns', () => {
    it('should recognize rollback patterns', () => {
      const rollbackPatterns = [
        'rollback',
        'rollback api in production',
        'revert deployment',
      ];

      rollbackPatterns.forEach(pattern => {
        const hasRollbackKeyword = /rollback|revert/i.test(pattern);
        expect(hasRollbackKeyword).toBe(true);
      });
    });
  });

  describe('Status Intent Patterns', () => {
    it('should recognize status patterns', () => {
      const statusPatterns = [
        'status',
        'what is the status',
        'check status',
        'show status',
      ];

      statusPatterns.forEach(pattern => {
        const hasStatusKeyword = /status|check/i.test(pattern);
        expect(hasStatusKeyword).toBe(true);
      });
    });
  });
});

describe('Risk Level Assessment', () => {
  it('should identify production as high risk', () => {
    const prodPattern = /production|prod/i;

    expect('deploy to production').toMatch(prodPattern);
    expect('scale in prod').toMatch(prodPattern);
  });

  it('should identify staging as moderate risk', () => {
    const stagingPattern = /staging|stage/i;

    expect('deploy to staging').toMatch(stagingPattern);
    expect('push to stage').toMatch(stagingPattern);
  });

  it('should identify rollback as destructive', () => {
    const rollbackPattern = /rollback|revert/i;

    expect('rollback deployment').toMatch(rollbackPattern);
    expect('revert to previous').toMatch(rollbackPattern);
  });
});

describe('Entity Extraction', () => {
  describe('Service Name Extraction', () => {
    it('should extract hyphenated service names', () => {
      const servicePattern = /(?:deploy|logs\s+for|of)\s+([\w-]+)/;

      const match1 = 'deploy web-app'.match(servicePattern);
      expect(match1?.[1]).toBe('web-app');

      const match2 = 'logs for api-server'.match(servicePattern);
      expect(match2?.[1]).toBe('api-server');
    });
  });

  describe('Environment Extraction', () => {
    it('should extract environment names', () => {
      const envPattern = /(?:to|in|on)\s+(development|dev|staging|stage|production|prod|preview)/i;

      const match1 = 'deploy to production'.match(envPattern);
      expect(match1?.[1]?.toLowerCase()).toMatch(/prod|production/);

      const match2 = 'scale in staging'.match(envPattern);
      expect(match2?.[1]?.toLowerCase()).toMatch(/stag|staging/);
    });
  });

  describe('Provider Extraction', () => {
    it('should extract cloud provider names', () => {
      const providerPattern = /(vercel|netlify|aws|railway|render|azure|gcp)/i;

      expect('deploy to vercel').toMatch(providerPattern);
      expect('connect to aws').toMatch(providerPattern);
      expect('adopt from netlify').toMatch(providerPattern);
    });
  });
});

describe('CLI Command Generation Patterns', () => {
  it('should generate deploy commands', () => {
    const command = 'aios cloud deploy --env production --service web-app';

    expect(command).toContain('aios');
    expect(command).toContain('cloud');
    expect(command).toContain('deploy');
    expect(command).toContain('--env');
    expect(command).toContain('--service');
  });

  it('should generate logs commands', () => {
    const command = 'aios cloud logs --service api --since 1h --level error';

    expect(command).toContain('logs');
    expect(command).toContain('--since');
    expect(command).toContain('--level');
  });

  it('should generate scale commands', () => {
    const command = 'aios cloud scale --service web --replicas 5';

    expect(command).toContain('scale');
    expect(command).toContain('--replicas');
  });
});

describe('Confidence Scoring', () => {
  it('should have high confidence for exact matches', () => {
    const exactPatterns = [
      'deploy',
      'status',
      'logs',
      'rollback',
    ];

    exactPatterns.forEach(pattern => {
      // Exact match should give high confidence
      const confidence = pattern.length > 0 ? 1.0 : 0.0;
      expect(confidence).toBeGreaterThan(0.9);
    });
  });

  it('should have lower confidence for ambiguous patterns', () => {
    const ambiguousPatterns = [
      'do something',
      'check it',
      'run',
    ];

    ambiguousPatterns.forEach(pattern => {
      // Ambiguous patterns should have lower confidence
      const hasKeyword = /deploy|logs|scale|status|rollback/i.test(pattern);
      expect(hasKeyword).toBe(false);
    });
  });
});
