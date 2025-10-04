/**
 * DevOps Prompt Templates - Comprehensive prompts for all DevOps tasks
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for DevOps prompt management
 * - OCP: Open for extension through new prompt categories
 */

import type { PromptTemplate } from '../utils/ai-utils.js'

export const DEPLOYMENT_PROMPTS: Record<string, PromptTemplate> = {
  COMPREHENSIVE_DEPLOYMENT: {
    id: 'comprehensive-deployment',
    category: 'deployment',
    template: `# Comprehensive Deployment Strategy Analysis

## Project Context
- **Technology Stack**: {{technologies}}
- **Project Type**: {{projectType}}
- **Scale Requirements**: {{scale}}
- **Budget Constraints**: {{budget}}
- **Timeline**: {{timeline}}

## Current Analysis
- **Languages**: {{languages}}
- **Frameworks**: {{frameworks}}
- **Dependencies**: {{dependencies}}
- **Architecture Patterns**: {{architecturePatterns}}
- **Existing Infrastructure**: {{existingInfra}}

## Deployment Strategy Requirements

### 1. Platform Recommendation
Analyze and recommend the optimal deployment platform(s) considering:
- Cost-effectiveness for the given scale
- Performance requirements
- Maintenance overhead
- Scalability potential
- Integration capabilities

### 2. Infrastructure Architecture
Design the complete infrastructure including:
- Compute resources (containers, serverless, VMs)
- Database architecture and scaling
- CDN and static asset delivery
- Load balancing and traffic distribution
- Backup and disaster recovery

### 3. CI/CD Pipeline Design
Create a comprehensive deployment pipeline:
- Source code management and branching strategy
- Automated testing (unit, integration, e2e)
- Build optimization and caching
- Staging and production environments
- Rollback and hotfix procedures

### 4. Environment Configuration
Specify all required configurations:
- Environment variables and secrets
- Configuration management strategy
- Service discovery and communication
- Monitoring and logging setup
- Health checks and alerting

### 5. Security Implementation
Address security at every layer:
- Network security and firewall rules
- Authentication and authorization
- SSL/TLS configuration
- Secret management and rotation
- Vulnerability scanning and compliance

### 6. Performance Optimization
Optimize for performance and cost:
- Resource allocation and auto-scaling
- Caching strategies (application, database, CDN)
- Database query optimization
- Asset optimization and compression
- Performance monitoring and alerting

### 7. Operational Excellence
Ensure smooth operations:
- Monitoring and observability stack
- Log aggregation and analysis
- Error tracking and alerting
- Performance metrics and KPIs
- Documentation and runbooks

Provide specific, actionable recommendations with implementation steps, commands, and configuration examples.`,
    variables: ['technologies', 'projectType', 'scale', 'budget', 'timeline', 'languages', 'frameworks', 'dependencies', 'architecturePatterns', 'existingInfra']
  },

  CONTAINERIZATION: {
    id: 'containerization-analysis',
    category: 'deployment',
    template: `# Container Strategy Analysis

## Application Context
- **Application Type**: {{appType}}
- **Runtime Requirements**: {{runtime}}
- **Dependencies**: {{dependencies}}
- **Performance Requirements**: {{performance}}

## Containerization Strategy
Provide comprehensive containerization recommendations:

### 1. Dockerfile Optimization
- Multi-stage build strategy
- Base image selection and security
- Layer optimization and caching
- Size reduction techniques

### 2. Container Orchestration
- Kubernetes vs Docker Compose vs serverless containers
- Service mesh considerations
- Configuration management
- Secret and config injection

### 3. Registry and Distribution
- Container registry selection
- Image versioning and tagging
- Security scanning and compliance
- Distribution optimization

Provide complete Dockerfile examples and orchestration configurations.`,
    variables: ['appType', 'runtime', 'dependencies', 'performance']
  },

  KUBERNETES_DEPLOYMENT: {
    id: 'kubernetes-deployment',
    category: 'deployment',
    template: `# Kubernetes Deployment Strategy

## Application Requirements
- **Application**: {{appName}}
- **Scale**: {{expectedScale}}
- **Availability**: {{availabilityRequirements}}
- **Resources**: {{resourceRequirements}}

## Kubernetes Configuration
Design complete Kubernetes deployment:

### 1. Workload Resources
- Deployment vs StatefulSet vs DaemonSet
- Pod specifications and resource limits
- Horizontal Pod Autoscaler configuration
- Disruption budgets and availability

### 2. Service and Networking
- Service types and load balancing
- Ingress configuration and SSL termination
- Network policies and security
- Service mesh integration

### 3. Configuration and Storage
- ConfigMaps and Secrets management
- Persistent volume configuration
- Storage classes and provisioning
- Backup and recovery strategy

### 4. Monitoring and Observability
- Prometheus and Grafana setup
- Logging with ELK or Loki
- Distributed tracing
- Health checks and readiness probes

Provide complete YAML manifests and operational procedures.`,
    variables: ['appName', 'expectedScale', 'availabilityRequirements', 'resourceRequirements']
  }
};

export const CI_CD_PROMPTS: Record<string, PromptTemplate> = {
  PIPELINE_DESIGN: {
    id: 'cicd-pipeline-design',
    category: 'deployment',
    template: `# CI/CD Pipeline Architecture

## Repository Context
- **Source Control**: {{sourceControl}}
- **Branch Strategy**: {{branchStrategy}}
- **Team Size**: {{teamSize}}
- **Release Frequency**: {{releaseFrequency}}

## Pipeline Requirements
Design a comprehensive CI/CD pipeline:

### 1. Source Stage
- Trigger configuration and webhook setup
- Branch protection and merge requirements
- Code quality gates and pre-commit hooks
- Dependency scanning and license compliance

### 2. Build Stage
- Build optimization and caching
- Artifact generation and storage
- Test execution (unit, integration, security)
- Code coverage and quality metrics

### 3. Security Stage
- Static application security testing (SAST)
- Dynamic application security testing (DAST)
- Dependency vulnerability scanning
- Container image security scanning

### 4. Deployment Stages
- Environment promotion strategy
- Blue-green or canary deployment
- Automated rollback triggers
- Smoke tests and validation

### 5. Monitoring and Feedback
- Deployment success metrics
- Performance monitoring integration
- Error tracking and alerting
- Feedback loops and notifications

Provide specific pipeline configurations for {{platform}} with implementation details.`,
    variables: ['sourceControl', 'branchStrategy', 'teamSize', 'releaseFrequency', 'platform']
  },

  TESTING_STRATEGY: {
    id: 'testing-strategy',
    category: 'deployment',
    template: `# Comprehensive Testing Strategy

## Application Context
- **Application Type**: {{appType}}
- **Critical Features**: {{criticalFeatures}}
- **User Base**: {{userBase}}
- **Risk Tolerance**: {{riskTolerance}}

## Testing Pyramid Implementation
Design complete testing strategy:

### 1. Unit Testing
- Framework selection and configuration
- Coverage targets and quality gates
- Mocking and test isolation
- Performance and property-based testing

### 2. Integration Testing
- API contract testing
- Database integration testing
- External service mocking
- Error scenario validation

### 3. End-to-End Testing
- User journey automation
- Cross-browser and device testing
- Performance and load testing
- Security and penetration testing

### 4. Deployment Testing
- Smoke tests and health checks
- Canary testing and monitoring
- Rollback validation
- Post-deployment verification

Provide specific test implementation examples and CI/CD integration.`,
    variables: ['appType', 'criticalFeatures', 'userBase', 'riskTolerance']
  }
};

export const INFRASTRUCTURE_PROMPTS: Record<string, PromptTemplate> = {
  CLOUD_ARCHITECTURE: {
    id: 'cloud-architecture',
    category: 'deployment',
    template: `# Cloud Infrastructure Architecture

## Requirements Analysis
- **Cloud Provider**: {{cloudProvider}}
- **Application Scale**: {{scale}}
- **Geographic Distribution**: {{regions}}
- **Compliance Requirements**: {{compliance}}
- **Budget Constraints**: {{budget}}

## Architecture Design
Create comprehensive cloud architecture:

### 1. Compute Architecture
- Instance types and sizing
- Auto-scaling configuration
- Load balancing strategy
- Container orchestration

### 2. Storage Architecture
- Database selection and configuration
- File storage and CDN strategy
- Backup and disaster recovery
- Data lifecycle management

### 3. Network Architecture
- VPC design and subnetting
- Security groups and NACLs
- VPN and hybrid connectivity
- DNS and traffic routing

### 4. Security Architecture
- Identity and access management
- Encryption at rest and in transit
- Network security and monitoring
- Compliance and auditing

### 5. Cost Optimization
- Resource rightsizing
- Reserved instances and savings plans
- Spot instance strategies
- Cost monitoring and alerting

Provide Infrastructure as Code templates and operational procedures.`,
    variables: ['cloudProvider', 'scale', 'regions', 'compliance', 'budget']
  },

  MONITORING_SETUP: {
    id: 'monitoring-setup',
    category: 'deployment',
    template: `# Comprehensive Monitoring Strategy

## Application Context
- **Service Architecture**: {{architecture}}
- **Critical Metrics**: {{criticalMetrics}}
- **SLA Requirements**: {{slaRequirements}}
- **Team Size**: {{teamSize}}

## Monitoring Stack Design
Implement complete observability:

### 1. Metrics Collection
- Application performance monitoring
- Infrastructure metrics
- Business metrics and KPIs
- Custom metric definition

### 2. Logging Strategy
- Centralized log aggregation
- Log parsing and indexing
- Log retention and archival
- Security and audit logging

### 3. Distributed Tracing
- Request flow visualization
- Performance bottleneck identification
- Error tracking and debugging
- Service dependency mapping

### 4. Alerting and Incident Response
- Alert rule configuration
- Escalation procedures
- On-call rotation setup
- Incident management workflow

### 5. Dashboards and Visualization
- Executive dashboards
- Operational dashboards
- Custom reporting and analytics
- Mobile and accessibility considerations

Provide complete monitoring stack configuration and operational procedures.`,
    variables: ['architecture', 'criticalMetrics', 'slaRequirements', 'teamSize']
  }
};

export const SECURITY_PROMPTS: Record<string, PromptTemplate> = {
  SECURITY_AUDIT: {
    id: 'security-audit',
    category: 'security',
    template: `# Comprehensive Security Audit

## System Context
- **Application Type**: {{appType}}
- **Data Sensitivity**: {{dataSensitivity}}
- **Compliance Requirements**: {{complianceReqs}}
- **Threat Model**: {{threatModel}}

## Security Assessment
Perform comprehensive security analysis:

### 1. Authentication & Authorization
- Authentication mechanism review
- Authorization model validation
- Session management security
- Multi-factor authentication implementation

### 2. Data Protection
- Data classification and handling
- Encryption implementation (at rest/in transit)
- Key management and rotation
- Data backup and recovery security

### 3. Network Security
- Network architecture review
- Firewall and access control validation
- VPN and secure communication
- DDoS protection and rate limiting

### 4. Application Security
- Input validation and sanitization
- Output encoding and CSRF protection
- SQL injection and XSS prevention
- Security header implementation

### 5. Infrastructure Security
- Server hardening and patching
- Container security configuration
- Cloud security best practices
- Access control and privilege management

Provide specific remediation steps with priority levels and implementation timelines.`,
    variables: ['appType', 'dataSensitivity', 'complianceReqs', 'threatModel']
  },

  COMPLIANCE_REVIEW: {
    id: 'compliance-review',
    category: 'security',
    template: `# Compliance Assessment

## Compliance Context
- **Regulations**: {{regulations}}
- **Industry Standards**: {{standards}}
- **Geographic Requirements**: {{geoRequirements}}
- **Audit Timeline**: {{auditTimeline}}

## Compliance Analysis
Evaluate compliance posture:

### 1. Regulatory Requirements
- Specific regulation mapping
- Control implementation status
- Gap identification and prioritization
- Evidence collection and documentation

### 2. Technical Controls
- Access control implementation
- Data protection measures
- Audit logging and monitoring
- Incident response procedures

### 3. Administrative Controls
- Policy and procedure review
- Training and awareness programs
- Risk assessment and management
- Vendor management and due diligence

### 4. Physical Controls
- Facility security measures
- Equipment protection
- Environmental controls
- Disposal and destruction procedures

Provide compliance roadmap with specific action items and timelines.`,
    variables: ['regulations', 'standards', 'geoRequirements', 'auditTimeline']
  }
};

export const OPTIMIZATION_PROMPTS: Record<string, PromptTemplate> = {
  PERFORMANCE_OPTIMIZATION: {
    id: 'performance-optimization',
    category: 'optimization',
    template: `# Performance Optimization Strategy

## Performance Context
- **Current Performance**: {{currentPerformance}}
- **Performance Targets**: {{targets}}
- **User Base**: {{userBase}}
- **Critical Paths**: {{criticalPaths}}

## Optimization Analysis
Comprehensive performance improvement:

### 1. Frontend Optimization
- Bundle size reduction and code splitting
- Asset optimization and compression
- Caching strategies (browser, CDN)
- Rendering performance and lazy loading

### 2. Backend Optimization
- Database query optimization
- API response time improvement
- Caching layer implementation
- Resource utilization optimization

### 3. Infrastructure Optimization
- Auto-scaling configuration
- Load balancing optimization
- CDN configuration and edge computing
- Database performance tuning

### 4. Monitoring and Measurement
- Performance metrics definition
- Baseline establishment and tracking
- A/B testing for optimizations
- Continuous performance monitoring

Provide specific optimization techniques with expected performance gains.`,
    variables: ['currentPerformance', 'targets', 'userBase', 'criticalPaths']
  },

  COST_OPTIMIZATION: {
    id: 'cost-optimization',
    category: 'optimization',
    template: `# Cost Optimization Strategy

## Cost Context
- **Current Spend**: {{currentSpend}}
- **Budget Targets**: {{budgetTargets}}
- **Growth Projections**: {{growthProjections}}
- **Cost Centers**: {{costCenters}}

## Cost Reduction Analysis
Comprehensive cost optimization:

### 1. Infrastructure Costs
- Right-sizing recommendations
- Reserved instance optimization
- Spot instance strategies
- Unused resource identification

### 2. Operational Costs
- Automation opportunities
- Process optimization
- Tool consolidation
- Vendor negotiation strategies

### 3. Development Costs
- Development efficiency improvements
- Technical debt reduction
- Deployment optimization
- Maintenance cost reduction

### 4. Monitoring and Governance
- Cost allocation and tracking
- Budget alerts and controls
- Cost optimization metrics
- Regular review procedures

Provide specific cost reduction recommendations with projected savings.`,
    variables: ['currentSpend', 'budgetTargets', 'growthProjections', 'costCenters']
  }
};

export const TROUBLESHOOTING_PROMPTS: Record<string, PromptTemplate> = {
  INCIDENT_ANALYSIS: {
    id: 'incident-analysis',
    category: 'troubleshooting',
    template: `# Incident Analysis and Resolution

## Incident Context
- **Incident Type**: {{incidentType}}
- **Severity Level**: {{severity}}
- **Affected Systems**: {{affectedSystems}}
- **Timeline**: {{timeline}}
- **Impact**: {{impact}}

## Root Cause Analysis
Comprehensive incident investigation:

### 1. Immediate Assessment
- Impact scope and user effect
- System status and health checks
- Recent changes and deployments
- Resource utilization and capacity

### 2. Investigation Process
- Log analysis and correlation
- Metric analysis and anomaly detection
- Trace analysis and service mapping
- External dependency validation

### 3. Root Cause Identification
- Timeline reconstruction
- Contributing factor analysis
- Change correlation analysis
- Failure mode identification

### 4. Resolution and Prevention
- Immediate remediation steps
- Long-term prevention measures
- Process improvements
- Monitoring enhancements

Provide detailed action plan with prevention strategies and timeline.`,
    variables: ['incidentType', 'severity', 'affectedSystems', 'timeline', 'impact']
  },

  SYSTEM_DEBUGGING: {
    id: 'system-debugging',
    category: 'troubleshooting',
    template: `# System Debugging Strategy

## Debug Context
- **System Components**: {{components}}
- **Error Symptoms**: {{symptoms}}
- **Environment**: {{environment}}
- **Reproduction Steps**: {{reproSteps}}

## Debugging Approach
Systematic debugging methodology:

### 1. Problem Isolation
- Component isolation testing
- Environment comparison
- Configuration validation
- Dependency verification

### 2. Data Collection
- Log aggregation and analysis
- Metric collection and visualization
- Trace collection and analysis
- Performance profiling

### 3. Hypothesis Testing
- Systematic hypothesis formation
- Controlled testing procedures
- Result validation and analysis
- Iteration and refinement

### 4. Resolution Implementation
- Fix implementation and testing
- Rollout strategy and monitoring
- Validation and verification
- Documentation and knowledge sharing

Provide step-by-step debugging procedures with validation checkpoints.`,
    variables: ['components', 'symptoms', 'environment', 'reproSteps']
  }
};

// Export all prompt categories
export const DEVOPS_PROMPTS = {
  DEPLOYMENT: DEPLOYMENT_PROMPTS,
  CI_CD: CI_CD_PROMPTS,
  INFRASTRUCTURE: INFRASTRUCTURE_PROMPTS,
  SECURITY: SECURITY_PROMPTS,
  OPTIMIZATION: OPTIMIZATION_PROMPTS,
  TROUBLESHOOTING: TROUBLESHOOTING_PROMPTS
} as const;

// Utility function to get prompt by category and id
export function getDevOpsPrompt(category: keyof typeof DEVOPS_PROMPTS, promptId: string): PromptTemplate | null {
  const categoryPrompts = DEVOPS_PROMPTS[category];
  if (!categoryPrompts) return null;

  return Object.values(categoryPrompts).find(prompt => prompt.id === promptId) || null;
}

// Get all prompts for a category
export function getDevOpsPromptsByCategory(category: keyof typeof DEVOPS_PROMPTS): PromptTemplate[] {
  const categoryPrompts = DEVOPS_PROMPTS[category];
  return categoryPrompts ? Object.values(categoryPrompts) : [];
}

// Search prompts by keywords
export function searchDevOpsPrompts(keyword: string): PromptTemplate[] {
  const allPrompts: PromptTemplate[] = [];

  Object.values(DEVOPS_PROMPTS).forEach(categoryPrompts => {
    Object.values(categoryPrompts).forEach(prompt => {
      if (prompt.template.toLowerCase().includes(keyword.toLowerCase()) ||
          prompt.id.toLowerCase().includes(keyword.toLowerCase())) {
        allPrompts.push(prompt);
      }
    });
  });

  return allPrompts;
}