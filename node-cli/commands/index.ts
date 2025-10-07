/**
 * @fileoverview CLI Commands Export
 * @module node-cli/commands
 */

export { executeAnalyze, type AnalyzeOptionsType } from './analyze.command.js';
export { executeRecommend, type RecommendOptionsType } from './recommend.command.js';
export { executeConnect, type ConnectOptionsType } from './connect.command.js';
export { executeAIAnalyze, type AIAnalyzeOptionsType } from './ai-analyze.command.js';

// Phase 3: Action Reasoning & Explanation
export { executeExplain, parseExplainQuery, type ExplainOptionsType } from './explain.command.js';

// Auth commands
export {
  executeAuthConnect,
  executeAuthList,
  executeAuthStatus,
  executeAuthSwitch,
  executeAuthRevoke
} from './auth.js';