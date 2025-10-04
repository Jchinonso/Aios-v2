/**
 * Enhanced Intelligence Types - Interface Segregation
 *
 * Following SOLID Principles:
 * - ISP: Focused interface definitions for enhanced intelligence operations
 * - SRP: Single responsibility for type declarations
 */

import type {
  IDetectedPattern
} from './file-system.types.js';
import type {
  AnalysisMetadata
} from '../file-system/types/analyzer.interface.js';

export interface EnhancedIntelligenceRequest {
  readonly type: 'analysis' | 'deployment' | 'optimization' | 'security' | 'troubleshooting';
  readonly projectPath: string;
  readonly context: Record<string, any>;
  readonly priority: string; // Will be typed properly when constants are available
  readonly options?: {
    readonly useAI?: boolean;
    readonly aiProvider?: 'openai' | 'anthropic' | 'ollama' | 'groq';
    readonly timeout?: number;
    readonly includeRecommendations?: boolean;
    readonly generatePrompts?: boolean;
    readonly analysisDepth?: 'basic' | 'comprehensive' | 'enterprise';
  };
}

export interface EnhancedIntelligenceResponse<T = any> {
  readonly success: boolean;
  readonly projectInfo?: {
    readonly languages: any; // Will be typed properly when language detection types are available
    readonly languageSpecific: Record<string, any>;
    readonly crossLanguagePatterns: string[];
  };
  readonly analysis?: T;
  readonly patterns?: IDetectedPattern[];
  readonly recommendations?: string[];
  readonly aiInsights?: {
    readonly content: string;
    readonly confidence: number;
    readonly model: string;
    readonly tokens?: { prompt: number; completion: number; total: number };
  };
  readonly prompts?: Array<{
    readonly type: string;
    readonly template: string;
    readonly variables: Record<string, any>;
  }>;
  readonly metadata: AnalysisMetadata;
  readonly warnings: string[];
  readonly error?: string;
}
