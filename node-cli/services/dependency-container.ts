/**
 * Dependency Container - Production-Grade Multi-Provider AI Integration
 *
 * @fileoverview Central dependency injection container with enterprise-grade AI service
 * @module node-cli/services
 *
 * **Key Features:**
 * - **9 AI Providers**: OpenAI, Anthropic, Groq, Ollama, Google AI, Google Cloud (Vertex AI), Cohere, HuggingFace, Replicate
 * - **Automatic Detection**: Scans environment variables and registers available providers
 * - **Production-Ready**: Retry logic, error handling, circuit breakers, metrics
 * - **Type-Safe**: Full TypeScript strict mode with comprehensive interfaces
 * - **Zero Config**: Works with any provider that has API key set
 *
 * **Supported Environment Variables:**
 * - `OPENAI_API_KEY` - Enable OpenAI (GPT-3.5, GPT-4, GPT-4 Turbo)
 * - `ANTHROPIC_API_KEY` - Enable Anthropic (Claude 3 Opus, Sonnet, Haiku)
 * - `GROQ_API_KEY` - Enable Groq (Llama, Mixtral with ultra-fast inference)
 * - `GOOGLE_API_KEY` - Enable Google AI (Gemini Pro, Gemini Ultra)
 * - `GOOGLE_CLOUD_PROJECT` + `GOOGLE_APPLICATION_CREDENTIALS` - Enable Google Cloud Vertex AI
 * - `COHERE_API_KEY` - Enable Cohere (Command, Command Light)
 * - `HUGGINGFACE_API_KEY` - Enable HuggingFace Inference API
 * - `REPLICATE_API_TOKEN` - Enable Replicate (Llama, SDXL, etc.)
 * - `OLLAMA_HOST` - Enable Ollama (local models, default: http://localhost:11434)
 * - `AI_PROVIDER` - Override default provider selection (e.g., 'anthropic', 'groq')
 *
 * @version 2.0.0
 * @since 1.0.0
 */

import type { ILogger, IMetricsCollector } from '@aios/shared';
import {
  EnhancedIntelligenceOrchestrator,
  CloudManager,
  createCloudManager
} from '@aios/shared';
import { ConsoleLogger } from './console-logger.js';
import { ConsoleMetrics } from './console-metrics.js';

/**
 * Detects available AI providers based on environment variables
 *
 * **Provider Detection Logic:**
 * - OpenAI: Requires `OPENAI_API_KEY`
 * - Anthropic: Requires `ANTHROPIC_API_KEY`
 * - Groq: Requires `GROQ_API_KEY`
 * - Google AI: Requires `GOOGLE_API_KEY`
 * - Google Cloud (Vertex AI): Requires `GOOGLE_CLOUD_PROJECT` + `GOOGLE_APPLICATION_CREDENTIALS`
 * - Cohere: Requires `COHERE_API_KEY`
 * - HuggingFace: Requires `HUGGINGFACE_API_KEY`
 * - Replicate: Requires `REPLICATE_API_TOKEN`
 * - Ollama: Always available (local installation, no API key)
 *
 * @returns Array of available provider names
 *
 * @example
 * ```typescript
 * // With OPENAI_API_KEY and ANTHROPIC_API_KEY set
 * const providers = detectAvailableProviders();
 * // Returns: ['openai', 'anthropic', 'ollama']
 * ```
 */
function detectAvailableProviders(): readonly string[] {
  const providers: string[] = [];

  // Check for API keys in environment
  if (process.env['OPENAI_API_KEY']) {
    providers.push('openai');
  }

  if (process.env['ANTHROPIC_API_KEY']) {
    providers.push('anthropic');
  }

  if (process.env['GROQ_API_KEY']) {
    providers.push('groq');
  }

  if (process.env['GOOGLE_API_KEY']) {
    providers.push('google');
  }

  // Google Cloud requires both project ID and credentials file
  if (process.env['GOOGLE_CLOUD_PROJECT'] && process.env['GOOGLE_APPLICATION_CREDENTIALS']) {
    providers.push('google-cloud');
  }

  if (process.env['COHERE_API_KEY']) {
    providers.push('cohere');
  }

  if (process.env['HUGGINGFACE_API_KEY']) {
    providers.push('huggingface');
  }

  if (process.env['REPLICATE_API_TOKEN']) {
    providers.push('replicate');
  }

  // Ollama is always available (local installation, no API key needed)
  // User just needs to have Ollama running on their machine
  providers.push('ollama');

  return Object.freeze(providers);
}

/**
 * Application configuration
 */
export interface ApplicationConfig {
  readonly debug?: boolean | undefined;
  readonly enableMetrics?: boolean | undefined;
}

/**
 * Container holding initialized services
 */
export interface ServiceContainer {
  readonly logger: ILogger;
  readonly metrics: IMetricsCollector;
  readonly intelligence: EnhancedIntelligenceOrchestrator | null;
  readonly cloudManager: CloudManager;
}

/**
 * Simplified Dependency Container
 *
 * Creates working services without complex AI setup
 */
export class DependencyContainer {
  private readonly services: ServiceContainer;
  private disposed = false;

  private constructor(services: ServiceContainer) {
    this.services = services;
  }

  get logger(): ILogger {
    this.ensureNotDisposed();
    return this.services.logger;
  }

  get metrics(): IMetricsCollector {
    this.ensureNotDisposed();
    return this.services.metrics;
  }

  get intelligence(): EnhancedIntelligenceOrchestrator | null {
    this.ensureNotDisposed();
    return this.services.intelligence;
  }

  get cloudManager(): CloudManager {
    this.ensureNotDisposed();
    return this.services.cloudManager;
  }

  /**
   * Initialize the dependency container
   */
  static async initialize(config: ApplicationConfig): Promise<DependencyContainer> {
    // 1. Initialize Logger
    const logger = new ConsoleLogger({
      enableDebug: config.debug ?? false,
      enableTrace: false,
      namespace: 'aios'
    });

    // 2. Initialize Metrics
    const metrics = new ConsoleMetrics({
      maxEntries: 10000,
      enableConsoleOutput: config.enableMetrics ?? false
    });

    metrics.increment('aios.startup');

    // 3. Initialize AI-Powered Intelligence (PRODUCTION-GRADE, MULTI-PROVIDER)
    // Uses AIServiceFactory.createMinimal() from shared for enterprise-grade intent parsing
    // This enables the LLM to understand natural language variations with:
    // - Production-tested retry logic and error handling
    // - Multi-provider support (OpenAI, Anthropic, Groq, Ollama, Google, Cohere)
    // - Type-safe configuration system
    // - Comprehensive logging and metrics
    //
    // Natural language understanding examples:
    // - "deploy", "deploy this app", "push to prod", "ship it" → all mapped to 'deploy' intent
    // - "why slow", "performance issues", "show me errors" → mapped to 'logs' with level=error
    // - Entity extraction works dynamically via AI, not hardcoded regex
    let intelligence: EnhancedIntelligenceOrchestrator | null = null;

    try {
      // Detect available AI providers based on environment variables
      const availableProviders = detectAvailableProviders();

      if (availableProviders.length > 0) {
        // Import production-grade AI service components from shared
        const {
          AIServiceFactory,
          InMemoryConversationManager,
          DefaultMessageProcessor,
          OpenAIProvider,
          AnthropicProvider,
          GroqProvider,
          OllamaProvider,
          GoogleProvider,
          GoogleCloudProvider,
          CohereProvider,
          HuggingFaceProvider,
          ReplicateProvider
        } = await import('@aios/shared/intelligence');

        const { SimpleProviderRegistry } = await import('./simple-provider-registry.js');

        // Initialize provider registry
        const providerRegistry = new SimpleProviderRegistry(logger);

        // Register all available providers
        // Note: Providers don't take constructor arguments - they get config via sendMessage()
        let defaultProvider: string | null = null;

        if (availableProviders.includes('openai')) {
          const openaiProvider = new OpenAIProvider();
          providerRegistry.register('openai', openaiProvider);
          defaultProvider = defaultProvider || 'openai';
          logger.debug('Registered OpenAI provider');
        }

        if (availableProviders.includes('anthropic')) {
          const anthropicProvider = new AnthropicProvider();
          providerRegistry.register('anthropic', anthropicProvider);
          defaultProvider = defaultProvider || 'anthropic';
          logger.debug('Registered Anthropic provider');
        }

        if (availableProviders.includes('groq')) {
          const groqProvider = new GroqProvider();
          providerRegistry.register('groq', groqProvider);
          defaultProvider = defaultProvider || 'groq';
          logger.debug('Registered Groq provider');
        }

        if (availableProviders.includes('ollama')) {
          const ollamaProvider = new OllamaProvider();
          providerRegistry.register('ollama', ollamaProvider);
          defaultProvider = defaultProvider || 'ollama';
          logger.debug('Registered Ollama provider');
        }

        if (availableProviders.includes('google')) {
          const googleProvider = new GoogleProvider();
          providerRegistry.register('google', googleProvider);
          defaultProvider = defaultProvider || 'google';
          logger.debug('Registered Google provider');
        }

        if (availableProviders.includes('cohere')) {
          const cohereProvider = new CohereProvider();
          providerRegistry.register('cohere', cohereProvider);
          defaultProvider = defaultProvider || 'cohere';
          logger.debug('Registered Cohere provider');
        }

        if (availableProviders.includes('google-cloud')) {
          const googleCloudProvider = new GoogleCloudProvider();
          providerRegistry.register('google-cloud', googleCloudProvider);
          defaultProvider = defaultProvider || 'google-cloud';
          logger.debug('Registered Google Cloud (Vertex AI) provider');
        }

        if (availableProviders.includes('huggingface')) {
          const huggingfaceProvider = new HuggingFaceProvider();
          providerRegistry.register('huggingface', huggingfaceProvider);
          defaultProvider = defaultProvider || 'huggingface';
          logger.debug('Registered HuggingFace provider');
        }

        if (availableProviders.includes('replicate')) {
          const replicateProvider = new ReplicateProvider();
          providerRegistry.register('replicate', replicateProvider);
          defaultProvider = defaultProvider || 'replicate';
          logger.debug('Registered Replicate provider');
        }

        // Use user-specified provider or first available
        const selectedProvider = process.env['AI_PROVIDER'] || defaultProvider;

        if (!selectedProvider) {
          throw new Error('No valid AI provider could be initialized');
        }

        // Initialize conversation and message management
        const conversationManager = new InMemoryConversationManager();
        const messageProcessor = new DefaultMessageProcessor(conversationManager, 50);

        // Create minimal AI service (lightweight but production-ready)
        const baseAIService = AIServiceFactory.createMinimal(
          logger,
          metrics,
          providerRegistry,
          conversationManager,
          messageProcessor,
          selectedProvider
        );

        // Wrap with fallback service for automatic provider switching
        const { FallbackAIService } = await import('./fallback-ai-service.js');
        const aiService = new FallbackAIService(
          baseAIService,
          availableProviders,
          logger,
          metrics
        );

        // Create intelligence orchestrator with production-grade AI service
        intelligence = new EnhancedIntelligenceOrchestrator(aiService, logger, metrics);

        logger.info('AI-powered intent parsing enabled (production-grade, multi-provider with auto-fallback)', {
          primaryProvider: selectedProvider,
          fallbackChain: availableProviders.join(' → '),
          totalProviders: availableProviders.length,
          features: 'retry logic, error handling, metrics, multi-provider, auto-fallback'
        });
        metrics.increment('aios.ai.enabled', {
          provider: selectedProvider,
          totalProviders: availableProviders.length.toString()
        });
      } else {
        logger.warn('No AI providers configured - AI parsing disabled, using regex fallback');
        logger.warn('Set one of these environment variables to enable AI:');
        logger.warn('  OPENAI_API_KEY              - https://platform.openai.com/api-keys');
        logger.warn('  ANTHROPIC_API_KEY           - https://console.anthropic.com/');
        logger.warn('  GROQ_API_KEY                - https://console.groq.com/');
        logger.warn('  GOOGLE_API_KEY              - https://makersuite.google.com/app/apikey');
        logger.warn('  GOOGLE_CLOUD_PROJECT        - https://cloud.google.com/vertex-ai (+ GOOGLE_APPLICATION_CREDENTIALS)');
        logger.warn('  COHERE_API_KEY              - https://dashboard.cohere.com/api-keys');
        logger.warn('  HUGGINGFACE_API_KEY         - https://huggingface.co/settings/tokens');
        logger.warn('  REPLICATE_API_TOKEN         - https://replicate.com/account/api-tokens');
        logger.warn('  Or install Ollama           - https://ollama.com/ (no API key needed)');
        metrics.increment('aios.ai.disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize AI service, falling back to regex parser', error as Error, {
        availableProviders: detectAvailableProviders(),
        errorType: (error as Error).name,
        errorMessage: (error as Error).message
      });
      metrics.increment('aios.ai.init_failed');
    }

    // 4. Initialize Cloud Manager
    const cloudManager = createCloudManager();

    metrics.increment('aios.startup.success');

    return new DependencyContainer({
      logger,
      metrics,
      intelligence,
      cloudManager
    });
  }

  /**
   * Load configuration from environment
   */
  static async loadConfig(): Promise<ApplicationConfig> {
    return {
      debug: process.env['DEBUG'] === 'true' || process.env['NODE_ENV'] === 'development',
      enableMetrics: process.env['ENABLE_METRICS'] === 'true'
    };
  }

  /**
   * Dispose of all services
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.logger.info('Shutting down AIOS services...');

    try {
      if (this.services.metrics instanceof ConsoleMetrics) {
        this.services.metrics.printSummary();
      }

      this.logger.info('AIOS services shut down successfully');
      this.disposed = true;
    } catch (error) {
      this.logger.error('Error during service disposal', error as Error);
      throw error;
    }
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error('DependencyContainer has been disposed');
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  getAllServices(): Readonly<ServiceContainer> {
    this.ensureNotDisposed();
    return this.services;
  }
}

/**
 * Global container instance
 */
let globalContainer: DependencyContainer | null = null;

/**
 * Get or create the global container
 */
export async function getContainer(): Promise<DependencyContainer> {
  if (!globalContainer || globalContainer.isDisposed()) {
    const config = await DependencyContainer.loadConfig();
    globalContainer = await DependencyContainer.initialize(config);
  }
  return globalContainer;
}

/**
 * Dispose global container
 */
export async function disposeContainer(): Promise<void> {
  if (globalContainer) {
    await globalContainer.dispose();
    globalContainer = null;
  }
}