/**
 * Error constants and codes
 */

export const ERROR_CODES = {
  // Configuration errors
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_LOAD_FAILED: 'CONFIG_LOAD_FAILED',
  CONFIG_SAVE_FAILED: 'CONFIG_SAVE_FAILED',

  // Provider errors
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  PROVIDER_INVALID: 'PROVIDER_INVALID',
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  PROVIDER_AUTH_FAILED: 'PROVIDER_AUTH_FAILED',

  // Deployment errors
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  DEPLOYMENT_TIMEOUT: 'DEPLOYMENT_TIMEOUT',
  DEPLOYMENT_CANCELLED: 'DEPLOYMENT_CANCELLED',
  DEPLOYMENT_NOT_FOUND: 'DEPLOYMENT_NOT_FOUND',

  // Project analysis errors
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PROJECT_ANALYSIS_FAILED: 'PROJECT_ANALYSIS_FAILED',
  PROJECT_INVALID: 'PROJECT_INVALID',

  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // AI Provider errors
  AI_API_KEY_REQUIRED: 'AI_API_KEY_REQUIRED',
  AI_API_KEY_INVALID: 'AI_API_KEY_INVALID',
  AI_MODEL_NOT_FOUND: 'AI_MODEL_NOT_FOUND',
  AI_MODEL_UNSUPPORTED: 'AI_MODEL_UNSUPPORTED',
  AI_CONTEXT_LENGTH_EXCEEDED: 'AI_CONTEXT_LENGTH_EXCEEDED',
  AI_RATE_LIMIT_EXCEEDED: 'AI_RATE_LIMIT_EXCEEDED',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  AI_REQUEST_FAILED: 'AI_REQUEST_FAILED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  AI_STREAMING_FAILED: 'AI_STREAMING_FAILED',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',

  // Credential errors
  CREDENTIALS_REQUIRED: 'CREDENTIALS_REQUIRED',
  CREDENTIALS_INVALID: 'CREDENTIALS_INVALID',
  CREDENTIALS_EXPIRED: 'CREDENTIALS_EXPIRED',
  TOKEN_REQUIRED: 'TOKEN_REQUIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.CONFIG_NOT_FOUND]: 'Configuration file not found',
  [ERROR_CODES.CONFIG_INVALID]: 'Configuration file is invalid',
  [ERROR_CODES.CONFIG_LOAD_FAILED]: 'Failed to load configuration',
  [ERROR_CODES.CONFIG_SAVE_FAILED]: 'Failed to save configuration',

  [ERROR_CODES.PROVIDER_NOT_FOUND]: 'Cloud provider not found',
  [ERROR_CODES.PROVIDER_INVALID]: 'Invalid cloud provider configuration',
  [ERROR_CODES.PROVIDER_NOT_CONFIGURED]: 'Cloud provider is not configured',
  [ERROR_CODES.PROVIDER_AUTH_FAILED]: 'Authentication failed with cloud provider',

  [ERROR_CODES.DEPLOYMENT_FAILED]: 'Deployment failed',
  [ERROR_CODES.DEPLOYMENT_TIMEOUT]: 'Deployment timed out',
  [ERROR_CODES.DEPLOYMENT_CANCELLED]: 'Deployment was cancelled',
  [ERROR_CODES.DEPLOYMENT_NOT_FOUND]: 'Deployment not found',

  [ERROR_CODES.PROJECT_NOT_FOUND]: 'Project not found',
  [ERROR_CODES.PROJECT_ANALYSIS_FAILED]: 'Project analysis failed',
  [ERROR_CODES.PROJECT_INVALID]: 'Invalid project structure',

  [ERROR_CODES.FILE_NOT_FOUND]: 'File not found',
  [ERROR_CODES.FILE_READ_ERROR]: 'Failed to read file',
  [ERROR_CODES.FILE_WRITE_ERROR]: 'Failed to write file',
  [ERROR_CODES.DIRECTORY_NOT_FOUND]: 'Directory not found',

  [ERROR_CODES.NETWORK_ERROR]: 'Network error occurred',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Operation timed out',
  [ERROR_CODES.CONNECTION_FAILED]: 'Connection failed',

  [ERROR_CODES.VALIDATION_FAILED]: 'Validation failed',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing',

  [ERROR_CODES.AI_API_KEY_REQUIRED]: 'API key is required',
  [ERROR_CODES.AI_API_KEY_INVALID]: 'API key is invalid',
  [ERROR_CODES.AI_MODEL_NOT_FOUND]: 'Model not found',
  [ERROR_CODES.AI_MODEL_UNSUPPORTED]: 'Model is not supported',
  [ERROR_CODES.AI_CONTEXT_LENGTH_EXCEEDED]: 'Context length exceeded',
  [ERROR_CODES.AI_RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ERROR_CODES.AI_QUOTA_EXCEEDED]: 'Quota exceeded',
  [ERROR_CODES.AI_REQUEST_FAILED]: 'AI request failed',
  [ERROR_CODES.AI_RESPONSE_INVALID]: 'Invalid response from AI provider',
  [ERROR_CODES.AI_STREAMING_FAILED]: 'Streaming failed',
  [ERROR_CODES.AI_PROVIDER_UNAVAILABLE]: 'AI provider is unavailable',

  [ERROR_CODES.CREDENTIALS_REQUIRED]: 'Credentials are required',
  [ERROR_CODES.CREDENTIALS_INVALID]: 'Credentials are invalid',
  [ERROR_CODES.CREDENTIALS_EXPIRED]: 'Credentials have expired',
  [ERROR_CODES.TOKEN_REQUIRED]: 'Token is required',
  [ERROR_CODES.TOKEN_INVALID]: 'Token is invalid',

  [ERROR_CODES.UNKNOWN_ERROR]: 'An unknown error occurred',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal error occurred',
  [ERROR_CODES.OPERATION_FAILED]: 'Operation failed',
} as const;

export const ERROR_DEFINITIONS = {
  PROVIDER_NOT_CONFIGURED: {
    code: ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    message: ERROR_MESSAGES[ERROR_CODES.PROVIDER_NOT_CONFIGURED],
  },
  UNKNOWN_ERROR: {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
  },
  ANALYSIS_FAILED: {
    code: ERROR_CODES.PROJECT_ANALYSIS_FAILED,
    message: ERROR_MESSAGES[ERROR_CODES.PROJECT_ANALYSIS_FAILED],
  },
  DEPLOYMENT_FAILED: {
    code: ERROR_CODES.DEPLOYMENT_FAILED,
    message: ERROR_MESSAGES[ERROR_CODES.DEPLOYMENT_FAILED],
  },
  CLOUD_PROVIDER_ERROR: {
    code: ERROR_CODES.OPERATION_FAILED,
    message: ERROR_MESSAGES[ERROR_CODES.OPERATION_FAILED],
  },
} as const;

/**
 * Error Factory Functions
 * @description Centralized error creation to eliminate duplicated error messages
 */

/**
 * Create AI provider API key error
 */
export function createAPIKeyRequiredError(providerName: string): Error {
  return new Error(`${providerName} API key is required`);
}

/**
 * Create AI provider API key invalid error
 */
export function createAPIKeyInvalidError(providerName: string): Error {
  return new Error(`${providerName} API key is invalid`);
}

/**
 * Create token required error
 */
export function createTokenRequiredError(providerName: string): Error {
  return new Error(`${providerName} token is required`);
}

/**
 * Create token not configured error
 */
export function createTokenNotConfiguredError(providerName: string): Error {
  return new Error(`${providerName} token not configured`);
}

/**
 * Create provider not configured error
 */
export function createProviderNotConfiguredError(providerName: string): Error {
  return new Error(`${providerName} provider is not configured`);
}

/**
 * Create provider not found error
 */
export function createProviderNotFoundError(providerType: string): Error {
  return new Error(`Failed to create provider: ${providerType}`);
}

/**
 * Create model not supported error
 */
export function createModelNotSupportedError(model: string, providerName: string): Error {
  return new Error(`Model '${model}' is not supported by ${providerName}`);
}

/**
 * Create context length exceeded error
 */
export function createContextLengthExceededError(
  requestedLength: number,
  maxLength: number,
  providerName: string
): Error {
  return new Error(
    `Context length ${requestedLength} exceeds maximum ${maxLength} for ${providerName}`
  );
}

/**
 * Create rate limit exceeded error
 */
export function createRateLimitExceededError(providerName: string, retryAfter?: number): Error {
  const retryMessage = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
  return new Error(`${providerName} rate limit exceeded.${retryMessage}`);
}

/**
 * Create quota exceeded error
 */
export function createQuotaExceededError(providerName: string): Error {
  return new Error(`${providerName} quota exceeded`);
}

/**
 * Create streaming not supported error
 */
export function createStreamingNotSupportedError(providerName: string): Error {
  return new Error(`${providerName} does not support streaming`);
}

/**
 * Create provider unavailable error
 */
export function createProviderUnavailableError(providerName: string, reason?: string): Error {
  const reasonMessage = reason ? `: ${reason}` : '';
  return new Error(`${providerName} is currently unavailable${reasonMessage}`);
}

/**
 * Create no response content error
 */
export function createNoResponseContentError(providerName: string): Error {
  return new Error(`No response content received from ${providerName}`);
}

/**
 * Create invalid configuration error
 */
export function createInvalidConfigurationError(details: string): Error {
  return new Error(`Invalid configuration: ${details}`);
}

/**
 * Create missing required field error
 */
export function createMissingRequiredFieldError(fieldName: string): Error {
  return new Error(`Required field '${fieldName}' is missing`);
}

/**
 * Create SDK not installed error
 */
export function createSDKNotInstalledError(providerName: string, packageName: string): Error {
  return new Error(
    `${providerName} SDK not installed. Install it with: npm install ${packageName}`
  );
}

/**
 * Create deployment failed error
 */
export function createDeploymentFailedError(providerName: string, reason?: string): Error {
  const reasonMessage = reason ? `: ${reason}` : '';
  return new Error(`${providerName} deployment failed${reasonMessage}`);
}

/**
 * Create build failed error
 */
export function createBuildFailedError(reason?: string): Error {
  const reasonMessage = reason ? `: ${reason}` : '';
  return new Error(`Build failed${reasonMessage}`);
}

/**
 * Create network error
 */
export function createNetworkError(operation: string, originalError?: Error): Error {
  const errorMessage = originalError ? `: ${originalError.message}` : '';
  return new Error(`Network error during ${operation}${errorMessage}`);
}

/**
 * Create timeout error
 */
export function createTimeoutError(operation: string, timeoutMs: number): Error {
  return new Error(`${operation} timed out after ${timeoutMs}ms`);
}

/**
 * Create validation error
 */
export function createValidationError(errors: string[]): Error {
  return new Error(`Validation failed: ${errors.join(', ')}`);
}

/**
 * Create API error with status code
 */
export function createAPIError(providerName: string, status: number, message: string): Error {
  return new Error(`${providerName} API error: ${status} - ${message}`);
}

/**
 * Create server not running error (for local services like Ollama)
 */
export function createServerNotRunningError(serviceName: string, url: string): Error {
  return new Error(`${serviceName} server is not running. Please start ${serviceName} and ensure it's accessible at ${url}`);
}

/**
 * Create project ID required error (for Google Cloud)
 */
export function createProjectIdRequiredError(providerName: string): Error {
  return new Error(`${providerName} project ID is required`);
}

/**
 * Create unexpected response error
 */
export function createUnexpectedResponseError(providerName: string, expectedType?: string): Error {
  const typeMsg = expectedType ? ` - expected ${expectedType}` : '';
  return new Error(`Unexpected response type from ${providerName} API${typeMsg}`);
}

/**
 * Create no response body error
 */
export function createNoResponseBodyError(providerName: string): Error {
  return new Error(`No response body reader available from ${providerName}`);
}

/**
 * Create authentication failed error
 */
export function createAuthenticationFailedError(providerName: string, details?: string): Error {
  const detailsMessage = details ? `: ${details}` : '';
  return new Error(`${providerName} authentication failed${detailsMessage}`);
}

/**
 * Create file not found error
 */
export function createFileNotFoundError(filePath: string): Error {
  return new Error(`File not found: ${filePath}`);
}

/**
 * Create directory not found error
 */
export function createDirectoryNotFoundError(dirPath: string): Error {
  return new Error(`Directory not found: ${dirPath}`);
}