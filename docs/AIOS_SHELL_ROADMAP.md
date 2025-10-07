# AIOS-Shell Implementation Roadmap

## Executive Summary

This roadmap bridges the current AIOS v2 implementation to the AIOS-Shell PRD vision. The current codebase provides a **solid foundation** (~70% architectural alignment) for the PRD's Phase 1 requirements.

## Current State Assessment

### ✅ Strong Foundation (Already Implemented)

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Project Analysis | ✅ Complete | `shared/intelligence/file-system/analyzers/unified-analyzer.ts` | Detects stack, deps, build commands |
| Multi-Provider | ✅ Complete | `shared/cloud/providers/` | Vercel, Netlify, AWS, Railway, Render |
| Provider Catalog | ✅ Complete | `shared/cloud/providers/provider-catalog.ts` | Single source of truth, metadata system |
| Deploy Operations | ✅ Complete | `shared/cloud/cloud-manager.ts` | Orchestrates deployments |
| Status/Logs | ✅ Complete | Provider implementations | `getDeploymentStatus()`, `getDeploymentLogs()` |
| AI/NL Services | ✅ Complete | `shared/intelligence/services/ai-service/` | OpenAI, Anthropic, Groq, Ollama |
| Cost Estimation | ✅ Complete | Provider `estimateCost()` methods | Basic cost calculation |
| Type Safety | ✅ Complete | Strict TypeScript throughout | Railway-Oriented Programming |
| Extensibility | ✅ Complete | `shared/cloud/types/operations.types.ts` | Designed for 40+ operation types |

### 🟡 Partial Implementation (Needs Enhancement)

| Feature | Current State | PRD Requirement | Gap |
|---------|---------------|-----------------|-----|
| Recommendations | Basic comparison | Ranked scores with rationale | Scoring algorithm, trade-off explanations |
| Security | Env vars only | OS keyring/KMS | Secure credential storage |
| CLI Structure | Basic commands | PRD command contract | Restructure to `aios cloud <verb>` pattern |
| Multi-Account | Single account | Account/team selection | Prompt for ambiguous cases |
| Health Checks | Provider methods exist | Verify cycle post-deploy | Automated smoke tests |

### ❌ Missing Components (New Development Required)

| Component | Priority | Complexity | Dependencies |
|-----------|----------|------------|--------------|
| **Plan/Apply/Verify** | P0 (Phase 1) | High | State management, diff engine |
| **State Persistence** | P0 (Phase 1) | Medium | `.aios/` directory structure |
| **Connect/Adopt Flow** | P0 (Phase 1) | Medium | Read-only mode, ownership verification |
| **Policy Engine** | P1 (Phase 2) | High | OPA integration or custom rules |
| **Secrets Vault** | P0 (Phase 1) | High | OS keyring, redaction filters |
| **Rollback UX** | P0 (Phase 1) | Medium | State history, one-liner generation |
| **Observability** | P1 (Phase 2) | Medium | Trace IDs, structured events |
| **DR/Chaos** | P2 (Phase 4) | High | Chaos engineering framework |
| **Incident Mgmt** | P2 (Phase 4) | High | PagerDuty/OpsGenie integration |
| **SBOM/Attest** | P2 (Phase 3-4) | Medium | Supply chain security tooling |

## Phase 1 Implementation Plan (MVP)

### 1.1 State Management System (Week 1-2)

**Goal:** Persist deployment state locally in `.aios/` directory.

**Implementation:**
```typescript
// shared/cloud/state/state-manager.ts
interface DeploymentRecord {
  id: string;
  timestamp: Date;
  provider: string;
  environment: 'staging' | 'production';
  status: 'success' | 'failed' | 'rolled-back';
  urls: string[];
  metadata: Record<string, unknown>;
  rollbackCommand?: string;
}

interface ProjectFingerprint {
  analyzedAt: Date;
  language: string;
  framework: string;
  dependencies: DependencyInfo[];
  buildCommand: string;
  outputDirectory: string;
  services: ServiceInfo[];
  cacheHash: string;
}

class StateManager {
  private stateDir = '.aios/';

  async persistDeployment(record: DeploymentRecord): Promise<void>
  async getDeploymentHistory(limit?: number): Promise<DeploymentRecord[]>
  async persistFingerprint(fingerprint: ProjectFingerprint): Promise<void>
  async getCachedFingerprint(): Promise<ProjectFingerprint | null>
}
```

**Integration Points:**
- Update `CloudManager.deploy()` to persist records
- Add `StateManager` to core services
- Create `.aios/` on first run with `.gitignore`

**Files to Create:**
- `shared/cloud/state/state-manager.ts`
- `shared/cloud/state/types.ts`
- `shared/cloud/state/__tests__/state-manager.test.ts`

**Success Criteria:**
- ✅ `.aios/deployments.json` persists after each deploy
- ✅ `.aios/fingerprint.json` caches analysis results
- ✅ Deployment history retrievable with `StateManager.getDeploymentHistory()`

### 1.2 Secrets Vault & OS Keyring (Week 2-3)

**Goal:** Store credentials securely in OS keyring, never on disk.

**Implementation:**
```typescript
// shared/core/security/keyring-service.ts
interface KeyringService {
  store(service: string, account: string, secret: string): Promise<void>;
  retrieve(service: string, account: string): Promise<string | null>;
  delete(service: string, account: string): Promise<void>;
  list(service: string): Promise<string[]>;
}

// Platform-specific implementations
class MacOSKeyringService implements KeyringService { /* Keychain API */ }
class LinuxKeyringService implements KeyringService { /* libsecret */ }
class WindowsKeyringService implements KeyringService { /* Credential Manager */ }

// shared/cloud/security/secrets-vault.ts
interface SecretsVaultRef {
  service: string;
  account: string;
  keyringRef: string;
}

class SecretsVault {
  constructor(private keyring: KeyringService) {}

  async storeProviderToken(provider: string, token: string): Promise<SecretsVaultRef>
  async getProviderToken(ref: SecretsVaultRef): Promise<string>
  async rotateToken(ref: SecretsVaultRef, newToken: string): Promise<void>
}
```

**Dependencies:**
- `keytar` npm package for cross-platform keyring access
- Or native bindings: `@nodelib/keychain` (macOS), `libsecret` (Linux), `node-credential-store` (Windows)

**Integration Points:**
- Update `CloudManager.configureProvider()` to use vault
- Migrate existing env var logic to keyring fallback
- Add `SecretsVault` to core services

**Files to Create:**
- `shared/core/security/keyring-service.ts`
- `shared/cloud/security/secrets-vault.ts`
- `shared/cloud/security/redaction-filter.ts` (scrub outputs)
- `shared/cloud/security/__tests__/secrets-vault.test.ts`

**Success Criteria:**
- ✅ Tokens stored in OS keyring, not `.env` or disk
- ✅ `.aios/connection.json` contains vault refs only
- ✅ Output redaction filters scrub secrets/JWTs/PII

### 1.3 Plan/Apply/Verify Cycle (Week 3-4)

**Goal:** Show diff before deploy, verify after, offer rollback.

**Implementation:**
```typescript
// shared/cloud/deployment/deployment-planner.ts
interface DeploymentPlan {
  changes: {
    type: 'create' | 'update' | 'delete';
    resource: string;
    before: unknown;
    after: unknown;
  }[];
  buildCommand: string;
  estimatedTime: number;
  risks: string[];
}

class DeploymentPlanner {
  async generatePlan(
    provider: string,
    config: DeploymentConfig,
    previousState?: DeploymentRecord
  ): Promise<DeploymentPlan>
}

// shared/cloud/deployment/deployment-verifier.ts
interface VerificationResult {
  healthy: boolean;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

class DeploymentVerifier {
  async verify(
    provider: string,
    deploymentId: string,
    config: DeploymentConfig
  ): Promise<VerificationResult>
}

// Update CloudManager
class CloudManager {
  async plan(provider: string, config: DeploymentConfig): Promise<DeploymentPlan>
  async apply(provider: string, plan: DeploymentPlan): Promise<DeploymentResult>
  async verify(provider: string, deploymentId: string): Promise<VerificationResult>
}
```

**Integration Points:**
- Add `plan()` step before `deploy()` in CLI
- Auto-verify after deployment
- Store verification results in deployment record

**Files to Create:**
- `shared/cloud/deployment/deployment-planner.ts`
- `shared/cloud/deployment/deployment-verifier.ts`
- `shared/cloud/deployment/__tests__/planner.test.ts`

**Success Criteria:**
- ✅ `aios cloud deploy` shows plan and requires confirmation
- ✅ Post-deploy health checks run automatically
- ✅ Failed verification suggests rollback

### 1.4 CLI Restructuring (Week 4-5)

**Goal:** Align CLI with PRD command contract.

**Current Structure:**
```bash
aios chat
aios deploy
aios analyze
```

**PRD Structure:**
```bash
aios cloud analyze [--path <dir>]
aios cloud recommend
aios cloud connect --provider <name> [--read-only]
aios cloud deploy --env <staging|production>
aios cloud status [--env <env>] [--last]
aios cloud logs [--service <name>] [--env <env>] [--since <15m>] [--level <error>]
aios cloud open [--provider <p>] [--project <id>]
aios cloud adopt --provider <p> [--project <id>] [--enable-write]
aios cloud rollback [--deployment <id>]
```

**Implementation:**
```typescript
// node-cli/commands/cloud/index.ts
export const cloudCommand = new Command('cloud')
  .description('Cloud deployment and operations');

cloudCommand
  .command('analyze')
  .option('--path <dir>', 'Project directory', process.cwd())
  .option('--json', 'Output as JSON')
  .action(analyzeHandler);

cloudCommand
  .command('recommend')
  .option('--json', 'Output as JSON')
  .action(recommendHandler);

cloudCommand
  .command('connect')
  .requiredOption('--provider <name>', 'Provider to connect')
  .option('--read-only', 'Connect in read-only mode')
  .action(connectHandler);

cloudCommand
  .command('deploy')
  .option('--env <environment>', 'Target environment', 'staging')
  .option('--dry-run', 'Show plan without applying')
  .action(deployHandler);

// ... other commands
```

**Files to Modify:**
- `node-cli/cli.ts` - Add cloud subcommand
- `node-cli/commands/cloud/*.ts` - New command handlers
- `node-cli/handlers/cloud/*.ts` - Business logic

**Success Criteria:**
- ✅ All PRD Phase 1 commands implemented
- ✅ Help text matches PRD documentation
- ✅ `--json` flag works for all commands

### 1.5 Connect & Adopt Flow (Week 5-6)

**Goal:** Safely adopt existing projects with read-only mode.

**Implementation:**
```typescript
// shared/cloud/adoption/project-adopter.ts
interface ConnectionProfile {
  provider: string;
  account: string;
  secretsRef: SecretsVaultRef;
  readOnly: boolean;
  projects: AdoptedProject[];
}

interface AdoptedProject {
  id: string;
  name: string;
  environments: string[];
  deployments: DeploymentRecord[];
  domains: string[];
  adoptedAt: Date;
}

class ProjectAdopter {
  async connect(provider: string, readOnly: boolean): Promise<ConnectionProfile>
  async listProjects(profile: ConnectionProfile): Promise<AdoptedProject[]>
  async adopt(profile: ConnectionProfile, projectId: string): Promise<AdoptedProject>
  async enableWrite(profile: ConnectionProfile, projectId: string): Promise<void>
}
```

**Integration Points:**
- Add `ProjectAdopter` service to `CloudManager`
- Store connection profiles in `.aios/connections.json`
- Block mutations in read-only mode with clear errors

**Files to Create:**
- `shared/cloud/adoption/project-adopter.ts`
- `shared/cloud/adoption/types.ts`
- `shared/cloud/adoption/__tests__/adopter.test.ts`

**Success Criteria:**
- ✅ `aios cloud connect --read-only` connects without write permissions
- ✅ `aios cloud adopt` backfills existing deployments
- ✅ Write operations blocked until `--enable-write` confirmed

### 1.6 Rollback One-Liner (Week 6)

**Goal:** `aios cloud rollback` reverts to last good deployment.

**Implementation:**
```typescript
// shared/cloud/deployment/rollback-manager.ts
class RollbackManager {
  async generateRollbackCommand(deploymentId: string): Promise<string>
  async rollback(deploymentId?: string): Promise<DeploymentResult>
  async listRollbackTargets(): Promise<DeploymentRecord[]>
}

// Update CloudManager
class CloudManager {
  async rollback(provider: string, deploymentId?: string): Promise<DeploymentResult> {
    // If no ID provided, find last successful deployment
    const target = deploymentId
      ? await this.state.getDeployment(deploymentId)
      : await this.state.getLastSuccessfulDeployment();

    // Use provider's rollback implementation
    return this.providers.get(provider).rollback(target.id);
  }
}
```

**Integration Points:**
- Add rollback command to CLI
- Store rollback commands in deployment records
- Show one-liner in deploy output

**Success Criteria:**
- ✅ `aios cloud rollback` reverts to last good state
- ✅ Rollback time P95 ≤ 2 minutes (PRD KPI)
- ✅ Deploy output shows rollback one-liner

## Phase 2 Implementation Plan (Day-2 Ops)

### 2.1 Environment Management (Week 7-8)

**Features:**
- `aios cloud env list --env <staging|production>`
- `aios cloud env set <KEY>=<VALUE> --env <env>`
- `aios cloud env delete <KEY> --env <env>`
- Secrets masking in output

### 2.2 Scaling Operations (Week 9-10)

**Features:**
- `aios cloud scale --replicas <N> --env <env>`
- `aios cloud restart --service <name> --env <env>`
- `aios cloud maintenance --enable|disable --env <env>`

### 2.3 Cost Optimization (Week 11-12)

**Features:**
- `aios cloud cost estimate`
- `aios cloud cost budget set <amount>`
- `aios cloud cost optimize` (rightsizing suggestions)

### 2.4 Enhanced Observability (Week 13-14)

**Features:**
- Trace IDs for all operations
- Structured logging with correlation
- Metrics export (Prometheus/StatsD)
- Error taxonomy

## Phase 3-6 (Future Phases)

See PRD sections 3-4 for:
- **Phase 3:** Canary/blue-green deployments, policy guardrails
- **Phase 4:** DR/chaos, SBOM/attestation, incident management
- **Phase 5:** SSO/RBAC, team workflows
- **Phase 6:** Web API + UI

## Integration with Existing Code

### Minimal Breaking Changes

**Keep Current APIs:**
- `CloudManager` remains main orchestrator
- Provider interface extends (doesn't replace)
- `UnifiedAnalyzer` used as-is

**Add New Services:**
- `StateManager` - new service
- `SecretsVault` - new service
- `DeploymentPlanner` - new service
- `DeploymentVerifier` - new service
- `ProjectAdopter` - new service
- `RollbackManager` - new service

**Update Existing:**
- `CloudManager` - add plan/verify/rollback methods
- Providers - add verification endpoints
- CLI - restructure command tree

### Migration Path

**For Existing Users:**
1. First run detects `.env` credentials → prompts to migrate to keyring
2. Existing deployments → run `aios cloud adopt` to backfill state
3. Old commands aliased to new structure with deprecation warnings

**Backwards Compatibility:**
```typescript
// node-cli/cli.ts - legacy support
program
  .command('deploy')
  .description('[DEPRECATED] Use: aios cloud deploy')
  .action(async () => {
    console.warn('⚠️  Command deprecated. Use: aios cloud deploy');
    // Forward to new command
    await cloudCommand.parseAsync(['cloud', 'deploy', ...process.argv.slice(3)]);
  });
```

## Success Metrics Tracking

### Phase 1 KPIs (from PRD)

| Metric | Target | Measurement |
|--------|--------|-------------|
| TTFD (Time to First Deploy) | P50 ≤ 10 min | Track from `analyze` to live URL |
| Rollback Time | P95 ≤ 2 min | Track from command to restored state |
| NL Task Success | ≥ 90% accuracy | AI intent → command mapping |
| Safety | 0 P0 incidents | Production mutations without confirmation |
| Secrets Redaction | 100% | No secrets in logs/outputs |

### Implementation Tracking

**Telemetry Events:**
```typescript
interface TelemetryEvent {
  event: 'deploy' | 'rollback' | 'adopt' | 'analyze';
  duration: number;
  success: boolean;
  provider: string; // anonymized
  error?: string; // taxonomy only
}
```

**Local Metrics (`.aios/metrics.json`):**
- Command latency percentiles
- Success/failure rates
- Provider API errors

## Risk Mitigation

### High-Risk Items

**1. OS Keyring Integration**
- **Risk:** Platform-specific bugs, permission issues
- **Mitigation:** Fallback to env vars with warnings; extensive platform testing

**2. State Corruption**
- **Risk:** Concurrent writes, corrupted JSON
- **Mitigation:** File locking, atomic writes, backup on update

**3. Provider API Changes**
- **Risk:** Breaking changes in provider SDKs
- **Mitigation:** Version pinning, contract tests, nightly canaries

**4. Secrets Leakage**
- **Risk:** Secrets in logs, error messages, diffs
- **Mitigation:** Comprehensive redaction filters, fuzz testing, audit mode

## Open Questions (from PRD)

### Resolved

1. **Policy Engine:** Start with JSON rules (simpler), add OPA in Phase 3
2. **Kubernetes:** Phase 2 (read status/logs only initially)
3. **Default Regions:** Allow per-env configuration in `.aios/config.json`

### New Questions

1. **State Locking:** How to prevent concurrent deploys? File locks? Distributed locks for teams?
2. **Multi-Team Support:** Phase 1 or Phase 5? Start with single-team, expand later?
3. **Monorepo Services:** How to deploy multiple services from one repo? Service selector required?

## Acceptance Tests (Phase 1)

From PRD Appendix C:

```bash
# Test 1: Fresh repo to staging URL ≤ 10 minutes
cd /tmp/test-nextjs-app
aios cloud analyze
aios cloud recommend
aios cloud connect --provider vercel
time aios cloud deploy --env staging
# Assert: URL live, time ≤ 10 min

# Test 2: Prod deploy requires confirmation
aios cloud deploy --env production
# Assert: Prompts for confirmation, shows plan first

# Test 3: Secrets redaction
aios cloud logs --level error
# Assert: No secrets in output (fuzz test with known tokens)

# Test 4: NL mapping accuracy
for phrase in "${NL_TEST_PHRASES[@]}"; do
  result=$(aios nl "$phrase" --dry-run)
  # Assert: Maps to correct command ≥ 90% of time
done
```

## Next Steps

**Immediate (This Week):**
1. ✅ Create this roadmap document
2. ⬜ Set up `.aios/` state directory structure
3. ⬜ Research OS keyring libraries (`keytar`, `keychain`)
4. ⬜ Prototype `StateManager` with JSON persistence

**Next Sprint (Week 1-2):**
1. Implement `StateManager` fully
2. Begin OS keyring integration
3. Update `CloudManager` to persist state
4. Add `.aios/` to `.gitignore` template

**Phase 1 Completion Target:** 6-8 weeks from start

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-10-01
**Owner:** AIOS Team
**Reviewers:** Architecture, Security, Product
