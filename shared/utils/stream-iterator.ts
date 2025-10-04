/**
 * @fileoverview Stream Iterator Utility
 * @description Reusable AsyncIterableIterator implementation for AI streaming responses.
 * Eliminates ~180 LOC duplication across 8 AI provider implementations.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

/**
 * Extract content function type
 * Takes a chunk from the stream and extracts the text content
 */
export type ContentExtractor<TChunk> = (chunk: TChunk) => string | null | undefined;

/**
 * Create an AsyncIterableIterator from an async iterable stream
 *
 * This utility wraps provider-specific streaming responses into a standard
 * AsyncIterableIterator interface, eliminating the need for duplicate
 * iterator implementations across AI providers.
 *
 * @param stream - The async iterable stream from the provider
 * @param extractContent - Function to extract text content from each chunk
 * @returns AsyncIterableIterator that yields text content
 *
 * @example
 * ```typescript
 * // OpenAI usage
 * const stream = await client.chat.completions.create({ stream: true, ... });
 * return createStreamIterator(stream, (chunk) => chunk.choices[0]?.delta?.content);
 *
 * // Anthropic usage
 * const stream = await client.messages.create({ stream: true, ... });
 * return createStreamIterator(stream, (chunk) => {
 *   if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
 *     return chunk.delta.text;
 *   }
 *   return null;
 * });
 * ```
 */
export function createStreamIterator<TChunk>(
  stream: AsyncIterable<TChunk>,
  extractContent: ContentExtractor<TChunk>
): AsyncIterableIterator<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of stream) {
        const content = extractContent(chunk);
        if (content) {
          yield content;
        }
      }
    },
    async next() {
      return { done: true, value: undefined };
    },
    async return() {
      return { done: true, value: undefined };
    },
    async throw(error: any) {
      throw error;
    }
  };
}

/**
 * Create an AsyncIterableIterator with transformation
 *
 * Similar to createStreamIterator but allows transformation of content
 * before yielding (e.g., decoding, formatting, filtering).
 *
 * @param stream - The async iterable stream from the provider
 * @param extractContent - Function to extract text content from each chunk
 * @param transform - Optional transformation function applied to extracted content
 * @returns AsyncIterableIterator that yields transformed content
 *
 * @example
 * ```typescript
 * const stream = await client.generate({ stream: true, ... });
 * return createStreamIteratorWithTransform(
 *   stream,
 *   (chunk) => chunk.text,
 *   (text) => text.trim() // Transform: trim whitespace
 * );
 * ```
 */
export function createStreamIteratorWithTransform<TChunk>(
  stream: AsyncIterable<TChunk>,
  extractContent: ContentExtractor<TChunk>,
  transform: (content: string) => string
): AsyncIterableIterator<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of stream) {
        const content = extractContent(chunk);
        if (content) {
          yield transform(content);
        }
      }
    },
    async next() {
      return { done: true, value: undefined };
    },
    async return() {
      return { done: true, value: undefined };
    },
    async throw(error: any) {
      throw error;
    }
  };
}

/**
 * Create an AsyncIterableIterator with error handling
 *
 * Wraps stream iteration with error handling, allowing graceful
 * recovery or transformation of errors from the provider.
 *
 * @param stream - The async iterable stream from the provider
 * @param extractContent - Function to extract text content from each chunk
 * @param onError - Error handler function
 * @returns AsyncIterableIterator with error handling
 *
 * @example
 * ```typescript
 * const stream = await client.chat({ stream: true, ... });
 * return createStreamIteratorWithErrorHandling(
 *   stream,
 *   (chunk) => chunk.content,
 *   (error) => {
 *     logger.error('Stream error:', error);
 *     throw new Error(`Streaming failed: ${error.message}`);
 *   }
 * );
 * ```
 */
export function createStreamIteratorWithErrorHandling<TChunk>(
  stream: AsyncIterable<TChunk>,
  extractContent: ContentExtractor<TChunk>,
  onError: (error: Error) => void | never
): AsyncIterableIterator<string> {
  return {
    async *[Symbol.asyncIterator]() {
      try {
        for await (const chunk of stream) {
          const content = extractContent(chunk);
          if (content) {
            yield content;
          }
        }
      } catch (error) {
        onError(error as Error);
      }
    },
    async next() {
      return { done: true, value: undefined };
    },
    async return() {
      return { done: true, value: undefined };
    },
    async throw(error: any) {
      throw error;
    }
  };
}

/**
 * Create an AsyncIterableIterator with buffering
 *
 * Buffers chunks until a delimiter is found or buffer size is reached,
 * useful for providers that send partial tokens or words.
 *
 * @param stream - The async iterable stream from the provider
 * @param extractContent - Function to extract text content from each chunk
 * @param options - Buffering options
 * @returns AsyncIterableIterator with buffering
 *
 * @example
 * ```typescript
 * const stream = await client.complete({ stream: true, ... });
 * return createBufferedStreamIterator(
 *   stream,
 *   (chunk) => chunk.text,
 *   { delimiter: ' ', maxBufferSize: 100 }
 * );
 * ```
 */
export function createBufferedStreamIterator<TChunk>(
  stream: AsyncIterable<TChunk>,
  extractContent: ContentExtractor<TChunk>,
  options: {
    delimiter?: string;
    maxBufferSize?: number;
  } = {}
): AsyncIterableIterator<string> {
  const { delimiter = '\n', maxBufferSize = 1000 } = options;

  return {
    async *[Symbol.asyncIterator]() {
      let buffer = '';

      for await (const chunk of stream) {
        const content = extractContent(chunk);
        if (!content) continue;

        buffer += content;

        // Yield complete segments when delimiter found
        if (delimiter) {
          const parts = buffer.split(delimiter);
          // Keep last part in buffer (might be incomplete)
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (part) {
              yield part + delimiter;
            }
          }
        }

        // Yield buffer if it exceeds max size
        if (buffer.length >= maxBufferSize) {
          yield buffer;
          buffer = '';
        }
      }

      // Yield remaining buffer
      if (buffer) {
        yield buffer;
      }
    },
    async next() {
      return { done: true, value: undefined };
    },
    async return() {
      return { done: true, value: undefined };
    },
    async throw(error: any) {
      throw error;
    }
  };
}

/**
 * Collect all chunks from a stream into a single string
 *
 * Utility function to consume an entire async iterable stream
 * and concatenate all chunks into a single string.
 *
 * @param iterator - AsyncIterableIterator to consume
 * @returns Promise that resolves to concatenated content
 *
 * @example
 * ```typescript
 * const stream = createStreamIterator(providerStream, extractContent);
 * const fullResponse = await collectStream(stream);
 * console.log(fullResponse);
 * ```
 */
export async function collectStream(iterator: AsyncIterableIterator<string>): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of iterator) {
    chunks.push(chunk);
  }

  return chunks.join('');
}

/**
 * Apply a callback to each chunk in a stream
 *
 * Allows side effects (e.g., logging, metrics) while streaming
 * without interrupting the stream flow.
 *
 * @param iterator - AsyncIterableIterator to process
 * @param callback - Function called for each chunk
 * @returns AsyncIterableIterator that passes through all chunks
 *
 * @example
 * ```typescript
 * const stream = createStreamIterator(providerStream, extractContent);
 * const trackedStream = tapStream(stream, (chunk) => {
 *   metrics.recordChunk(chunk.length);
 *   logger.debug('Chunk:', chunk);
 * });
 * ```
 */
export async function* tapStream(
  iterator: AsyncIterableIterator<string>,
  callback: (chunk: string) => void | Promise<void>
): AsyncIterableIterator<string> {
  for await (const chunk of iterator) {
    await callback(chunk);
    yield chunk;
  }
}

/**
 * Limit the number of chunks yielded from a stream
 *
 * Useful for testing or implementing partial response limits.
 *
 * @param iterator - AsyncIterableIterator to limit
 * @param maxChunks - Maximum number of chunks to yield
 * @returns AsyncIterableIterator limited to maxChunks
 *
 * @example
 * ```typescript
 * const stream = createStreamIterator(providerStream, extractContent);
 * const limitedStream = limitStream(stream, 10); // Only first 10 chunks
 * ```
 */
export async function* limitStream(
  iterator: AsyncIterableIterator<string>,
  maxChunks: number
): AsyncIterableIterator<string> {
  let count = 0;

  for await (const chunk of iterator) {
    if (count >= maxChunks) break;
    yield chunk;
    count++;
  }
}
