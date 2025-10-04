# AIOS CLI

AI-powered DevOps chat assistant - A comprehensive command-line interface for intelligent project analysis, deployment automation, and development assistance.

## 🚀 Features

- 💬 **Interactive AI Chat** - Natural language conversations with AI
- 📊 **Project Analysis** - Deep analysis of codebases and project structure
- 🚀 **Smart Deployments** - AI-guided deployment automation
- 🔒 **Security Audits** - Comprehensive security analysis and recommendations
- ⚡ **Performance Optimization** - AI-powered performance suggestions
- 🛠️ **Multi-language Support** - Support for 8+ programming languages

## 📦 Installation

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Test the CLI
npm run dev -- --help
```

## 🎯 Quick Start

```bash
# Show CLI information and available commands
aios info

# Check system status
aios status

# Analyze current project
aios analyze

# Start interactive chat (when configured)
aios chat

# Analyze with verbose output
aios analyze --verbose

# Send a single message to AI
aios chat -m "How can I optimize this project?"
```

## 🛠️ Commands

### `aios status`
Shows system status, platform information, and API key configuration.

### `aios analyze [options]`
Analyzes the current or specified project directory.

**Options:**
- `-p, --path <path>` - Project path to analyze (default: current directory)
- `-v, --verbose` - Show detailed analysis output

### `aios chat [options]`
Starts an interactive AI chat session or sends a single message.

**Options:**
- `-m, --message <message>` - Send a single message instead of interactive mode

### `aios info`
Displays detailed information about AIOS CLI, features, and available commands.

## ⚙️ Configuration

### Environment Variables

```bash
# OpenAI API Key (for GPT models)
export OPENAI_API_KEY="your-openai-api-key"

# Anthropic API Key (for Claude models)
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Or create a .env file
echo "OPENAI_API_KEY=your-key-here" > .env
```

## 🏗️ Development

### Project Structure

```
node-cli/
├── cli-simple.ts              # Simple working CLI (current)
├── cli.ts                     # Full-featured CLI (in development)
├── commands/                  # Command implementations
├── services/                  # Core services and business logic
├── chat/                      # Chat functionality
└── package.json
```

### Available Scripts

```bash
# Development (simple CLI)
npm run dev

# Development (full CLI)
npm run dev:full

# Build
npm run build
npm run build:simple

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm test
```

### Architecture

The CLI follows **SOLID principles** with a modular, extensible architecture:

- **Single Responsibility** - Each command and service has a focused purpose
- **Open/Closed** - Easy to add new commands without modifying existing code
- **Liskov Substitution** - Services are interchangeable through interfaces
- **Interface Segregation** - Focused, minimal interfaces
- **Dependency Inversion** - Depends on abstractions, not concretions

## 🎨 CLI Design

The CLI provides a rich, user-friendly experience with:

- **Colorful output** using chalk
- **Loading spinners** with ora
- **Interactive prompts** using inquirer
- **Progress indicators** for long-running operations
- **Comprehensive help** and error messages

## 🔧 Troubleshooting

### Common Issues

**"No API keys configured"**
- Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variables
- Or create a `.env` file in the project root

**"Command not found"**
- Make sure you've run `npm run build`
- Check that the `dist/` directory exists

**TypeScript errors during development**
- Run `npm run type-check` to see detailed errors
- Ensure all dependencies are installed: `npm install`

### Debug Mode

Enable debug logging:
```bash
DEBUG=aios:* npm run dev -- status
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Roadmap

- [ ] **Enhanced AI Integration** - Full chat capabilities with context retention
- [ ] **Real-time Deployment Monitoring** - Live deployment status and logs
- [ ] **Team Collaboration** - Multi-user project sharing and insights
- [ ] **Plugin System** - Extensible architecture for custom integrations
- [ ] **CI/CD Integration** - GitHub Actions, GitLab CI, Jenkins plugins
- [ ] **Cloud Provider Integration** - AWS, Azure, GCP deployment automation

---

**Made with ❤️ by the AIOS team**