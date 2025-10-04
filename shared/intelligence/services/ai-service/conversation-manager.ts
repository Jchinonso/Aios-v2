
/**
 * @fileoverview Conversation Manager - State Management for AI Conversations
 * 
 * This module provides conversation state management functionality for AI services.
 * It handles creating, storing, retrieving, and managing conversation history
 * using an in-memory implementation that can be extended to use databases.
 * 
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../../../core/types/result.js'
import { Result } from '../../../core/types/result.js'
import type { AIMessage, AIConversation } from '../../../types/ai.types.js'
import type { IConversationManager } from '../../types/ai-service.types.js'

/**
 * In-Memory Conversation Manager Implementation
 * 
 * This class provides conversation state management using an in-memory Map.
 * It implements immutable conversation updates and provides a foundation
 * that can be extended to use persistent storage like databases. Includes
 * resource cleanup, memory management, and TTL-based expiration.
 * 
 * @example
 * ```typescript
 * const conversationManager = new InMemoryConversationManager();
 * 
 * // Create a new conversation
 * const result = await conversationManager.createConversation({
 *   topic: 'programming',
 *   user: 'developer123'
 * });
 * 
 * if (result.isSuccess) {
 *   const conversationId = result.value;
 *   // Use conversationId for subsequent operations
 * }
 * ```
 * 
 * @implements {IConversationManager}
 */
export class InMemoryConversationManager implements IConversationManager {
  // Configuration constants
  private static readonly MAX_CONVERSATIONS = 1000;
  private static readonly CONVERSATION_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_MESSAGES_PER_CONVERSATION = 100;
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  /** @private */
  private readonly conversations = new Map<string, AIConversation>();
  
  /** @private */
  private readonly cleanupTimer: NodeJS.Timeout;

  /**
   * Creates an instance of InMemoryConversationManager
   * 
   * Initializes the conversation manager and starts the cleanup timer
   * for automatic resource management.
   */
  constructor() {
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredConversations().catch(error => {
        console.error('Failed to cleanup expired conversations:', error);
      });
    }, InMemoryConversationManager.CLEANUP_INTERVAL);
  }

  /**
   * Creates a new conversation with optional context
   * 
   * @param {Record<string, any>} [context] - Optional context data for the conversation
   * @returns {Promise<IResult<string>>} Result containing the conversation ID or error
   * 
   * @example
   * ```typescript
   * const result = await conversationManager.createConversation({
   *   topic: 'programming',
   *   user: 'developer123'
   * });
   * 
   * if (result.isSuccess) {
   *   console.log('Created conversation:', result.value);
   * }
   * ```
   */
  async createConversation(context?: Record<string, any>): Promise<IResult<string>> {
    try {
      // Clean up expired conversations before creating new ones
      await this.cleanupExpiredConversations();

      // Check conversation limit
      if (this.conversations.size >= InMemoryConversationManager.MAX_CONVERSATIONS) {
        await this.evictOldestConversations();
      }

      const id = this.generateConversationId();
      const conversation: AIConversation = {
        id,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(context && { context })
      };

      this.conversations.set(id, conversation);
      return Result.success(id);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Retrieves a conversation by its ID
   * 
   * @param {string} id - The unique identifier of the conversation
   * @returns {Promise<IResult<AIConversation | null>>} Result containing the conversation or null if not found
   * 
   * @example
   * ```typescript
   * const result = await conversationManager.getConversation('conv_123');
   * 
   * if (result.isSuccess && result.value) {
   *   console.log(`Conversation has ${result.value.messages.length} messages`);
   * }
   * ```
   */
  async getConversation(id: string): Promise<IResult<AIConversation | null>> {
    try {
      const conversation = this.conversations.get(id) || null;
      return Result.success(conversation);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Updates a conversation by adding new messages
   * 
   * @param {string} id - The unique identifier of the conversation
   * @param {AIMessage[]} newMessages - Array of new messages to add to the conversation
   * @returns {Promise<IResult<void>>} Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const newMessages = [
   *   { role: 'user', content: 'Hello', timestamp: new Date() },
   *   { role: 'assistant', content: 'Hi there!', timestamp: new Date() }
   * ];
   * 
   * const result = await conversationManager.updateConversation('conv_123', newMessages);
   * 
   * if (result.isSuccess) {
   *   console.log('Conversation updated successfully');
   * }
   * ```
   */
  async updateConversation(id: string, newMessages: AIMessage[]): Promise<IResult<void>> {
    try {
      const conversation = this.conversations.get(id);
      if (conversation) {
        // Combine messages and enforce limit
        const combinedMessages = [...conversation.messages, ...newMessages];
        const truncatedMessages = this.truncateMessages(combinedMessages);

        const updatedConversation: AIConversation = {
          ...conversation,
          messages: truncatedMessages,
          updatedAt: new Date()
        };
        this.conversations.set(id, updatedConversation);
      }
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Clears/deletes a conversation by its ID
   * 
   * @param {string} id - The unique identifier of the conversation to clear
   * @returns {Promise<IResult<void>>} Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await conversationManager.clearConversation('conv_123');
   * 
   * if (result.isSuccess) {
   *   console.log('Conversation cleared successfully');
   * }
   * ```
   */
  async clearConversation(id: string): Promise<IResult<void>> {
    try {
      this.conversations.delete(id);
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Lists all active conversations
   * 
   * @returns {Promise<IResult<AIConversation[]>>} Result containing array of all conversations
   * 
   * @example
   * ```typescript
   * const result = await conversationManager.listConversations();
   * 
   * if (result.isSuccess) {
   *   console.log(`Found ${result.value.length} active conversations`);
   * }
   * ```
   */
  async listConversations(): Promise<IResult<AIConversation[]>> {
    try {
      const conversations = Array.from(this.conversations.values());
      return Result.success(conversations);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Generates a unique conversation ID
   * 
   * @private
   * @returns {string} A unique conversation identifier
   */
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleans up expired conversations based on TTL
   * 
   * @private
   * @returns {Promise<void>} Promise that resolves when cleanup is complete
   */
  private async cleanupExpiredConversations(): Promise<void> {
    const now = Date.now();
    const expiredIds: string[] = [];

    this.conversations.forEach((conversation, id) => {
      if (now - conversation.createdAt.getTime() > InMemoryConversationManager.CONVERSATION_TTL) {
        expiredIds.push(id);
      }
    });

    // Remove expired conversations
    for (const id of expiredIds) {
      this.conversations.delete(id);
    }

    if (expiredIds.length > 0) {
      console.log(`Cleaned up ${expiredIds.length} expired conversations`);
    }
  }

  /**
   * Evicts oldest conversations when limit is reached
   * 
   * @private
   * @returns {Promise<void>} Promise that resolves when eviction is complete
   */
  private async evictOldestConversations(): Promise<void> {
    const conversations = Array.from(this.conversations.entries());
    conversations.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

    // Remove oldest 10% of conversations
    const toRemove = Math.ceil(conversations.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const conversationEntry = conversations[i];
      if (conversationEntry) {
        this.conversations.delete(conversationEntry[0]);
      }
    }

    console.log(`Evicted ${toRemove} oldest conversations`);
  }

  /**
   * Truncates messages to enforce per-conversation limits
   * 
   * @private
   * @param {AIMessage[]} messages - Messages to potentially truncate
   * @returns {AIMessage[]} Truncated messages array
   */
  private truncateMessages(messages: AIMessage[]): AIMessage[] {
    if (messages.length <= InMemoryConversationManager.MAX_MESSAGES_PER_CONVERSATION) {
      return messages;
    }

    // Keep the most recent messages
    const excess = messages.length - InMemoryConversationManager.MAX_MESSAGES_PER_CONVERSATION;
    return messages.slice(excess);
  }

  /**
   * Destroys the conversation manager and cleans up resources
   * 
   * @returns {Promise<void>} Promise that resolves when cleanup is complete
   */
  async destroy(): Promise<void> {
    clearInterval(this.cleanupTimer);
    this.conversations.clear();
  }
}