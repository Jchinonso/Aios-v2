// Intelligence Analysis Types
// Defines types for project analysis and intelligence operations

import type { AnalysisMetadata } from '../file-system/types/analyzer.interface.js'

export interface ProjectAnalysis {
  readonly id: string;
  readonly projectPath: string;
  readonly summary: ProjectSummary;
  readonly technologyStack: TechnologyStack;
  readonly resourceRequirements: ResourceRequirements;
  readonly deploymentConstraints: DeploymentConstraints;
  readonly detectedPatterns: DetectedPattern[];
  readonly confidence: number;
  readonly timestamp: Date;
  readonly metadata: AnalysisMetadata;
}

export interface ProjectSummary {
  readonly projectType: ProjectType;
  readonly primaryLanguage: string;
  readonly architecturePattern: ArchitecturePattern;
  readonly deploymentComplexity: ComplexityLevel;
  readonly estimatedMonthlyCost: string;
  readonly teamReadinessScore: number;
  readonly description: string;
}

export type ProjectType =
  | 'static-site'
  | 'spa-application'
  | 'full-stack-web-application'
  | 'api-backend'
  | 'microservices-system'
  | 'jamstack-application'
  | 'mobile-backend'
  | 'ml-pipeline'
  | 'data-processing-system';

export type ArchitecturePattern =
  | 'spa-with-api'
  | 'server-side-rendered'
  | 'jamstack'
  | 'microservices'
  | 'monolithic'
  | 'serverless-functions'
  | 'event-driven'
  | 'cqrs-pattern';

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'enterprise';

export interface TechnologyStack {
  readonly frontend?: FrontendStack;
  readonly backend?: BackendStack;
  readonly database?: DatabaseStack;
  readonly infrastructure: InfrastructureStack;
  readonly thirdPartyServices: ThirdPartyService[];
}

export interface FrontendStack {
  readonly framework: string;
  readonly version: string;
  readonly rendering: 'client-side' | 'server-side' | 'static' | 'hybrid';
  readonly buildTool: string;
  readonly uiLibraries: string[];
  readonly stateManagement?: string;
  readonly deploymentRequirements: FrontendDeploymentRequirements;
}

export interface BackendStack {
  readonly framework: string;
  readonly runtime: string;
  readonly database?: string;
  readonly apiType: 'rest' | 'graphql' | 'grpc' | 'websocket';
  readonly deploymentRequirements: BackendDeploymentRequirements;
}

export interface DatabaseStack {
  readonly type: string;
  readonly version: string;
  readonly hosting: 'managed' | 'self-hosted' | 'embedded';
  readonly deploymentRequirements: DatabaseDeploymentRequirements;
}

export interface InfrastructureStack {
  readonly containerization: ContainerizationInfo;
  readonly orchestration: OrchestrationInfo;
  readonly monitoring: MonitoringInfo;
  readonly security: SecurityInfo;
}

export interface ContainerizationInfo {
  readonly type: 'docker' | 'podman' | 'containerd' | 'none';
  readonly dockerfile?: string;
  readonly composeFile?: string;
  readonly baseImage?: string;
}

export interface OrchestrationInfo {
  readonly type: 'kubernetes' | 'docker-swarm' | 'nomad' | 'none';
  readonly manifests?: string[];
  readonly helmCharts?: string[];
}

export interface MonitoringInfo {
  readonly type: 'prometheus' | 'datadog' | 'newrelic' | 'custom' | 'none';
  readonly dashboards?: string[];
  readonly alerts?: string[];
}

export interface SecurityInfo {
  readonly type: 'basic' | 'advanced' | 'enterprise';
  readonly features: string[];
  readonly compliance: string[];
}

export interface FrontendDeploymentRequirements {
  readonly staticHosting: boolean;
  readonly cdnRequired: boolean;
  readonly sslRequired: boolean;
  readonly customDomain: boolean;
  readonly environmentVariables: string[];
}

export interface BackendDeploymentRequirements {
  readonly runtimeEnvironment: string;
  readonly databaseConnection: boolean;
  readonly externalApis: string[];
  readonly environmentVariables: string[];
  readonly persistentStorage: boolean;
}

export interface DatabaseDeploymentRequirements {
  readonly backupStrategy: string;
  readonly scalingStrategy: string;
  readonly securityLevel: string;
  readonly monitoringRequired: boolean;
}

export interface ThirdPartyService {
  readonly name: string;
  readonly type: string;
  readonly purpose: string;
  readonly required: boolean;
  readonly cost: string;
}

export interface ResourceRequirements {
  readonly cpu: CpuRequirements;
  readonly memory: MemoryRequirements;
  readonly storage: StorageRequirements;
  readonly network: NetworkRequirements;
  readonly scaling: ScalingRequirements;
}

export interface CpuRequirements {
  readonly minCores: number;
  readonly maxCores: number;
  readonly architecture: string;
  readonly burstable: boolean;
}

export interface MemoryRequirements {
  readonly minGB: number;
  readonly maxGB: number;
  readonly type: 'standard' | 'high-memory' | 'optimized';
}

export interface StorageRequirements {
  readonly minGB: number;
  readonly maxGB: number;
  readonly type: 'ssd' | 'hdd' | 'nvme';
  readonly persistent: boolean;
  readonly backup: boolean;
}

export interface NetworkRequirements {
  readonly bandwidth: number;
  readonly latency: number;
  readonly regions: string[];
  readonly cdn: boolean;
}

export interface ScalingRequirements {
  readonly minInstances: number;
  readonly maxInstances: number;
  readonly autoScaling: boolean;
  readonly loadBalancing: boolean;
}

export interface DeploymentConstraints {
  readonly budget: BudgetConstraints;
  readonly timeline: TimelineConstraints;
  readonly technical: TechnicalConstraints;
  readonly compliance: ComplianceConstraints;
}

export interface BudgetConstraints {
  readonly maxMonthlyCost: number;
  readonly currency: string;
  readonly freeTier: boolean;
  readonly reservedInstances: boolean;
}

export interface TimelineConstraints {
  readonly deploymentDate: Date;
  readonly goLiveDate: Date;
  readonly maintenanceWindows: string[];
  readonly rollbackPlan: boolean;
}

export interface TechnicalConstraints {
  readonly cloudProviders: string[];
  readonly regions: string[];
  readonly architectures: string[];
  readonly operatingSystems: string[];
}

export interface ComplianceConstraints {
  readonly standards: string[];
  readonly certifications: string[];
  readonly dataResidency: string[];
  readonly auditLogging: boolean;
}

export interface DetectedPattern {
  readonly type: string;
  readonly pattern: string;
  readonly files: string[];
  readonly confidence: number;
  readonly description: string;
  readonly recommendations: string[];
}

// Removed duplicate AnalysisMetadata - use the one from analyzer.interface.ts
