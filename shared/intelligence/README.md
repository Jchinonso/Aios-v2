# Intelligence Module - SOLID Architecture

The intelligence module is the core AI-powered analysis engine of the AIOS v2 system. It provides comprehensive project analysis, pattern detection, AI services, and intelligent recommendations following SOLID principles.

## 🎯 Purpose

This module serves as the intelligence backbone of the application, providing:
- **AI Services** - High-level AI operations with conversation management
- **Project Analysis** - Comprehensive code and project analysis
- **Pattern Detection** - Multi-language pattern recognition
- **Metadata Extraction** - Technology and dependency analysis
- **Provider Integration** - Multiple AI provider support

## 🏗️ Architecture Overview

The intelligence module is organized into focused, single-responsibility components:

1. **AI Services** - High-level AI operations with conversation management
2. **Analyzers** - Project analysis and pattern detection
3. **Providers** - Low-level AI provider implementations
4. **Metadata** - Technology and dependency extraction
5. **File System** - File scanning and pattern detection
6. **Types** - Comprehensive type definitions and interfaces

## 📁 Directory Structure

```
intelligence/
├── services/             # AI service implementations
│   ├── ai-service/       # Core AI service with conversation management
│   ├── analysis-pipeline-manager.ts
│   ├── deployment-execution-engine.ts
│   ├── enhanced-intelligence-orchestrator.ts
│   └── intelligence-orchestrator.ts
├── analyzers/            # Project analysis components
│   ├── core/             # Base analyzers and factories
│   ├── languages/        # Language-specific analyzers
│   ├── specialized/      # Specialized analysis tools
│   └── project-analyzer.ts
├── providers/            # AI provider implementations
│   ├── anthropic-provider.ts
│   ├── groq-provider.ts
│   ├── ollama-provider.ts
│   └── openai-provider.ts
├── metadata/             # Metadata extraction
│   ├── extractors/       # Technology and dependency extractors
│   └── metadata-service.ts
├── file-system/          # File system analysis
│   ├── core/             # Core file system interfaces
│   ├── patterns/         # Pattern detection
│   └── scanners/         # File scanning utilities
├── types/                # Type definitions
├── constants/            # Intelligence-specific constants
├── prompts/              # AI prompts and templates
└── utils/                # Utility functions
```

## 🔧 Key Components

### AI Services (`services/ai-service/`)
High-level AI service with conversation management, message processing, and provider abstraction.

```typescript
import { AIService } from '@aios/shared/intelligence';

const aiService = new AIService(
  logger,
  metrics,
  providerRegistry,
  conversationManager,
  messageProcessor,
  'openai',
  50
);

// Send a message
const result = await aiService.sendMessage('Hello, world!', {
  conversationId: 'conv_123',
  systemPrompt: 'You are a helpful assistant'
});
```

### Analyzers (`analyzers/`)
Project analysis components that can detect patterns, frameworks, and technologies.

```typescript
import { CompositeAnalyzer, FileSystemAnalyzer, PackageAnalyzer } from '@aios/shared/intelligence';

const analyzer = new CompositeAnalyzer(logger, metrics);
analyzer.addAnalyzer(new FileSystemAnalyzer(logger, metrics));
analyzer.addAnalyzer(new PackageAnalyzer(logger, metrics));

const result = await analyzer.analyze('/path/to/project', context);
```

### Providers (`providers/`)
Low-level AI provider implementations for different AI services.

```typescript
import { OpenAIProvider, AnthropicProvider } from '@aios/shared/intelligence';

const openaiProvider = new OpenAIProvider();
const response = await openaiProvider.sendMessage(messages, config);
```

## SOLID Principles Applied

- **SRP**: Each component has a single, well-defined responsibility
- **OCP**: Open for extension through new analyzers, providers, and strategies
- **LSP**: All implementations are substitutable with their interfaces
- **ISP**: Segregated interfaces for different concerns
- **DIP**: Depends on abstractions, not concretions

## Usage Examples

### Basic AI Operations
```typescript
// Create AI service
const aiService = AIServiceFactory.create(
  logger,
  metrics,
  providerRegistry,
  'openai',
  50
);

// Send message
const result = await aiService.sendMessage('Analyze this code', {
  systemPrompt: 'You are a code reviewer'
});

if (result.isSuccess) {
  console.log(result.value.content);
}
```

### Project Analysis
```typescript
// Create composite analyzer
const analyzer = new CompositeAnalyzer(logger, metrics);
analyzer.addAnalyzer(new FileSystemAnalyzer(logger, metrics));
analyzer.addAnalyzer(new PackageAnalyzer(logger, metrics));

// Analyze project
const analysis = await analyzer.analyze('/path/to/project', {
  requestId: 'analysis_123',
  timestamp: new Date(),
  metadata: {}
});

if (analysis.isSuccess) {
  console.log('Analysis completed:', analysis.value.data);
}
```

### Conversation Management
```typescript
// Create conversation
const convResult = await aiService.createConversation({
  context: 'code-review',
  userId: 'user123'
});

if (convResult.isSuccess) {
  const conversationId = convResult.value;
  
  // Send messages in conversation
  await aiService.sendMessage('Review this function', {
    conversationId
  });
}
```

## Error Handling

All operations return `Result<T>` types for proper error handling:

```typescript
const result = await aiService.sendMessage('Hello');

if (result.isSuccess) {
  // Handle success
  console.log(result.value.content);
} else {
  // Handle error
  console.error('Error:', result.error.message);
}
```

## Dependencies

- Core logging and metrics systems
- Provider factory registry
- Configuration management
- Result type system

## 🔄 Integration

The intelligence module integrates with:
- **Constants Module** - AI provider configurations and defaults
- **Utils Module** - Configuration management and logging
- **Core Module** - Result pattern and error handling
- **Types Module** - Type definitions and interfaces

## 📊 Statistics

- **69 TypeScript files** with comprehensive AI functionality
- **21 analyzers** supporting multiple languages and frameworks
- **4 AI providers** (OpenAI, Anthropic, Groq, Ollama)
- **7 metadata extractors** for technology detection
- **100% TypeScript** with strict typing
- **SOLID principles** throughout the architecture

## 🛠️ Development

### Prerequisites
- Node.js 18+
- TypeScript 5+
- AI provider API keys

### Configuration
```typescript
// Configure AI providers
const config = {
  ai: {
    defaultProvider: 'openai',
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      }
    }
  }
};
```

## 🔮 Future Enhancements

- [ ] Additional AI providers (Claude, Gemini)
- [ ] Advanced pattern detection
- [ ] Machine learning integration
- [ ] Real-time analysis capabilities
- [ ] Performance optimization
- [ ] Caching mechanisms

## Migration from Legacy

The old `AIClient` has been replaced with the new `AIService` architecture:

- **Before**: `new AIClient(options)` with hard-coded providers
- **After**: `AIServiceFactory.create()` with dependency injection
- **Before**: Direct provider instantiation
- **After**: Provider registry with factory pattern
- **Before**: Exception-based error handling
- **After**: Result-based error handling