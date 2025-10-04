# AIOS v2 - Quick Reference Guide

**Last Updated:** 2025-10-02

---

## 🚀 Quick Start

### Production Ready Providers

#### Cloud Deployment
✅ **Vercel** - Fully implemented
✅ **Netlify** - Fully implemented
✅ **Render** - Fully implemented
⚠️ **Railway** - Pending (guide available)
⚠️ **AWS** - Pending (guide available)

#### AI Intelligence
✅ All 10 providers fully implemented and production ready

---

## 📦 Environment Setup

### Cloud Providers

```bash
# Vercel
export VERCEL_TOKEN="your_token"
export VERCEL_PROJECT_ID="your_project_id"

# Netlify
export NETLIFY_TOKEN="your_token"
export NETLIFY_SITE_ID="your_site_id"

# Render
export RENDER_API_KEY="your_api_key"
export RENDER_SERVICE_ID="your_service_id"
```

### AI Providers

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
export COHERE_API_KEY="..."
export REPLICATE_API_TOKEN="..."
export HUGGINGFACE_API_KEY="..."
export GROQ_API_KEY="..."
```

---

## 🛠️ Usage Examples

### Deploy to Netlify

```typescript
import { NetlifyProvider } from '@aios/shared/cloud/providers';

const provider = new NetlifyProvider();
provider.configure({
  type: 'netlify',
  token: process.env.NETLIFY_TOKEN,
  siteId: process.env.NETLIFY_SITE_ID
});

const result = await provider.deploy({
  projectPath: './my-app',
  environment: 'production'
});

console.log('Deployed to:', result.url);
```

### Deploy to Render

```typescript
import { RenderProvider } from '@aios/shared/cloud/providers';

const provider = new RenderProvider();
provider.configure({
  type: 'render',
  apiKey: process.env.RENDER_API_KEY,
  serviceId: process.env.RENDER_SERVICE_ID
});

const result = await provider.deploy({
  projectPath: './my-app',
  environment: 'production'
});

console.log('Deployed to:', result.url);
```

### Use AI Provider

```typescript
import { OpenAIProvider } from '@aios/shared/intelligence/providers';

const ai = new OpenAIProvider();
const response = await ai.sendMessage([
  { role: 'user', content: 'Hello, how are you?' }
], {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

console.log(response.content);
```

---

## 📊 Provider Status Matrix

| Provider | Type | Status | Methods | SDK |
|----------|------|--------|---------|-----|
| **Vercel** | Cloud | ✅ Complete | 8/8 | `@vercel/client` |
| **Netlify** | Cloud | ✅ Complete | 8/8 | `@netlify/api` |
| **Render** | Cloud | ✅ Complete | 8/8 | Custom REST |
| **Railway** | Cloud | ⚠️ Pending | 0/8 | GraphQL |
| **AWS** | Cloud | ⚠️ Pending | 0/8 | AWS SDK |
| **OpenAI** | AI | ✅ Complete | - | Official SDK |
| **Anthropic** | AI | ✅ Complete | - | Official SDK |
| **Google AI** | AI | ✅ Complete | - | Direct API |
| **Cohere** | AI | ✅ Complete | - | Official SDK |
| **All Others** | AI | ✅ Complete | - | Various |

---

## 📝 Available Methods

### Cloud Provider Methods (All 3 providers)

```typescript
// Deployment
deploy(config: DeploymentConfig): Promise<DeploymentResult>
getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus>
cancelDeployment(deploymentId: string): Promise<void>

// Logs & Info
getDeploymentLogs(deploymentId: string, limit?: number): Promise<DeploymentLog[]>
listDeployments(projectId?: string, limit?: number): Promise<DeploymentSummary[]>

// Management
rollback(deploymentId: string): Promise<DeploymentResult>
estimateCost(config: DeploymentConfig): Promise<CostEstimate>
getHealthStatus(): Promise<ProviderHealthStatus>
```

### AI Provider Methods

```typescript
sendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse>
streamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>>
validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] }
getCost(tokens: number, model: string): number
```

---

## 🔍 Error Handling

### Centralized Error Factories

All providers use standardized error factories:

```typescript
import {
  createAPIKeyRequiredError,
  createDeploymentFailedError,
  createNetworkError,
  createTimeoutError
} from '@aios/shared/constants/errors';

// Usage examples
throw createAPIKeyRequiredError('OpenAI');
throw createDeploymentFailedError('Netlify', 'Build failed');
throw createNetworkError('deployment status check', error);
throw createTimeoutError('Deployment', 300000);
```

### Common Error Types

- `createAPIKeyRequiredError(provider)` - Missing API key
- `createTokenNotConfiguredError(provider)` - Missing auth token
- `createProviderNotConfiguredError(provider)` - Provider not set up
- `createDeploymentFailedError(provider, reason)` - Deployment failure
- `createNetworkError(operation, error)` - Network/API issues
- `createTimeoutError(operation, timeoutMs)` - Operation timeout

---

## 📂 File Structure

```
shared/
├── cloud/
│   ├── providers/
│   │   ├── vercel-provider.ts        ✅ Complete
│   │   ├── netlify-provider.ts       ✅ Complete
│   │   ├── render-provider.ts        ✅ Complete
│   │   ├── railway-provider.ts       ⚠️ Mock
│   │   ├── aws-provider.ts           ⚠️ Mock
│   │   └── IMPLEMENTATION_GUIDE.md   📚 Docs
│   └── types/
│       └── provider-config.types.ts
├── intelligence/
│   └── providers/
│       ├── openai-provider.ts        ✅ Complete
│       ├── anthropic-provider.ts     ✅ Complete
│       ├── google-provider.ts        ✅ Complete
│       └── ... (all complete)
└── constants/
    └── errors.ts                      ✅ 22 factories
```

---

## 🧪 Testing

### Build Verification

```bash
npm run build
# ✅ Should complete with zero errors
```

### Manual Testing

```typescript
// Test provider configuration
const provider = new NetlifyProvider();
const isConfigured = provider.isConfigured();
console.log('Configured:', isConfigured);

// Test health check
const health = await provider.getHealthStatus();
console.log('Health:', health.status);

// Test deployment (dry run)
const estimate = await provider.estimateCost({
  projectPath: './test',
  environment: 'staging'
});
console.log('Estimated cost:', estimate.monthly.typical);
```

---

## 📚 Documentation

### Main Documents

1. **CODEBASE_STATUS_REPORT.md** - Complete audit and status
2. **MOCK_TO_REAL_IMPLEMENTATION_SUMMARY.md** - Session achievements
3. **shared/cloud/providers/IMPLEMENTATION_GUIDE.md** - Railway & AWS guide
4. **QUICK_REFERENCE.md** - This document

### Key Sections

- Implementation status: See STATUS_REPORT.md
- Railway implementation: See IMPLEMENTATION_GUIDE.md § Railway Provider
- AWS implementation: See IMPLEMENTATION_GUIDE.md § AWS Provider
- Error handling: See errors.ts or any provider file

---

## ⚡ Performance Tips

### Deployment Optimization

```typescript
// Use specific deployment configuration
const config: DeploymentConfig = {
  projectPath: './dist',  // Pre-built output
  environment: 'production',
  region: 'us-east-1',    // Specify region
};

// Monitor deployment status efficiently
const status = await provider.getDeploymentStatus(deploymentId);
if (status.phase === 'ready') {
  console.log('Deployment complete!');
}
```

### Cost Optimization

```typescript
// Estimate before deploying
const estimate = await provider.estimateCost(config);
console.log('Monthly cost:', estimate.monthly.typical);

// Use staging for development
const devConfig = { ...config, environment: 'staging' };
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "Provider not configured"**
```typescript
// Solution: Ensure environment variables are set
console.log('Token:', process.env.NETLIFY_TOKEN ? 'Set' : 'Missing');
```

**Issue: "Deployment failed"**
```typescript
// Solution: Check deployment logs
const logs = await provider.getDeploymentLogs(deploymentId);
logs.forEach(log => console.log(log.message));
```

**Issue: "API key required"**
```typescript
// Solution: Configure provider with API key
provider.configure({
  type: 'netlify',
  token: 'your_token_here'  // Don't hardcode in production!
});
```

### Debug Mode

```typescript
// Enable verbose logging
process.env.LOG_LEVEL = 'debug';

// Check provider health
const health = await provider.getHealthStatus();
console.log('Provider health:', JSON.stringify(health, null, 2));
```

---

## 🔐 Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate credentials regularly** - Update keys periodically
3. **Use project tokens** - Scope tokens to specific projects
4. **Monitor usage** - Track API calls and costs
5. **Validate inputs** - Always validate deployment configs

---

## 📈 Metrics & Monitoring

### Track Deployments

```typescript
const deployments = await provider.listDeployments();
console.log(`Total deployments: ${deployments.length}`);

deployments.forEach(d => {
  console.log(`${d.deploymentId}: ${d.status} (${d.environment})`);
});
```

### Monitor Costs

```typescript
const estimate = await provider.estimateCost(config);
const monthlyCost = estimate.monthly.typical;

if (monthlyCost > 100) {
  console.warn('⚠️ Deployment may exceed budget');
}
```

---

## 🚦 Status Indicators

### Provider Health Status

```typescript
const health = await provider.getHealthStatus();

switch (health.status) {
  case 'healthy':
    console.log('✅ Provider operational');
    break;
  case 'degraded':
    console.log('⚠️ Provider experiencing issues');
    break;
  case 'unhealthy':
    console.log('❌ Provider unavailable');
    break;
}
```

### Deployment Status

```typescript
const status = await provider.getDeploymentStatus(deploymentId);

switch (status.phase) {
  case 'queued':
    console.log('⏳ Waiting to start...');
    break;
  case 'building':
    console.log('🔨 Building...');
    break;
  case 'deploying':
    console.log('🚀 Deploying...');
    break;
  case 'ready':
    console.log('✅ Deployment live!');
    break;
  case 'failed':
    console.log('❌ Deployment failed');
    break;
}
```

---

## 🎯 Quick Wins

### 1. Deploy Static Site (5 minutes)

```bash
export NETLIFY_TOKEN="your_token"
export NETLIFY_SITE_ID="your_site_id"
```

```typescript
const provider = new NetlifyProvider();
const result = await provider.deploy({
  projectPath: './dist',
  environment: 'production'
});
console.log('Live at:', result.url);
```

### 2. Get AI Response (2 minutes)

```bash
export OPENAI_API_KEY="sk-..."
```

```typescript
const ai = new OpenAIProvider();
const response = await ai.sendMessage([
  { role: 'user', content: 'Explain AIOS in one sentence' }
], { apiKey: process.env.OPENAI_API_KEY });
console.log(response.content);
```

### 3. Check Provider Status (1 minute)

```typescript
const health = await provider.getHealthStatus();
console.log('Status:', health.status);
console.log('Response time:', health.checkDuration, 'ms');
```

---

## 📞 Support & Resources

### Documentation
- Implementation Guide: `/shared/cloud/providers/IMPLEMENTATION_GUIDE.md`
- Status Report: `/CODEBASE_STATUS_REPORT.md`
- Session Summary: `/MOCK_TO_REAL_IMPLEMENTATION_SUMMARY.md`

### Provider APIs
- Vercel: https://vercel.com/docs/rest-api
- Netlify: https://docs.netlify.com/api/get-started/
- Render: https://render.com/docs/api

### Next Steps
1. ✅ Use Vercel/Netlify/Render for production
2. 📋 Review IMPLEMENTATION_GUIDE.md for Railway/AWS
3. 🧪 Add integration tests
4. 📊 Monitor deployments and costs

---

*Quick Reference Guide - Always Up to Date*
*For detailed information, see CODEBASE_STATUS_REPORT.md*
