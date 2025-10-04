export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  OLLAMA: 'ollama',
  GROQ: 'groq'
} as const;

export const AI_MODELS = {
  [AI_PROVIDERS.OPENAI]: {
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_3_5_TURBO: 'gpt-3.5-turbo'
  },
  [AI_PROVIDERS.ANTHROPIC]: {
    CLAUDE_3_OPUS: 'claude-3-opus-20240229',
    CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU: 'claude-3-haiku-20240307'
  },
  [AI_PROVIDERS.GEMINI]: {
    GEMINI_PRO: 'gemini-pro',
    GEMINI_PRO_VISION: 'gemini-pro-vision'
  },
  [AI_PROVIDERS.OLLAMA]: {
    LLAMA_2: 'llama2',
    LLAMA_2_7B: 'llama2:7b',
    LLAMA_2_13B: 'llama2:13b',
    CODELLAMA: 'codellama',
    CODELLAMA_7B: 'codellama:7b',
    CODELLAMA_13B: 'codellama:13b',
    MISTRAL: 'mistral',
    MISTRAL_7B: 'mistral:7b',
    LLAMA_3: 'llama3',
    LLAMA_3_8B: 'llama3:8b',
    DEEPSEEK_R1: 'deepseek-r1:latest',
    QWEN: 'qwen',
    GEMMA: 'gemma'
  },
  [AI_PROVIDERS.GROQ]: {
    LLAMA_3_70B: 'llama3-70b-8192',
    LLAMA_3_8B: 'llama3-8b-8192',
    MIXTRAL_8X7B: 'mixtral-8x7b-32768',
    GEMMA_7B: 'gemma-7b-it',
    GPT_OSS_120B: 'openai/gpt-oss-120b'
  }
} as const;

export const AI_DEFAULTS = {
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  MAX_HISTORY_LENGTH: 50,
  TIMEOUT: 30000
} as const;

export const AI_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
} as const;