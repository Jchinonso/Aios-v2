# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIOS v2 is an AI-powered DevOps assistant providing conversational infrastructure management. It's a **TypeScript monorepo** using npm workspaces with two packages:
- **`@aios/shared`**: Core libraries (cloud providers, AI services, project analysis)
- **`@aios/cli`**: Command-line interface (thin wrapper around shared)

The system enables natural language deployment to multiple cloud providers (Vercel, Netlify, AWS, Railway, Render) with automatic project analysis and intelligent recommendations.

### AIOS-Shell Vision (Future Roadmap)

The project is evolving toward **AIOS-Shell** - a provider-agnostic DevOps orchestrator with:
- **Plan/Apply/Verify cycles** for safe deployments
- **State persistence** (`.aios/` directory) tracking deployments, rollbacks, and project fingerprints
- **OS keyring integration** for secure credential storage
- **Read-only adoption** of existing projects before enabling writes
- **Policy guardrails** with approval flows and compliance hooks
- **Day-2 operations**: env/secrets management, scaling, DR, incident management

**Current Status:** Foundation complete (~70% architectural alignment). See `AIOS_SHELL_ROADMAP.md` for detailed implementation plan.

## Development Commands

### Building
```bash
# Build entire monorepo
npm run build

# Build individual packages
npm run build:shared
npm run build:cli

# Clean build artifacts
npm run clean
```

### Running
```bash
# Development mode (CLI with hot reload)
npm run dev

# Production mode
npm run build && npm start

# Direct CLI execution
npm run aios
```

### Type Checking & Validation
```bash
# Type check without emitting files
npm run type-check

# Run all validation checks
npm run validate:all

# Individual validators
npm run validate:structure
npm run validate:style
npm run validate:quality
npm run validate:file-sizes
```

### Linting & Formatting
```bash
# Lint all packages
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Security checks
npm run security:audit
npm run security:check
```

## Architecture

### Monorepo Structure
```
aios-v2/
├── shared/              # @aios/shared - Core shared libraries
│   ├── cloud/           # Cloud provider integrations
│   ├── intelligence/    # AI services and project analysis
│   ├── core/            # Core utilities (logging, metrics, results)
│   ├── types/           # Shared TypeScript types
│   ├── constants/       # Global constants
│   └── utils/           # Utility functions
├── node-cli/            # @aios/cli - CLI interface
│   ├── commands/        # CLI command handlers
│   ├── handlers/        # Business logic handlers
│   ├── services/        # CLI-specific services
│   └── cli.ts          # Main entry point
└── scripts/             # Build and validation scripts
```

### Cloud Module (`shared/cloud/`)

**Single Responsibility Architecture** - Each component has one clear purpose:

- **`cloud-manager.ts`**: High-level orchestrator coordinating all cloud operations
- **`providers/`**: Provider implementations following `BaseProvider` abstract class
  - `base-provider.ts`: Abstract base with common logic
  - `vercel-provider.ts`, `netlify-provider.ts`, etc.: Concrete implementations
  - `provider-catalog.ts`: **Single source of truth** for all provider metadata
  - `provider-registry.ts`: Runtime provider instance management
  - `provider-factory.ts`: Provider instantiation (deprecated, use catalog)
- **`services/`**: Specialized services (cost analysis, health checks, deployment orchestration)
- **`types/`**: Type definitions including `operations.types.ts` for extensibility
- **`constants/provider-constants.ts`**: **All magic numbers live here** (TIME_CONSTANTS, DEFAULT_LIMITS, PROGRESS, DEFAULT_COSTS, POLLING_INTERVALS)

**Critical Design Patterns:**
1. **Provider Catalog Pattern**: `provider-catalog.ts` is the **single source of truth** - never hardcode provider lists
2. **No Magic Numbers**: Use constants from `provider-constants.ts` - search for hardcoded numbers before committing
3. **Type-Safe Operations**: Future operations use discriminated unions in `operations.types.ts`
4. **Lazy Loading**: Providers loaded dynamically to avoid circular dependencies

**Anti-Patterns to Avoid:**
- ❌ Hardcoding provider lists (use `getSupportedProviders()`, `getProvidersByFeature()`)
- ❌ Magic numbers for timeouts/limits (use TIME_CONSTANTS, DEFAULT_LIMITS)
- ❌ Using 'as any' casts (create proper type guards in `provider-config.types.ts`)
- ❌ Duplicate provider registration (catalog auto-registers via `registerAllProviders()`)

### Intelligence Module (`shared/intelligence/`)

**AI-Powered Analysis Engine** with multiple specialized components:

- **`services/ai-service/`**: High-level AI service with conversation management
  - Handles multiple AI providers (OpenAI, Anthropic, Groq, Ollama)
  - Manages conversation context and message processing
  - Provider abstraction layer
- **`file-system/`**: Project analysis and pattern detection
  - `analyzers/unified-analyzer.ts`: **Primary analyzer** - configuration-driven, replaces all language-specific analyzers
  - `services/`: Specialized services (language detection, dependency analysis, build config)
  - `config/analyzer-config/`: Pattern definitions for framework/language detection
- **`providers/`**: Low-level AI provider implementations (OpenAI, Anthropic, Groq, Ollama)
- **`types/`**: Comprehensive type definitions for AI and analysis

**Key Principle**: `UnifiedAnalyzer` is the **single analyzer** - don't create language-specific analyzers. Extend via configuration in `analyzer-config/`.

### Core Module (`shared/core/`)

Foundational infrastructure:
- **Logging**: `ILogger` interface with multiple implementations
- **Metrics**: `IMetricsCollector` for observability
- **Results**: `Result<T>` type for Railway-Oriented Programming (no exceptions for expected errors)
- **Error Handling**: Structured error types with context

## TypeScript Configuration

**Strictest Possible Settings** - this project enforces enterprise-grade type safety:

```typescript
{
  "strict": true,
  "noImplicitAny": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noUncheckedIndexedAccess": true,
  "noPropertyAccessFromIndexSignature": true
}
```

**Critical Rules:**
1. **Index Access**: Use `process.env['VAR']` not `process.env.VAR` (strict mode)
2. **Array Access**: Always check `array[index]` could be undefined
3. **Type Assertions**: Use type guards over 'as any' - create them in provider-config.types.ts
4. **Const Assertions**: Use `as const` for readonly objects/arrays

## Recent Refactoring (Production-Grade)

**Completed Sept 2024** - God Mode refactoring with Principal Engineer rigor:

1. ✅ **Eliminated ALL Hardcoding**
   - Provider lists → ProviderCatalog (single source of truth)
   - Magic numbers → provider-constants.ts
   - Feature maps → Dynamic catalog discovery

2. ✅ **Zero 'as any' Casts** (in business logic)
   - Created type-safe provider configs (provider-config.types.ts)
   - Implemented extractToken() utility and type guards
   - Only remaining 'as any': lazy loading in catalog (acceptable)

3. ✅ **Removed ALL Duplication**
   - Deleted ~5,400 LOC redundant provider folders
   - Removed mock analyzeProjectImplementation() from all providers
   - Single UnifiedAnalyzer (no language-specific analyzers)

4. ✅ **Full Type Safety**
   - 0 TypeScript errors in strict mode
   - Proper discriminated unions for operations
   - Complete type coverage

**If Adding New Code:**
- Check FINAL_REFACTORING_REPORT.md for architecture decisions
- Use provider-constants.ts for any timeout/limit/cost values
- Register new providers in provider-catalog.ts, not hardcoded lists
- Extend operations via operations.types.ts (see EXTENSIBILITY.md)

## Environment Variables

**Required** (at least one AI provider):
```bash
OPENAI_API_KEY=sk-...           # OpenAI GPT models
ANTHROPIC_API_KEY=sk-ant-...    # Anthropic Claude models
GROQ_API_KEY=gsk_...            # Groq fast inference
# Ollama requires no key, just local installation
```

**Optional** (cloud providers):
```bash
VERCEL_TOKEN=...
NETLIFY_TOKEN=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

**Configuration:**
```bash
NODE_ENV=development|production
LOG_LEVEL=info|debug|error
```

## Common Workflows

### Adding a New Cloud Provider

1. Create provider class extending `BaseProvider` in `shared/cloud/providers/`
2. Register in `provider-catalog.ts` PROVIDER_CATALOG_CONFIG (single source of truth)
3. Implement required methods: `deployImplementation()`, `getDeploymentStatusImplementation()`, etc.
4. Use constants from `provider-constants.ts` for all timeouts/limits
5. Add provider-specific config type to `provider-config.types.ts`
6. That's it - catalog auto-registers via `registerAllProviders()`

### Adding a New DevOps Operation

1. Define operation types in `shared/cloud/types/operations.types.ts`
2. Add to `CloudOperationType` union
3. Create request/result interfaces extending base types
4. Implement in supporting providers
5. Update provider metadata in `provider-catalog.ts`

See `shared/cloud/EXTENSIBILITY.md` for detailed guide with 40+ operation categories.

### Extending Project Analysis

1. Add patterns to `shared/intelligence/file-system/config/analyzer-config/`
2. No need for new analyzer classes - `UnifiedAnalyzer` is configuration-driven
3. Patterns defined per language/framework in JSON-like configs
4. Supports: frameworks, build tools, dependencies, file patterns

## Testing

```bash
# Run all tests
npm run test

# Test individual packages
npm run test -w shared
npm run test -w node-cli
```

## Key Documentation

- `AIOS_SHELL_ROADMAP.md` - **[NEW]** Complete implementation roadmap for PRD features
- `shared/cloud/README.md` - Cloud module deep dive
- `shared/cloud/EXTENSIBILITY.md` - Adding new operations (40+ operation types)
- `shared/cloud/API.md` - CloudManager API reference
- `shared/intelligence/README.md` - Intelligence module architecture
- `FINAL_REFACTORING_REPORT.md` - Recent refactoring decisions and metrics
- `README.md` - User-facing documentation and quick start

## Code Quality Standards

**Enforced via ESLint + TypeScript strict mode:**
- No unused variables/parameters (will fail build)
- No implicit any types
- No unsafe index access without checks
- Proper error handling via Result type (Railway-Oriented Programming)
- Security linting enabled (eslint-plugin-security)

**Before Committing:**
```bash
npm run validate:all  # Runs lint, type-check, security, and all validators
```

### Senior Developer Standards

We follow enterprise-grade coding standards that ensure clarity, maintainability, and safety:

#### Code Quality Metrics
| Metric | Excellent (A) | Good (B) | Needs Work (C-F) |
|--------|---------------|----------|------------------|
| Cyclomatic Complexity | ≤ 5 | ≤ 8 | > 8 |
| Cognitive Complexity | ≤ 3 | ≤ 6 | > 6 |
| Method Length | ≤ 20 lines | ≤ 30 lines | > 30 lines |
| Class Length | ≤ 200 lines | ≤ 300 lines | > 300 lines |
| Parameter Count | ≤ 3 | ≤ 4 | > 4 |
| Test Coverage | ≥ 95% | ≥ 85% | < 85% |

#### Naming Conventions

```typescript
// Interfaces - PascalCase with 'I' prefix
interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
}

// Types - PascalCase with 'Type' suffix
type ValidationResultType = {
  isValid: boolean;
  errors: string[];
};

// Enums - PascalCase with 'Enum' suffix
enum UserStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Classes - PascalCase
class DatabaseConnectionManager { }

// Functions/Methods - camelCase
function calculateMonthlyRevenue(subscriptions: ISubscription[]): number { }

// Constants - UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Private members - camelCase with underscore prefix
class UserService {
  private readonly _userRepository: IUserRepository;
}

// Boolean variables - descriptive predicates
const isUserAuthenticated = await authService.verifyToken(token);
const hasPermissionToEdit = user.permissions.includes('edit');
```

#### Documentation Standards

All exported functions must have JSDoc:

```typescript
/**
 * Calculates the compound annual growth rate (CAGR) for a given investment.
 *
 * @param startValue - The initial investment value (must be positive)
 * @param endValue - The final investment value (must be positive)
 * @param years - The number of years (must be positive)
 * @returns The CAGR as a decimal (e.g., 0.15 for 15%)
 *
 * @throws {Error} When any parameter is negative or zero
 *
 * @example
 * ```typescript
 * const cagr = calculateCompoundAnnualGrowthRate(1000, 1500, 3);
 * console.log(`CAGR: ${(cagr * 100).toFixed(2)}%`); // "CAGR: 14.47%"
 * ```
 */
export function calculateCompoundAnnualGrowthRate(
  startValue: number,
  endValue: number,
  years: number,
): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) {
    throw new Error('All parameters must be positive values');
  }
  return Math.pow(endValue / startValue, 1 / years) - 1;
}
```

#### SOLID Principles

**Single Responsibility Principle:**
```typescript
// ✅ Good - Each class has one responsibility
class UserValidator {
  validate(user: IUser): IValidationResult { }
}

class UserRepository {
  save(user: IUser): Promise<void> { }
}

class EmailService {
  sendWelcomeEmail(user: IUser): Promise<void> { }
}
```

**Interface Segregation:**
```typescript
// ✅ Good - Segregated interfaces
interface IUserCrudOperations {
  create(user: IUser): Promise<IUser>;
  update(user: IUser): Promise<IUser>;
  delete(id: string): Promise<void>;
}

interface IUserReporting {
  generateReport(): Promise<string>;
}
```

#### Error Handling

Use the **Result Pattern** for safe operations:

```typescript
type ResultType<T, E = Error> =
  | { success: true; data: T; error?: undefined }
  | { success: false; data?: undefined; error: E };

export function safeJsonParse<T>(jsonString: string): ResultType<T, SyntaxError> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof SyntaxError ? error : new SyntaxError('Invalid JSON format')
    };
  }
}

// Usage
const result = safeJsonParse<IUserData>(userJsonString);
if (result.success) {
  console.log('User data:', result.data);
} else {
  logger.error('Failed to parse user data:', result.error.message);
}
```

Create custom error classes for domain-specific errors:

```typescript
abstract class BaseApplicationError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ResourceNotFoundError extends BaseApplicationError {
  constructor(resourceType: string, identifier: string) {
    super(
      `${resourceType} with identifier '${identifier}' was not found`,
      'RESOURCE_NOT_FOUND'
    );
  }
}
```

#### Pure Functions and Immutability

Prefer pure functions when possible:

```typescript
// ✅ Pure function - predictable, testable, cacheable
function calculateTotalPrice(
  items: readonly ICartItem[],
  taxRate: number,
  discountPercentage: number = 0
): number {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercentage / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = discountedSubtotal * taxRate;
  return discountedSubtotal + taxAmount;
}

// ✅ Immutable updates
function updateUserProfile(
  user: Readonly<IUser>,
  updates: Partial<IUser>
): IUser {
  return {
    ...user,
    ...updates,
    updatedAt: new Date(),
  };
}
```

#### Design Patterns

**Factory Pattern:**
```typescript
export class NotificationServiceFactory {
  public static createService(
    type: NotificationTypeEnum,
    config: INotificationConfig
  ): INotificationService {
    switch (type) {
      case NotificationTypeEnum.EMAIL:
        return new EmailNotificationService(config.email!);
      case NotificationTypeEnum.SMS:
        return new SmsNotificationService(config.sms!);
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
  }
}
```

**Builder Pattern:**
```typescript
export class DatabaseConfigBuilder {
  private _config: Partial<IDatabaseConfig> = {};

  public host(host: string): this {
    this._config.host = host;
    return this;
  }

  public port(port: number): this {
    this._config.port = port;
    return this;
  }

  public build(): IDatabaseConfig {
    this._validateRequiredFields();
    return { ...this._config } as IDatabaseConfig;
  }
}

// Usage
const dbConfig = new DatabaseConfigBuilder()
  .host('localhost')
  .port(5432)
  .build();
```

#### Testing Standards (AAA Pattern)

```typescript
describe('UserService', () => {
  it('should create a new user with valid data', async () => {
    // Arrange
    const userData = { name: 'John Doe', email: 'john@example.com' };
    const mockRepository = createMockUserRepository();
    const userService = new UserService(mockRepository);

    // Act
    const result = await userService.createUser(userData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(userData);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});
```

#### Performance Considerations

Use memoization and caching for expensive operations:

```typescript
export class PermissionService {
  private readonly _permissionCache = new Map<string, Promise<IPermissionSet>>();
  private readonly _cacheExpirationMs = 5 * 60 * 1000; // 5 minutes

  public async getUserPermissions(userId: string): Promise<IPermissionSet> {
    const cacheKey = `permissions:${userId}`;
    const cachedPromise = this._permissionCache.get(cacheKey);

    if (cachedPromise) {
      return cachedPromise;
    }

    const permissionPromise = this._fetchUserPermissions(userId);
    this._permissionCache.set(cacheKey, permissionPromise);

    setTimeout(() => {
      this._permissionCache.delete(cacheKey);
    }, this._cacheExpirationMs);

    return permissionPromise;
  }
}
```

See `docs/CODING_STANDARDS.md` for complete guidelines with additional examples and patterns.
