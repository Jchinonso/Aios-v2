/**
 * Deployment Types - Interface Segregation
 *
 * Following SOLID Principles:
 * - ISP: Focused interface definitions for deployment operations
 * - SRP: Single responsibility for type declarations
 */

export interface IDeploymentStrategy {
  readonly name: string;
  readonly platform: string;
  readonly supportedLanguages: string[];
  canHandle(projectInfo: any): boolean;
  generateDeploymentConfig(projectInfo: any): Promise<DeploymentConfig>;
  validateRequirements(projectInfo: any): Promise<ValidationResult>;
  execute(config: DeploymentConfig): Promise<DeploymentResult>;
}

export interface DeploymentConfig {
  readonly strategy: string;
  readonly platform: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly buildCommands: string[];
  readonly environmentVariables: Record<string, string>;
  readonly healthChecks: HealthCheck[];
  readonly scalingConfig?: ScalingConfig;
  readonly domainConfig?: DomainConfig;
  readonly databaseConfig?: DatabaseConfig;
}

export interface HealthCheck {
  readonly path: string;
  readonly port: number;
  readonly protocol: 'http' | 'https' | 'tcp';
  readonly timeout: number;
  readonly interval: number;
  readonly retries: number;
}

export interface ScalingConfig {
  readonly minInstances: number;
  readonly maxInstances: number;
  readonly cpuThreshold: number;
  readonly memoryThreshold: number;
}

export interface DomainConfig {
  readonly domain: string;
  readonly subdomain?: string;
  readonly ssl: boolean;
  readonly redirectHttps: boolean;
}

export interface DatabaseConfig {
  readonly type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
  readonly version: string;
  readonly size: 'small' | 'medium' | 'large';
  readonly backup: boolean;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly requirements: string[];
}

export interface DeploymentResult {
  readonly success: boolean;
  readonly deploymentId: string;
  readonly url?: string;
  readonly logs: string[];
  readonly duration: number;
  readonly metadata: Record<string, any>;
}
