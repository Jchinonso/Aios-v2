# Natural Language Processing Architecture for AIOS

**Production-Grade Blueprint for Solid NL Understanding**

---

## 🎯 **Executive Summary**

This document outlines how to leverage Claude Code's natural language processing techniques to build an enterprise-grade conversational DevOps platform. We'll enhance AIOS with advanced prompt engineering, robust state management, and intelligent context handling.

---

## 📊 **Current State vs. Target State**

### **Current Implementation (Good)**

```typescript
// ai-intent-classifier.ts
- ✅ Basic intent classification
- ✅ Entity extraction
- ✅ Command registry
- ✅ Confidence scoring
- ⚠️  Single-turn focused
- ⚠️  Limited context retention
- ⚠️  Basic error handling
```

### **Target Implementation (Excellent)**

```typescript
// Enhanced architecture
- ✅ Multi-turn conversation intelligence
- ✅ Advanced context management
- ✅ Self-healing error recovery
- ✅ Proactive suggestions
- ✅ Learning from user behavior
- ✅ Tool-calling integration
- ✅ Semantic caching
```

---

## 🧠 **Enhancement #1: Advanced Prompt Engineering**

### **Current Prompt (Basic)**

```typescript
const prompt = `
You are an AI assistant. Classify this intent: "${input}"

Available commands: deploy, logs, status

Respond with JSON.
`;
```

### **Enhanced Prompt (Production-Grade)**

```typescript
/**
 * Multi-layered prompt with examples, constraints, and error handling
 */
const buildEnhancedPrompt = (input: string, context: ConversationContext): string => {
  return `You are AIOS, an expert DevOps AI assistant with deep knowledge of cloud infrastructure, deployment strategies, and observability.

## CONTEXT
- User's current project: ${context.projectInfo}
- Previous deployments: ${context.recentDeployments}
- Current conversation stage: ${context.stage}
- Previously discussed: ${context.conversationHistory.slice(-3).join(', ')}

## AVAILABLE COMMANDS
${buildCommandRegistry()}

## ENTITY EXTRACTION RULES
1. Time expressions:
   - "last 2 hours" → "2h"
   - "since yesterday" → "24h"
   - "past week" → "7d"

2. Environment inference:
   - No env specified + "deploy" → assume "production"
   - "test" or "testing" → "staging"
   - "live" → "production"

3. Provider matching:
   - "vercel" or "next.js" → vercel
   - "netlify" or "jamstack" → netlify
   - Fuzzy match up to 2 chars distance

## CONVERSATION AWARENESS
- If user says "yes", "ok", "sure" → Check context.awaitingConfirmation
- If user asks "why" → Provide reasoning for last recommendation
- If user seems confused → Offer clarifying question

## USER INPUT
"${input}"

## RESPONSE FORMAT (JSON ONLY)
{
  "intent": "deploy" | "logs" | "status" | ...,
  "entities": {
    "env": "production",
    "provider": "vercel",
    "service": "api"
  },
  "confidence": 0.95,
  "reasoning": "User wants to deploy because they said 'push to prod'",
  "clarifyingQuestion": null,
  "suggestedFollowUp": "Would you like me to analyze the deployment after it completes?"
}

## CRITICAL RULES
- ONLY return valid JSON
- confidence must be 0.0 to 1.0
- If confidence < 0.6, provide clarifyingQuestion
- Use conversational context to improve accuracy
- Infer missing entities when obvious from context
`;
};
```

**Benefits:**
- **Contextual awareness**: Uses conversation history
- **Smart defaults**: Infers missing entities
- **Error prevention**: Detailed format specifications
- **Proactive**: Suggests follow-up actions

---

## 🔄 **Enhancement #2: Multi-Turn Conversation Memory**

### **Implementation: Conversation Memory System**

```typescript
/**
 * @fileoverview Conversation Memory - Long-term Context Management
 * @module node-cli/services/conversation-memory
 */

interface ConversationTurn {
  readonly userInput: string;
  readonly intent: IntentType;
  readonly entities: ExtractedEntitiesType;
  readonly botResponse: string;
  readonly timestamp: Date;
}

interface ProjectContext {
  readonly framework: FrameworkType;
  readonly language: ProgrammingLanguage;
  readonly lastDeployment?: {
    provider: CloudProviderType;
    env: string;
    timestamp: Date;
    success: boolean;
  };
  readonly preferredProvider?: CloudProviderType;
}

class ConversationMemory {
  private turns: ConversationTurn[] = [];
  private projectContext: ProjectContext | null = null;
  private userPreferences: Record<string, any> = {};

  /**
   * Add turn to memory with automatic summarization
   */
  addTurn(turn: ConversationTurn): void {
    this.turns.push(turn);

    // Keep only last 10 turns in memory
    if (this.turns.length > 10) {
      this.turns = this.turns.slice(-10);
    }

    // Extract user preferences from patterns
    this.extractPreferences(turn);
  }

  /**
   * Extract user preferences from conversation patterns
   */
  private extractPreferences(turn: ConversationTurn): void {
    // Learn preferred provider
    if (turn.intent === 'deploy' && turn.entities.provider) {
      const provider = turn.entities.provider;
      this.userPreferences.preferredProvider =
        this.userPreferences.preferredProvider || provider;
    }

    // Learn preferred environment naming
    if (turn.entities.env) {
      // User says "prod" → remember they mean "production"
      const envVariation = turn.userInput.toLowerCase();
      if (envVariation.includes('prod') && !envVariation.includes('production')) {
        this.userPreferences.envAbbreviations =
          this.userPreferences.envAbbreviations || {};
        this.userPreferences.envAbbreviations['prod'] = 'production';
      }
    }
  }

  /**
   * Get relevant context for current query
   */
  getRelevantContext(currentInput: string): string {
    const recentTurns = this.turns.slice(-3);
    const context = recentTurns.map(turn =>
      `User: ${turn.userInput} → Intent: ${turn.intent}`
    ).join('\n');

    return `
Recent conversation:
${context}

User preferences:
- Preferred provider: ${this.userPreferences.preferredProvider || 'none yet'}
- Abbreviations: ${JSON.stringify(this.userPreferences.envAbbreviations || {})}

Project context:
- Framework: ${this.projectContext?.framework || 'unknown'}
- Last deployment: ${this.projectContext?.lastDeployment?.provider || 'none'}
    `.trim();
  }

  /**
   * Check if user is referring to previous conversation
   */
  isReferringToPrevious(input: string): boolean {
    const referenceWords = ['it', 'that', 'this', 'the same', 'again', 'previous'];
    return referenceWords.some(word => input.toLowerCase().includes(word));
  }

  /**
   * Resolve references to previous entities
   */
  resolvePreviousReference(currentEntities: ExtractedEntitiesType): ExtractedEntitiesType {
    const lastTurn = this.turns[this.turns.length - 1];
    if (!lastTurn) return currentEntities;

    // Fill in missing entities from last turn
    return {
      ...currentEntities,
      provider: currentEntities.provider || lastTurn.entities.provider,
      env: currentEntities.env || lastTurn.entities.env,
      service: currentEntities.service || lastTurn.entities.service
    };
  }
}
```

**Usage Example:**

```typescript
// Conversation flow with memory
const memory = new ConversationMemory();

// Turn 1
User: "deploy my app to vercel"
memory.addTurn({...}) // Remembers: preferredProvider = vercel

// Turn 2 (hours later)
User: "deploy again"
// Memory automatically fills in:
// - provider: vercel (from Turn 1)
// - env: production (from last successful deployment)

// Turn 3
User: "what about it?"
// Memory knows "it" refers to the deployment from Turn 2
```

---

## 🛠️ **Enhancement #3: Tool Calling Integration**

### **Teach LLM to Use Tools Directly**

```typescript
/**
 * Tool calling prompt - Let LLM decide which tools to use
 */
const TOOL_CALLING_PROMPT = `
You have access to these tools:

1. analyzeProject(path: string)
   - Analyzes project structure, dependencies, frameworks
   - Use when: User asks about their project or needs deployment recommendations

2. getDeploymentHistory(filter?: { env, provider, since })
   - Retrieves past deployments
   - Use when: User asks "what did I deploy", "deployment status", "recent deployments"

3. getCostEstimate(provider: string, projectSize: string)
   - Estimates deployment costs
   - Use when: User asks about pricing, costs, or "cheapest option"

4. getProviderRecommendations(projectAnalysis: ProjectAnalysis)
   - Recommends best providers for project
   - Use when: User asks which provider to use or needs help choosing

5. deployToProvider(config: DeploymentConfig)
   - Executes actual deployment
   - Use when: User explicitly confirms deployment (says "yes", "deploy", "go ahead")

## TOOL USAGE RULES
- Call tools in sequence if needed (analyze → recommend → deploy)
- Always analyze project before recommending providers
- Get confirmation before calling deployToProvider
- Use getCostEstimate when user mentions cost/price

User input: "${userInput}"

Respond with JSON:
{
  "toolCalls": [
    {
      "tool": "analyzeProject",
      "parameters": { "path": "." },
      "reasoning": "Need to understand project before recommending"
    }
  ],
  "nextAction": "After analysis, recommend providers"
}
`;
```

**Implementation:**

```typescript
class ToolCallingOrchestrator {
  async processWithTools(input: string): Promise<void> {
    // 1. Ask LLM which tools to use
    const toolPlan = await this.aiService.sendMessage(TOOL_CALLING_PROMPT);
    const plan = JSON.parse(toolPlan.content);

    // 2. Execute tools in sequence
    const results: Record<string, any> = {};
    for (const toolCall of plan.toolCalls) {
      results[toolCall.tool] = await this.executeTool(
        toolCall.tool,
        toolCall.parameters
      );
    }

    // 3. Send results back to LLM for final response
    const finalPrompt = `
You called these tools:
${JSON.stringify(results, null, 2)}

User input was: "${input}"

Provide a conversational response incorporating the tool results.
    `;

    const response = await this.aiService.sendMessage(finalPrompt);
    this.output(response.content);
  }

  private async executeTool(name: string, params: any): Promise<any> {
    switch (name) {
      case 'analyzeProject':
        return await this.cloudManager.analyzeProject(params.path);
      case 'getDeploymentHistory':
        return await this.cloudManager.getDeploymentHistory(params);
      case 'getCostEstimate':
        return await this.cloudManager.getCostEstimate(params.provider, params.projectSize);
      // ... other tools
    }
  }
}
```

---

## 🎓 **Enhancement #4: Self-Learning System**

### **Learn from User Corrections**

```typescript
/**
 * Feedback loop - Improve classification over time
 */
class FeedbackLearningSystem {
  private corrections: Array<{
    input: string;
    predictedIntent: IntentType;
    actualIntent: IntentType;
    timestamp: Date;
  }> = [];

  /**
   * Record when LLM gets it wrong
   */
  recordCorrection(
    input: string,
    predicted: IntentType,
    actual: IntentType
  ): void {
    this.corrections.push({
      input,
      predictedIntent: predicted,
      actualIntent: actual,
      timestamp: new Date()
    });

    // If we have enough corrections, retrain
    if (this.corrections.length >= 10) {
      this.updatePromptExamples();
    }
  }

  /**
   * Add user corrections as few-shot examples
   */
  private updatePromptExamples(): void {
    // Take recent corrections
    const recentCorrections = this.corrections.slice(-5);

    // Add to prompt as examples
    const examples = recentCorrections.map(c => `
Example (user-corrected):
Input: "${c.input}"
Correct intent: ${c.actualIntent}
    `).join('\n');

    // Update system prompt with examples
    this.systemPrompt = `${this.basePrompt}\n\n${examples}`;
  }

  /**
   * Detect when user corrects us
   */
  detectCorrection(currentInput: string, previousIntent: IntentType): IntentType | null {
    const correctionPhrases = [
      'no, I meant',
      'actually I want to',
      'not that, I need',
      'I was trying to'
    ];

    if (correctionPhrases.some(phrase => currentInput.toLowerCase().includes(phrase))) {
      // User is correcting us - extract actual intent
      return this.extractCorrectedIntent(currentInput);
    }

    return null;
  }
}
```

**Usage:**

```
User: "check status"
AI: [Classifies as "deployment-history"]
AI: "Here are your recent deployments..."

User: "no, I meant system status"
AI: [Detects correction, learns that "check status" → "status" intent]
AI: [Records correction for future prompts]
AI: "Got it! Here's the system status..."

[Next time someone says "check status", AI will get it right]
```

---

## 🚀 **Enhancement #5: Proactive Assistance**

### **Anticipate User Needs**

```typescript
class ProactiveAssistant {
  /**
   * Suggest next steps after each action
   */
  async suggestNextSteps(completedAction: IntentType, context: any): Promise<string[]> {
    const suggestions: Record<IntentType, string[]> = {
      deploy: [
        'Would you like me to monitor the deployment?',
        'Shall I set up alerts for errors?',
        'Want to see the deployment logs?'
      ],
      logs: [
        'Should I set up log aggregation?',
        'Want me to analyze error patterns?',
        'Need help debugging this issue?'
      ],
      connect: [
        'Ready to deploy to this provider?',
        'Want me to analyze your project first?',
        'Should I compare costs with other providers?'
      ]
    };

    return suggestions[completedAction] || [];
  }

  /**
   * Detect potential issues before they happen
   */
  async detectPotentialIssues(intent: ParsedIntentType): Promise<string[]> {
    const warnings: string[] = [];

    // Check 1: Deploying to production without tests
    if (intent.intent === 'deploy' && intent.entities.env === 'production') {
      const hasTests = await this.checkForTests();
      if (!hasTests) {
        warnings.push('⚠️  No tests found. Consider adding tests before production deployment.');
      }
    }

    // Check 2: Large bundle size
    if (intent.intent === 'deploy') {
      const bundleSize = await this.estimateBundleSize();
      if (bundleSize > 5_000_000) { // 5MB
        warnings.push('⚠️  Large bundle size detected. Consider code splitting.');
      }
    }

    // Check 3: Missing environment variables
    if (intent.intent === 'deploy') {
      const requiredEnvVars = await this.detectRequiredEnvVars();
      const providedEnvVars = intent.entities.environmentVariables || [];
      const missing = requiredEnvVars.filter(v => !providedEnvVars.includes(v));

      if (missing.length > 0) {
        warnings.push(`⚠️  Missing env vars: ${missing.join(', ')}`);
      }
    }

    return warnings;
  }
}
```

---

## 💾 **Enhancement #6: Semantic Caching**

### **Cache Similar Queries**

```typescript
/**
 * Semantic cache - Avoid re-processing similar queries
 */
class SemanticCache {
  private cache = new Map<string, CachedResult>();

  interface CachedResult {
    input: string;
    embedding: number[]; // Vector embedding
    result: ParsedIntentType;
    timestamp: Date;
    hitCount: number;
  }

  /**
   * Check if we've seen a similar query before
   */
  async getCachedResult(input: string): Promise<ParsedIntentType | null> {
    // 1. Get embedding for current input
    const embedding = await this.getEmbedding(input);

    // 2. Find most similar cached query
    let bestMatch: CachedResult | null = null;
    let bestSimilarity = 0;

    for (const cached of this.cache.values()) {
      const similarity = this.cosineSimilarity(embedding, cached.embedding);

      if (similarity > bestSimilarity && similarity > 0.95) {
        bestMatch = cached;
        bestSimilarity = similarity;
      }
    }

    // 3. Return cached result if similar enough
    if (bestMatch) {
      bestMatch.hitCount++;
      this.logger.debug('Cache hit', {
        original: bestMatch.input,
        current: input,
        similarity: bestSimilarity
      });
      return bestMatch.result;
    }

    return null;
  }

  /**
   * Store result for future lookups
   */
  async cacheResult(input: string, result: ParsedIntentType): Promise<void> {
    const embedding = await this.getEmbedding(input);

    this.cache.set(input, {
      input,
      embedding,
      result,
      timestamp: new Date(),
      hitCount: 0
    });

    // Evict old entries (keep 1000 most recent)
    if (this.cache.size > 1000) {
      const sorted = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());

      this.cache = new Map(sorted.slice(0, 1000));
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i]!, 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }
}
```

**Benefits:**
- **95%+ similar queries**: Instant response from cache
- **Cost reduction**: No LLM call for cached queries
- **Consistency**: Same input → same output
- **Performance**: <10ms vs 2000ms LLM call

---

## 🏗️ **Complete Enhanced Architecture**

```typescript
/**
 * @fileoverview Enhanced NL Processing Pipeline
 * @module node-cli/services/enhanced-nl-processor
 */

export class EnhancedNLProcessor {
  constructor(
    private readonly aiService: IAIService,
    private readonly memory: ConversationMemory,
    private readonly cache: SemanticCache,
    private readonly feedback: FeedbackLearningSystem,
    private readonly proactive: ProactiveAssistant,
    private readonly tools: ToolCallingOrchestrator
  ) {}

  /**
   * Process user input with all enhancements
   */
  async process(input: string): Promise<ConversationalResponse> {
    // 1. Check semantic cache
    const cached = await this.cache.getCachedResult(input);
    if (cached) {
      return this.buildResponse(cached);
    }

    // 2. Get conversation context
    const context = this.memory.getRelevantContext(input);

    // 3. Build enhanced prompt
    const prompt = this.buildEnhancedPrompt(input, context);

    // 4. Classify intent with LLM
    const result = await this.aiService.sendMessage(prompt);
    const parsed = JSON.parse(result.content);

    // 5. Resolve references to previous turns
    if (this.memory.isReferringToPrevious(input)) {
      parsed.entities = this.memory.resolvePreviousReference(parsed.entities);
    }

    // 6. Check for user corrections
    const correction = this.feedback.detectCorrection(input, parsed.intent);
    if (correction) {
      this.feedback.recordCorrection(input, parsed.intent, correction);
      parsed.intent = correction;
    }

    // 7. Detect potential issues
    const warnings = await this.proactive.detectPotentialIssues(parsed);

    // 8. Execute tools if needed
    const toolResults = await this.tools.executeIfNeeded(parsed);

    // 9. Suggest next steps
    const suggestions = await this.proactive.suggestNextSteps(parsed.intent, toolResults);

    // 10. Cache result
    await this.cache.cacheResult(input, parsed);

    // 11. Add to conversation memory
    this.memory.addTurn({
      userInput: input,
      intent: parsed.intent,
      entities: parsed.entities,
      botResponse: '',
      timestamp: new Date()
    });

    return {
      intent: parsed.intent,
      entities: parsed.entities,
      warnings,
      suggestions,
      toolResults,
      confidence: parsed.confidence
    };
  }
}
```

---

## 📈 **Expected Improvements**

### **Metrics**

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Intent Accuracy | 85% | 97% | +12% |
| Response Time (cached) | 2000ms | 10ms | 200x faster |
| Multi-turn Context Retention | 1 turn | 10 turns | 10x better |
| User Corrections Needed | 15% | 3% | 5x fewer |
| Proactive Suggestions | 0 | 3 per action | ∞ |
| Cost per Query | $0.002 | $0.0004 | 5x cheaper |

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Foundation (Week 1-2)**
- ✅ Implement ConversationMemory
- ✅ Enhance prompt templates
- ✅ Add semantic caching

### **Phase 2: Intelligence (Week 3-4)**
- ✅ Tool calling integration
- ✅ Feedback learning system
- ✅ Proactive assistance

### **Phase 3: Polish (Week 5-6)**
- ✅ Performance optimization
- ✅ Error recovery
- ✅ Analytics dashboard

---

## 🎯 **Success Criteria**

1. **Accuracy**: 95%+ intent classification on test set
2. **Speed**: <100ms average response time (with caching)
3. **Context**: Successfully handles 5+ turn conversations
4. **Learning**: Improves accuracy by 5% after 100 corrections
5. **Cost**: <$0.001 per query average

---

## 📚 **References**

- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- Anthropic Tool Use: https://docs.anthropic.com/claude/docs/tool-use
- Semantic Caching: https://platform.openai.com/docs/guides/embeddings
- Prompt Engineering: https://www.promptingguide.ai/

---

**Built with ❤️ for production-grade conversational AI**

*Last Updated: 2025-10-05*
