// Intelligence Provider Types
// Defines types for cloud providers and AI providers

export interface ProviderCapability {
  readonly name: string;
  readonly type: ProviderType;
  readonly region: string;
  readonly pricing: PricingModel;
  readonly technicalSpecs: TechnicalSpecs;
  readonly strengths: string[];
  readonly limitations: string[];
  readonly useCases: string[];
  readonly compatibility: CompatibilityMatrix;
}

export type ProviderType = 'cloud' | 'ai' | 'database' | 'storage' | 'cdn' | 'monitoring';

export interface PricingModel {
  readonly model: 'pay-as-you-go' | 'reserved' | 'spot' | 'free-tier';
  readonly currency: string;
  readonly pricing: PricingTier[];
  readonly freeTier?: FreeTierInfo;
}

export interface PricingTier {
  readonly name: string;
  readonly minUsage: number;
  readonly maxUsage?: number;
  readonly price: number;
  readonly unit: string;
}

export interface FreeTierInfo {
  readonly duration: string;
  readonly limits: Record<string, number>;
  readonly restrictions: string[];
}

export interface TechnicalSpecs {
  readonly cpu: CpuSpecs;
  readonly memory: MemorySpecs;
  readonly storage: StorageSpecs;
  readonly network: NetworkSpecs;
  readonly limits: ResourceLimits;
}

export interface CpuSpecs {
  readonly architectures: string[];
  readonly minCores: number;
  readonly maxCores: number;
  readonly burstable: boolean;
}

export interface MemorySpecs {
  readonly minGB: number;
  readonly maxGB: number;
  readonly types: string[];
}

export interface StorageSpecs {
  readonly minGB: number;
  readonly maxGB: number;
  readonly types: string[];
  readonly persistent: boolean;
}

export interface NetworkSpecs {
  readonly bandwidth: number;
  readonly latency: number;
  readonly regions: string[];
  readonly cdn: boolean;
}

export interface ResourceLimits {
  readonly maxInstances: number;
  readonly maxConcurrentRequests: number;
  readonly maxStorageGB: number;
  readonly maxBandwidthGB: number;
}

export interface CompatibilityMatrix {
  readonly frameworks: string[];
  readonly languages: string[];
  readonly databases: string[];
  readonly operatingSystems: string[];
  readonly containerRuntimes: string[];
}

export interface ProviderScore {
  readonly provider: string;
  readonly score: number;
  readonly factors: ScoreFactor[];
  readonly recommendation: string;
}

export interface ScoreFactor {
  readonly name: string;
  readonly weight: number;
  readonly score: number;
  readonly reason: string;
}

export interface ProviderRecommendation {
  readonly primary: ProviderScore;
  readonly alternatives: ProviderScore[];
  readonly reasoning: string;
  readonly configuration: DeploymentConfiguration;
}

export interface DeploymentConfiguration {
  readonly provider: string;
  readonly region: string;
  readonly resources: ResourceConfiguration;
  readonly networking: NetworkingConfiguration;
  readonly security: SecurityConfiguration;
  readonly monitoring: MonitoringConfiguration;
  readonly cost: CostEstimate;
}

export interface ResourceConfiguration {
  readonly instances: InstanceConfiguration[];
  readonly storage: StorageConfiguration[];
  readonly databases: DatabaseConfiguration[];
}

export interface InstanceConfiguration {
  readonly type: string;
  readonly count: number;
  readonly cpu: number;
  readonly memory: number;
  readonly storage: number;
}

export interface StorageConfiguration {
  readonly type: string;
  readonly size: number;
  readonly iops?: number;
  readonly backup: boolean;
}

export interface DatabaseConfiguration {
  readonly type: string;
  readonly version: string;
  readonly size: number;
  readonly backup: boolean;
  readonly encryption: boolean;
}

export interface NetworkingConfiguration {
  readonly vpc: boolean;
  readonly subnets: string[];
  readonly loadBalancer: boolean;
  readonly cdn: boolean;
  readonly ssl: boolean;
}

export interface SecurityConfiguration {
  readonly encryption: boolean;
  readonly accessControl: string[];
  readonly compliance: string[];
  readonly monitoring: boolean;
}

export interface MonitoringConfiguration {
  readonly type: string;
  readonly dashboards: string[];
  readonly alerts: string[];
  readonly logging: boolean;
  readonly metrics: string[];
}

export interface CostEstimate {
  readonly monthly: number;
  readonly currency: string;
  readonly breakdown: CostBreakdown[];
  readonly savings: CostSavings[];
}

export interface CostBreakdown {
  readonly category: string;
  readonly cost: number;
  readonly percentage: number;
}

export interface CostSavings {
  readonly strategy: string;
  readonly potentialSavings: number;
  readonly implementation: string;
}
