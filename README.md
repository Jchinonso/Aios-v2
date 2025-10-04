# AIOS v2 - AI-powered DevOps Assistant 🤖

**Conversational DevOps made simple** - Chat with your infrastructure like talking to a senior DevOps engineer

## 🌟 Features

- **Conversational Interface**: Chat naturally about your deployment needs
- **Multi-AI Support**: OpenAI GPT-4, Anthropic Claude, Groq (fast inference), and Ollama (local)
- **Cloud Providers**: Vercel, Netlify, AWS (more coming soon)
- **Project Analysis**: Automatic framework and dependency detection
- **Interactive Deployment**: Step-by-step guided deployments
- **Cost Optimization**: Smart recommendations based on your needs

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Add your API keys to `.env`:
```bash
# At least one AI provider is required
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Cloud provider tokens (optional)
VERCEL_TOKEN=your_vercel_token_here
NETLIFY_TOKEN=your_netlify_token_here
```

### 3. Start the Assistant

```bash
# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

### 4. (Optional) Set Up Ollama for Local AI

For privacy and free local AI, you can use Ollama:

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama server
ollama serve

# Pull a model (in another terminal)
ollama pull llama3:8b

# Now you can use Ollama in AIOS!
aios chat -p ollama
```

## 💬 Example Conversations

### Deploy a React App
```
You: I have a React app I want to deploy

🤖 Assistant: I'd be happy to help deploy your React app! Let me analyze your project structure first...

[Analyzing project...]

I've detected:
- React 18 with Vite
- TypeScript
- Tailwind CSS

Here are my recommendations:
1. Vercel (Recommended) - Perfect for React apps
2. Netlify - Great alternative with form handling
3. AWS Amplify - More control and scaling options

Which would you prefer?

You: What's the cheapest option?

🤖 Assistant: For cost optimization, here's the breakdown:
- Vercel Free Tier: $0/month (100GB bandwidth)
- Netlify Free Tier: $0/month (100GB bandwidth)
- AWS Amplify: ~$15/month (pay-as-you-go)

Both Vercel and Netlify offer generous free tiers perfect for React apps. Vercel has slight edge for React/Next.js apps.

Shall I deploy to Vercel free tier?

You: Yes, let's do it!

🤖 Assistant: Starting deployment to Vercel...

[Step 1] 🔍 Analyzing project structure... ✅
[Step 2] 📦 Creating optimized build... ✅
[Step 3] 🚀 Deploying to Vercel... ✅

✅ Deployment successful!
Your app is live at: https://your-app-abc123.vercel.app

Would you like me to:
- Set up custom domain
- Add environment variables
- Configure monitoring
```

### Troubleshoot Performance Issues
```
You: My app is running really slow, can you help?

🤖 Assistant: I'd be happy to help diagnose performance issues! Let me ask a few questions:

1. What type of slowness are you experiencing?
   - Page load times
   - Runtime performance
   - API response times

2. When did you first notice the slowness?

3. Have you made any recent changes?

Let me also analyze your current deployment for optimization opportunities...

[Analyzing deployment...]

I found a few potential issues:
- Bundle size is 2.8MB (recommendation: <1MB)
- No image optimization detected
- Missing browser caching headers

Would you like me to:
1. Analyze your bundle and suggest optimizations
2. Set up performance monitoring
3. Implement caching strategies
```

## 🏗️ Architecture

```
src/
├── ai/           # AI provider integrations (OpenAI, Anthropic)
├── cloud/        # Cloud provider integrations (Vercel, Netlify)
├── chat/         # Conversational interface logic
├── types/        # TypeScript type definitions
├── utils/        # Utility functions
└── cli.ts        # Main CLI entry point
```

## 🔧 Available Commands

The assistant understands natural language, but here are some examples:

### Deployment
- "Deploy my app to Vercel"
- "I want to deploy this Next.js project"
- "Help me choose the best hosting platform"

### Analysis
- "Analyze my project structure"
- "What's the best deployment strategy for this app?"
- "How much will it cost to host this?"

### Troubleshooting
- "My deployment failed, can you help?"
- "The app is slow, what can I optimize?"
- "Help me debug this build error"

### Monitoring
- "Set up monitoring for my app"
- "How is my app performing?"
- "Show me deployment analytics"

## 🌐 Supported Platforms

### AI Providers
- ✅ OpenAI (GPT-4, GPT-3.5-turbo)
- ✅ Anthropic (Claude 3 Sonnet)
- ✅ Groq (Lightning-fast LPU inference - Llama 3 70B, Mixtral, Gemma)
- ✅ Ollama (Local AI - Llama 3, Code Llama, Mistral, etc.)
- 🔄 Google Gemini (coming soon)

### Cloud Providers
- ✅ Vercel
- ✅ Netlify
- 🔄 AWS Amplify (coming soon)
- 🔄 Railway (coming soon)
- 🔄 Render (coming soon)

### Frameworks Detected
- ✅ Next.js
- ✅ React (Vite/CRA)
- ✅ Vue.js
- ✅ Nuxt.js
- ✅ Svelte/SvelteKit
- ✅ Static sites

## 🔑 Environment Variables

### Required (at least one)
- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `GROQ_API_KEY` - Groq API key for fast inference (get from https://console.groq.com/keys)
- **Ollama** - No API key needed, just install and run locally

### Optional Cloud Providers
- `VERCEL_TOKEN` - Vercel deployment token
- `NETLIFY_TOKEN` - Netlify personal access token
- `AWS_ACCESS_KEY_ID` - AWS access key (coming soon)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (coming soon)

### Configuration
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (info/debug/error)

## 🚀 Development

### Scripts
- `npm run dev` - Start in development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Run built version
- `npm run watch` - Development mode with file watching
- `npm run type-check` - Run TypeScript type checking

### Project Structure
- **TypeScript** for type safety
- **ESM modules** for modern JavaScript
- **Modular architecture** for easy extension
- **Environment-based configuration**

## 🤝 Contributing

This is part of the larger AIOS project. The Node.js CLI provides a more accessible interface while leveraging the robust Rust core for performance-critical operations.

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for developers who want deployment to be as easy as having a conversation**# Aios-v2
