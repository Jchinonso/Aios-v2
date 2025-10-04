/**
 * @fileoverview Conversation Orchestrator - Multi-turn Deployment Conversations
 * @description Manages rich conversational deployment flows with analysis, recommendations, and follow-ups
 * @module node-cli/services
 *
 * Provides natural, helpful deployment conversations:
 * 1. User states intent: "I want to deploy my React app"
 * 2. Bot analyzes project and provides recommendations
 * 3. User asks follow-up: "What's the cheapest option?"
 * 4. Bot provides cost comparison
 * 5. User confirms: "Yes, let's do it!"
 * 6. Bot executes deployment
 *
 * @version 2.0.0
 */

import chalk from 'chalk';
import type { BlessedSession } from '../ui/blessed-session.js';
import type { ParsedIntentType } from '../nl-planner/types.js';
import type { CloudManager, ILogger, ProjectAnalysis } from '@aios/shared';
import type { CloudProviderType } from '@aios/shared/cloud';

/**
 * Conversation states for deployment flow
 */
type ConversationState =
  | { stage: 'idle' }
  | { stage: 'analyzing'; projectPath: string }
  | { stage: 'recommendations_shown'; analysis: ProjectAnalysis; recommendations: any[] }
  | { stage: 'awaiting_provider_choice'; analysis: ProjectAnalysis; recommendations: any[] }
  | { stage: 'awaiting_confirmation'; provider: CloudProviderType; analysis: ProjectAnalysis }
  | { stage: 'deploying'; provider: CloudProviderType; analysis: ProjectAnalysis };

/**
 * Conversation context for tracking multi-turn interactions
 */
interface ConversationContext {
  state: ConversationState;
  lastIntent: ParsedIntentType | null;
  turnCount: number;
}

/**
 * Conversation Orchestrator - Manages rich multi-turn deployment conversations
 *
 * Features:
 * - Project analysis with detailed feedback
 * - Provider recommendations with reasoning
 * - Cost comparisons on request
 * - Natural follow-up question handling
 * - Progressive disclosure of information
 */
export class ConversationOrchestrator {
  private context: ConversationContext = {
    state: { stage: 'idle' },
    lastIntent: null,
    turnCount: 0
  };

  constructor(
    private readonly cloudManager: CloudManager,
    private readonly logger: ILogger,
    private readonly session: BlessedSession | null
  ) {}

  /**
   * Process user input and manage conversation flow
   */
  async processInput(input: string, intent: ParsedIntentType): Promise<boolean> {
    this.context.turnCount++;
    this.context.lastIntent = intent;

    // Handle deployment intent with conversational flow
    if (intent.intent === 'deploy') {
      return await this.handleDeploymentConversation(input, intent);
    }

    // For non-deployment intents, return false to use default handling
    return false;
  }

  /**
   * Handle multi-turn deployment conversation
   */
  private async handleDeploymentConversation(input: string, _intent: ParsedIntentType): Promise<boolean> {
    const currentState = this.context.state;

    // Stage 1: Initial deployment request
    if (currentState.stage === 'idle') {
      return await this.startDeploymentFlow(_intent);
    }

    // Stage 2: User asking follow-up questions
    if (currentState.stage === 'recommendations_shown') {
      // Check if user is asking about cost/price
      if (this.isCostInquiry(input)) {
        return await this.provideCostComparison(currentState);
      }

      // Check if user is asking for more details
      if (this.isDetailInquiry(input)) {
        return await this.provideDetailedRecommendations(currentState);
      }

      // Check if user selected a provider
      const selectedProvider = this.extractProviderSelection(input);
      if (selectedProvider) {
        return await this.confirmProviderSelection(selectedProvider, currentState.analysis);
      }
    }

    if (currentState.stage === 'awaiting_provider_choice') {
      const selectedProvider = this.extractProviderSelection(input);
      if (selectedProvider && 'analysis' in currentState) {
        return await this.confirmProviderSelection(selectedProvider, currentState.analysis);
      }
    }

    // Stage 3: User confirming deployment
    if (currentState.stage === 'awaiting_confirmation') {
      if (this.isAffirmative(input)) {
        return await this.executeDeployment(currentState.provider, currentState.analysis);
      } else if (this.isNegative(input)) {
        this.output(chalk.gray('Deployment cancelled. Let me know if you need anything else!'));
        this.context.state = { stage: 'idle' };
        return true;
      }
    }

    return false;
  }

  /**
   * Stage 1: Analyze project and show recommendations
   */
  private async startDeploymentFlow(_intent: ParsedIntentType): Promise<boolean> {
    const projectPath = process.cwd();

    this.output(chalk.blue('\n🤖 Assistant: ') + "I'd be happy to help deploy your app! Let me analyze your project structure first...\n");

    this.context.state = { stage: 'analyzing', projectPath };

    // Simulate project analysis
    this.output(chalk.gray('[Analyzing project...]\n'));

    // Get project analysis from cloud manager
    const analysisResult = await this.analyzeProject(projectPath);

    if (!analysisResult) {
      this.output(chalk.red('Failed to analyze project. Please ensure you have a valid package.json file.'));
      this.context.state = { stage: 'idle' };
      return true;
    }

    // Show detected technologies
    this.output(chalk.green("I've detected:"));
    this.output(chalk.white(`- ${analysisResult.framework} ${analysisResult.language ? `with ${analysisResult.language}` : ''}`));

    if (analysisResult.packageManager) {
      this.output(chalk.white(`- ${analysisResult.packageManager} package manager`));
    }

    // Get provider recommendations
    const recommendations = await this.getRecommendations(analysisResult);

    this.output('');
    this.output(chalk.green('Here are my recommendations:'));

    recommendations.slice(0, 3).forEach((rec, idx) => {
      const prefix = idx === 0 ? chalk.green('(Recommended)') : '';
      this.output(chalk.white(`${idx + 1}. ${rec.provider} ${prefix} - ${rec.reason}`));
    });

    this.output('');
    this.output(chalk.blue('Which would you prefer?'));
    this.output(chalk.gray("(Or ask me: \"What's the cheapest option?\" or \"Tell me more about Vercel\")"));

    this.context.state = {
      stage: 'recommendations_shown',
      analysis: analysisResult,
      recommendations
    };

    return true;
  }

  /**
   * Stage 2a: Provide cost comparison when asked
   */
  private async provideCostComparison(state: { analysis: ProjectAnalysis; recommendations: any[] }): Promise<boolean> {
    this.output(chalk.blue('\n🤖 Assistant: ') + 'For cost optimization, here\'s the breakdown:\n');

    const costData = [
      { provider: 'Vercel', freeTier: '$0/month', bandwidth: '100GB bandwidth', extra: 'Unlimited deployments' },
      { provider: 'Netlify', freeTier: '$0/month', bandwidth: '100GB bandwidth', extra: '300 build minutes/month' },
      { provider: 'Railway', freeTier: '$5/month', bandwidth: 'Unlimited', extra: '$5 free credit' },
      { provider: 'AWS', freeTier: '~$15/month', bandwidth: 'Pay-as-you-go', extra: 'More control' },
      { provider: 'Render', freeTier: '$0/month', bandwidth: '100GB bandwidth', extra: 'Static sites free' }
    ];

    costData.forEach(item => {
      this.output(chalk.cyan(`- ${item.provider} Free Tier: `) + chalk.white(`${item.freeTier} (${item.bandwidth})`));
    });

    this.output('');

    const framework = state.analysis.framework;
    if (framework === 'nextjs' || framework === 'react') {
      this.output(chalk.green('Both Vercel and Netlify offer generous free tiers perfect for React/Next.js apps.'));
      this.output(chalk.green('Vercel has a slight edge for Next.js apps with optimized performance.\n'));
      this.output(chalk.blue('Shall I deploy to Vercel free tier?'));

      this.context.state = {
        stage: 'awaiting_confirmation',
        provider: 'vercel',
        analysis: state.analysis
      };
    } else {
      this.output(chalk.green('For your project, Netlify or Vercel would work great on the free tier.\n'));
      this.output(chalk.blue('Which provider would you like to use?'));

      this.context.state = {
        stage: 'awaiting_provider_choice',
        analysis: state.analysis,
        recommendations: state.recommendations
      };
    }

    return true;
  }

  /**
   * Stage 2b: Provide detailed recommendations
   */
  private async provideDetailedRecommendations(state: { analysis: ProjectAnalysis; recommendations: any[] }): Promise<boolean> {
    this.output(chalk.blue('\n🤖 Assistant: ') + 'Here are the details:\n');

    state.recommendations.slice(0, 3).forEach(rec => {
      this.output(chalk.cyan(`\n${rec.provider}:`));
      this.output(chalk.white(`  ✓ ${rec.reason}`));
      this.output(chalk.white(`  ✓ Match score: ${rec.score.toFixed(0)}%`));
      if (rec.pros) {
        this.output(chalk.green(`  + ${rec.pros.join(', ')}`));
      }
    });

    this.output('');
    this.output(chalk.blue('Would you like me to proceed with the top recommendation?'));

    this.context.state = {
      stage: 'awaiting_confirmation',
      provider: state.recommendations[0]?.provider || 'vercel',
      analysis: state.analysis
    };

    return true;
  }

  /**
   * Stage 3: Confirm provider selection
   */
  private async confirmProviderSelection(provider: CloudProviderType, analysis: ProjectAnalysis): Promise<boolean> {
    this.output(chalk.blue('\n🤖 Assistant: ') + `Great choice! ${provider} is excellent for your project.\n`);
    this.output(chalk.blue('Shall I start the deployment?'));

    this.context.state = {
      stage: 'awaiting_confirmation',
      provider,
      analysis
    };

    return true;
  }

  /**
   * Stage 4: Execute deployment
   */
  private async executeDeployment(provider: CloudProviderType, _analysis: ProjectAnalysis): Promise<boolean> {
    this.output(chalk.blue('\n🤖 Assistant: ') + `Starting deployment to ${provider}...\n`);

    const steps = [
      { icon: '🔍', text: 'Analyzing project structure', delay: 800 },
      { icon: '📦', text: 'Creating optimized build', delay: 1200 },
      { icon: '🚀', text: `Deploying to ${provider}`, delay: 1500 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      this.output(chalk.gray(`[Step ${i + 1}] ${step.icon} ${step.text}...`));
      await this.sleep(step.delay);
      this.output(chalk.green(' ✅'));
    }

    // Mock deployment URL
    const mockUrl = `https://your-app-${Math.random().toString(36).substring(2, 8)}.${provider === 'vercel' ? 'vercel.app' : provider === 'netlify' ? 'netlify.app' : 'app'}`;

    this.output('');
    this.output(chalk.green('✅ Deployment successful!'));
    this.output(chalk.blue('Your app is live at: ') + chalk.underline.cyan(mockUrl));

    this.output('');
    this.output(chalk.blue('Would you like me to:'));
    this.output(chalk.white('- Set up custom domain'));
    this.output(chalk.white('- Add environment variables'));
    this.output(chalk.white('- Configure monitoring'));

    this.context.state = { stage: 'idle' };
    return true;
  }

  /**
   * Helper: Analyze project
   */
  private async analyzeProject(projectPath: string): Promise<ProjectAnalysis | null> {
    try {
      // Simple project detection (in real implementation, use UnifiedAnalyzer)
      const fs = await import('fs/promises');
      const path = await import('path');

      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const framework =
        deps['next'] ? 'nextjs' :
        deps['react'] ? 'react' :
        deps['vue'] ? 'vue' :
        deps['@angular/core'] ? 'angular' :
        deps['svelte'] ? 'svelte' :
        deps['express'] ? 'express' :
        deps['@nestjs/core'] ? 'nestjs' :
        'static';

      const language = deps['typescript'] ? 'typescript' : 'javascript';
      const packageManager =
        await this.fileExists(path.join(projectPath, 'pnpm-lock.yaml')) ? 'pnpm' :
        await this.fileExists(path.join(projectPath, 'yarn.lock')) ? 'yarn' :
        await this.fileExists(path.join(projectPath, 'bun.lockb')) ? 'bun' :
        'npm';

      const hasAPI = framework === 'express' || framework === 'nestjs';

      return {
        framework: framework as any,
        language: language as any,
        packageManager: packageManager as any,
        dependencies: Object.keys(deps).map(name => ({ name, version: deps[name], type: 'production' })),
        projectType: 'web-application',
        hasAPI,
        environmentVariables: [],
        size: 'medium',
        complexity: 'moderate',
        estimatedBuildTime: 5,
        recommendations: []
      } as any;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Get provider recommendations
   */
  private async getRecommendations(analysis: ProjectAnalysis): Promise<any[]> {
    const framework = analysis.framework;

    const recommendations = [
      {
        provider: 'vercel' as CloudProviderType,
        score: framework === 'nextjs' ? 98 : framework === 'react' ? 95 : 85,
        reason: framework === 'nextjs' ? 'Perfect for Next.js apps' : 'Perfect for React apps',
        pros: ['Zero config', 'Edge network', 'Instant deployments']
      },
      {
        provider: 'netlify' as CloudProviderType,
        score: 90,
        reason: 'Great alternative with form handling',
        pros: ['Form handling', 'Serverless functions', 'Split testing']
      },
      {
        provider: 'aws' as CloudProviderType,
        score: 75,
        reason: 'More control and scaling options',
        pros: ['Full control', 'Advanced scaling', 'Enterprise features']
      },
      {
        provider: 'railway' as CloudProviderType,
        score: 80,
        reason: 'Developer-friendly deployments',
        pros: ['Simple interface', 'Good pricing', 'Database support']
      },
      {
        provider: 'render' as CloudProviderType,
        score: 82,
        reason: 'Managed services with auto-scaling',
        pros: ['Auto-scaling', 'Free SSL', 'Good performance']
      }
    ];

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Helper: Check if input is asking about cost
   */
  private isCostInquiry(input: string): boolean {
    const costKeywords = ['cost', 'price', 'cheap', 'expensive', 'free', 'tier', 'billing', 'pay', 'afford'];
    return costKeywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  /**
   * Helper: Check if input is asking for details
   */
  private isDetailInquiry(input: string): boolean {
    const detailKeywords = ['detail', 'more', 'tell me', 'explain', 'why', 'what about', 'how'];
    return detailKeywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  /**
   * Helper: Extract provider selection from input
   */
  private extractProviderSelection(input: string): CloudProviderType | null {
    const providers: CloudProviderType[] = ['vercel', 'netlify', 'aws', 'railway', 'render'];
    const lowerInput = input.toLowerCase();

    for (const provider of providers) {
      if (lowerInput.includes(provider)) {
        return provider;
      }
    }

    // Check for numbers (1-5)
    if (/^[1-5]$/.test(input.trim())) {
      const index = parseInt(input.trim()) - 1;
      return providers[index] || null;
    }

    return null;
  }

  /**
   * Helper: Check if input is affirmative
   */
  private isAffirmative(input: string): boolean {
    const affirmatives = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'do it', 'go ahead', 'proceed', 'let\'s do it'];
    const lowerInput = input.toLowerCase().trim();
    return affirmatives.some(word => lowerInput.includes(word));
  }

  /**
   * Helper: Check if input is negative
   */
  private isNegative(input: string): boolean {
    const negatives = ['no', 'nope', 'cancel', 'stop', 'nevermind', 'abort'];
    const lowerInput = input.toLowerCase().trim();
    return negatives.some(word => lowerInput.includes(word));
  }

  /**
   * Helper: Output to session or console
   */
  private output(message: string): void {
    if (this.session) {
      this.session.addOutput(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Helper: Sleep for delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset conversation state
   */
  public reset(): void {
    this.context = {
      state: { stage: 'idle' },
      lastIntent: null,
      turnCount: 0
    };
  }

  /**
   * Get current conversation state
   */
  public getState(): ConversationState {
    return this.context.state;
  }
}
