# AIOS Cloud Module

## Overview

The AIOS Cloud Module is a comprehensive, provider-agnostic cloud deployment system that enables seamless deployment to multiple cloud platforms including Vercel, Netlify, Railway, Render, AWS, and more. Built with TypeScript and following SOLID principles, it provides a unified interface for cloud operations while maintaining type safety and configurability.

## Features

### ✨ Core Features

- **🚀 Multi-Provider Support**: Deploy to 10+ cloud providers through a unified interface
- **🔧 Zero Configuration**: Intelligent framework detection and optimal deployment configuration
- **📊 Cost Estimation**: Advanced cost analysis and budget optimization across providers
- **🎯 Smart Recommendations**: AI-powered provider selection based on project analysis
- **🔄 Retry & Resilience**: Built-in retry mechanisms with exponential backoff and circuit breakers
- **📈 Real-time Monitoring**: Deployment status tracking and performance monitoring
- **🌍 Global Deployment**: Multi-region support with intelligent region selection
- **🔐 Security First**: Secure credential management and validation

### 🏗️ Supported Frameworks

#### Frontend Frameworks
- **React Ecosystem**: Next.js, React, Vite, Create React App
- **Vue Ecosystem**: Vue.js, Nuxt.js, Vite + Vue
- **Other Modern Frameworks**: Svelte, SvelteKit, Angular, Solid, Qwik, Preact
- **Static Sites**: Gatsby, Jekyll, Hugo, Eleventy, Astro
- **Build Tools**: Webpack, Rollup, Parcel, Vite

#### Backend Frameworks
- **Node.js**: Express, Fastify, NestJS, Koa, Hapi, AdonisJS
- **Python**: Django, Flask, FastAPI, Tornado, Pyramid
- **Ruby**: Rails, Sinatra, Padrino, Grape
- **Go**: Gin, Fiber, Echo, Chi, Gorilla Mux
- **Rust**: Rocket, Actix-Web, Warp, Tide, Axum
- **Java**: Spring Boot, Quarkus, Micronaut, Dropwizard
- **PHP**: Laravel, Symfony, CodeIgniter, Slim

### ☁️ Supported Providers

| Provider | Specialty | Features |
|----------|-----------|----------|
| **Vercel** | Next.js, React | Zero-config, Edge Functions, Preview Deployments |
| **Netlify** | JAMstack, Static Sites | Build Plugins, Branch Previews, Form Handling |
| **Railway** | Full-stack Apps | Database Integration, Docker Support |
| **Render** | Web Services | Auto-scaling, Background Workers, Databases |
| **AWS** | Enterprise | Complete Cloud Platform, Advanced Features |
| **DigitalOcean** | Simplicity | App Platform, Managed Databases |
| **Fly.io** | Edge Computing | Global Distribution, Docker-native |
| **Cloudflare** | Performance | Edge Workers, Global CDN |

## Quick Start

### Installation

```bash
npm install @aios/cloud-module
```

### Basic Usage

```typescript
import { CloudManager } from '@aios/cloud-module';

// Initialize the cloud manager
const cloudManager = new CloudManager();

// Configure a provider
await cloudManager.configureProvider('vercel', {
  type: 'vercel',
  accessToken: process.env.VERCEL_TOKEN
});

// Deploy your application
const result = await cloudManager.deploy('vercel', {
  projectPath: './my-nextjs-app',
  environment: 'production',
  buildCommand: 'npm run build',
  outputDirectory: '.next'
});

console.log(`Deployed to: ${result.data?.url}`);
```

### Get Provider Recommendations

```typescript
// Analyze your project
const analysis = await cloudManager.analyzeProject('./my-app', 'vercel');

if (analysis.success) {
  // Get smart recommendations
  const recommendations = await cloudManager.getProviderRecommendations(
    analysis.data,
    {
      costOptimization: true,
      performanceFirst: true,
      maxBudget: 50 // USD per month
    }
  );

  console.log('Recommended providers:');
  recommendations.forEach(rec => {
    console.log(`${rec.provider}: ${rec.score}/100 - ${rec.reasoning}`);
  });
}
```

## Architecture

### Design Patterns

The cloud module follows several design patterns for maintainability and extensibility:

- **Strategy Pattern**: Interchangeable cloud provider implementations
- **Factory Pattern**: Provider creation and management
- **Observer Pattern**: Deployment status monitoring
- **Circuit Breaker**: Fault tolerance and resilience
- **Facade Pattern**: Simplified interface to complex subsystems

### Core Components

```
shared/cloud/
├── cloud-manager.ts           # Main orchestrator
├── types/                     # TypeScript type definitions
│   ├── cloud-provider.types.ts
│   ├── deployment.types.ts
│   └── cost.types.ts
├── providers/                 # Provider implementations
│   ├── base-provider.ts       # Abstract base class
│   ├── vercel-provider.ts
│   ├── netlify-provider.ts
│   └── ...
├── utils/                     # Utility modules
│   ├── provider-selector.ts   # Smart provider recommendations
│   ├── project-analyzer.ts    # Project analysis and detection
│   ├── config-validator.ts    # Configuration validation
│   └── error-handler.ts       # Error handling and recovery
└── config/                    # Configuration management
    └── cloud-config.ts        # Centralized configuration
```

## Configuration

### Environment Variables

```bash
# Provider API Keys
VERCEL_TOKEN=your_vercel_token
NETLIFY_ACCESS_TOKEN=your_netlify_token
RAILWAY_TOKEN=your_railway_token

# Optional Configuration
CLOUD_DEFAULT_TIMEOUT=1800000    # 30 minutes
CLOUD_MAX_RETRIES=3
CLOUD_REGION_PREFERENCE=us-east-1
```

### Custom Configuration

```typescript
import { createCloudConfig } from '@aios/cloud-module';

const customConfig = createCloudConfig({
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

const cloudManager = new CloudManager(customConfig);
```

## API Reference

### CloudManager

The main class for orchestrating cloud operations.

#### Methods

##### `configureProvider(provider, config)`
Configure a cloud provider with authentication credentials.

```typescript
await cloudManager.configureProvider('vercel', {
  type: 'vercel',
  accessToken: 'your-token',
  region: 'us-east-1',
  timeout: 30000
});
```

##### `deploy(provider, config)`
Deploy an application to the specified provider.

```typescript
const result = await cloudManager.deploy('vercel', {
  projectPath: './app',
  environment: 'production',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  environmentVariables: [
    { key: 'NODE_ENV', value: 'production', isRequired: true }
  ]
});
```

##### `analyzeProject(projectPath, provider?)`
Analyze a project to detect framework, dependencies, and optimal configuration.

```typescript
const analysis = await cloudManager.analyzeProject('./my-react-app');
// Returns: ProjectAnalysis with framework detection, build settings, etc.
```

##### `getProviderRecommendations(analysis, preferences?)`
Get intelligent provider recommendations based on project analysis.

```typescript
const recommendations = await cloudManager.getProviderRecommendations(
  projectAnalysis,
  {
    costOptimization: true,
    performanceFirst: false,
    requiredFeatures: ['managed-databases'],
    maxBudget: 100
  }
);
```

##### `estimateDeploymentCosts(provider, config)`
Estimate deployment costs for a specific provider and configuration.

```typescript
const estimate = await cloudManager.estimateDeploymentCosts('vercel', {
  projectPath: './app',
  environment: 'production'
});

console.log(`Monthly cost: $${estimate.monthly.typical}`);
```

##### `getDeploymentStatus(provider, deploymentId)`
Get real-time deployment status and progress.

```typescript
const status = await cloudManager.getDeploymentStatus('vercel', 'deployment-id');
console.log(`Progress: ${status.data?.progress}%`);
```

## Examples

### Deploy a Next.js App to Vercel

```typescript
import { CloudManager } from '@aios/cloud-module';

const cloudManager = new CloudManager();

// Configure Vercel
await cloudManager.configureProvider('vercel', {
  type: 'vercel',
  accessToken: process.env.VERCEL_TOKEN
});

// Deploy
const result = await cloudManager.deploy('vercel', {
  projectPath: './my-nextjs-app',
  environment: 'production',
  environmentVariables: [
    { key: 'NEXT_PUBLIC_API_URL', value: 'https://api.myapp.com', isRequired: true }
  ]
});

if (result.success) {
  console.log(`✅ Deployed successfully to ${result.data.url}`);
} else {
  console.error(`❌ Deployment failed: ${result.error?.message}`);
}
```

### Multi-Provider Cost Comparison

```typescript
const providers = ['vercel', 'netlify', 'railway'];
const estimates = await Promise.all(
  providers.map(provider =>
    cloudManager.estimateDeploymentCosts(provider, deploymentConfig)
  )
);

estimates.forEach((estimate, index) => {
  console.log(`${providers[index]}: $${estimate.monthly.typical}/month`);
});
```

### Automated Provider Selection

```typescript
// Analyze project
const analysis = await cloudManager.analyzeProject('./my-app');

if (analysis.success) {
  // Get recommendations
  const recommendations = await cloudManager.getProviderRecommendations(
    analysis.data,
    { costOptimization: true, maxBudget: 25 }
  );

  // Deploy to best recommended provider
  const bestProvider = recommendations[0];
  console.log(`Deploying to ${bestProvider.provider} (score: ${bestProvider.score})`);

  const result = await cloudManager.deploy(bestProvider.provider, {
    projectPath: './my-app',
    environment: 'production'
  });
}
```

## Error Handling

The module provides comprehensive error handling with structured error types:

```typescript
import { CloudError, isCloudError } from '@aios/cloud-module';

try {
  await cloudManager.deploy('vercel', config);
} catch (error) {
  if (isCloudError(error)) {
    console.error(`Cloud error: ${error.code} - ${error.message}`);
    console.error(`Provider: ${error.provider}`);
    console.error(`Retryable: ${error.retryable}`);

    if (error.recovery) {
      console.log('Suggested recovery actions:');
      error.recovery.forEach(action => console.log(`- ${action}`));
    }
  }
}
```

## Testing

The module includes comprehensive test suites for all components:

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run specific provider tests
npm run test:providers

# Generate coverage report
npm run test:coverage
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/aios-team/aios-v2.git
cd aios-v2/shared/cloud

# Install dependencies
npm install

# Run tests
npm test

# Start development mode
npm run dev
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Support

- 📖 **Documentation**: [https://docs.aios.dev/cloud](https://docs.aios.dev/cloud)
- 💬 **Community**: [https://discord.gg/aios](https://discord.gg/aios)
- 🐛 **Issues**: [GitHub Issues](https://github.com/aios-team/aios-v2/issues)
- 📧 **Email**: cloud-support@aios.dev

---

**Made with ❤️ by the AIOS Team**