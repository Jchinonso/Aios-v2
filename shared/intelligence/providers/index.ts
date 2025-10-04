/**
 * @fileoverview AI Providers - Eliminated Code Duplication
 * 
 * This module exports AI providers with eliminated code duplication.
 * Common functionality is now in the base provider class.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

// Base provider class
export { AIProvider } from './base-provider.js';

// Concrete provider implementations (now with eliminated duplication)
export { OpenAIProvider } from './openai-provider.js';
export { AnthropicProvider } from './anthropic-provider.js';
export { OllamaProvider } from './ollama-provider.js';
export { GoogleProvider } from './google-provider.js';
export { GoogleCloudProvider } from './google-cloud-provider.js';
export { GroqProvider } from './groq-provider.js';
export { CohereProvider } from './cohere-provider.js';
export { HuggingFaceProvider } from './huggingface-provider.js';
export { ReplicateProvider } from './replicate-provider.js';