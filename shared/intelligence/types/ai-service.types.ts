/**
 * AI Service Types - Interface Segregation
 *
 * Following SOLID Principles:
 * - ISP: Focused interface definitions for AI operations
 * - SRP: Single responsibility for type declarations
 */

import type { IResult } from '../../core/types/result.js'
import type {
  AIMessage,
  AIResponse,
  AIConversation,
  AIProviderConfig
} from '../../types/ai.types.js';

// ISP: Segregated interface for AI operations
export interface IAIService {
  sendMessage(content: string, options?: AIServiceOptions): Promise<IResult<AIResponse>>;
  streamMessage(content: string, options?: AIServiceOptions): Promise<IResult<AsyncIterableIterator<string>>>;
  createConversation(context?: Record<string, any>): Promise<IResult<string>>;
  getConversation(conversationId: string): Promise<IResult<AIConversation | null>>;
  clearConversation(conversationId: string): Promise<IResult<void>>;
  listConversations(): Promise<IResult<AIConversation[]>>;
}

// ISP: Segregated interface for conversation management
export interface IConversationManager {
  createConversation(context?: Record<string, any>): Promise<IResult<string>>;
  getConversation(id: string): Promise<IResult<AIConversation | null>>;
  updateConversation(id: string, messages: AIMessage[]): Promise<IResult<void>>;
  clearConversation(id: string): Promise<IResult<void>>;
  listConversations(): Promise<IResult<AIConversation[]>>;
}

// ISP: Segregated interface for message processing
export interface IMessageProcessor {
  processMessage(content: string, options: AIServiceOptions): Promise<IResult<AIMessage[]>>;
  trimConversationHistory(messages: AIMessage[], maxLength: number): AIMessage[];
}

export interface AIServiceOptions {
  readonly provider?: string;
  readonly conversationId?: string;
  readonly systemPrompt?: string;
  readonly maxHistoryLength?: number;
  readonly config?: Partial<AIProviderConfig>;
}

// Re-export AI types
export type { AIResponse } from '../../types/ai.types.js'
