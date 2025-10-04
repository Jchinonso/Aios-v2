/**
 * @fileoverview Redaction Filter - Prevent secrets from being logged
 * @description Middleware to redact sensitive data from console output
 * @module node-cli/utils/redaction-filter
 */

/**
 * Sensitive patterns to redact
 */
const SENSITIVE_PATTERNS = [
  // API Keys and Tokens
  /\b[A-Za-z0-9_-]{32,}\b/g, // Generic long alphanumeric (likely tokens)
  /sk-[A-Za-z0-9]{32,}/g, // OpenAI style keys
  /sk-ant-[A-Za-z0-9-]{32,}/g, // Anthropic keys
  /gsk_[A-Za-z0-9]{32,}/g, // Groq keys
  /ghp_[A-Za-z0-9]{32,}/g, // GitHub personal access tokens
  /glpat-[A-Za-z0-9_-]{20,}/g, // GitLab personal access tokens

  // AWS Keys
  /AKIA[0-9A-Z]{16}/g, // AWS Access Key ID
  /[A-Za-z0-9/+=]{40}/g, // AWS Secret Access Key (40 chars base64)

  // Database URLs
  /postgres:\/\/[^:]+:[^@]+@[^/]+\/[^\s]+/g,
  /mysql:\/\/[^:]+:[^@]+@[^/]+\/[^\s]+/g,
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^/]+\/[^\s]+/g,

  // Generic password patterns
  /password["\s:=]+["']?[^\s"']{6,}["']?/gi,
  /secret["\s:=]+["']?[^\s"']{6,}["']?/gi,
  /api[_-]?key["\s:=]+["']?[^\s"']{6,}["']?/gi,
  /token["\s:=]+["']?[^\s"']{6,}["']?/gi,

  // Bearer tokens
  /Bearer\s+[A-Za-z0-9_-]+/g,

  // JWT tokens (rough pattern)
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
];

/**
 * Environment variable names that should be redacted
 */
const SENSITIVE_ENV_VARS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'GITHUB_TOKEN',
  'GITLAB_TOKEN',
  'VERCEL_TOKEN',
  'NETLIFY_TOKEN',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DATABASE_URL',
  'POSTGRES_PASSWORD',
  'MYSQL_PASSWORD',
  'MONGODB_URI',
  'API_KEY',
  'API_SECRET',
  'SECRET_KEY',
  'PRIVATE_KEY',
];

/**
 * Redact sensitive data from text
 */
export function redactSecrets(text: string): string {
  let redacted = text;

  // Apply all pattern-based redactions
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      // Show first 4 and last 4 characters for debugging
      if (match.length > 12) {
        return `${match.substring(0, 4)}${'•'.repeat(match.length - 8)}${match.substring(match.length - 4)}`;
      }
      // For shorter matches, redact completely
      return '•'.repeat(match.length);
    });
  }

  // Redact environment variable values
  for (const envVar of SENSITIVE_ENV_VARS) {
    const value = process.env[envVar];
    if (value && value.length > 0) {
      // Escape special regex characters
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedValue, 'g');
      redacted = redacted.replace(regex, '••••••••••••');
    }
  }

  return redacted;
}

/**
 * Redact sensitive data from objects (for JSON output)
 */
export function redactSecretsFromObject<T extends Record<string, unknown>>(obj: T): T {
  const redacted: Record<string, unknown> = { ...obj };

  for (const [key, value] of Object.entries(redacted)) {
    // Check if key name suggests sensitive data
    const keyLower = key.toLowerCase();
    const isSensitiveKey = keyLower.includes('password') ||
                          keyLower.includes('secret') ||
                          keyLower.includes('token') ||
                          keyLower.includes('key') ||
                          keyLower.includes('api');

    if (isSensitiveKey && typeof value === 'string') {
      // Redact the value
      redacted[key] = '••••••••••••';
    } else if (typeof value === 'string') {
      // Apply text redaction to all strings
      redacted[key] = redactSecrets(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively redact nested objects
      redacted[key] = redactSecretsFromObject(value as Record<string, unknown>);
    }
  }

  return redacted as T;
}

/**
 * Wrap console.log to automatically redact secrets
 */
export function createRedactedLogger() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  return {
    log: (...args: unknown[]) => {
      const redactedArgs = args.map(arg =>
        typeof arg === 'string' ? redactSecrets(arg) : arg
      );
      originalLog(...redactedArgs);
    },
    error: (...args: unknown[]) => {
      const redactedArgs = args.map(arg =>
        typeof arg === 'string' ? redactSecrets(arg) : arg
      );
      originalError(...redactedArgs);
    },
    warn: (...args: unknown[]) => {
      const redactedArgs = args.map(arg =>
        typeof arg === 'string' ? redactSecrets(arg) : arg
      );
      originalWarn(...redactedArgs);
    },
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
}

/**
 * Check if a string contains potential secrets
 */
export function containsSecrets(text: string): boolean {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  for (const envVar of SENSITIVE_ENV_VARS) {
    const value = process.env[envVar];
    if (value && text.includes(value)) {
      return true;
    }
  }

  return false;
}
