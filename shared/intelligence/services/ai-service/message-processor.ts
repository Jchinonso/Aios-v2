/**
 * @fileoverview Message Processor - Message Processing Operations
 * 
 * This module provides message processing functionality for AI services.
 * It handles message formatting, conversation history management, and
 * context assembly before sending to AI providers.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../../../core/types/result.js'
import { Result } from '../../../core/types/result.js'
import type { AIMessage } from '../../../types/ai.types.js'
import type { IConversationManager, IMessageProcessor, AIServiceOptions } from '../../types/ai-service.types.js'

/**
 * Default Message Processor Implementation
 * 
 * This class provides message processing functionality including system prompt
 * handling, conversation history management, and message trimming to stay
 * within token limits.
 * 
 * @example
 * ```typescript
 * const messageProcessor = new DefaultMessageProcessor(
 *   conversationManager,
 *   50 // max history length
 * );
 * 
 * const result = await messageProcessor.processMessage('Hello!', {
 *   conversationId: 'conv_123',
 *   systemPrompt: 'You are a helpful assistant'
 * });
 * ```
 * 
 * @implements {IMessageProcessor}
 */
export class DefaultMessageProcessor implements IMessageProcessor {
  /**
   * Creates an instance of DefaultMessageProcessor
   * 
   * @param {IConversationManager} conversationManager - Manager for conversation state
   * @param {number} maxHistoryLength - Maximum conversation history length
   */
  constructor(
    private readonly conversationManager: IConversationManager,
    private readonly maxHistoryLength: number
  ) {}

  /**
   * Processes a message by assembling system prompts, conversation history, and current message
   * 
   * @param {string} content - The message content to process
   * @param {AIServiceOptions} options - Options including conversation ID and system prompt
   * @param {string} [options.conversationId] - Conversation ID for context
   * @param {string} [options.systemPrompt] - System prompt to set context
   * @param {number} [options.maxHistoryLength] - Override default history length
   * 
   * @returns {Promise<IResult<AIMessage[]>>} Result containing formatted messages or error
   * 
   * @example
   * ```typescript
   * const result = await messageProcessor.processMessage('Hello!', {
   *   conversationId: 'conv_123',
   *   systemPrompt: 'You are a helpful assistant',
   *   maxHistoryLength: 100
   * });
   * 
   * if (result.isSuccess) {
   *   console.log(`Processed ${result.value.length} messages`);
   * }
   * ```
   */
  async processMessage(content: string, options: AIServiceOptions): Promise<IResult<AIMessage[]>> {
    try {
      const messages: AIMessage[] = [];

      // Add system prompt if provided
      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt,
          timestamp: new Date()
        });
      }

      // Add conversation history if enabled
      if (options.conversationId) {
        const conversationResult = await this.conversationManager.getConversation(options.conversationId);
        if (conversationResult.isSuccess && conversationResult.value) {
          messages.push(...conversationResult.value.messages);
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content,
        timestamp: new Date()
      });

      // Trim history if needed
      const trimmedMessages = this.trimConversationHistory(
        messages,
        options.maxHistoryLength || this.maxHistoryLength
      );

      return Result.success(trimmedMessages);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Trims conversation history while preserving system messages
   * 
   * @param {AIMessage[]} messages - Array of messages to trim
   * @param {number} maxLength - Maximum number of messages to keep
   * @returns {AIMessage[]} Trimmed array of messages
   * 
   * @example
   * ```typescript
   * const trimmed = messageProcessor.trimConversationHistory(messages, 10);
   * console.log(`Trimmed from ${messages.length} to ${trimmed.length} messages`);
   * ```
   */
  trimConversationHistory(messages: AIMessage[], maxLength: number): AIMessage[] {
    if (messages.length <= maxLength) {
      return messages;
    }

    // Keep system messages and trim user/assistant messages
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const conversationMessages = messages
      .filter(msg => msg.role !== 'system')
      .slice(-maxLength);

    return [...systemMessages, ...conversationMessages];
  }
}