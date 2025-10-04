# AIOS Cloud Module - API Reference

## Overview

The AIOS Cloud Module provides a comprehensive, enterprise-grade API for multi-cloud deployment orchestration. This reference documents all public interfaces, classes, and utility functions available for cloud operations.

## Table of Contents

- [Core Classes](#core-classes)
- [Provider Interfaces](#provider-interfaces)
- [Utility Functions](#utility-functions)
- [Type Definitions](#type-definitions)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Core Classes

### CloudManager

The primary orchestrator for all cloud operations.

```typescript
class CloudManager {
  constructor(config?: CloudManagerConfig)

  // Provider Management
  configureProvider(provider: CloudProviderType, config: CloudProviderConfig): Promise<void>
  getConfiguredProviders(): CloudProviderType[]

  // Deployment Operations
  deploy(provider: CloudProviderType, config: DeploymentConfig): Promise<Result<DeploymentResult>>
  getDeploymentStatus(provider: CloudProviderType, deploymentId: string): Promise<Result<DeploymentStatus>>
  cancelDeployment(provider: CloudProviderType, deploymentId: string): Promise<Result<void>>
  getDeploymentLogs(provider: CloudProviderType, deploymentId: string): Promise<Result<DeploymentLog[]>>
  rollback(provider: CloudProviderType, deploymentId: string): Promise<Result<DeploymentResult>>

  // Analysis and Recommendations
  analyzeProject(projectPath: string, provider?: CloudProviderType): Promise<Result<ProjectAnalysis>>
  getProviderRecommendations(analysis: ProjectAnalysis, preferences?: ProviderSelectionPreferences): Promise<CloudProviderRecommendation[]>

  // Cost Management
  estimateDeploymentCosts(provider: CloudProviderType, config: DeploymentConfig): Promise<CostEstimate>
}
```

#### Methods

##### `configureProvider(provider, config)`

Configure authentication and settings for a cloud provider.

**Parameters:**
- `provider` (CloudProviderType): Provider identifier
- `config` (CloudProviderConfig): Provider-specific configuration

**Example:**
```typescript
await cloudManager.configureProvider('vercel', {
  type: 'vercel',
  accessToken: process.env.VERCEL_TOKEN,
  team: 'my-organization',
  region: 'us-east-1'
});
```

##### `deploy(provider, config)`

Deploy an application to the specified provider.

**Parameters:**
- `provider` (CloudProviderType): Target provider
- `config` (DeploymentConfig): Deployment configuration

**Returns:** `Promise<Result<DeploymentResult>>`

**Example:**
```typescript
const result = await cloudManager.deploy('vercel', {
  projectPath: './my-nextjs-app',
  environment: 'production',
  buildCommand: 'npm run build',
  environmentVariables: [
    { key: 'NODE_ENV', value: 'production', isRequired: true }
  ]
});

if (result.success) {
  console.log(`Deployed to: ${result.data.url}`);
} else {
  console.error(`Deployment failed: ${result.error.message}`);
}
```

##### `getProviderRecommendations(analysis, preferences?)`

Get intelligent provider recommendations based on project analysis.

**Parameters:**
- `analysis` (ProjectAnalysis): Project analysis results
- `preferences` (ProviderSelectionPreferences, optional): Selection preferences

**Returns:** `Promise<CloudProviderRecommendation[]>`

**Example:**
```typescript
const analysis = await cloudManager.analyzeProject('./my-app');
const recommendations = await cloudManager.getProviderRecommendations(
  analysis.data,
  {
    costOptimization: true,
    maxBudget: 50,
    requiredFeatures: ['managed-databases', 'auto-scaling']
  }
);

recommendations.forEach(rec => {
  console.log(`${rec.provider}: ${rec.score}/100 - ${rec.reasoning}`);
});
```

### ProviderSelector

AI-powered provider recommendation engine.

```typescript
class ProviderSelector {
  constructor()

  recommend(
    analysis: ProjectAnalysis,
    preferences?: ProviderSelectionPreferences
  ): Promise<CloudProviderRecommendation[]>
}
```

### BaseProvider

Abstract base class for all cloud provider implementations.

```typescript
abstract class BaseProvider implements CloudProvider {
  constructor(name: CloudProviderType, features: ProviderFeature[], regions: string[])

  // Abstract methods that providers must implement
  protected abstract analyzeProjectImplementation(projectPath: string): Promise<ProjectAnalysis>
  protected abstract deployImplementation(config: DeploymentConfig): Promise<DeploymentResult>
  protected abstract getDeploymentStatusImplementation(deploymentId: string): Promise<DeploymentStatus>
  protected abstract estimateCostImplementation(config: DeploymentConfig): Promise<CostEstimate>

  // Public interface methods
  analyzeProject(projectPath: string): Promise<Result<ProjectAnalysis>>
  deploy(config: DeploymentConfig): Promise<Result<DeploymentResult>>
  getDeploymentStatus(deploymentId: string): Promise<Result<DeploymentStatus>>
  estimateCost(config: DeploymentConfig): Promise<Result<CostEstimate>>
  getCapabilities(): ProviderCapabilities
  isConfigured(): boolean
}
```

## Provider Interfaces

### CloudProvider

Core interface that all providers must implement.

```typescript
interface CloudProvider {
  readonly name: CloudProviderType
  readonly features: ProviderFeature[]
  readonly regions: string[]

  analyzeProject(projectPath: string): Promise<Result<ProjectAnalysis>>
  deploy(config: DeploymentConfig): Promise<Result<DeploymentResult>>
  getDeploymentStatus(deploymentId: string): Promise<Result<DeploymentStatus>>
  cancelDeployment(deploymentId: string): Promise<Result<void>>
  getDeploymentLogs(deploymentId: string, limit?: number): Promise<Result<DeploymentLog[]>>
  listDeployments(projectId?: string, limit?: number): Promise<Result<DeploymentSummary[]>>
  rollback(deploymentId: string): Promise<Result<DeploymentResult>>
  isConfigured(): boolean
  getCapabilities(): ProviderCapabilities
  estimateCost(config: DeploymentConfig): Promise<Result<CostEstimate>>
}
```

### ProviderCapabilities

Defines provider technical capabilities and limitations.

```typescript
interface ProviderCapabilities {
  readonly maxDeployments: number
  readonly maxBuildTime: number
  readonly maxFileSize: number
  readonly supportedFrameworks: FrameworkType[]
  readonly supportedLanguages: ProgrammingLanguage[]
  readonly customDomains: boolean
  readonly environmentVariables: boolean
  readonly teamCollaboration: boolean
  readonly apiAccess: boolean
}
```

## Utility Functions

### Configuration Validation

```typescript
// Validate provider configuration
validateProviderConfig(provider: CloudProviderType, config: CloudProviderConfig): ValidationResult

// Validate deployment configuration
validateDeploymentConfig(config: DeploymentConfig): ValidationResult

// Create configuration validator
createConfigValidator(options?: ConfigValidatorOptions): ConfigValidator
```

### Project Analysis

```typescript
// Analyze project structure and dependencies
analyzeProject(projectPath: string): Promise<ProjectAnalysis>

// Detect framework from dependencies
detectFrameworkFromDependencies(dependencies: ProjectDependency[]): FrameworkType

// Create project analyzer
createProjectAnalyzer(options?: ProjectAnalyzerOptions): ProjectAnalyzer
```

### Deployment Helpers

```typescript
// Generate deployment configuration
generateDeploymentConfig(analysis: ProjectAnalysis, preferences?: DeploymentPreferences): DeploymentConfig

// Calculate deployment health score
calculateHealthScore(deployment: DeploymentResult): number

// Estimate deployment duration
estimateDeploymentDuration(config: DeploymentConfig, provider: CloudProviderType): number

// Validate deployment readiness
validateDeploymentReadiness(config: DeploymentConfig): ValidationResult
```

### Error Handling

```typescript
// Create cloud-specific error
createCloudError(code: CloudErrorCode, message: string, context?: Record<string, any>): CloudError

// Handle cloud errors with recovery
handleCloudError(error: CloudError): Promise<ErrorRecoveryResult>

// Error handling wrapper
withErrorHandling<T>(operation: () => Promise<T>, context?: string): Promise<Result<T>>
```

### Retry Handling

```typescript
// Retry operation with configuration
retry<T>(operation: () => Promise<T>, config: RetryConfig): Promise<RetryResult<T>>

// Create retry handler
createRetryHandler(config?: RetryConfig): RetryHandler

// Circuit breaker for resilience
createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker
```

## Type Definitions

### Core Types

```typescript
// Cloud provider identifier
type CloudProviderType = 'vercel' | 'netlify' | 'aws' | 'railway' | 'render' | 'digitalocean' | 'fly' | 'cloudflare'

// Framework types (80+ supported frameworks)
type FrameworkType = 'nextjs' | 'react' | 'vue' | 'angular' | 'svelte' | 'django' | 'flask' | 'rails' | 'express' | 'gin' | 'actix' | ...

// Programming languages
type ProgrammingLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'php' | 'ruby' | 'csharp' | ...

// Provider features
type ProviderFeature = 'zero-config' | 'auto-scaling' | 'preview-deployments' | 'managed-databases' | 'edge-functions' | ...
```

### Configuration Types

```typescript
interface CloudManagerConfig {
  readonly defaultProvider?: CloudProviderType
  readonly providers: Record<string, unknown>
  readonly deploymentOptions?: {
    readonly autoApprove: boolean
    readonly costThreshold: number
    readonly defaultEnvironment: string
  }
  readonly logLevel?: LogLevel
}

interface DeploymentConfig {
  readonly projectPath: string
  readonly environment: string
  readonly strategy?: DeploymentStrategy
  readonly buildCommand?: string
  readonly outputDirectory?: string
  readonly environmentVariables?: EnvironmentVariable[]
  readonly region?: string
  readonly scaling?: ScalingConfig
  readonly domain?: DomainConfig
  readonly monitoring?: MonitoringConfig
}

interface ProviderSelectionPreferences {
  readonly costOptimization?: boolean
  readonly performanceFirst?: boolean
  readonly simplicityFirst?: boolean
  readonly requiredFeatures?: ProviderFeature[]
  readonly maxBudget?: number
  readonly regionPreferences?: string[]
  readonly preferredProviders?: CloudProviderType[]
  readonly excludeProviders?: CloudProviderType[]
  readonly teamSize?: number
  readonly supportLevel?: 'basic' | 'professional' | 'enterprise'
}
```

### Result Types

```typescript
interface DeploymentResult {
  readonly deploymentId: string
  readonly url: string
  readonly status: string
  readonly buildTime: number
  readonly environment: string
  readonly version: string
  readonly metadata?: Record<string, any>
}

interface ProjectAnalysis {
  readonly framework: FrameworkType
  readonly language: ProgrammingLanguage
  readonly packageManager: PackageManager
  readonly dependencies: ProjectDependency[]
  readonly buildCommand?: string
  readonly startCommand?: string
  readonly outputDirectory?: string
  readonly hasDatabase?: boolean
  readonly databaseType?: DatabaseType
  readonly environmentVariables: EnvironmentVariable[]
  readonly size: ProjectSize
  readonly complexity: ProjectComplexity
  readonly estimatedBuildTime: number
  readonly recommendations: string[]
}

interface CloudProviderRecommendation {
  readonly provider: CloudProviderType
  readonly score: number
  readonly reasoning: string
  readonly costEstimate: CostEstimate
  readonly features: ProviderFeature[]
  readonly limitations?: string[]
  readonly setupComplexity: SetupComplexity
  readonly scalabilityScore: number
  readonly performanceScore: number
}
```

## Configuration

### Environment Variables

```bash
# Provider API Keys
VERCEL_TOKEN=your_vercel_token
NETLIFY_ACCESS_TOKEN=your_netlify_token
RAILWAY_TOKEN=your_railway_token
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Optional Configuration
CLOUD_DEFAULT_TIMEOUT=1800000    # 30 minutes
CLOUD_MAX_RETRIES=3
CLOUD_REGION_PREFERENCE=us-east-1
CLOUD_LOG_LEVEL=info
```

### Configuration Files

Create a cloud configuration object:

```typescript
import { createCloudConfig } from '@aios/cloud-module';

const config = createCloudConfig({
  providers: {
    vercel: {
      type: 'vercel',
      accessToken: process.env.VERCEL_TOKEN,
      team: 'my-team'
    },
    aws: {
      type: 'aws',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1'
    }
  },
  retry: {
    standard: {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffFactor: 2
    }
  },
  deployment: {
    defaultTimeout: 2400000, // 40 minutes
    maxConcurrentDeployments: 5
  }
});
```

## Error Handling

### Error Types

```typescript
interface CloudError extends AppError {
  readonly code: CloudErrorCode
  readonly severity: ErrorSeverity
  readonly category: ErrorCategory
  readonly retryable: boolean
  readonly recovery?: string[]
  readonly provider?: CloudProviderType
  readonly context: Record<string, any>
}

enum CloudErrorCode {
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  PROVIDER_UNAUTHORIZED = 'PROVIDER_UNAUTHORIZED',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  // ... more error codes
}
```

### Error Handling Patterns

```typescript
import { CloudError, isCloudError, withErrorHandling } from '@aios/cloud-module';

// Basic error handling
try {
  const result = await cloudManager.deploy('vercel', config);
} catch (error) {
  if (isCloudError(error)) {
    console.error(`Cloud error: ${error.code} - ${error.message}`);
    if (error.recovery) {
      console.log('Recovery suggestions:');
      error.recovery.forEach(action => console.log(`- ${action}`));
    }
  }
}

// Using error handling wrapper
const result = await withErrorHandling(
  () => cloudManager.deploy('vercel', config),
  'deployment-operation'
);

if (!result.success) {
  console.error('Deployment failed:', result.error);
}
```

## Examples

### Basic Deployment Workflow

```typescript
import { CloudManager } from '@aios/cloud-module';

async function deployApp() {
  const cloudManager = new CloudManager();

  // Configure provider
  await cloudManager.configureProvider('vercel', {
    type: 'vercel',
    accessToken: process.env.VERCEL_TOKEN
  });

  // Analyze project
  const analysis = await cloudManager.analyzeProject('./my-nextjs-app');
  if (!analysis.success) {
    throw new Error(`Analysis failed: ${analysis.error.message}`);
  }

  // Get recommendations
  const recommendations = await cloudManager.getProviderRecommendations(
    analysis.data,
    { costOptimization: true, maxBudget: 50 }
  );

  console.log(`Recommended provider: ${recommendations[0].provider}`);

  // Deploy
  const deployment = await cloudManager.deploy('vercel', {
    projectPath: './my-nextjs-app',
    environment: 'production'
  });

  if (deployment.success) {
    console.log(`Deployed to: ${deployment.data.url}`);

    // Monitor deployment
    const status = await cloudManager.getDeploymentStatus(
      'vercel',
      deployment.data.deploymentId
    );
    console.log(`Status: ${status.data?.phase} (${status.data?.progress}%)`);
  }
}
```

### Advanced Multi-Provider Setup

```typescript
import { CloudManager, ProviderSelector } from '@aios/cloud-module';

async function enterpriseDeployment() {
  const cloudManager = new CloudManager({
    providers: {
      vercel: { /* config */ },
      aws: { /* config */ },
      railway: { /* config */ }
    },
    deploymentOptions: {
      autoApprove: false,
      costThreshold: 1000,
      defaultEnvironment: 'staging'
    }
  });

  // Configure multiple providers
  const providers = ['vercel', 'aws', 'railway'] as const;
  for (const provider of providers) {
    await cloudManager.configureProvider(provider, configs[provider]);
  }

  // Analyze project
  const analysis = await cloudManager.analyzeProject('./enterprise-app');

  // Get detailed recommendations
  const selector = new ProviderSelector();
  const recommendations = await selector.recommend(analysis.data, {
    teamSize: 100,
    supportLevel: 'enterprise',
    requiredFeatures: [
      'managed-databases',
      'auto-scaling',
      'team-collaboration',
      'enterprise-support'
    ]
  });

  // Deploy to top 2 providers for redundancy
  const deploymentPromises = recommendations.slice(0, 2).map(rec =>
    cloudManager.deploy(rec.provider, {
      projectPath: './enterprise-app',
      environment: 'production',
      monitoring: { enabled: true, alertsEnabled: true }
    })
  );

  const results = await Promise.allSettled(deploymentPromises);

  results.forEach((result, index) => {
    const provider = recommendations[index].provider;
    if (result.status === 'fulfilled' && result.value.success) {
      console.log(`✅ ${provider}: ${result.value.data.url}`);
    } else {
      console.log(`❌ ${provider}: Deployment failed`);
    }
  });
}
```

### Cost Optimization Workflow

```typescript
async function optimizeDeploymentCosts() {
  const cloudManager = new CloudManager();

  // Configure providers
  const providers = ['vercel', 'netlify', 'railway', 'render'];
  // ... configure all providers

  const analysis = await cloudManager.analyzeProject('./my-app');

  // Get cost estimates for all providers
  const costEstimates = await Promise.all(
    providers.map(async provider => {
      const estimate = await cloudManager.estimateDeploymentCosts(provider, {
        projectPath: './my-app',
        environment: 'production'
      });

      return {
        provider,
        monthlyCost: estimate.monthly.typical,
        features: estimate.additional.map(a => a.service)
      };
    })
  );

  // Sort by cost
  costEstimates.sort((a, b) => a.monthlyCost - b.monthlyCost);

  console.log('Cost comparison:');
  costEstimates.forEach(({ provider, monthlyCost }) => {
    console.log(`${provider}: $${monthlyCost}/month`);
  });

  // Deploy to most cost-effective option
  const cheapest = costEstimates[0];
  console.log(`Deploying to most cost-effective provider: ${cheapest.provider}`);

  const deployment = await cloudManager.deploy(cheapest.provider, {
    projectPath: './my-app',
    environment: 'production'
  });
}
```

## Best Practices

### 1. Configuration Management

- Store sensitive credentials in environment variables
- Use configuration objects for reusable settings
- Validate configurations before deployment

### 2. Error Handling

- Always handle both success and error cases
- Use structured error types for better debugging
- Implement retry logic for transient failures

### 3. Cost Optimization

- Use cost estimation before deployment
- Set budget limits in preferences
- Monitor ongoing costs with provider APIs

### 4. Security

- Never commit API keys to version control
- Use least-privilege access for provider credentials
- Enable monitoring and alerting for deployments

### 5. Performance

- Use provider recommendations for optimal performance
- Consider regional deployment for global applications
- Monitor deployment performance metrics

---

For more examples and advanced usage patterns, see the [Examples Guide](./examples/) and [Best Practices](./docs/best-practices.md).