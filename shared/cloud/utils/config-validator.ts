/**
 * @fileoverview Configuration Validator - Validates cloud configurations
 * @description Comprehensive validation utilities for cloud provider configurations,
 * deployment settings, and infrastructure specifications. Provides detailed
 * validation errors and suggestions for fixing configuration issues.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type {
  CloudProviderType,
  CloudProviderConfig,
} from '../types/cloud-provider.types.js';

import type {
  DeploymentConfig,
} from '../types/deployment.types.js';

import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

/**
 * Validation result interface
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly isValid: boolean;
  /** Validation errors found */
  readonly errors: ValidationError[];
  /** Validation warnings */
  readonly warnings: ValidationWarning[];
}

/**
 * Validation error interface
 * @interface ValidationError
 */
export interface ValidationError {
  /** Error code */
  readonly code: string;
  /** Field that failed validation */
  readonly field: string;
  /** Error message */
  readonly message: string;
  /** Suggested fix */
  readonly suggestion?: string;
}

/**
 * Validation warning interface
 * @interface ValidationWarning
 */
export interface ValidationWarning {
  /** Warning code */
  readonly code: string;
  /** Field with warning */
  readonly field: string;
  /** Warning message */
  readonly message: string;
  /** Optional suggestion */
  readonly suggestion?: string;
}

/**
 * Configuration Validator for cloud configurations
 * @class ConfigValidator
 * @description Provides comprehensive validation for cloud provider configurations,
 * deployment settings, and related infrastructure specifications.
 */
export class ConfigValidator {
  private readonly logger: ILogger;

  /**
   * Creates a new ConfigValidator instance
   * @constructor
   */
  constructor() {
    this.logger = createLogger('ConfigValidator');
  }

  /**
   * Validate cloud provider configuration
   * @method validateProviderConfig
   * @param {CloudProviderConfig} config - Provider configuration to validate
   * @returns {ValidationResult} Validation result with errors and warnings
   */
  validateProviderConfig(config: CloudProviderConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.logger.debug('Validating provider configuration', { type: config.type });

    // Validate basic structure
    if (!config.type) {
      errors.push({
        code: 'MISSING_PROVIDER_TYPE',
        field: 'type',
        message: 'Provider type is required',
        suggestion: 'Specify a valid provider type (vercel, netlify, aws, etc.)'
      });
    } else if (!this.isValidProviderType(config.type)) {
      errors.push({
        code: 'INVALID_PROVIDER_TYPE',
        field: 'type',
        message: `Invalid provider type: ${config.type}`,
        suggestion: 'Use one of: vercel, netlify, aws, railway, render, digitalocean, linode, vultr, fly, cloudflare'
      });
    }

    // Provider-specific validation
    if (config.type) {
      const providerErrors = this.validateProviderSpecificConfig(config);
      errors.push(...providerErrors.errors);
      warnings.push(...providerErrors.warnings);
    }

    // Validate optional fields
    if (config.timeout !== undefined) {
      if (config.timeout < 1000 || config.timeout > 300000) {
        warnings.push({
          code: 'TIMEOUT_OUT_OF_RANGE',
          field: 'timeout',
          message: 'Timeout should be between 1000ms and 300000ms (5 minutes)',
          suggestion: 'Use a timeout between 1 second and 5 minutes for better reliability'
        });
      }
    }

    if (config.maxRetries !== undefined) {
      if (config.maxRetries < 0 || config.maxRetries > 10) {
        warnings.push({
          code: 'MAX_RETRIES_OUT_OF_RANGE',
          field: 'maxRetries',
          message: 'maxRetries should be between 0 and 10',
          suggestion: 'Use 0-5 retries for most operations'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate deployment configuration
   * @method validateDeploymentConfig
   * @param {DeploymentConfig} config - Deployment configuration to validate
   * @returns {ValidationResult} Validation result
   */
  validateDeploymentConfig(config: DeploymentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.logger.debug('Validating deployment configuration');

    // Validate required fields
    if (!config.projectPath) {
      errors.push({
        code: 'MISSING_PROJECT_PATH',
        field: 'projectPath',
        message: 'Project path is required',
        suggestion: 'Provide the absolute path to your project directory'
      });
    }

    if (!config.environment) {
      errors.push({
        code: 'MISSING_ENVIRONMENT',
        field: 'environment',
        message: 'Environment is required',
        suggestion: 'Specify environment: development, staging, or production'
      });
    } else if (!this.isValidEnvironment(config.environment)) {
      errors.push({
        code: 'INVALID_ENVIRONMENT',
        field: 'environment',
        message: `Invalid environment: ${config.environment}`,
        suggestion: 'Use one of: development, staging, production, preview'
      });
    }

    // Validate optional fields
    if (config.region && !this.isValidRegion(config.region)) {
      warnings.push({
        code: 'UNKNOWN_REGION',
        field: 'region',
        message: `Unknown region: ${config.region}`,
        suggestion: 'Verify the region is supported by your chosen provider'
      });
    }

    if (config.environmentVariables) {
      const envVarErrors = this.validateEnvironmentVariables(config.environmentVariables);
      errors.push(...envVarErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate provider-specific configuration requirements
   * @private
   * @method validateProviderSpecificConfig
   */
  private validateProviderSpecificConfig(config: CloudProviderConfig): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (config.type) {
      case 'vercel':
        if (!config.accessToken) {
          errors.push({
            code: 'MISSING_VERCEL_TOKEN',
            field: 'accessToken',
            message: 'Vercel access token is required',
            suggestion: 'Get your token from https://vercel.com/account/tokens'
          });
        }
        break;

      case 'netlify':
        if (!config.accessToken) {
          errors.push({
            code: 'MISSING_NETLIFY_TOKEN',
            field: 'accessToken',
            message: 'Netlify access token is required',
            suggestion: 'Generate a token in your Netlify account settings'
          });
        }
        break;

      case 'aws':
        if ('accessKeyId' in config && !config.accessKeyId) {
          errors.push({
            code: 'MISSING_AWS_ACCESS_KEY',
            field: 'accessKeyId',
            message: 'AWS access key ID is required',
            suggestion: 'Provide your AWS access key ID'
          });
        }
        if ('secretAccessKey' in config && !config.secretAccessKey) {
          errors.push({
            code: 'MISSING_AWS_SECRET_KEY',
            field: 'secretAccessKey',
            message: 'AWS secret access key is required',
            suggestion: 'Provide your AWS secret access key'
          });
        }
        if ('region' in config && !config.region) {
          errors.push({
            code: 'MISSING_AWS_REGION',
            field: 'region',
            message: 'AWS region is required',
            suggestion: 'Specify an AWS region (e.g., us-east-1, eu-west-1)'
          });
        }
        break;

      case 'railway':
        if ('apiToken' in config && !config.apiToken) {
          errors.push({
            code: 'MISSING_RAILWAY_TOKEN',
            field: 'apiToken',
            message: 'Railway API token is required',
            suggestion: 'Get your token from Railway dashboard settings'
          });
        }
        break;

      case 'render':
        if ('apiKey' in config && !config.apiKey) {
          errors.push({
            code: 'MISSING_RENDER_KEY',
            field: 'apiKey',
            message: 'Render API key is required',
            suggestion: 'Generate an API key in your Render account settings'
          });
        }
        break;

      default:
        warnings.push({
          code: 'UNKNOWN_PROVIDER_VALIDATION',
          field: 'type',
          message: `No specific validation rules for provider: ${config.type}`,
          suggestion: 'Ensure you have the required credentials for this provider'
        });
    }

    return { errors, warnings };
  }

  /**
   * Validate environment variables
   * @private
   * @method validateEnvironmentVariables
   */
  private validateEnvironmentVariables(envVars: any[]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(envVars)) {
      errors.push({
        code: 'INVALID_ENV_VARS_TYPE',
        field: 'environmentVariables',
        message: 'Environment variables must be an array',
        suggestion: 'Provide environment variables as an array of objects'
      });
      return errors;
    }

    envVars.forEach((envVar, index) => {
      if (!envVar.key) {
        errors.push({
          code: 'MISSING_ENV_VAR_KEY',
          field: `environmentVariables[${index}].key`,
          message: 'Environment variable key is required',
          suggestion: 'Each environment variable must have a key property'
        });
      }

      if (envVar.key && !this.isValidEnvVarKey(envVar.key)) {
        errors.push({
          code: 'INVALID_ENV_VAR_KEY',
          field: `environmentVariables[${index}].key`,
          message: `Invalid environment variable key: ${envVar.key}`,
          suggestion: 'Keys should contain only letters, numbers, and underscores'
        });
      }
    });

    return errors;
  }

  /**
   * Check if provider type is valid
   * @private
   * @method isValidProviderType
   */
  private isValidProviderType(type: string): type is CloudProviderType {
    const validTypes: CloudProviderType[] = [
      'vercel', 'netlify', 'aws', 'railway', 'render',
      'digitalocean', 'linode', 'vultr', 'fly', 'cloudflare'
    ];
    return validTypes.includes(type as CloudProviderType);
  }

  /**
   * Check if environment is valid
   * @private
   * @method isValidEnvironment
   */
  private isValidEnvironment(environment: string): boolean {
    const validEnvironments = ['development', 'staging', 'production', 'preview'];
    return validEnvironments.includes(environment);
  }

  /**
   * Check if region format is valid
   * @private
   * @method isValidRegion
   */
  private isValidRegion(region: string): boolean {
    // Basic region format validation
    return /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(region) && region.length >= 2;
  }

  /**
   * Check if environment variable key is valid
   * @private
   * @method isValidEnvVarKey
   */
  private isValidEnvVarKey(key: string): boolean {
    return /^[A-Z_][A-Z0-9_]*$/.test(key);
  }
}

/**
 * Create a new configuration validator instance
 * @function createConfigValidator
 * @returns {ConfigValidator} New validator instance
 */
export const createConfigValidator = (): ConfigValidator => {
  return new ConfigValidator();
};

/**
 * Validate provider configuration (convenience function)
 * @function validateProviderConfig
 * @param {CloudProviderConfig} config - Configuration to validate
 * @returns {ValidationResult} Validation result
 */
export const validateProviderConfig = (config: CloudProviderConfig): ValidationResult => {
  const validator = createConfigValidator();
  return validator.validateProviderConfig(config);
};

/**
 * Validate deployment configuration (convenience function)
 * @function validateDeploymentConfig
 * @param {DeploymentConfig} config - Configuration to validate
 * @returns {ValidationResult} Validation result
 */
export const validateDeploymentConfig = (config: DeploymentConfig): ValidationResult => {
  const validator = createConfigValidator();
  return validator.validateDeploymentConfig(config);
};