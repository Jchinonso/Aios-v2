/**
 * Cloud Constants - Centralized constants for cloud operations
 * 
 * Following SOLID Principles:
 * - SRP: Single responsibility for cloud constants
 * - OCP: Open for extension through new constant categories
 */

// Time constants (in milliseconds)
export const TIME_CONSTANTS = {
  // Build timeouts
  DEFAULT_BUILD_TIMEOUT: 1800000, // 30 minutes
  QUICK_BUILD_TIMEOUT: 300000, // 5 minutes
  LONG_BUILD_TIMEOUT: 3600000, // 60 minutes
  
  // Retry delays
  RETRY_DELAY_BASE: 1000, // 1 second
  RETRY_DELAY_MAX: 10000, // 10 seconds
  RETRY_DELAY_MULTIPLIER: 2,
  
  // Cache TTL
  CACHE_TTL_SHORT: 300000, // 5 minutes
  CACHE_TTL_MEDIUM: 1800000, // 30 minutes
  CACHE_TTL_LONG: 3600000, // 1 hour
  CACHE_TTL_VERY_LONG: 86400000, // 24 hours
  
  // Status check intervals
  STATUS_CHECK_INTERVAL: 5000, // 5 seconds
  STATUS_CHECK_TIMEOUT: 300000, // 5 minutes
  
  // Deployment timeouts
  DEPLOYMENT_TIMEOUT: 1800000, // 30 minutes
  QUICK_DEPLOYMENT_TIMEOUT: 300000, // 5 minutes
} as const;

// Size constants (in bytes)
export const SIZE_CONSTANTS = {
  // File size limits
  MAX_FILE_SIZE_SMALL: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE_MEDIUM: 50 * 1024 * 1024, // 50MB
  MAX_FILE_SIZE_LARGE: 100 * 1024 * 1024, // 100MB
  MAX_FILE_SIZE_ENTERPRISE: 500 * 1024 * 1024, // 500MB
  
  // Project size thresholds
  SMALL_PROJECT_THRESHOLD: 1000, // files
  MEDIUM_PROJECT_THRESHOLD: 10000, // files
  LARGE_PROJECT_THRESHOLD: 50000, // files
} as const;

// Deployment constants
export const DEPLOYMENT_CONSTANTS = {
  // Default values
  DEFAULT_VERSION: '1.0.0',
  DEFAULT_ENVIRONMENT: 'production',
  DEFAULT_BUILD_COMMAND: 'npm run build',
  DEFAULT_INSTALL_COMMAND: 'npm install',
  DEFAULT_OUTPUT_DIRECTORY: 'dist',
  
  // Status values
  STATUS_DEPLOYING: 'deploying',
  STATUS_READY: 'ready',
  STATUS_FAILED: 'failed',
  STATUS_CANCELLED: 'cancelled',
  
  // Health check values
  HEALTH_HEALTHY: 'healthy',
  HEALTH_UNHEALTHY: 'unhealthy',
  HEALTH_DEGRADED: 'degraded',
  
  // Progress values
  PROGRESS_START: 0,
  PROGRESS_COMPLETE: 100,
} as const;

// URL patterns and templates
export const URL_CONSTANTS = {
  // Provider URL patterns
  VERCEL_URL_PATTERN: 'https://{deploymentId}.vercel.app',
  NETLIFY_URL_PATTERN: 'https://{deploymentId}.netlify.app',
  RAILWAY_URL_PATTERN: 'https://{deploymentId}.railway.app',
  RENDER_URL_PATTERN: 'https://{deploymentId}.onrender.com',
  
  // API endpoints
  VERCEL_API_BASE: 'https://api.vercel.com',
  NETLIFY_API_BASE: 'https://api.netlify.com',
  RAILWAY_API_BASE: 'https://backboard.railway.app',
  RENDER_API_BASE: 'https://api.render.com',
  
  // Default domains
  DEFAULT_DOMAIN: 'app.example.com',
} as const;

// Retry and error handling constants
export const RETRY_CONSTANTS = {
  // Retry attempts
  MAX_RETRY_ATTEMPTS: 3,
  MAX_RETRY_ATTEMPTS_HIGH_PRIORITY: 5,
  MAX_RETRY_ATTEMPTS_LOW_PRIORITY: 1,
  
  // Exponential backoff
  BACKOFF_BASE_DELAY: 1000, // 1 second
  BACKOFF_MAX_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
  
  // Jitter
  JITTER_MIN: 0.1,
  JITTER_MAX: 0.9,
} as const;

// Cost and pricing constants
export const COST_CONSTANTS = {
  // Default pricing (per month in USD)
  DEFAULT_BASE_PRICE: 0,
  DEFAULT_BUILD_PRICE: 0,
  DEFAULT_BANDWIDTH_PRICE: 0,
  
  // Budget thresholds
  BUDGET_ALERT_THRESHOLD: 0.8, // 80%
  BUDGET_CRITICAL_THRESHOLD: 0.95, // 95%
  
  // Cost estimation
  ESTIMATED_TRAFFIC_GB: 10, // GB per month
  ESTIMATED_BUILDS_PER_MONTH: 50,
} as const;

// Logging and monitoring constants
export const LOGGING_CONSTANTS = {
  // Log levels
  LOG_LEVEL_TRACE: 'trace',
  LOG_LEVEL_DEBUG: 'debug',
  LOG_LEVEL_INFO: 'info',
  LOG_LEVEL_WARN: 'warn',
  LOG_LEVEL_ERROR: 'error',
  
  // Log retention
  LOG_RETENTION_DAYS: 30,
  LOG_RETENTION_DAYS_ENTERPRISE: 90,
  
  // Log sources
  LOG_SOURCE_DEPLOYMENT: 'deployment',
  LOG_SOURCE_BUILD: 'build',
  LOG_SOURCE_RUNTIME: 'runtime',
  LOG_SOURCE_SYSTEM: 'system',
} as const;

// Framework and technology constants
export const FRAMEWORK_CONSTANTS = {
  // Supported frameworks
  FRAMEWORK_NEXTJS: 'nextjs',
  FRAMEWORK_REACT: 'react',
  FRAMEWORK_VUE: 'vue',
  FRAMEWORK_ANGULAR: 'angular',
  FRAMEWORK_SVELTE: 'svelte',
  FRAMEWORK_EXPRESS: 'express',
  FRAMEWORK_FASTIFY: 'fastify',
  FRAMEWORK_DJANGO: 'django',
  FRAMEWORK_FLASK: 'flask',
  FRAMEWORK_RAILS: 'rails',
  FRAMEWORK_SPRING: 'spring',
  
  // Build commands by framework
  BUILD_COMMANDS: {
    nextjs: 'next build',
    react: 'npm run build',
    vue: 'npm run build',
    angular: 'ng build',
    svelte: 'npm run build',
    express: 'npm start',
    fastify: 'npm start',
    django: 'python manage.py collectstatic',
    flask: 'python app.py',
    rails: 'bundle exec rails assets:precompile',
    spring: 'mvn clean package',
  },
  
  // Output directories by framework
  OUTPUT_DIRECTORIES: {
    nextjs: '.next',
    react: 'build',
    vue: 'dist',
    angular: 'dist',
    svelte: 'build',
    express: '.',
    fastify: '.',
    django: 'staticfiles',
    flask: 'static',
    rails: 'public',
    spring: 'target',
  },
} as const;

// Error codes and messages
export const ERROR_CONSTANTS = {
  // Error codes
  ERROR_CODE_DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  ERROR_CODE_BUILD_FAILED: 'BUILD_FAILED',
  ERROR_CODE_TIMEOUT: 'TIMEOUT',
  ERROR_CODE_INVALID_CONFIG: 'INVALID_CONFIG',
  ERROR_CODE_CREDENTIALS_INVALID: 'CREDENTIALS_INVALID',
  ERROR_CODE_QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  ERROR_CODE_NETWORK_ERROR: 'NETWORK_ERROR',
  ERROR_CODE_PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  
  // Error messages
  ERROR_MESSAGE_DEPLOYMENT_FAILED: 'Deployment failed due to an unexpected error',
  ERROR_MESSAGE_BUILD_FAILED: 'Build process failed during deployment',
  ERROR_MESSAGE_TIMEOUT: 'Operation timed out',
  ERROR_MESSAGE_INVALID_CONFIG: 'Invalid configuration provided',
  ERROR_MESSAGE_CREDENTIALS_INVALID: 'Invalid credentials provided',
  ERROR_MESSAGE_QUOTA_EXCEEDED: 'Quota exceeded for the selected provider',
  ERROR_MESSAGE_NETWORK_ERROR: 'Network error occurred during operation',
  ERROR_MESSAGE_PROVIDER_UNAVAILABLE: 'Provider service is currently unavailable',
} as const;

// Validation constants
export const VALIDATION_CONSTANTS = {
  // String lengths
  MIN_PROJECT_NAME_LENGTH: 1,
  MAX_PROJECT_NAME_LENGTH: 100,
  MIN_DEPLOYMENT_ID_LENGTH: 1,
  MAX_DEPLOYMENT_ID_LENGTH: 255,
  
  // Numeric ranges
  MIN_CONFIDENCE_SCORE: 0,
  MAX_CONFIDENCE_SCORE: 1,
  MIN_COST_ESTIMATE: 0,
  MAX_COST_ESTIMATE: 1000000, // $1M
  
  // Array limits
  MAX_REQUIRED_FEATURES: 20,
  MAX_PREFERRED_PROVIDERS: 10,
  MAX_REGIONS: 50,
} as const;

// Performance constants
export const PERFORMANCE_CONSTANTS = {
  // Concurrent operations
  MAX_CONCURRENT_DEPLOYMENTS: 5,
  MAX_CONCURRENT_BUILDS: 3,
  MAX_CONCURRENT_API_CALLS: 10,
  
  // Rate limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
  RATE_LIMIT_REQUESTS_PER_HOUR: 1000,
  
  // Timeout thresholds
  QUICK_OPERATION_TIMEOUT: 30000, // 30 seconds
  NORMAL_OPERATION_TIMEOUT: 300000, // 5 minutes
  LONG_OPERATION_TIMEOUT: 1800000, // 30 minutes
} as const;

// Mock data constants
export const MOCK_CONSTANTS = {
  // Default account IDs
  DEFAULT_AWS_ACCOUNT_ID: '123456789012',
  DEFAULT_GCP_PROJECT_NUMBER: '123456789012',
  DEFAULT_AZURE_SUBSCRIPTION_ID: '12345678-1234-1234-1234-123456789012',
  
  // Default regions
  DEFAULT_AWS_REGION: 'us-east-1',
  DEFAULT_GCP_REGION: 'us-central1',
  DEFAULT_AZURE_REGION: 'eastus',
  
  // Build time ranges (in milliseconds)
  BUILD_TIME_RANGES: {
    LAMBDA: { min: 60000, max: 360000 }, // 1-6 minutes
    ECS: { min: 120000, max: 720000 }, // 2-12 minutes
    EKS: { min: 300000, max: 1200000 }, // 5-20 minutes
    BEANSTALK: { min: 180000, max: 780000 }, // 3-13 minutes
    AMPLIFY: { min: 60000, max: 360000 }, // 1-6 minutes
    CLOUDFORMATION: { min: 300000, max: 1500000 }, // 5-25 minutes
    S3_STATIC: { min: 30000, max: 210000 }, // 30 seconds - 3.5 minutes
    LIGHTSAIL: { min: 120000, max: 720000 }, // 2-12 minutes
    DEFAULT: { min: 60000, max: 660000 }, // 1-11 minutes
  },
  
  // URL patterns
  URL_PATTERNS: {
    AWS_LAMBDA: 'https://{functionName}.lambda.{region}.amazonaws.com',
    AWS_ECS: 'https://{serviceName}.ecs.{region}.amazonaws.com',
    AWS_EKS: 'https://{clusterName}.eks.{region}.amazonaws.com',
    AWS_BEANSTALK: 'https://{appName}.elasticbeanstalk.com',
    AWS_AMPLIFY: 'https://{appId}.amplifyapp.com',
    AWS_CLOUDFORMATION: 'https://{stackName}.cloudformation.{region}.amazonaws.com',
    AWS_S3_STATIC: 'https://{bucketName}.s3-website-{region}.amazonaws.com',
    AWS_LIGHTSAIL: 'https://{instanceName}.lightsail.{region}.amazonaws.com',
    AWS_GENERIC: 'https://{deploymentId}.amazonaws.com',
    AWS_ROLLBACK: 'https://rollback-{deploymentId}.amazonaws.com',
  },

  // Time constants for mock data (in milliseconds)
  TIME_OFFSETS: {
    FIVE_MINUTES_AGO: 300000,
    ONE_MINUTE_AGO: 60000,
    FOUR_MINUTES_AGO: 240000,
    THIRTY_SECONDS_AGO: 30000,
    ONE_HOUR_AGO: 3600000,
    ONE_DAY_AGO: 86400000,
    TWO_HOURS_AGO: 7200000,
    SIX_MINUTES_AGO: 360000,
    SEVEN_MINUTES_AGO: 420000,
  },
} as const;
