/**
 * AI Types - AI-related interfaces and types
 */

export interface AIMessage {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp?: Date;
}

export interface AIResponse {
  readonly content: string;
  readonly model?: string;
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  } | undefined;
  readonly finishReason?: string | undefined;
  readonly metadata?: Record<string, any>;
}

export interface AIConversation {
  readonly id: string;
  readonly messages: AIMessage[];
  readonly context?: Record<string, any>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AIProviderConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly baseUrl?: string;
  readonly timeout: number;
  readonly retries: number;
  readonly fallbackProvider?: string;
  readonly healthCheckInterval?: number;
  readonly circuitBreakerThreshold?: number;
  readonly rateLimitPerMinute?: number;
  readonly costPerToken?: number;
  readonly region?: string;
  readonly version?: string;
}

export interface AIProviderHealth {
  readonly isHealthy: boolean;
  readonly lastCheck: Date;
  readonly responseTime?: number;
  readonly errorRate?: number;
  readonly availability?: number;
  readonly metadata?: Record<string, any>;
}

export interface AIProviderCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly supportsVision: boolean;
  readonly supportsAudio: boolean;
  readonly maxContextLength: number;
  readonly supportedModels: string[];
  readonly supportedRegions: string[];
}

export interface AIProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  totalCost: number;
  lastRequestTime?: Date;
}

export interface AIProvider {
  readonly name: string;
  readonly capabilities: AIProviderCapabilities;
  
  sendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse>;
  streamMessage?(messages: AIMessage[], config: AIProviderConfig): AsyncIterableIterator<string>;
  checkHealth?(config: AIProviderConfig): Promise<AIProviderHealth>;
  getMetrics?(): AIProviderMetrics;
  validateConfig?(config: AIProviderConfig): { isValid: boolean; errors: string[] };
  estimateCost?(messages: AIMessage[], config: AIProviderConfig): number;
}

export interface AIProviderFactory {
  createProvider(name: string, config: AIProviderConfig): AIProvider;
  getAvailableProviders(): string[];
  getProviderCapabilities(name: string): AIProviderCapabilities | null;
  registerProvider(name: string, provider: AIProvider): void;
}

export interface AICacheConfig {
  readonly enabled: boolean;
  readonly ttl: number; // Time to live in seconds
  readonly maxSize: number; // Maximum cache size
  readonly keyGenerator?: (messages: AIMessage[], config: AIProviderConfig) => string;
}

export interface AIRateLimitConfig {
  readonly enabled: boolean;
  readonly requestsPerMinute: number;
  readonly requestsPerHour: number;
  readonly requestsPerDay: number;
  readonly burstLimit: number;
}

export interface AISecurityConfig {
  readonly inputSanitization: boolean;
  readonly outputFiltering: boolean;
  readonly auditLogging: boolean;
  readonly allowedDomains?: string[];
  readonly blockedPatterns?: string[];
  readonly maxInputLength: number;
  readonly maxOutputLength: number;
}

export interface AIAdvancedConfig {
  readonly cache?: AICacheConfig;
  readonly rateLimit?: AIRateLimitConfig;
  readonly security?: AISecurityConfig;
  readonly monitoring?: {
    readonly enabled: boolean;
    readonly metricsInterval: number;
    readonly alertThresholds: Record<string, number>;
  };
  readonly fallback?: {
    readonly enabled: boolean;
    readonly providers: string[];
    readonly strategy: 'sequential' | 'parallel' | 'weighted';
  };
}
