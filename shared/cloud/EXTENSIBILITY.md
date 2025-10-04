# Cloud Operations Extensibility Guide

## Overview

The AIOS cloud system is designed for **extensibility beyond deployment**. This guide shows how to add new DevOps operations without modifying core code.

## Architecture Principles

### 1. **Open/Closed Principle**
- System is **open for extension** (new operations)
- System is **closed for modification** (core interfaces stable)

### 2. **Strategy Pattern**
- Each operation type is a pluggable strategy
- Providers implement operations they support
- Client code works with abstractions

### 3. **Type Safety**
- Full TypeScript coverage with discriminated unions
- Compile-time guarantees for operation requests/results
- No runtime type checking needed

## Supported Operation Categories

### Current (✅ Implemented)
- **Deployment Operations**: deploy, rollback, preview

### Future (🚀 Extensible)
- **Infrastructure**: provision, destroy, drift-detection
- **Monitoring**: metrics, logs, traces, alerts
- **Scaling**: auto-scale, manual-scale, load-balancing
- **Security**: secrets, certificates, access-control, vulnerability-scan
- **Database**: provision, backup, restore, migration
- **Networking**: DNS, CDN, firewall, VPN
- **Cost Management**: analysis, optimization, budgets, forecasting
- **CI/CD**: pipeline, build, test, release
- **Containers**: build, registry, orchestration, health-check
- **Backup & DR**: create, restore, schedule, failover

## How to Add a New Operation

### Step 1: Define Operation Types (if not exists)

```typescript
// shared/cloud/types/operations.types.ts

// Add to CloudOperationType union
export type CloudOperationType =
  | 'deployment'
  // ... existing types
  | 'custom:my-operation'; // NEW

// Define request type
export interface MyOperationRequest extends BaseOperationRequest {
  readonly type: 'custom:my-operation';
  readonly myParam: string;
  readonly options?: {
    readonly timeout?: number;
  };
}

// Define result type
export interface MyOperationResult extends BaseOperationResult {
  readonly type: 'custom:my-operation';
  readonly outputData: unknown;
}

// Add to unions
export type CloudOperationRequest =
  | BaseOperationRequest
  // ... existing types
  | MyOperationRequest; // NEW

export type CloudOperationResult =
  | BaseOperationResult
  // ... existing types
  | MyOperationResult; // NEW
```

### Step 2: Implement in Provider

```typescript
// shared/cloud/providers/my-provider.ts

import { BaseProvider } from './base-provider.js';
import type { CloudOperationExecutor } from '../types/operations.types.js';

export class MyProvider extends BaseProvider implements CloudOperationExecutor {

  // Implement CloudOperationExecutor interface
  async executeOperation<T extends CloudOperationRequest>(
    request: T
  ): Promise<Result<CloudOperationResult>> {

    // Type-safe dispatch based on operation type
    switch (request.type) {
      case 'custom:my-operation':
        return this.executeMyOperation(request as MyOperationRequest);

      case 'monitoring:metrics':
        return this.executeMetrics(request as MonitoringMetricsRequest);

      default:
        return {
          success: false,
          error: {
            code: 'OPERATION_NOT_SUPPORTED',
            message: `Operation ${request.type} not supported by ${this.name}`
          }
        };
    }
  }

  getSupportedOperations(): ReadonlyMap<CloudOperationType, OperationCapability> {
    return new Map([
      ['custom:my-operation', {
        type: 'custom:my-operation',
        supported: true,
        maturity: 'beta',
        apiVersion: 'v1',
        requiredPermissions: ['custom:execute'],
        limitations: {
          rateLimit: { requests: 100, period: 'minute' }
        },
        costPerOperation: {
          amount: 0.01,
          currency: 'USD'
        }
      }],
      // ... other operations
    ]);
  }

  supportsOperation(type: CloudOperationType): boolean {
    return this.getSupportedOperations().has(type);
  }

  private async executeMyOperation(
    request: MyOperationRequest
  ): Promise<Result<MyOperationResult>> {
    try {
      // Your custom logic here
      const result: MyOperationResult = {
        operationId: crypto.randomUUID(),
        type: 'custom:my-operation',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 1000,
        outputData: { /* your data */ }
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: (error as Error).message
        }
      };
    }
  }
}
```

### Step 3: Register in Catalog

```typescript
// shared/cloud/providers/provider-catalog.ts

const PROVIDER_CATALOG_CONFIG = [
  {
    type: 'my-provider' as const,
    priority: 6,
    metadata: {
      displayName: 'My Provider',
      description: 'Custom cloud provider with extended operations',
      tier: 'pro' as const,
      stable: true,
      requiredEnvVars: ['MY_PROVIDER_TOKEN'] as const,
      docsUrl: 'https://myprovider.com/docs',

      // NEW: Declare supported operations
      supportedOperations: [
        'deployment',
        'custom:my-operation',
        'monitoring:metrics',
        'cost:analysis'
      ] as const,

      // NEW: Operation-specific capabilities
      operationCapabilities: new Map([
        ['custom:my-operation', {
          type: 'custom:my-operation',
          supported: true,
          maturity: 'stable',
          apiVersion: 'v1',
          costPerOperation: { amount: 0.01, currency: 'USD' }
        }]
      ])
    },
  },
  // ... existing providers
] as const;
```

### Step 4: Use the Operation

```typescript
// Client code

import { getProviderCatalog } from '@aios/cloud/providers';
import type { MyOperationRequest } from '@aios/cloud/types';

async function runCustomOperation() {
  const catalog = getProviderCatalog();

  // Find providers that support this operation
  const providers = catalog.findProvidersByOperation('custom:my-operation');
  console.log(`Found ${providers.length} providers supporting custom operation`);

  // Get recommended provider based on criteria
  const recommended = catalog.recommendProviderForOperation(
    'custom:my-operation',
    { tier: 'pro', stable: true, maxCost: 0.05 }
  );

  if (!recommended) {
    throw new Error('No provider found for operation');
  }

  // Get provider instance and execute
  const providerConstructor = await catalog.getConstructor(recommended.type);
  const provider = new providerConstructor!();

  // Type-safe operation request
  const request: MyOperationRequest = {
    type: 'custom:my-operation',
    myParam: 'value',
    operationId: crypto.randomUUID(),
    timeout: 30000,
    tags: { environment: 'production' }
  };

  // Execute operation
  const result = await (provider as CloudOperationExecutor).executeOperation(request);

  if (result.success) {
    console.log('Operation completed:', result.data);
  } else {
    console.error('Operation failed:', result.error);
  }
}
```

## Discovery & Introspection

### Find Providers by Operation

```typescript
const catalog = getProviderCatalog();

// Find all providers supporting monitoring
const monitoringProviders = catalog.findProvidersByOperation('monitoring:metrics');

// Get all unique operations across all providers
const allOperations = catalog.getAllSupportedOperations();
console.log(`System supports ${allOperations.length} operation types`);

// Get capability matrix (operation → provider → capability)
const matrix = catalog.getOperationCapabilityMatrix();
const metricsCapabilities = matrix.get('monitoring:metrics');
// Map of provider → capability for metrics operation
```

### Recommend Best Provider

```typescript
// Automatic provider selection based on requirements
const bestProvider = catalog.recommendProviderForOperation(
  'database:provision',
  {
    tier: 'enterprise',      // Enterprise-grade provider
    stable: true,            // Production-ready only
    maxCost: 1.00           // Cost constraint
  }
);

if (bestProvider) {
  console.log(`Recommended: ${bestProvider.metadata.displayName}`);
  console.log(`Maturity: ${bestProvider.metadata.operationCapabilities?.get('database:provision')?.maturity}`);
}
```

## Type Safety Benefits

### Compile-Time Guarantees

```typescript
// ✅ VALID: Type-safe operation request
const request: MonitoringMetricsRequest = {
  type: 'monitoring:metrics',
  resourceId: 'my-resource',
  metrics: ['cpu', 'memory'],
  timeRange: {
    start: new Date('2025-01-01'),
    end: new Date()
  }
};

// ❌ INVALID: TypeScript will catch this at compile-time
const invalid: MonitoringMetricsRequest = {
  type: 'monitoring:metrics',
  resourceId: 'my-resource',
  // Missing required 'metrics' field - compile error!
};
```

### Discriminated Unions

```typescript
function handleOperationResult(result: CloudOperationResult) {
  // TypeScript knows the shape based on 'type' discriminator
  switch (result.type) {
    case 'monitoring:metrics':
      // result is typed as MonitoringMetricsResult
      console.log(result.metrics.length);
      break;

    case 'cost:analysis':
      // result is typed as CostAnalysisResult
      console.log(result.total.amount);
      break;
  }
}
```

## Migration Path

### Phase 1: ✅ Current (Deployment Only)
- Providers implement `CloudProvider` interface
- Only deployment operations
- Catalog tracks basic metadata

### Phase 2: 🚀 Enhanced (Multi-Operation)
- Providers also implement `CloudOperationExecutor`
- Support for 40+ operation types
- Catalog tracks operation capabilities
- **Backward compatible**: Existing deployment code unchanged

### Phase 3: 🔮 Future (Plugin System)
- Dynamic operation plugin loading
- Custom operation types from external packages
- Runtime operation registration
- Community-contributed operations

## Example: Adding Database Operations to AWS Provider

```typescript
// aws-provider.ts

import { AmplifyClient } from '@aws-sdk/client-amplify';
import { RDSClient, CreateDBInstanceCommand } from '@aws-sdk/client-rds';

export class AWSProvider extends BaseProvider implements CloudOperationExecutor {
  private rdsClient?: RDSClient;

  async executeOperation<T extends CloudOperationRequest>(
    request: T
  ): Promise<Result<CloudOperationResult>> {
    switch (request.type) {
      case 'database:provision':
        return this.provisionDatabase(request as DatabaseProvisionRequest);

      case 'database:backup':
        return this.backupDatabase(request as DatabaseBackupRequest);

      // ... other operations
    }
  }

  private async provisionDatabase(
    request: DatabaseProvisionRequest
  ): Promise<Result<BaseOperationResult>> {
    const rds = this.getRDSClient();

    const command = new CreateDBInstanceCommand({
      DBInstanceIdentifier: `db-${request.operationId}`,
      Engine: request.engine, // postgresql, mysql, etc.
      EngineVersion: request.version,
      DBInstanceClass: request.instance.type,
      AllocatedStorage: request.instance.storage.size,
      BackupRetentionPeriod: request.instance.backup?.retentionDays || 7,
      // ... AWS-specific mapping
    });

    const response = await rds.send(command);

    return {
      success: true,
      data: {
        operationId: request.operationId!,
        type: 'database:provision',
        status: 'completed',
        startedAt: new Date(),
        resourceIds: [response.DBInstance!.DBInstanceIdentifier!]
      }
    };
  }
}
```

## Benefits

### 1. **No Core Modifications**
- Add new operations without touching CloudManager, ProviderRegistry, etc.
- Core system remains stable

### 2. **Type Safety**
- Full compile-time checking
- Auto-completion in IDE
- Refactoring-friendly

### 3. **Provider Flexibility**
- Each provider chooses which operations to support
- No forced implementation of unsupported features
- Clear capability declaration

### 4. **Discovery & Recommendation**
- Automatic provider selection based on operation needs
- Cost-aware routing
- Maturity-based filtering

### 5. **Future-Proof**
- Easy to add new operation categories
- Plugin system ready
- Community extensibility

## Conclusion

The architecture is **fully prepared for future DevOps operations**:

✅ Type-safe operation abstractions
✅ Plugin-ready provider system
✅ Capability-based discovery
✅ Cost-aware recommendation
✅ Zero-modification extensibility

Adding a new operation requires:
1. Define types (request/result interfaces)
2. Implement in providers that support it
3. Register capabilities in catalog
4. Use type-safe client code

**No changes to core CloudManager, ProviderRegistry, or existing code.**
