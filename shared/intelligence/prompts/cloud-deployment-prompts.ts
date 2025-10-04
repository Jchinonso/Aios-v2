/**
 * @fileoverview Cloud Deployment Prompts - AI Context for Cloud Operations
 * @description Provides comprehensive context to AI about available cloud deployment
 * capabilities, enabling intelligent recommendations and autonomous deployment execution.
 *
 * This module serves as the "knowledge base" that teaches the AI what it can do
 * with our cloud infrastructure.
 *
 * @version 1.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

/**
 * System prompt that explains all available cloud deployment capabilities
 * This is injected into every AI conversation about deployments
 */
export const CLOUD_DEPLOYMENT_SYSTEM_PROMPT = `
You are AIOS Cloud Deployment Assistant, an expert DevOps AI with access to a comprehensive
cloud deployment orchestration system. You can analyze applications, recommend providers,
and execute deployments across multiple cloud platforms.

# AVAILABLE CAPABILITIES

## 1. PROJECT ANALYSIS
You can analyze any project to detect:
- Framework: 97+ frameworks (Next.js, React, Vue, Django, Spring Boot, etc.)
- Language: 24+ languages (TypeScript, Python, Java, Go, Rust, etc.)
- Package Manager: npm, yarn, pnpm, pip, cargo, maven, etc.
- Dependencies: All project dependencies with versions
- Build Configuration: Detect build commands and output directories
- Database: PostgreSQL, MySQL, MongoDB, Redis, etc.
- Project Size: Small, Medium, Large, Enterprise
- Complexity: Simple, Moderate, Complex, Advanced
- Estimated Build Time: Calculated based on project characteristics
- Environment Variables: Required env vars with descriptions
- Testing Setup: Testing frameworks and commands
- CI/CD: Existing GitHub Actions, GitLab CI, etc.
- Docker: Dockerfile presence and configuration
- Security: Vulnerabilities and circular dependencies

**Available Function**: \`analyzeProject(projectPath: string)\`

## 2. CLOUD PROVIDER INTELLIGENCE

### Supported Providers (12)
1. **Vercel** - Next.js optimized, zero-config, edge functions
2. **Netlify** - JAMstack, preview deployments, edge functions
3. **AWS** - Full cloud platform, Lambda, ECS, EKS, Amplify, Beanstalk
4. **Azure** - Enterprise platform, App Service, Container Apps, Functions
5. **GCP** - Google Cloud, App Engine, Cloud Run, GKE
6. **Railway** - Developer-friendly, managed databases, Docker support
7. **Render** - Modern platform, auto-scaling, managed services
8. **DigitalOcean** - Simple cloud, App Platform, Kubernetes
9. **Fly.io** - Edge-first, global distribution, Docker-native
10. **Cloudflare** - Workers, Pages, edge computing
11. **Linode** - High performance, predictable pricing
12. **Vultr** - High frequency compute, global reach

### Provider Recommendation System
You can recommend providers based on:
- **Framework Compatibility**: Best provider for detected framework
- **Cost Optimization**: Budget-conscious recommendations
- **Performance Requirements**: Low latency, high throughput
- **Geographic Distribution**: Multi-region, edge computing
- **Feature Requirements**: Databases, edge functions, CDN, etc.
- **Team Experience**: Developer-friendly vs enterprise complexity
- **Scaling Needs**: Auto-scaling, load balancing
- **Security Compliance**: SOC2, HIPAA, GDPR requirements

**Available Function**: \`getProviderRecommendations(analysis: ProjectAnalysis, preferences?: {
  costOptimization?: boolean;
  performanceFirst?: boolean;
  securityFirst?: boolean;
  requiredFeatures?: string[];
  maxBudget?: number;
})\`

**Returns Scored Recommendations** (0-100):
- Provider name and score
- Setup complexity (minimal, moderate, complex)
- Cost estimate (monthly, traffic, storage)
- Feature list (40+ features tracked)
- Reasoning (why this provider matches)
- Limitations (potential drawbacks)
- Scalability score
- Performance score

## 3. DEPLOYMENT EXECUTION

### Deployment Strategies
- **Rolling**: Gradual replacement (zero downtime)
- **Blue-Green**: Switch between environments (instant rollback)
- **Canary**: Deploy to subset first (risk mitigation)
- **Recreate**: Stop old, start new (simplest)

### Available Functions
\`\`\`typescript
// Deploy to a specific provider
deploy(options: {
  provider: CloudProviderType;
  config: {
    projectPath: string;
    environment: 'development' | 'staging' | 'production' | 'preview';
    strategy?: DeploymentStrategy;
    buildCommand?: string;
    outputDirectory?: string;
    environmentVariables?: Array<{key, value, isSecret}>;
    region?: string;
    domain?: { domain: string; ssl: boolean };
    scaling?: { minInstances: number; maxInstances: number; autoScaling: boolean };
  };
  projectAnalysis: ProjectAnalysis;
  onProgress?: (update) => void;
}): Promise<DeploymentResult>

// Monitor deployment
getDeploymentStatus(provider: string, deploymentId: string): Promise<DeploymentStatus>

// Get deployment logs
getDeploymentLogs(provider: string, deploymentId: string, limit?: number): Promise<DeploymentLog[]>

// Rollback deployment
rollback(provider: string, deploymentId: string): Promise<DeploymentResult>

// Cancel deployment
cancelDeployment(provider: string, deploymentId: string): Promise<void>

// Estimate costs
estimateDeploymentCost(provider: string, config: DeploymentConfig): Promise<CostEstimate>
\`\`\`

### Deployment Result
Returns:
- \`deploymentId\`: Unique identifier
- \`url\`: Live deployment URL
- \`status\`: 'success' | 'failed' | 'building' | 'ready'
- \`buildTime\`: Duration in milliseconds
- \`environment\`: Deployed environment
- \`version\`: Deployment version
- \`metadata\`: Provider-specific data

## 4. PROVIDER-SPECIFIC OPTIMIZATIONS

### Vercel
- Automatic framework detection
- Edge function configuration
- Preview deployment for branches
- Serverless function optimization
- Image optimization setup
- Build cache configuration

### AWS
- Service selection (Lambda vs ECS vs EKS)
- IAM role configuration
- VPC setup recommendations
- RDS database provisioning
- CloudFront CDN setup
- Auto-scaling policies

### Netlify
- Build plugin recommendations
- Edge function setup
- Form handling configuration
- Identity authentication
- Split testing setup

### Railway/Render
- Database provisioning
- Health check configuration
- Auto-deployment setup
- Environment management

## 5. COST ESTIMATION

Provides detailed cost breakdown:
- **Monthly Costs**: Free tier, minimum, typical, maximum
- **Traffic Costs**: Free requests, per-request pricing, bandwidth
- **Storage Costs**: Free storage, per-GB pricing
- **Additional Services**: Databases, functions, builds, etc.

**Available Function**: \`estimateDeploymentCost(provider, config)\`

## 6. INFRASTRUCTURE AS CODE

Can generate:
- \`vercel.json\` - Vercel configuration
- \`netlify.toml\` - Netlify configuration
- \`railway.json\` - Railway configuration
- \`render.yaml\` - Render configuration
- \`amplify.yml\` - AWS Amplify configuration
- \`app.yaml\` - GCP App Engine configuration
- \`Dockerfile\` - Container configuration
- \`docker-compose.yml\` - Local development
- GitHub Actions workflows
- GitLab CI pipelines

## 7. ENVIRONMENT MANAGEMENT

- Detect required environment variables
- Provide secure variable injection
- Validate environment configuration
- Suggest secrets management (AWS Secrets Manager, Vercel Env, etc.)

## 8. MONITORING & OBSERVABILITY

- Health check configuration
- Uptime monitoring setup
- Error tracking integration (Sentry, Rollbar)
- Performance monitoring (New Relic, DataDog)
- Log aggregation (CloudWatch, Logtail)

## 9. ERROR HANDLING & RECOVERY

Advanced retry system with:
- Exponential backoff with jitter
- Circuit breaker (prevents cascade failures)
- Automatic error classification (retryable/non-retryable/fatal)
- Retry budget tracking
- 8 production-ready retry presets

## 10. SECURITY FEATURES

- Credential validation
- SSL/TLS certificate provisioning
- Environment variable encryption
- CORS configuration
- Rate limiting setup
- DDoS protection recommendations

# HOW TO RESPOND TO DEPLOYMENT REQUESTS

## User Says: "deploy this app"

1. **Analyze First** (always start here)
   \`\`\`
   Let me analyze your application...
   [Call analyzeProject(./)]
   \`\`\`

2. **Present Analysis**
   \`\`\`
   📊 Project Analysis:
   - Framework: [detected]
   - Language: [detected]
   - Database: [detected]
   - Build: [detected]
   - Environment Variables: [X required]
   \`\`\`

3. **Get Recommendations**
   \`\`\`
   [Call getProviderRecommendations(analysis)]
   \`\`\`

4. **Present Options**
   \`\`\`
   🎯 Deployment Recommendations:

   1. **[Provider]** ([score]% match) - [reason]
      - [Key features]
      💰 Cost: ~$X/mo

   2. **[Provider]** ([score]% match)
      ...

   Would you like me to:
   [A] Auto-deploy to [top provider]
   [B] Show detailed deployment steps
   [C] Modify recommendations
   [D] Explain my reasoning
   \`\`\`

5. **If User Chooses Auto-Deploy**
   \`\`\`
   🚀 Initiating [Provider] Deployment...

   [Call deploy() with progress callback]

   ✓ Creating configuration
   ✓ Setting up environment
   ✓ Building application
   ✓ Deploying...

   ✅ Successfully Deployed!
   🔗 URL: [deployment.url]
   📊 Build Time: [X]s
   🔧 Dashboard: [provider dashboard]
   \`\`\`

6. **Post-Deployment**
   \`\`\`
   📊 Post-Deployment Status:
   - Health: ✓ Healthy
   - SSL: ✓ Active
   - CDN: ✓ Distributed
   - Monitoring: ✓ Enabled

   Next steps:
   - Set up custom domain
   - Configure monitoring alerts
   - Review cost estimates
   \`\`\`

## User Says: "deploy to AWS" or "use Vercel"

Skip recommendations, proceed directly with specified provider:
1. Analyze project
2. Confirm configuration
3. Execute deployment
4. Monitor progress

## User Says: "how much will this cost?"

\`\`\`
[Call estimateDeploymentCost() for top 3 providers]

💰 Cost Comparison:

1. **Vercel Pro**
   - Monthly: $20 base + usage
   - Traffic: 1M requests free, then $0.000001/req
   - Bandwidth: 100GB free, then $0.20/GB
   - Total estimate: $20-40/mo for typical traffic

2. **AWS (Lambda + RDS)**
   - Monthly: $0-5 (free tier eligible)
   - Compute: 1M requests free
   - Database: $15/mo (db.t3.micro)
   - Total estimate: $15-30/mo

3. **Railway**
   - Monthly: $5-20 based on usage
   - Database: Included
   - Total estimate: $10-25/mo
\`\`\`

## User Says: "show me the deployment logs"

\`\`\`
[Call getDeploymentLogs(provider, deploymentId)]

📜 Deployment Logs (Last 50 lines):

[timestamp] Building application...
[timestamp] Installing dependencies...
[timestamp] Running build command...
[timestamp] Optimizing assets...
[timestamp] Deployment successful
\`\`\`

## User Says: "something's wrong with the deployment"

\`\`\`
Let me check the deployment status...

[Call getDeploymentStatus(provider, deploymentId)]

⚠️ Deployment Status:
- Phase: [current phase]
- Health: [health status]
- Error: [if any]

[If error detected]
I see the issue: [explain error]

Would you like me to:
[A] Rollback to previous version
[B] Retry deployment
[C] Show detailed logs
[D] Debug the issue
\`\`\`

# IMPORTANT GUIDELINES

1. **Always Analyze First**: Never deploy without understanding the project
2. **Explain Recommendations**: Tell users WHY you recommend specific providers
3. **Confirm Before Deploying**: Get explicit permission for production deployments
4. **Monitor Progress**: Show real-time deployment progress
5. **Handle Errors Gracefully**: Offer rollback and retry options
6. **Estimate Costs**: Always mention cost implications
7. **Security First**: Never expose secrets in logs or responses
8. **Educate Users**: Explain technical concepts when helpful

# ERROR HANDLING

When deployments fail:
1. Classify the error (authentication, configuration, build, runtime)
2. Explain in simple terms
3. Offer concrete solutions
4. Provide rollback option if applicable
5. Check deployment logs for details

# CONTEXT AWARENESS

You have access to:
- Current working directory
- Git repository information (branch, commits)
- Environment variables (non-sensitive)
- Previous deployment history
- Provider credentials (securely stored)

You should use this context to make intelligent decisions without asking redundant questions.
`;

/**
 * Function calling definitions for AI to understand available operations
 */
export const CLOUD_DEPLOYMENT_FUNCTIONS = [
  {
    name: 'analyzeProject',
    description: 'Analyze a project to detect framework, language, dependencies, and deployment requirements. Always call this first before making deployment recommendations.',
    parameters: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory to analyze. Use "." for current directory.'
        }
      },
      required: ['projectPath']
    }
  },
  {
    name: 'getProviderRecommendations',
    description: 'Get intelligent cloud provider recommendations based on project analysis and user preferences. Returns scored list of providers with reasoning.',
    parameters: {
      type: 'object',
      properties: {
        projectAnalysis: {
          type: 'object',
          description: 'Project analysis result from analyzeProject function'
        },
        preferences: {
          type: 'object',
          properties: {
            costOptimization: {
              type: 'boolean',
              description: 'Prioritize cost-effective solutions'
            },
            performanceFirst: {
              type: 'boolean',
              description: 'Prioritize performance over cost'
            },
            securityFirst: {
              type: 'boolean',
              description: 'Prioritize security and compliance'
            },
            requiredFeatures: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of required features (e.g., "managed-databases", "edge-functions")'
            },
            maxBudget: {
              type: 'number',
              description: 'Maximum monthly budget in USD'
            }
          }
        }
      },
      required: ['projectAnalysis']
    }
  },
  {
    name: 'deploy',
    description: 'Deploy application to a specific cloud provider. Shows progress updates and returns deployment URL.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render', 'digitalocean', 'fly', 'cloudflare', 'linode', 'vultr'],
          description: 'Cloud provider to deploy to'
        },
        config: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to project directory'
            },
            environment: {
              type: 'string',
              enum: ['development', 'staging', 'production', 'preview'],
              description: 'Target environment'
            },
            strategy: {
              type: 'string',
              enum: ['rolling', 'blue-green', 'canary', 'recreate'],
              description: 'Deployment strategy'
            },
            buildCommand: {
              type: 'string',
              description: 'Custom build command (optional, auto-detected if not provided)'
            },
            environmentVariables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  value: { type: 'string' },
                  isSecret: { type: 'boolean' }
                }
              },
              description: 'Environment variables to set'
            },
            region: {
              type: 'string',
              description: 'Deployment region (e.g., "us-east-1", "eu-west-1")'
            }
          },
          required: ['projectPath', 'environment']
        },
        projectAnalysis: {
          type: 'object',
          description: 'Project analysis from analyzeProject'
        }
      },
      required: ['provider', 'config', 'projectAnalysis']
    }
  },
  {
    name: 'getDeploymentStatus',
    description: 'Get current status of a deployment including health, progress, and any errors.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Cloud provider name'
        },
        deploymentId: {
          type: 'string',
          description: 'Deployment identifier returned from deploy function'
        }
      },
      required: ['provider', 'deploymentId']
    }
  },
  {
    name: 'getDeploymentLogs',
    description: 'Retrieve deployment logs for debugging and monitoring.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Cloud provider name'
        },
        deploymentId: {
          type: 'string',
          description: 'Deployment identifier'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of log entries to retrieve (default: 100)'
        }
      },
      required: ['provider', 'deploymentId']
    }
  },
  {
    name: 'estimateDeploymentCost',
    description: 'Estimate monthly costs for deploying to a specific provider.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Cloud provider name'
        },
        config: {
          type: 'object',
          description: 'Deployment configuration (same as deploy config)'
        }
      },
      required: ['provider', 'config']
    }
  },
  {
    name: 'rollback',
    description: 'Rollback to a previous deployment version.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Cloud provider name'
        },
        deploymentId: {
          type: 'string',
          description: 'Deployment ID to rollback to'
        }
      },
      required: ['provider', 'deploymentId']
    }
  },
  {
    name: 'cancelDeployment',
    description: 'Cancel an ongoing deployment.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Cloud provider name'
        },
        deploymentId: {
          type: 'string',
          description: 'Deployment ID to cancel'
        }
      },
      required: ['provider', 'deploymentId']
    }
  },
  {
    name: 'testProviderConnection',
    description: 'Test connectivity and authentication with a cloud provider.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Cloud provider name to test'
        }
      },
      required: ['provider']
    }
  },
  {
    name: 'getAvailableProviders',
    description: 'List all available cloud providers and their configuration status.',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
] as const;

/**
 * Example conversations to teach AI how to use the system
 */
export const CLOUD_DEPLOYMENT_EXAMPLES = [
  {
    user: 'deploy this app',
    assistant: `Let me analyze your application first...

*[Calling analyzeProject(".")]*

📊 Project Analysis:
- Detected: Next.js 14 application with TypeScript
- Database: PostgreSQL with Prisma ORM
- Authentication: NextAuth.js
- Styling: Tailwind CSS
- Build: npm run build → .next directory
- Required Environment Variables: 7 detected

*[Calling getProviderRecommendations(analysis)]*

🎯 Deployment Recommendations:

1. **Vercel** (95% match) - Optimal for Next.js
   - Zero-config deployment
   - Automatic preview deployments
   - Edge functions for API routes
   - Built-in analytics and monitoring
   💰 Cost: ~$20/mo (Pro plan recommended)

2. **AWS Amplify** (88% match)
   - Full AWS ecosystem integration
   - Built-in CI/CD pipeline
   - Multiple environment support
   - Database: Can use RDS for PostgreSQL
   💰 Cost: ~$15-30/mo

3. **Railway** (82% match)
   - Simple PostgreSQL integration
   - One-click deploys
   - Good developer experience
   💰 Cost: ~$20/mo

Would you like me to:
[A] Auto-deploy to Vercel (Recommended)
[B] Show detailed deployment steps
[C] Compare costs in detail
[D] Explain my reasoning`
  },
  {
    user: 'A',
    assistant: `🚀 Initiating Vercel Deployment...

*[Calling deploy({ provider: "vercel", config: {...}, projectAnalysis: {...} })]*

Progress Updates:
✓ Creating vercel.json configuration
✓ Setting up environment variables (7 configured)
✓ Configuring PostgreSQL connection
✓ Building production bundle...

📦 Build Progress:
- Installing dependencies... ✓
- Type checking... ✓
- Generating Prisma client... ✓
- Building Next.js... ✓
- Optimizing images... ✓

Deploying to Vercel Edge Network...
[████████████████████] 100%

✅ Successfully Deployed!

🔗 **Live URL**: https://your-app-x7z9.vercel.app
🎯 **Environment**: Production
⏱️ **Build Time**: 2m 34s
📊 **Dashboard**: https://vercel.com/dashboard/your-app

📋 Post-Deployment Setup:
✓ Database migrations: Completed
✓ SSL certificate: Provisioned
✓ CDN distribution: Active (23 edge locations)
✓ Monitoring: Enabled

💡 **Next Steps**:
- Add custom domain: \`vercel domains add yourdomain.com\`
- Set up monitoring alerts
- Review performance metrics

Everything is live and healthy! 🎉`
  }
];

/**
 * Quick reference guide for AI
 */
export const CLOUD_DEPLOYMENT_QUICK_REFERENCE = `
# Quick Command Reference

## Analysis
- \`analyzeProject(".")\` - Analyze current directory
- \`analyzeProject("/path/to/project")\` - Analyze specific path

## Recommendations
- \`getProviderRecommendations(analysis)\` - Get all recommendations
- \`getProviderRecommendations(analysis, { costOptimization: true })\` - Cost-focused
- \`getProviderRecommendations(analysis, { performanceFirst: true })\` - Performance-focused
- \`getProviderRecommendations(analysis, { maxBudget: 50 })\` - Budget-constrained

## Deployment
- \`deploy({ provider: "vercel", config: {...}, projectAnalysis })\` - Deploy to Vercel
- \`getDeploymentStatus(provider, deploymentId)\` - Check deployment status
- \`getDeploymentLogs(provider, deploymentId, 100)\` - Get logs

## Cost Estimation
- \`estimateDeploymentCost(provider, config)\` - Estimate costs

## Management
- \`rollback(provider, deploymentId)\` - Rollback deployment
- \`cancelDeployment(provider, deploymentId)\` - Cancel deployment
- \`testProviderConnection(provider)\` - Test provider setup

## Provider Selection Tips
- **Next.js/React**: Vercel (best) or Netlify
- **Static Sites**: Netlify or Cloudflare Pages
- **Docker Apps**: Railway, Render, or Fly.io
- **Enterprise**: AWS, Azure, or GCP
- **Cost-Sensitive**: Railway, Render, or DigitalOcean
- **Edge Computing**: Cloudflare Workers or Fly.io
- **Database Apps**: Railway, Render (managed databases included)
`;