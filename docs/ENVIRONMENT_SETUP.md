# 🔑 Environment Variables Setup Guide

This guide explains how to configure AI provider credentials and other environment variables for AIOS.

## 📋 Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your API keys** in the `.env` file

3. **Run AIOS** - it will automatically load your credentials

## 🔧 Environment Variables

### AI Providers (At least one required)

| Provider | Environment Variable | How to Get |
|----------|---------------------|------------|
| **OpenAI** | `OPENAI_API_KEY` | [Get API Key](https://platform.openai.com/api-keys) |
| **Anthropic** | `ANTHROPIC_API_KEY` | [Get API Key](https://console.anthropic.com/) |
| **Groq** | `GROQ_API_KEY` | [Get API Key](https://console.groq.com/keys) |
| **Ollama** | None | [Install Ollama](https://ollama.ai/) |

### Cloud Providers (Dynamic Collection)

> **🆕 New Feature**: Cloud provider credentials are now collected dynamically when you choose a deployment platform after AI recommendations. You don't need to pre-configure all cloud providers!

| Provider | Environment Variable | How to Get | Collection Method |
|----------|---------------------|------------|------------------|
| **Vercel** | `VERCEL_TOKEN` | [Get Token](https://vercel.com/account/tokens) | 🔄 Interactive prompt |
| **Netlify** | `NETLIFY_TOKEN` | [Get Token](https://app.netlify.com/user/applications#personal-access-tokens) | 🔄 Interactive prompt |
| **AWS** | `AWS_ACCESS_KEY_ID`<br>`AWS_SECRET_ACCESS_KEY` | [Get Credentials](https://aws.amazon.com/console/) | 🔄 Interactive prompt |
| **Railway** | `RAILWAY_TOKEN` | [Get Token](https://railway.app/account/tokens) | 🔄 Interactive prompt |
| **Render** | `RENDER_API_KEY` | [Get API Key](https://dashboard.render.com/account/api-keys) | 🔄 Interactive prompt |

## 📝 Example .env File

```bash
# AI Providers (at least one required)
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
GROQ_API_KEY=gsk_your-groq-api-key-here

# Cloud Providers (optional)
VERCEL_TOKEN=your-vercel-token-here
NETLIFY_TOKEN=your-netlify-token-here

# Configuration
NODE_ENV=development
LOG_LEVEL=info
DEFAULT_AI_PROVIDER=openai
DEFAULT_CLOUD_PROVIDER=vercel
```

## 🚀 Usage Examples

### AI Service (Automatic Credential Loading)
```typescript
import { AIServiceFactory } from '@aios/shared';

// AI provider credentials are automatically loaded from environment variables
const aiService = AIServiceFactory.createWithCredentials(
  logger,
  metrics,
  providerRegistry
);

// Send a message - credentials are injected automatically
const response = await aiService.sendMessage('Hello, world!');
```

### CLI Usage (Interactive Credential Collection)
```typescript
import { CloudDeploymentService } from '@aios/shared/cloud';

// CLI automatically detects interactive environment
const deploymentService = new CloudDeploymentService(logger, metrics);

// Get AI recommendations for your project
const recommendations = await deploymentService.getRecommendations('/path/to/project');

// Deploy with AI recommendation - credentials collected interactively
const result = await deploymentService.deployWithRecommendation(
  { projectPath: '/path/to/project', interactive: true },
  recommendations.value[0] // Use first recommendation
);

if (result.isSuccess) {
  console.log(`Deployed to ${result.value.url}`);
}
```

### Web Application Usage (Non-Interactive)
```typescript
import { CloudDeploymentService } from '@aios/shared/cloud';

// Web app explicitly sets non-interactive mode
const deploymentService = new CloudDeploymentService(logger, metrics, { interactive: false });

// Get credential requirements for UI
const requirements = await deploymentService.getWebCredentialRequirements('vercel');
if (requirements.isSuccess) {
  const config = requirements.value;
  // Build form with config.requiredFields
  // Show config.description and config.instructions to user
}

// Deploy with credentials from web form
const result = await deploymentService.deployWithWebCredentials(
  { projectPath: '/path/to/project' },
  recommendation,
  { VERCEL_TOKEN: 'user-provided-token' } // From web form
);

if (result.isSuccess) {
  console.log(`Deployed to ${result.value.url}`);
}
```

### Manual Credential Management
```typescript
import { CredentialManager } from '@aios/shared/core';

const credentialManager = new CredentialManager();

// Check if OpenAI is configured
const openaiStatus = credentialManager.getProviderCredentials('openai');
if (openaiStatus.isConfigured) {
  console.log('OpenAI is ready to use');
}

// Get configuration summary
const summary = credentialManager.getConfigurationSummary();
console.log(summary);
```

## 🔍 Credential Validation

The system automatically validates your credentials:

### ✅ Valid API Key Formats
- **OpenAI**: `sk-[48 characters]`
- **Anthropic**: `sk-ant-[95 characters]`
- **Groq**: `gsk_[52 characters]`

### ❌ Common Issues
- Missing environment variables
- Invalid API key format
- Expired or revoked API keys
- Network connectivity issues

## 🛠️ Troubleshooting

### "No AI providers configured"
```bash
# Check your environment variables
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Or check your .env file
cat .env | grep API_KEY
```

### "Provider validation failed"
```bash
# Validate a specific provider
npx aios check-credentials openai

# Get configuration summary
npx aios check-credentials --summary
```

### Environment Variable Not Loading
```bash
# Make sure .env is in the correct location
ls -la .env

# Check if dotenv is loading correctly
NODE_ENV=development npx aios --verbose
```

## 🔒 Security Best Practices

1. **Never commit API keys** to version control
2. **Use .env files** for local development
3. **Use environment variables** in production
4. **Rotate API keys** regularly
5. **Monitor API usage** to detect anomalies

## 📊 Provider Priority

When multiple providers are configured, AIOS uses this priority order:

1. **OpenAI** (if configured)
2. **Anthropic** (if configured)
3. **Groq** (if configured)
4. **Ollama** (if running locally)
5. **Local** (fallback)

## 🆕 Dynamic Credential Collection Workflow

### How It Works

1. **AI Analysis**: AI analyzes your project and suggests the best cloud provider
2. **User Choice**: You choose which provider to use based on AI recommendations
3. **Credential Collection**: System collects credentials for the chosen provider
   - **CLI**: Interactive prompts using terminal
   - **Web**: Form-based collection in browser UI
4. **Deployment**: Your project is deployed using the provided credentials

### Environment Compatibility

The credential system automatically adapts to your environment:

| Environment | Credential Collection | UI Method | Dependencies |
|-------------|---------------------|-----------|--------------|
| **CLI** | Interactive prompts | Terminal-based | `inquirer` (bundled) |
| **Web** | Form-based | Browser UI | None (pure TypeScript) |
| **Node.js** | Auto-detect | Terminal or programmatic | Optional `inquirer` |
| **Browser** | Form-based | Web UI | None |

### Example Workflow

```bash
# 1. AI analyzes your project
npx aios analyze /path/to/project

# Output:
# 🤖 AI Recommendations:
# 1. Vercel (90% confidence) - Best for Next.js apps
# 2. Netlify (80% confidence) - Great for static sites
# 3. AWS (70% confidence) - Most scalable option

# 2. You choose Vercel
npx aios deploy --provider vercel

# 3. System prompts for Vercel credentials
# ? Configure VERCEL credentials? Yes
# ? Enter VERCEL_TOKEN: [hidden input]
# ? Save credentials to .env file? Yes

# 4. Deployment proceeds automatically
# ✅ Deployed to https://your-app.vercel.app
```

### Benefits

- **🎯 Targeted**: Only collect credentials for providers you actually use
- **🔒 Secure**: Credentials are collected securely and can be saved to .env
- **⚡ Fast**: No need to pre-configure all possible providers
- **🤖 Smart**: AI helps you choose the best provider for your project

## 🔄 Dynamic Configuration

You can change providers at runtime:

```typescript
// Use a specific provider
const response = await aiService.sendMessage('Hello!', {
  provider: 'anthropic'
});

// Override configuration
const response = await aiService.sendMessage('Hello!', {
  provider: 'openai',
  config: {
    model: 'gpt-4',
    temperature: 0.8
  }
});
```

## 📈 Monitoring

Track your API usage and costs:

```typescript
// Get metrics for all providers
const metrics = aiService.getMetrics();

// Check specific provider usage
const openaiMetrics = metrics.getProviderMetrics('openai');
console.log(`OpenAI requests: ${openaiMetrics.requestCount}`);
console.log(`OpenAI tokens used: ${openaiMetrics.tokenCount}`);
```

## 🆘 Support

If you're having trouble with credentials:

1. **Check the logs** for detailed error messages
2. **Validate your API keys** on the provider's website
3. **Test with a simple request** to verify connectivity
4. **Check your network** for firewall or proxy issues

For more help, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).
