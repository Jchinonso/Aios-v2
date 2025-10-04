/**
 * Default application constants
 */

/**
 * Application defaults
 */
export const APP_DEFAULTS = {
  NAME: 'AIOS',
  VERSION: '2.0.0',
  DESCRIPTION: 'AI-powered DevOps chat assistant',
  AUTHOR: 'AIOS Team',
  LICENSE: 'MIT'
} as const;

/**
 * Default timeouts (milliseconds)
 */
export const TIMEOUTS = {
  CONNECTION: 10000,
  REQUEST: 30000,
  DEPLOYMENT: 900000, // 15 minutes
  ANALYSIS: 60000,
  CHAT_RESPONSE: 120000,
  AI_HEALTH_CHECK: 5000, // 5 seconds for quick health checks
  AI_REQUEST_DEFAULT: 30000, // 30 seconds for AI API requests
  CONNECTION_POOL_IDLE: 300000, // 5 minutes
  CONNECTION_POOL_MAX_IDLE: 600000, // 10 minutes
  CONNECTION_POOL_HEALTH_CHECK: 60000 // 1 minute
} as const;

/**
 * Default limits
 */
export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_CONCURRENT_OPERATIONS: 5,
  MAX_RETRY_ATTEMPTS: 3,
  MAX_HISTORY_LENGTH: 1000,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_UPLOAD_SIZE: 50 * 1024 * 1024 // 50MB
} as const;

/**
 * Default paths
 */
export const PATHS = {
  CONFIG_DIR: '.aios',
  CACHE_DIR: '.aios/cache',
  LOGS_DIR: '.aios/logs',
  CONFIG_FILE: '.aios/config.json',
  USER_CONFIG_FILE: '.aios/user.json',
  HISTORY_FILE: '.aios/history.json'
} as const;

/**
 * AI Provider defaults
 */
export const AI_PROVIDER_DEFAULTS = {
  OLLAMA_PORT: 11434,
  OLLAMA_HOST: 'localhost',
  OLLAMA_BASE_URL: 'http://localhost:11434',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  MAX_CONTEXT_LENGTH: 200000 // Claude 3 context length
} as const;

/**
 * Port defaults for different frameworks
 */
export const PORT_DEFAULTS = {
  NEXT_JS: 3000,
  REACT: 3000,
  VUE: 8080,
  ANGULAR: 4200,
  SVELTE: 5000,
  EXPRESS: 3000,
  FASTIFY: 3000,
  NGINX: 80,
  APACHE: 80
} as const;