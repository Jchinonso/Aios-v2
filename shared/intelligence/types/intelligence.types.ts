/**
 * Intelligence Types - Interface Segregation
 *
 * Following SOLID Principles:
 * - ISP: Focused interface definitions for intelligence operations
 * - SRP: Single responsibility for type declarations
 */

import type {
  IDetectedPattern
} from './file-system.types.js';
import type {
  AnalysisMetadata
} from '../file-system/types/analyzer.interface.js';
// @ts-expect-error - Reserved for future prompt management
import type { PromptTemplate } from '../utils/ai-utils.js'

export interface IntelligenceRequest {
  readonly type: 'analysis' | 'deployment' | 'optimization' | 'security' | 'troubleshooting';
  readonly context: Record<string, any>;
  readonly priority: string; // Will be typed properly when constants are available
  readonly options?: {
    readonly useAI?: boolean;
    readonly timeout?: number;
    readonly maxConcurrency?: number;
    readonly includeRecommendations?: boolean;
  };
}

export interface IntelligenceResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly patterns?: IDetectedPattern[];
  readonly recommendations?: string[];
  readonly aiInsights?: string;
  readonly metadata: AnalysisMetadata;
  readonly warnings: string[];
  readonly error?: string;
}

export interface AnalysisWorkflow {
  readonly id: string;
  readonly name: string;
  readonly steps: AnalysisStep[];
  readonly parallel?: boolean;
  readonly timeout?: number;
}

export interface AnalysisStep {
  readonly id: string;
  readonly analyzer: string;
  readonly config?: Record<string, any>;
  readonly dependencies?: string[];
  readonly optional?: boolean;
}
