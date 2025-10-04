/**
 * @fileoverview Error Factory Unit Tests
 * @description Comprehensive unit tests for centralized error factory functions
 */

import { describe, it, expect } from 'vitest';
import {
  createAPIError,
  createAPIKeyRequiredError,
  createTokenNotConfiguredError,
  createProjectIdRequiredError,
  createNoResponseContentError,
  createNoResponseBodyError,
  createUnexpectedResponseError,
  createServerNotRunningError,
  createNetworkError,
  createDeploymentFailedError,
  createInvalidConfigurationError,
} from '../errors.js';

describe('Error Factory Functions', () => {
  describe('createAPIError', () => {
    it('should create API error with provider, status code and message', () => {
      const error = createAPIError('TestProvider', 404, 'Not Found');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('TestProvider');
      expect(error.message).toContain('404');
      expect(error.message).toContain('Not Found');
    });

    it('should handle different providers correctly', () => {
      const providers = ['Anthropic', 'Google', 'OpenAI', 'Railway', 'Netlify'];

      providers.forEach(provider => {
        const error = createAPIError(provider, 500, 'Server Error');
        expect(error.message).toContain(provider);
      });
    });

    it('should handle various status codes', () => {
      const statusCodes = [400, 401, 403, 404, 429, 500, 502, 503];

      statusCodes.forEach(status => {
        const error = createAPIError('TestProvider', status, 'Error');
        expect(error.message).toContain(String(status));
      });
    });

    it('should include error message if provided', () => {
      const errorMessage = 'Detailed error message';
      const error = createAPIError('TestProvider', 400, errorMessage);

      expect(error.message).toContain(errorMessage);
    });
  });

  describe('createAPIKeyRequiredError', () => {
    it('should create API key required error for provider', () => {
      const error = createAPIKeyRequiredError('OpenAI');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('OpenAI');
      expect(error.message).toContain('API key');
      expect(error.message.toLowerCase()).toContain('required');
    });

    it('should work with different provider names', () => {
      const providers = ['Anthropic', 'Google', 'Groq', 'HuggingFace'];

      providers.forEach(provider => {
        const error = createAPIKeyRequiredError(provider);
        expect(error.message).toContain(provider);
      });
    });
  });

  describe('createTokenNotConfiguredError', () => {
    it('should create token not configured error', () => {
      const error = createTokenNotConfiguredError('Railway');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Railway');
      expect(error.message.toLowerCase()).toContain('token');
      expect(error.message.toLowerCase()).toContain('not configured');
    });

    it('should work with cloud providers', () => {
      const providers = ['Railway', 'Render', 'Vercel', 'Netlify'];

      providers.forEach(provider => {
        const error = createTokenNotConfiguredError(provider);
        expect(error.message).toContain(provider);
      });
    });
  });

  describe('createProjectIdRequiredError', () => {
    it('should create project ID required error', () => {
      const error = createProjectIdRequiredError('Google Cloud');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Google Cloud');
      expect(error.message.toLowerCase()).toContain('project');
    });
  });

  describe('createNoResponseContentError', () => {
    it('should create no response content error', () => {
      const error = createNoResponseContentError('Anthropic');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Anthropic');
      expect(error.message.toLowerCase()).toContain('response');
      expect(error.message.toLowerCase()).toContain('content');
    });

    it('should handle multiple providers', () => {
      const providers = ['Anthropic', 'Google', 'Replicate', 'Groq'];

      providers.forEach(provider => {
        const error = createNoResponseContentError(provider);
        expect(error.message).toContain(provider);
      });
    });
  });

  describe('createNoResponseBodyError', () => {
    it('should create no response body error', () => {
      const error = createNoResponseBodyError('Google');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Google');
      expect(error.message.toLowerCase()).toContain('response body');
    });
  });

  describe('createUnexpectedResponseError', () => {
    it('should create unexpected response error without expected type', () => {
      const error = createUnexpectedResponseError('Anthropic');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Anthropic');
      expect(error.message.toLowerCase()).toContain('unexpected');
      expect(error.message.toLowerCase()).toContain('response');
    });

    it('should create unexpected response error with expected type', () => {
      const error = createUnexpectedResponseError('Anthropic', 'stream');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Anthropic');
      expect(error.message).toContain('stream');
    });

    it('should handle different expected types', () => {
      const types = ['stream', 'json', 'text', 'binary'];

      types.forEach(type => {
        const error = createUnexpectedResponseError('TestProvider', type);
        expect(error.message).toContain(type);
      });
    });
  });

  describe('createServerNotRunningError', () => {
    it('should create server not running error', () => {
      const error = createServerNotRunningError('Ollama');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Ollama');
      expect(error.message.toLowerCase()).toContain('server');
      expect(error.message.toLowerCase()).toContain('not running');
    });
  });

  describe('createNetworkError', () => {
    it('should create network error with operation', () => {
      const error = createNetworkError('deployment');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('deployment');
      expect(error.message.toLowerCase()).toContain('network');
    });

    it('should create network error with operation and original error', () => {
      const originalError = new Error('Connection timeout');
      const error = createNetworkError('status check', originalError);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('status check');
      expect(error.message).toContain('Connection timeout');
    });

    it('should handle various operations', () => {
      const operations = ['deployment', 'status check', 'log retrieval', 'rollback'];

      operations.forEach(operation => {
        const error = createNetworkError(operation);
        expect(error.message).toContain(operation);
      });
    });
  });

  describe('createDeploymentFailedError', () => {
    it('should create deployment failed error with provider', () => {
      const error = createDeploymentFailedError('Railway', 'Build failed');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Railway');
      expect(error.message).toContain('Build failed');
      expect(error.message.toLowerCase()).toContain('deployment');
      expect(error.message.toLowerCase()).toContain('failed');
    });

    it('should work without reason', () => {
      const error = createDeploymentFailedError('Vercel');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Vercel');
    });
  });

  describe('createInvalidConfigurationError', () => {
    it('should create invalid config error', () => {
      const error = createInvalidConfigurationError('Missing required field: apiKey');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Missing required field');
      expect(error.message.toLowerCase()).toContain('invalid');
      expect(error.message.toLowerCase()).toContain('config');
    });

    it('should handle various validation errors', () => {
      const validationErrors = [
        'Invalid port number',
        'Unsupported framework',
        'Missing environment variable',
        'Invalid region'
      ];

      validationErrors.forEach(validationError => {
        const error = createInvalidConfigurationError(validationError);
        expect(error.message).toContain(validationError);
      });
    });
  });

  describe('Error Consistency', () => {
    it('should all return Error instances', () => {
      const errors = [
        createAPIError('Provider', 500, 'Error'),
        createAPIKeyRequiredError('Provider'),
        createTokenNotConfiguredError('Provider'),
        createProjectIdRequiredError('Provider'),
        createNoResponseContentError('Provider'),
        createNoResponseBodyError('Provider'),
        createUnexpectedResponseError('Provider'),
        createServerNotRunningError('Provider', 'http://localhost:3000'),
        createNetworkError('operation'),
        createDeploymentFailedError('Provider'),
        createInvalidConfigurationError('Error'),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive error messages', () => {
      const errors = [
        createAPIError('Provider', 404, 'Not found'),
        createAPIKeyRequiredError('Provider'),
        createNoResponseContentError('Provider'),
      ];

      errors.forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(10); // Ensure meaningful message
      });
    });
  });

  describe('Error Message Formatting', () => {
    it('should not have trailing or leading whitespace', () => {
      const error = createAPIError('Provider', 500, 'Error');
      expect(error.message).toBe(error.message.trim());
    });

    it('should be consistent in capitalization', () => {
      const error1 = createAPIKeyRequiredError('OpenAI');
      const error2 = createAPIKeyRequiredError('Anthropic');

      // Both should follow same pattern (e.g., both start with capital letter)
      const startsWithCapital = (str: string) => str.charAt(0) === str.charAt(0).toUpperCase();
      expect(startsWithCapital(error1.message)).toBe(startsWithCapital(error2.message));
    });
  });
});
