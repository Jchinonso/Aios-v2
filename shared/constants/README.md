# Constants Module

The constants module provides centralized configuration values, error definitions, and application-wide constants for the AIOS v2 system. This module eliminates hardcoding and provides a single source of truth for all constant values.

## 🎯 Purpose

This module serves as the configuration backbone of the application, providing:
- **Centralized constants** - All application constants in one place
- **Type safety** - TypeScript const assertions for compile-time safety
- **Maintainability** - Easy to update and modify constants
- **Consistency** - Uniform naming and structure across the application

## 📁 File Structure

```
constants/
├── ai.constants.ts        # AI provider and model constants
├── cloud.constants.ts     # Cloud provider and deployment constants
├── cloud-providers.ts     # Comprehensive cloud provider configurations
├── defaults.ts           # Application defaults and limits
├── errors.ts             # Error codes and messages
└── index.ts              # Module exports
```

## 🔧 Key Components

### AI Constants (`ai.constants.ts`)
- **AI Providers**: OpenAI, Anthropic, Gemini, Ollama, Groq
- **AI Models**: Specific models for each provider
- **AI Defaults**: Default configuration values
- **AI Roles**: User, Assistant, System roles

```typescript
import { AI_PROVIDERS, AI_MODELS, AI_DEFAULTS } from './constants';

// Usage
const provider = AI_PROVIDERS.OPENAI;
const model = AI_MODELS[AI_PROVIDERS.OPENAI].GPT_4;
const maxTokens = AI_DEFAULTS.MAX_TOKENS;
```

### Cloud Constants (`cloud.constants.ts`)
- **Cloud Providers**: Vercel, Netlify, AWS, Railway, Render
- **Frameworks**: Next.js, React, Vue, Express, Django, etc.
- **Package Managers**: npm, yarn, pnpm
- **Deployment Status**: Pending, Building, Ready, Error
- **Provider Limits**: Deployment limits and timeouts

```typescript
import { CLOUD_PROVIDERS, FRAMEWORKS, PROVIDER_LIMITS } from './constants';

// Usage
const provider = CLOUD_PROVIDERS.VERCEL;
const framework = FRAMEWORKS.NEXT_JS;
const limits = PROVIDER_LIMITS[CLOUD_PROVIDERS.VERCEL];
```

### Cloud Providers (`cloud-providers.ts`)
Comprehensive cloud provider configurations including:
- **Provider Details**: Name, base URL, API version
- **Features**: Zero-config, auto-scaling, custom domains, etc.
- **Capabilities**: Supported frameworks, languages, deployment strategies

```typescript
import { PROVIDER_CONFIGS } from './constants';

// Usage
const vercelConfig = PROVIDER_CONFIGS.vercel;
const features = vercelConfig.features;
```

### Defaults (`defaults.ts`)
Application-wide defaults including:
- **App Information**: Name, version, description
- **Timeouts**: Connection, request, deployment timeouts
- **Limits**: File sizes, concurrent operations, retry attempts
- **Paths**: Configuration and cache directories

```typescript
import { APP_DEFAULTS, TIMEOUTS, LIMITS } from './constants';

// Usage
const appName = APP_DEFAULTS.NAME;
const timeout = TIMEOUTS.DEPLOYMENT;
const maxFileSize = LIMITS.MAX_FILE_SIZE;
```

### Errors (`errors.ts`)
Standardized error handling with:
- **Error Codes**: Unique identifiers for each error type
- **Error Messages**: Human-readable error descriptions
- **Error Definitions**: Structured error objects

```typescript
import { ERROR_CODES, ERROR_MESSAGES } from './constants';

// Usage
const errorCode = ERROR_CODES.DEPLOYMENT_FAILED;
const message = ERROR_MESSAGES[ERROR_CODES.DEPLOYMENT_FAILED];
```

## 🚀 Usage Examples

### Basic Import
```typescript
import { 
  AI_PROVIDERS, 
  CLOUD_PROVIDERS, 
  ERROR_CODES,
  APP_DEFAULTS 
} from './constants';
```

### Provider Configuration
```typescript
import { PROVIDER_CONFIGS, CLOUD_PROVIDERS } from './constants';

function getProviderFeatures(provider: string) {
  const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
  return config?.features || [];
}
```

### Error Handling
```typescript
import { ERROR_CODES, ERROR_MESSAGES } from './constants';

function handleError(error: Error) {
  const errorCode = ERROR_CODES.UNKNOWN_ERROR;
  const message = ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
  
  return {
    code: errorCode,
    message: message,
    originalError: error
  };
}
```

### AI Configuration
```typescript
import { AI_PROVIDERS, AI_MODELS, AI_DEFAULTS } from './constants';

const aiConfig = {
  provider: AI_PROVIDERS.OPENAI,
  model: AI_MODELS[AI_PROVIDERS.OPENAI].GPT_4,
  maxTokens: AI_DEFAULTS.MAX_TOKENS,
  temperature: AI_DEFAULTS.TEMPERATURE
};
```

## 🔄 Integration

The constants module integrates with:
- **Intelligence Module** - AI provider configurations
- **Cloud Module** - Provider configurations and limits
- **Utils Module** - Default values and limits
- **Core Module** - Error handling and configuration

## 📋 Best Practices

1. **Use const assertions** - All constants use `as const` for type safety
2. **Group related constants** - Organize constants by functionality
3. **Provide defaults** - Always include sensible default values
4. **Document usage** - Include JSDoc comments for complex constants
5. **Avoid hardcoding** - Use constants instead of magic numbers/strings

## 🛠️ Adding New Constants

When adding new constants:

1. **Choose the right file** - Add to the most appropriate existing file
2. **Follow naming conventions** - Use UPPER_SNAKE_CASE for constants
3. **Add to exports** - Include in the index.ts file
4. **Update documentation** - Add examples and usage notes

## 📊 Statistics

- **5 constant files** with comprehensive coverage
- **20+ AI providers and models** supported
- **15+ cloud providers** configured
- **50+ error codes** defined
- **100% TypeScript** with strict typing

## 🔮 Future Enhancements

- [ ] Environment-specific constants
- [ ] Dynamic configuration loading
- [ ] Validation schemas for constants
- [ ] Runtime configuration updates
- [ ] Internationalization support
