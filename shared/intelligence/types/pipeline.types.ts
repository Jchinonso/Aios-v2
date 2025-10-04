/**
 * Pipeline Types - Interface Segregation
 *
 * Following SOLID Principles:
 * - ISP: Focused interface definitions for pipeline operations
 * - SRP: Single responsibility for type declarations
 */

import type {
  AnalysisResult
} from '../file-system/types/analyzer.interface.js';

export interface PipelineStep<TInput = any, TOutput = any> {
  readonly id: string;
  readonly name: string;
  readonly execute: (input: TInput, context: PipelineContext) => Promise<TOutput>;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly optional?: boolean;
  readonly condition?: (input: TInput, context: PipelineContext) => boolean;
}

export interface PipelineDefinition<TInput = any, TOutput = any> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly steps: PipelineStep<TInput, TOutput>[];
  readonly parallel?: boolean;
  readonly timeout?: number;
  readonly priority: string; // Will be typed properly when constants are available
}

export interface PipelineContext {
  readonly executionId: string;
  readonly startTime: number;
  readonly metadata: Record<string, any>;
  readonly logger: PipelineLogger;
  stepResults: Map<string, any>;
  warnings: string[];
  errors: string[];
}

export interface PipelineExecution<T = any> {
  readonly id: string;
  readonly pipelineId: string;
  readonly status: string; // Will be typed properly when constants are available
  readonly startTime: number;
  readonly endTime?: number;
  readonly result?: AnalysisResult<T>;
  readonly currentStep?: string;
  readonly progress: number;
  readonly context: PipelineContext;
}

export interface PipelineLogger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
}

export interface BatchAnalysisRequest {
  readonly items: Array<{
    readonly id: string;
    readonly data: any;
    readonly priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  readonly pipelineId: string;
  readonly concurrency?: number;
  readonly timeout?: number;
  readonly continueOnError?: boolean;
}

export interface BatchAnalysisResult<T = any> {
  readonly completed: Array<{ id: string; result: AnalysisResult<T> }>;
  readonly failed: Array<{ id: string; error: string }>;
  readonly totalProcessed: number;
  readonly duration: number;
  readonly statistics: {
    readonly successRate: number;
    readonly averageExecutionTime: number;
    readonly totalWarnings: number;
    readonly totalErrors: number;
  };
}
