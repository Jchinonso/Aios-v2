# AIOS-Shell CLI Mockups

Terminal-friendly adaptations of the web UI mockups for natural language deployment flows.

---

## Mockup 1: Natural Language Deploy with Plan/Apply/Verify

### Terminal Output

```bash
$ aios

AIOS ▸ How can I help? (e.g., "deploy web to staging", "show api errors 15m")
> I need to deploy the latest version of the web application to production.

⠋ Generating plan...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plan Preview

  Intent: deploy
  Service: web-app
  Environment: production
  Strategy: instant

  Mapped Command:
  $ aios cloud deploy --env production --service web-app --strategy instant

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes:

  [+] Create deployment 'web-app-v1.2.0'
  [~] Update service 'web-app' to use new deployment
  [+] Run smoke tests
  [-] Decommission old deployment 'web-app-v1.1.0'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Risk: High (Destructive)
    This is a high-risk operation targeting the production environment.

Policy Status:
  ✓ Policy: Pass
  ⚠ Policy: Warn - Deployment outside maintenance window (22:00-06:00 UTC)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To proceed, type 'production' to confirm:
> production

✓ Plan approved • Saving to .aios/evidence/2025-10-02T14-23-45Z/plan.txt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Executing Deployment

  Building deployment...        ████████████████░░░░░░░░░░░░  45%
  Running smoke tests...        ⠙

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suggestions:
  • aios cloud logs --env production --service web-app --since 5m
  • aios cloud rollback --env production --service web-app
  • aios obs why-slow --service web-app --env production

AIOS ▸ What's next?
> _
```

---

## Mockup 2: First-Run Guided Gate (Operate Existing Deployment)

### Terminal Output

```bash
$ aios

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Welcome to AIOS-Shell! Let's get you set up.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

First, what would you like to do?

  1) 🚀 Deploy new/update from Git
     Push your code to a live environment.

  2) ☁️  Operate existing deployment  ← selected
     Connect to your cloud and manage services.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Got it. Let's connect to your Cloud Provider.

Please select where your services are hosted:

  ☑ Vercel          ☐ Netlify          ☐ AWS
  ☐ GCP             ☐ Azure            ☐ Kubernetes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now, select the account and region.

Account / Team
  Acme Inc (Personal) ▼

Region
  us-east-1 (N. Virginia) ▼

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read-only mode
  ● Enabled  ○ Disabled

  Start in read-only mode to prevent accidental changes. You can enable write
  access at any time after confirming.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Security Note
    Your cloud credentials will be encrypted and stored securely. AIOS
    will only assume the permissions granted.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Connect Cloud Provider? (y/N)
> y

⠋ Connecting to Vercel...

✓ Connected to Vercel (vaultRef: keyring://vercel_acme_01)
  • Found 3 services: web-app, api-gateway, worker-queue
  • Mapped environments: staging, production
  • Access mode: Read-only

✓ Configuration saved to .aios/config.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mapped Command:
  aios connect cloud --provider vercel --account "Acme Inc (Personal)" \
    --region us-east-1 --read-only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suggestions:
  • aios cloud status --env production
  • aios cloud logs --service web-app --since 1h
  • aios cloud deploy web-app --env production

AIOS ▸ How can I help?
> _
```

---

## Mockup 3: Deploy with Policy Warnings

### Terminal Output

```bash
$ aios

AIOS ▸ How can I help?
> I need to deploy the latest version of the web application to production.

⠋ Generating plan...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plan Preview

  Intent: deploy
  Service: web-app
  Environment: production
  Strategy: instant

  Mapped Command:
  $ aios cloud deploy --env production --service web-app --strategy instant

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes:

  [+] Create deployment 'web-app-v1.2.0'
  [~] Update service 'web-app' to use new deployment
  [+] Run smoke tests
  [-] Decommission old deployment 'web-app-v1.1.0'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Risk: High (Destructive)

Policy Status:
  ✓ Policy: Pass - All required approvals obtained
  ⚠ Policy: Warn - Deployment outside maintenance window (22:00-06:00 UTC)
  ⚠ Policy: Warn - No rollback test in last 30 days

⚠️  Policy: Warn

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is a high-risk operation targeting the production environment.

To proceed, type 'production' to confirm:
> production

✓ Plan approved • Saving to .aios/evidence/2025-10-02T14-23-45Z/plan.txt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Executing Deployment

  Building deployment...        ████████████████░░░░░░░░░░░░  45%
  Running smoke tests...        ⠙

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suggestions:
  • aios cloud logs --env production --service web-app --level error
  • aios cloud rollback --env production --service web-app
  • aios obs why-slow --service web-app

AIOS ▸ What's next?
> _
```

---

## Additional CLI Patterns

### Git Source Connection (First-Run - Deploy from Git)

```bash
$ aios

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Welcome to AIOS-Shell! Let's get you set up.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

First, what would you like to do?

  1) 🚀 Deploy new/update from Git  ← selected
     Push your code to a live environment.

  2) ☁️  Operate existing deployment
     Connect to your cloud and manage services.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Connect a Git provider:

  1) GitHub (recommended)       - OAuth device code flow
  2) GitLab                     - Personal Access Token
  3) Other Git                  - Bitbucket, Azure Repos, or custom

Selection (1-3):
> 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GitHub OAuth Device Code Flow

  1. Visit:  https://github.com/login/device
  2. Enter code:  ABCD-EFGH
  3. Authorize AIOS

⠋ Waiting for authorization...

✓ GitHub connected (vaultRef: keyring://gh_aios_01)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select a repository:

Organizations:
  • acme-inc
  • personal-projects

Repositories (acme-inc):
  • webapp
  • backend
  • ops-tools

Repository:
> acme-inc/webapp

Branch (main):
> main

Paths (comma separated) [detect automatically]:
> apps/web,services/api

Pin to specific SHA? (y/N):
> n

✓ Repository configured
  • Repo: acme-inc/webapp
  • Branch: main
  • Paths: apps/web, services/api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⠋ Analyzing project structure...

✓ Detected services: [web, api]
  • Default environment: staging
  • Other environments: production

✓ Configuration saved to .aios/config.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AIOS ▸ How can I help?
> _
```

---

### Rollback Command

```bash
$ aios

AIOS ▸ How can I help?
> rollback web-app in production

⠋ Generating plan...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plan Preview

  Intent: rollback
  Service: web-app
  Environment: production
  Target: web-app-v1.1.0 (deployed 2 hours ago)

  Mapped Command:
  $ aios cloud rollback --env production --service web-app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes:

  [~] Switch service 'web-app' to deployment 'web-app-v1.1.0'
  [+] Run health checks
  [-] Mark 'web-app-v1.2.0' as inactive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Risk: High (Destructive)

Policy Status:
  ✓ Policy: Pass

To proceed, type 'production' to confirm:
> production

⠋ Executing rollback...

✓ Rollback complete
  • Service: web-app
  • Active deployment: web-app-v1.1.0
  • URL: https://web-app.prod.acme.com
  • Health: Healthy

✓ Evidence saved to .aios/evidence/2025-10-02T16-45-12Z/rollback.txt

AIOS ▸ What's next?
> _
```

---

### Logs Query

```bash
$ aios

AIOS ▸ How can I help?
> show me api error logs from the last 15 minutes

Mapped Command:
  $ aios cloud logs --service api --since 15m --level error

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Streaming logs (Ctrl+C to stop)...

2025-10-02 16:30:15  ERROR  [api] Failed to connect to database
  → ConnectionTimeoutError: Connection timed out after 5000ms
  → at db.connect (src/db/connection.ts:42)

2025-10-02 16:30:18  ERROR  [api] Request failed: POST /api/orders
  → 500 Internal Server Error
  → RequestID: req_abc123xyz

2025-10-02 16:31:02  ERROR  [api] Redis connection lost
  → Error: ECONNREFUSED 127.0.0.1:6379
  → at RedisClient.connect (src/cache/redis.ts:78)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Showing 3 errors from last 15m

Suggestions:
  • aios obs why-slow --service api --since 15m
  • aios cloud restart --service api --env production
  • aios cloud logs --service api --query "ConnectionTimeout" --since 1h

AIOS ▸ What's next?
> _
```

---

### Why Slow Analysis

```bash
$ aios

AIOS ▸ How can I help?
> why is the api slow?

⠋ Analyzing api performance...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Performance Analysis: api (production)

Timeframe: Last 1 hour

Key Findings:

  1. ⚠️  Database Connection Pool Exhaustion
     • 95% of connections in use (19/20)
     • Average wait time: 1.2s
     • Recommendation: Increase pool size or add connection timeout

  2. ⚠️  High Memory Usage
     • Current: 1.8GB / 2GB (90%)
     • 3 memory warnings in last hour
     • Recommendation: Scale up instance or optimize memory usage

  3. ✓ Network Latency: Normal
     • P50: 45ms, P95: 120ms, P99: 380ms

  4. ⚠️  Slow Database Queries
     • 12 queries > 1s detected
     • Top offender: SELECT * FROM orders WHERE... (avg 2.4s)
     • Recommendation: Add index on orders.customer_id

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick Actions:

  1. Scale up memory:
     $ aios runtime scale --service api --memory 4GB

  2. Increase DB pool:
     $ aios config set api.db.poolSize 40

  3. View slow queries:
     $ aios obs traces --service api --slow-only --since 1h

AIOS ▸ What would you like to do?
> _
```

---

## Non-Interactive Mode Examples

### JSON Output Mode

```bash
$ aios cloud status --env production --json

{
  "timestamp": "2025-10-02T16:45:30Z",
  "environment": "production",
  "services": [
    {
      "name": "web-app",
      "status": "healthy",
      "deployment": "web-app-v1.2.0",
      "replicas": 3,
      "urls": ["https://web-app.prod.acme.com"]
    },
    {
      "name": "api",
      "status": "degraded",
      "deployment": "api-v2.1.3",
      "replicas": 5,
      "urls": ["https://api.prod.acme.com"]
    }
  ]
}
```

### Auto-Approve Mode (Staging Only)

```bash
$ aios cloud deploy --env staging --service web-app --yes

⠋ Deploying web-app to staging...

✓ Build complete
✓ Deployment live: https://web-app.staging.acme.com
✓ Health checks passed

Evidence: .aios/evidence/2025-10-02T16-50-00Z/deploy.txt
```

---

## Design Principles for CLI

1. **Progressive Disclosure**: Show essential info first, details on demand
2. **Clear Visual Hierarchy**: Use box drawing characters (━, │) for sections
3. **Consistent Color Coding**:
   - Blue: Info/operations
   - Green: Success/pass
   - Yellow: Warnings
   - Red: Errors/destructive/production
   - Gray: Secondary info
4. **Mapped Commands Always Shown**: Never hide what's being executed
5. **Contextual Suggestions**: Always offer next logical steps
6. **Spinners for Long Operations**: Keep user informed
7. **Type-to-Confirm for Production**: Safety first
8. **Progress Bars for Multi-Step**: Visual feedback
9. **Evidence Trails**: Save everything to `.aios/evidence/`
10. **NL Prompt Persistent**: Always `AIOS ▸` ready for next command

---

## Terminal Requirements

- **Width**: Optimized for 80-120 columns
- **Colors**: 256-color support (fallback to 16 colors)
- **Unicode**: Box drawing characters (━ │ ├ ┤)
- **Emoji Support**: Optional (can be disabled via config)
- **Copy-Paste**: All commands should be easily copyable

---

## Implementation Notes

**Libraries:**
- `chalk` - Terminal colors (already in package.json)
- `inquirer` - Interactive prompts (already in package.json)
- `ora` - Spinners (already in package.json)
- `cli-progress` - Progress bars (add)
- `boxen` - Boxes for important messages (add)
- `cli-table3` - Tables for structured data (add)

**Structure:**
```
node-cli/
├── nl-planner/
│   ├── intent-parser.ts      # NL → JSON intent
│   ├── command-mapper.ts     # Intent → CLI command
│   └── entity-extractor.ts   # Extract service, env, etc.
├── ui/
│   ├── plan-preview.ts       # Plan display
│   ├── progress-tracker.ts   # Deployment progress
│   ├── policy-display.ts     # Policy status
│   └── suggestions.ts        # Context suggestions
└── flows/
    ├── first-run-gate.ts     # Guided setup
    ├── deploy-flow.ts        # Deploy with confirm
    └── adopt-flow.ts         # Read-only adoption
```
