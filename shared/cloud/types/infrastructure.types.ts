/**
 * @fileoverview Infrastructure Types - Resource definitions and scaling configs
 * @description Comprehensive type definitions for cloud infrastructure management,
 * including compute resources, storage, networking, security, and monitoring
 * configurations. Enables Infrastructure as Code (IaC) approaches with
 * provider-agnostic resource definitions.
 *
 * These types support auto-scaling, load balancing, security policies,
 * and comprehensive infrastructure monitoring across cloud platforms.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

/**
 * Infrastructure configuration
 */
export interface InfrastructureConfig {
  readonly compute: ComputeConfig;
  readonly storage: StorageConfig;
  readonly network: NetworkConfig;
  readonly security: SecurityConfig;
  readonly monitoring: InfrastructureMonitoringConfig;
}

/**
 * Compute configuration
 */
export interface ComputeConfig {
  readonly instances: InstanceConfig[];
  readonly scaling: AutoScalingConfig;
  readonly loadBalancer?: LoadBalancerConfig;
}

/**
 * Instance configuration
 */
export interface InstanceConfig {
  readonly type: string; // e.g., 't3.micro', 'f1-micro'
  readonly cpu: number; // cores
  readonly memory: number; // GB
  readonly storage: number; // GB
  readonly region: string;
  readonly availabilityZone?: string;
}

/**
 * Auto-scaling configuration
 */
export interface AutoScalingConfig {
  readonly enabled: boolean;
  readonly minInstances: number;
  readonly maxInstances: number;
  readonly targetCPU: number; // percentage
  readonly targetMemory: number; // percentage
  readonly scaleUpCooldown: number; // seconds
  readonly scaleDownCooldown: number; // seconds;
  readonly policies: ScalingPolicy[];
}

/**
 * Scaling policy
 */
export interface ScalingPolicy {
  readonly name: string;
  readonly metric: 'cpu' | 'memory' | 'requests' | 'custom';
  readonly threshold: number;
  readonly action: 'scale-up' | 'scale-down';
  readonly adjustment: number; // number of instances
  readonly cooldown: number; // seconds
}

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  readonly type: 'application' | 'network' | 'gateway';
  readonly scheme: 'internal' | 'internet-facing';
  readonly listeners: LoadBalancerListener[];
  readonly healthCheck: HealthCheckConfig;
  readonly sslPolicy?: string;
  readonly stickySessions?: boolean;
}

/**
 * Load balancer listener
 */
export interface LoadBalancerListener {
  readonly port: number;
  readonly protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'UDP';
  readonly sslCertificate?: string;
  readonly rules: RoutingRule[];
}

/**
 * Routing rule
 */
export interface RoutingRule {
  readonly condition: RoutingCondition;
  readonly action: RoutingAction;
  readonly priority: number;
}

/**
 * Routing condition
 */
export interface RoutingCondition {
  readonly field: 'path-pattern' | 'host-header' | 'http-header' | 'query-string';
  readonly values: string[];
}

/**
 * Routing action
 */
export interface RoutingAction {
  readonly type: 'forward' | 'redirect' | 'fixed-response';
  readonly targetGroup?: string;
  readonly redirectUrl?: string;
  readonly statusCode?: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly enabled: boolean;
  readonly protocol: 'HTTP' | 'HTTPS' | 'TCP';
  readonly path?: string;
  readonly port?: number;
  readonly interval: number; // seconds
  readonly timeout: number; // seconds
  readonly healthyThreshold: number;
  readonly unhealthyThreshold: number;
  readonly matcher?: string; // HTTP response codes
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  readonly volumes: VolumeConfig[];
  readonly databases: DatabaseConfig[];
  readonly caches: CacheConfig[];
  readonly objectStorage: ObjectStorageConfig[];
}

/**
 * Volume configuration
 */
export interface VolumeConfig {
  readonly name: string;
  readonly type: 'gp3' | 'io2' | 'standard' | 'ssd' | 'hdd';
  readonly size: number; // GB
  readonly iops?: number;
  readonly encrypted: boolean;
  readonly backup: BackupConfig;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  readonly name: string;
  readonly engine: 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  readonly version: string;
  readonly instanceClass: string;
  readonly storage: number; // GB
  readonly multiAZ: boolean;
  readonly backup: BackupConfig;
  readonly monitoring: boolean;
  readonly encryption: boolean;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  readonly name: string;
  readonly engine: 'redis' | 'memcached';
  readonly nodeType: string;
  readonly numNodes: number;
  readonly port: number;
  readonly encryption: boolean;
}

/**
 * Object storage configuration
 */
export interface ObjectStorageConfig {
  readonly name: string;
  readonly provider: 's3' | 'gcs' | 'azure-blob';
  readonly region: string;
  readonly versioning: boolean;
  readonly encryption: boolean;
  readonly lifecycle: LifecyclePolicy[];
}

/**
 * Lifecycle policy
 */
export interface LifecyclePolicy {
  readonly name: string;
  readonly enabled: boolean;
  readonly rules: LifecycleRule[];
}

/**
 * Lifecycle rule
 */
export interface LifecycleRule {
  readonly condition: {
    readonly age?: number; // days
    readonly prefix?: string;
    readonly tags?: Record<string, string>;
  };
  readonly action: 'transition' | 'delete';
  readonly targetClass?: 'ia' | 'glacier' | 'deep-archive';
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  readonly enabled: boolean;
  readonly schedule: string; // cron expression
  readonly retention: number; // days
  readonly crossRegion: boolean;
  readonly encryption: boolean;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  readonly vpc: VPCConfig;
  readonly subnets: SubnetConfig[];
  readonly securityGroups: SecurityGroupConfig[];
  readonly routing: RouteConfig[];
}

/**
 * VPC configuration
 */
export interface VPCConfig {
  readonly cidr: string;
  readonly enableDnsSupport: boolean;
  readonly enableDnsHostnames: boolean;
  readonly tags: Record<string, string>;
}

/**
 * Subnet configuration
 */
export interface SubnetConfig {
  readonly name: string;
  readonly cidr: string;
  readonly availabilityZone: string;
  readonly public: boolean;
  readonly tags: Record<string, string>;
}

/**
 * Security group configuration
 */
export interface SecurityGroupConfig {
  readonly name: string;
  readonly description: string;
  readonly inboundRules: SecurityRule[];
  readonly outboundRules: SecurityRule[];
}

/**
 * Security rule
 */
export interface SecurityRule {
  readonly protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  readonly fromPort?: number;
  readonly toPort?: number;
  readonly source: string; // CIDR or security group ID
  readonly description?: string;
}

/**
 * Route configuration
 */
export interface RouteConfig {
  readonly destination: string; // CIDR
  readonly target: string; // gateway ID, instance ID, etc.
  readonly routeTable: string;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  readonly ssl: SSLConfig;
  readonly firewall: FirewallConfig;
  readonly accessControl: AccessControlConfig;
  readonly compliance: ComplianceConfig;
}

/**
 * SSL configuration
 */
export interface SSLConfig {
  readonly enabled: boolean;
  readonly certificateSource: 'managed' | 'imported' | 'self-signed';
  readonly certificateArn?: string;
  readonly protocols: string[];
  readonly ciphers: string[];
  readonly hsts: boolean;
}

/**
 * Firewall configuration
 */
export interface FirewallConfig {
  readonly enabled: boolean;
  readonly rules: FirewallRule[];
  readonly defaultAction: 'allow' | 'deny';
  readonly logging: boolean;
}

/**
 * Firewall rule
 */
export interface FirewallRule {
  readonly name: string;
  readonly action: 'allow' | 'deny';
  readonly protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  readonly source: string;
  readonly destination: string;
  readonly ports?: number[];
  readonly priority: number;
}

/**
 * Access control configuration
 */
export interface AccessControlConfig {
  readonly authentication: AuthenticationConfig;
  readonly authorization: AuthorizationConfig;
  readonly mfa: boolean;
  readonly sessionTimeout: number; // minutes
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  readonly provider: 'local' | 'oauth2' | 'saml' | 'ldap';
  readonly settings: Record<string, unknown>;
}

/**
 * Authorization configuration
 */
export interface AuthorizationConfig {
  readonly rbac: boolean;
  readonly policies: AuthorizationPolicy[];
}

/**
 * Authorization policy
 */
export interface AuthorizationPolicy {
  readonly name: string;
  readonly effect: 'allow' | 'deny';
  readonly actions: string[];
  readonly resources: string[];
  readonly conditions?: Record<string, unknown>;
}

/**
 * Compliance configuration
 */
export interface ComplianceConfig {
  readonly standards: ComplianceStandard[];
  readonly monitoring: boolean;
  readonly reporting: boolean;
  readonly remediation: boolean;
}

/**
 * Compliance standard
 */
export type ComplianceStandard = 'soc2' | 'pci-dss' | 'hipaa' | 'gdpr' | 'iso27001';

/**
 * Infrastructure monitoring configuration
 */
export interface InfrastructureMonitoringConfig {
  readonly metrics: boolean;
  readonly logs: boolean;
  readonly traces: boolean;
  readonly alerts: AlertConfig[];
  readonly dashboards: string[];
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  readonly name: string;
  readonly metric: string;
  readonly threshold: number;
  readonly comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  readonly duration: number; // seconds
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly channels: string[];
}

/**
 * Resource definition
 */
export interface ResourceDefinition {
  readonly type: string;
  readonly name: string;
  readonly properties: Record<string, unknown>;
  readonly dependencies?: string[];
  readonly tags?: Record<string, string>;
}