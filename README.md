# AIOS v2 - AI-Powered DevOps Assistant 🤖

**Production-grade conversational DevOps platform** - Deploy to cloud providers using natural language with enterprise-ready AI infrastructure.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🌟 Features

### 🚀 **Multi-Provider AI Integration**
- **9 LLM Providers**: OpenAI, Anthropic, Groq, Ollama, Google AI, Google Cloud (Vertex AI), Cohere, HuggingFace, Replicate
- **Automatic Failover**: Seamlessly switches providers on failure with smart cooldown tracking
- **Zero Configuration**: Auto-detects available providers from environment variables
- **Production-Ready**: Retry logic, circuit breakers, comprehensive metrics

### ☁️ **Cloud Provider Support**
- **Vercel** - Optimized for Next.js, React, and modern web apps
- **Netlify** - Static sites, JAMstack, and serverless functions
- **AWS** - Full-featured cloud infrastructure
- **Railway** - Developer-friendly container deployments
- **Render** - Managed services with auto-scaling

### 🎨 **Beautiful Terminal UI**
- **Blessed TUI** with fixed input at bottom (Claude Code-style)
- **Arrow Key Navigation** for provider selection (↑/↓ or Vim k/j)
- **Visual Feedback** with color-coded options and selection indicators
- **Smooth Transitions** between UI states

### 🧠 **Intelligent Project Analysis**
- **Framework Detection**: Next.js, React, Vue, Angular, Svelte, Express, NestJS
- **Language Detection**: TypeScript, JavaScript, Python, Go, Rust
- **Dependency Analysis**: Automatic build configuration detection
- **Cost Estimation**: Smart recommendations based on project requirements

### 🔒 **Enterprise Security**
- **Secrets Management**: Encrypted vault for API keys and credentials
- **Policy Engine**: Approval workflows and compliance guardrails
- **State Tracking**: `.aios/` directory for deployment history
- **Git Integration**: Clone from GitHub/GitLab for remote deployments

---

## 📦 Installation

### Prerequisites

- **Node.js 18+** (recommended: 20 LTS)
- **npm** or **pnpm** or **yarn**
- At least **one AI provider API key**

### Quick Install

```bash
# Clone the repository
git clone https://github.com/Jchinonso/Aios-v2.git
cd Aios-v2

# Install dependencies (monorepo structure)
npm install

# Build all packages
npm run build

# Install globally
npm link

# Verify installation
aios --version
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# ============================================================================
# AI PROVIDERS (at least one required)
# ============================================================================

# OpenAI (GPT-3.5, GPT-4, GPT-4 Turbo)
OPENAI_API_KEY=sk-...

# Anthropic (Claude 3 Opus, Sonnet, Haiku)
ANTHROPIC_API_KEY=sk-ant-...

# Groq (Ultra-fast inference: Llama, Mixtral)
GROQ_API_KEY=gsk_...

# Google AI (Gemini Pro, Gemini Ultra)
GOOGLE_API_KEY=...

# Google Cloud Vertex AI (requires both)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Cohere (Command, Command Light)
COHERE_API_KEY=...

# HuggingFace Inference API
HUGGINGFACE_API_KEY=...

# Replicate (Llama, SDXL, etc.)
REPLICATE_API_TOKEN=...

# Ollama (no API key - runs locally)
OLLAMA_HOST=http://localhost:11434  # Optional, defaults to localhost

# ============================================================================
# CLOUD PROVIDERS (optional - can configure during deployment)
# ============================================================================

VERCEL_TOKEN=...
NETLIFY_TOKEN=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# ============================================================================
# CONFIGURATION
# ============================================================================

NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
ENABLE_METRICS=true

# Override default AI provider (optional)
AI_PROVIDER=anthropic  # or: openai, groq, ollama, google, cohere, etc.
```

### Provider Priority

If no provider is specified, AIOS uses this fallback order:
1. **OpenAI** (highest priority)
2. **Anthropic**
3. **Groq**
4. **Ollama** (always available if running locally)
5. **Google**
6. **Cohere**
7. **Google Cloud**
8. **HuggingFace**
9. **Replicate**

Set `AI_PROVIDER` environment variable to override.

---

## 🚀 Usage

### Interactive Mode (Recommended)

```bash
aios
```

This launches the blessed TUI with natural language input:

```
╔══════════════════════════════════════════════════════════════╗
║  AIOS - AI DevOps Assistant                                  ║
║                                                              ║
║  Project: my-nextjs-app                                      ║
║  AI-powered deployments to cloud                             ║
║                                                              ║
║  Quick Commands                                              ║
║  deploy, analyze, connect, /clear                            ║
║                                                              ║
║  Supported Providers                                         ║
║  Vercel • Netlify • AWS • Railway • Render                   ║
╚══════════════════════════════════════════════════════════════╝

 [Output area - scrollable when full]

╔══════════════════════════════════════════════════════════════╗
║ >                                                            ║
╚══════════════════════════════════════════════════════════════╝
```

### Example Conversations

**Deploy a Project:**
```
> deploy my app to production

🤖 Analyzing your request...
✓ Understood: deploy (confidence: 95%)
CLI equivalent: aios deploy --env production

🌐 Select Cloud Provider

   ❯ Vercel
     Netlify
     AWS
     Railway
     Render
     Cancel

[Use ↑/↓ or k/j to navigate, Enter to select, Esc to cancel]
```

**Natural Language Variations:**
```
> push this to vercel
> ship it to production
> deploy this next.js app
> I need to deploy my website
> help me get this app live
```

All these get intelligently mapped to the deploy command with entity extraction.

### CLI Commands (Non-Interactive)

```bash
# Deploy to specific provider
aios deploy --cloud vercel --env production

# Analyze project
aios analyze

# Connect cloud provider
aios connect vercel

# Get recommendations
aios recommend

# Check auth status
aios auth list
aios auth status
```

---

## 🏗️ Architecture

### Monorepo Structure

```
aios-v2/
├── shared/              # @aios/shared - Core shared libraries
│   ├── cloud/           # Cloud provider integrations
│   │   ├── providers/   # Vercel, Netlify, AWS, Railway, Render
│   │   ├── services/    # Cost analysis, health checks
│   │   └── types/       # Type definitions
│   ├── intelligence/    # AI services and project analysis
│   │   ├── providers/   # AI provider implementations (9 providers)
│   │   ├── services/    # AI service orchestration
│   │   └── file-system/ # Project analysis engine
│   ├── core/            # Logging, metrics, results
│   └── types/           # Shared TypeScript types
│
├── node-cli/            # @aios/cli - CLI interface
│   ├── commands/        # CLI command handlers
│   ├── handlers/        # Business logic (deployment, analysis)
│   ├── services/        # CLI-specific services
│   │   ├── dependency-container.ts       # DI container
│   │   ├── fallback-ai-service.ts        # Auto-failover wrapper
│   │   └── simple-provider-registry.ts   # Provider management
│   ├── ui/
│   │   └── blessed-session.ts            # Terminal UI
│   ├── nl-planner/      # Natural language parsing
│   ├── state/           # State management
│   └── policy/          # Policy engine
│
└── scripts/             # Build and validation scripts
```

### Key Design Patterns

- **Single Responsibility**: Each component has one clear purpose
- **Factory Pattern**: Provider instantiation and AI service creation
- **Decorator Pattern**: FallbackAIService wraps base AIService
- **Registry Pattern**: Runtime provider instance management
- **Result Pattern**: Railway-oriented programming (no exceptions for expected errors)
- **Type-Safe Operations**: Discriminated unions for extensibility

---

## 🧪 Development

### Build Commands

```bash
# Build entire monorepo
npm run build

# Build individual packages
npm run build:shared
npm run build:cli

# Clean build artifacts
npm run clean
```

### Development Workflow

```bash
# Development mode with hot reload
npm run dev

# Type check without building
npm run type-check

# Run all validation checks
npm run validate:all

# Individual validators
npm run validate:structure
npm run validate:style
npm run validate:quality
npm run validate:file-sizes
```

### Testing

```bash
# Run all tests
npm run test

# Test individual packages
npm run test -w shared
npm run test -w node-cli

# Watch mode
npm run test:watch
```

### Code Quality

```bash
# Lint all packages
npm run lint

# Format code
npm run format

# Security audit
npm run security:audit
npm run security:check
```

---

## 📚 Documentation

### Essential Guides

- **[AIOS Shell Roadmap](AIOS_SHELL_ROADMAP.md)** - Future vision and implementation plan
- **[Cloud Module](shared/cloud/README.md)** - Cloud provider integration deep dive
- **[Cloud API Reference](shared/cloud/API.md)** - CloudManager API documentation
- **[Extensibility Guide](shared/cloud/EXTENSIBILITY.md)** - Adding new operations (40+ categories)
- **[Intelligence Module](shared/intelligence/README.md)** - AI and analysis architecture
- **[Coding Standards](docs/CODING_STANDARDS.md)** - Senior developer guidelines

### Key Concepts

**Provider Catalog Pattern:**
```typescript
// Single source of truth for all provider metadata
import { getSupportedProviders, getProvidersByFeature } from '@aios/shared/cloud';

const providers = getSupportedProviders();
const staticHosting = getProvidersByFeature('staticHosting');
```

**AI Service with Automatic Failover:**
```typescript
// Automatically tries next provider on failure
const result = await aiService.sendMessage('deploy my app');
// If OpenAI fails → tries Anthropic → tries Groq → tries Ollama
```

**Result Pattern (No Exceptions):**
```typescript
const result = await cloudManager.deploy({ provider, config });

if (result.isSuccess) {
  console.log('Deployed:', result.data.url);
} else {
  console.error('Failed:', result.error.message);
}
```

---

## 🔑 API Keys Setup

### OpenAI
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Anthropic
1. Visit https://console.anthropic.com/
2. Generate API key
3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

### Groq (Fastest Inference)
1. Visit https://console.groq.com/keys
2. Create API key
3. Add to `.env`: `GROQ_API_KEY=gsk_...`

### Ollama (Free, Local, Private)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama server
ollama serve

# Pull a model (in another terminal)
ollama pull llama3:8b

# No API key needed - works automatically!
```

### Cloud Providers

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and get token
vercel login
vercel token create

# Add to .env
VERCEL_TOKEN=...
```

**Netlify:**
1. Visit https://app.netlify.com/user/applications#personal-access-tokens
2. Create new access token
3. Add to `.env`: `NETLIFY_TOKEN=...`

---

## 🎯 Roadmap

### Current Status (v2.0.0)
- ✅ Multi-provider AI infrastructure (9 providers)
- ✅ Automatic failover between providers
- ✅ Blessed TUI with arrow key navigation
- ✅ Cloud provider integrations (Vercel, Netlify, AWS, Railway, Render)
- ✅ Natural language intent parsing
- ✅ Project analysis and recommendations
- ✅ State management and deployment history

### In Progress
- 🔄 Plan/Apply/Verify workflow (Terraform-style)
- 🔄 OS keyring integration for secure credentials
- 🔄 Read-only project adoption
- 🔄 Advanced policy guardrails

### Future (v3.0)
- 📋 Day-2 operations (scaling, DR, incident management)
- 📋 Multi-environment orchestration
- 📋 Cost optimization automation
- 📋 Performance monitoring and alerts
- 📋 Rollback and blue/green deployments

See [AIOS_SHELL_ROADMAP.md](AIOS_SHELL_ROADMAP.md) for detailed implementation plan.

---

## 🤝 Contributing

We welcome contributions! This project follows enterprise-grade coding standards:

### Code Quality Metrics
| Metric | Target |
|--------|--------|
| Cyclomatic Complexity | ≤ 5 (excellent) |
| Cognitive Complexity | ≤ 3 (excellent) |
| Method Length | ≤ 20 lines |
| Test Coverage | ≥ 85% |

### Before Submitting
```bash
npm run validate:all  # Runs lint, type-check, security, and all validators
```

See [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) for complete guidelines.

---

## 📊 Performance

### AI Provider Benchmarks
| Provider | Avg Latency | Tokens/sec | Cost (1M tokens) |
|----------|-------------|------------|------------------|
| Groq     | ~0.3s       | 800-1000   | $0.27            |
| OpenAI   | ~2s         | 40-60      | $15-$30          |
| Anthropic| ~2.5s       | 30-50      | $15-$75          |
| Ollama   | ~1s*        | 40-100     | Free (local)     |

*Depends on local hardware

### Build Performance
- TypeScript compilation: ~5s (cold), ~1s (incremental)
- Bundle size: 2.1MB (production)
- Startup time: <500ms

---

## 🐛 Troubleshooting

### Common Issues

**"No AI providers configured"**
```bash
# Make sure you have at least one AI provider API key
echo "OPENAI_API_KEY=sk-..." >> .env
# or
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

**"Module not found" errors**
```bash
# Rebuild from clean state
npm run clean
npm install
npm run build
```

**Blessed UI not rendering**
```bash
# Make sure you're using a terminal that supports ANSI
# Try running with force TTY:
FORCE_COLOR=1 aios
```

**TypeScript errors during build**
```bash
# Ensure you're using Node.js 18+
node --version

# Clear TypeScript cache
rm -rf node-cli/dist shared/dist
npm run build
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with production-grade infrastructure:
- **TypeScript** for type safety
- **Blessed** for terminal UI
- **Inquirer** for interactive prompts
- **OpenAI, Anthropic, Groq, Ollama** for AI capabilities
- **Vercel, Netlify, AWS** for cloud deployments

---

## 📞 Support

- **Issues**: https://github.com/Jchinonso/Aios-v2/issues
- **Discussions**: https://github.com/Jchinonso/Aios-v2/discussions
- **Documentation**: See `/docs` folder

---

**Built with ❤️ for developers who want deployment to be as easy as having a conversation**

*Production-ready • Type-safe • Multi-provider • Enterprise-grade*
