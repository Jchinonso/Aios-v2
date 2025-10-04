# Utils Module

The utils module provides essential utility classes and functions that are used across the AIOS v2 system. This module follows SOLID principles and provides reusable functionality for configuration management, file operations, and logging.

## 🎯 Purpose

This module serves as the utility foundation of the application, providing:
- **Configuration Management** - Centralized config loading and saving
- **File Operations** - Safe and efficient file system utilities
- **Logging** - Structured logging with context and levels
- **Reusability** - Common functionality used across modules

## 📁 File Structure

```
utils/
├── config-manager.ts     # Configuration management utilities
├── file-utils.ts         # File system operation utilities
├── logger.ts             # Logging utilities
└── index.ts              # Module exports
```

## 🔧 Key Components

### Configuration Manager (`config-manager.ts`)
Comprehensive configuration management with:
- **Config Loading** - Automatic config file creation and loading
- **Config Saving** - Safe configuration persistence
- **Provider Management** - AI and cloud provider configurations
- **Settings Management** - Application settings and preferences
- **Default Merging** - Intelligent default value merging

```typescript
import { ConfigManager } from './utils';

// Usage
const configManager = new ConfigManager();
const result = await configManager.loadConfig();

if (result.isSuccess) {
  const config = result.data;
  // Use configuration
}
```

**Key Features:**
- Automatic config file creation with defaults
- Provider-specific configuration management
- Settings validation and merging
- Path resolution and directory creation
- Error handling with Result pattern

### File Utils (`file-utils.ts`)
Safe file system operations with:
- **File Operations** - Read, write, delete, exists
- **Directory Management** - Create directories, list files
- **Path Utilities** - Extension extraction, path validation
- **Statistics** - File stats and metadata
- **Safety** - Path sanitization and validation

```typescript
import { FileUtils, fileUtils, getFileExtension } from './utils';

// Usage
const fileUtils = new FileUtils();
const exists = await fileUtils.exists('/path/to/file');
const content = await fileUtils.readFile('/path/to/file');

// Utility functions
const ext = getFileExtension('file.txt'); // '.txt'
```

**Key Features:**
- Promise-based async operations
- Automatic directory creation
- Path validation and sanitization
- File statistics and metadata
- Error handling for file operations

### Logger (`logger.ts`)
Structured logging system with:
- **Log Levels** - Debug, info, warn, error, trace
- **Context Support** - Additional context in log entries
- **Service Identification** - Service-specific logging
- **JSON Output** - Structured log format
- **Level Filtering** - Configurable log level filtering

```typescript
import { Logger, createLogger } from './utils';

// Usage
const logger = createLogger('MyService', 'debug');
logger.info('Operation completed', { userId: 123 });
logger.error('Operation failed', error, { context: 'deployment' });
```

**Key Features:**
- Configurable log levels
- Structured JSON output
- Context and metadata support
- Error stack trace logging
- Service identification

## 🚀 Usage Examples

### Configuration Management
```typescript
import { ConfigManager } from './utils';

async function setupConfiguration() {
  const configManager = new ConfigManager();
  
  // Load or create configuration
  const loadResult = await configManager.loadConfig();
  if (loadResult.isFailure) {
    console.error('Failed to load config:', loadResult.error);
    return;
  }
  
  // Update AI provider settings
  configManager.updateAIProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  });
  
  // Save configuration
  const saveResult = await configManager.saveConfig();
  if (saveResult.isFailure) {
    console.error('Failed to save config:', saveResult.error);
  }
}
```

### File Operations
```typescript
import { FileUtils, getFileExtension, isValidPath } from './utils';

async function processFiles() {
  const fileUtils = new FileUtils();
  
  // Check if file exists
  const exists = await fileUtils.exists('/path/to/file');
  if (!exists) {
    console.log('File does not exist');
    return;
  }
  
  // Read file content
  const content = await fileUtils.readFile('/path/to/file');
  
  // Validate path
  if (isValidPath('/path/to/file')) {
    const extension = getFileExtension('/path/to/file');
    console.log('File extension:', extension);
  }
  
  // Get file statistics
  const stats = await fileUtils.getFileStats('/path/to/file');
  console.log('File size:', stats.size);
}
```

### Logging
```typescript
import { createLogger } from './utils';

function performOperation() {
  const logger = createLogger('DeploymentService', 'info');
  
  logger.info('Starting deployment', { 
    project: 'my-app',
    environment: 'production' 
  });
  
  try {
    // Perform operation
    logger.info('Deployment completed successfully');
  } catch (error) {
    logger.error('Deployment failed', error as Error, {
      project: 'my-app',
      step: 'build'
    });
  }
}
```

## 🔄 Integration

The utils module integrates with:
- **Constants Module** - Default values and configuration
- **Intelligence Module** - Configuration for AI providers
- **Core Module** - Result pattern and error handling
- **Types Module** - Type definitions and interfaces

## 📋 Best Practices

1. **Use Result Pattern** - All operations return Result<T> for error handling
2. **Async Operations** - Use async/await for file operations
3. **Error Handling** - Always check for failures and handle errors
4. **Path Validation** - Validate paths before file operations
5. **Context Logging** - Include relevant context in log messages

## 🛠️ Configuration Schema

The ConfigManager uses the following configuration structure:

```typescript
interface ConfigFile {
  ai: {
    defaultProvider: string;
    providers: Record<string, AIProviderConfig>;
  };
  cloud: {
    defaultProvider: string;
    providers: Record<string, CloudProviderConfig>;
  };
  settings: {
    verbose: boolean;
    autoSave: boolean;
    theme: string;
  };
}
```

## 📊 Statistics

- **3 utility classes** with comprehensive functionality
- **20+ utility functions** for common operations
- **100% TypeScript** with strict typing
- **Promise-based** async operations
- **Error-safe** with Result pattern

## 🔮 Future Enhancements

- [ ] Configuration validation schemas
- [ ] File watching and change detection
- [ ] Log rotation and archival
- [ ] Performance monitoring utilities
- [ ] Caching utilities
- [ ] Network utilities
- [ ] Encryption utilities
