/**
 * Cloud Configuration - Centralized configuration for cloud providers
 */

import type { CloudProviderType, ProviderFeature } from '../types/cloud-provider.types.js'

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  readonly features: ProviderFeature[];
  readonly regions: string[];
  readonly limits: {
    readonly maxDeployments: number;
    readonly maxConcurrentDeployments: number;
    readonly maxBuildTime: number; // in seconds
    readonly maxFileSize: number; // in bytes
  };
  readonly pricing: {
    readonly basePrice: number; // per month
    readonly buildPrice: number; // per build
    readonly bandwidthPrice: number; // per GB
  };
}

/**
 * Cloud configuration interface
 */
export interface CloudConfig {
  readonly providers: Record<CloudProviderType, ProviderConfig>;
  readonly defaultProvider: CloudProviderType;
  readonly globalLimits: {
    readonly maxConcurrentDeployments: number;
    readonly maxBuildTime: number;
    readonly maxFileSize: number;
  };
  readonly monitoring: {
    readonly enabled: boolean;
    readonly retentionDays: number;
  };
  readonly costOptimization: {
    readonly enabled: boolean;
    readonly budgetLimit: number;
    readonly alertThreshold: number;
  };
}

/**
 * Default cloud configuration
 */
export const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  providers: {
    vercel: {
      features: [
        'zero-config',
        'preview-deployments',
        'edge-functions',
        'automatic-ssl',
        'custom-domains',
        'analytics',
        'serverless-functions'
      ],
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      limits: {
        maxDeployments: 1000,
        maxConcurrentDeployments: 5,
        maxBuildTime: 1800, // 30 minutes
        maxFileSize: 100 * 1024 * 1024 // 100MB
      },
      pricing: {
        basePrice: 0,
        buildPrice: 0,
        bandwidthPrice: 0
      }
    },
    netlify: {
      features: [
        'static-hosting',
        'form-handling',
        'identity',
        'functions',
        'split-testing',
        'edge-handlers'
      ],
      regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
      limits: {
        maxDeployments: 500,
        maxConcurrentDeployments: 3,
        maxBuildTime: 1200, // 20 minutes
        maxFileSize: 50 * 1024 * 1024 // 50MB
      },
      pricing: {
        basePrice: 0,
        buildPrice: 0,
        bandwidthPrice: 0
      }
    },
    railway: {
      features: [
        'full-stack-deployment',
        'database-provisioning',
        'environment-management',
        'auto-scaling',
        'monitoring'
      ],
      regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
      limits: {
        maxDeployments: 100,
        maxConcurrentDeployments: 2,
        maxBuildTime: 2400, // 40 minutes
        maxFileSize: 200 * 1024 * 1024 // 200MB
      },
      pricing: {
        basePrice: 5,
        buildPrice: 0.1,
        bandwidthPrice: 0.1
      }
    },
    aws: {
      features: [
        'ec2',
        'lambda',
        's3',
        'cloudfront',
        'rds',
        'elastic-beanstalk',
        'ecs',
        'eks'
      ],
      regions: [
        'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1',
        'ap-northeast-1', 'ca-central-1', 'eu-central-1'
      ],
      limits: {
        maxDeployments: 10000,
        maxConcurrentDeployments: 20,
        maxBuildTime: 3600, // 60 minutes
        maxFileSize: 500 * 1024 * 1024 // 500MB
      },
      pricing: {
        basePrice: 10,
        buildPrice: 0.05,
        bandwidthPrice: 0.09
      }
    },
    gcp: {
      features: [
        'compute-engine',
        'cloud-functions',
        'cloud-storage',
        'cloud-cdn',
        'cloud-sql',
        'app-engine',
        'cloud-run',
        'gke'
      ],
      regions: [
        'us-central1', 'us-east1', 'us-west1', 'europe-west1',
        'asia-southeast1', 'asia-northeast1'
      ],
      limits: {
        maxDeployments: 10000,
        maxConcurrentDeployments: 20,
        maxBuildTime: 3600, // 60 minutes
        maxFileSize: 500 * 1024 * 1024 // 500MB
      },
      pricing: {
        basePrice: 10,
        buildPrice: 0.05,
        bandwidthPrice: 0.12
      }
    },
    azure: {
      features: [
        'virtual-machines',
        'azure-functions',
        'blob-storage',
        'cdn',
        'sql-database',
        'app-service',
        'container-instances',
        'aks'
      ],
      regions: [
        'eastus', 'westus2', 'westeurope', 'southeastasia',
        'japaneast', 'canadacentral'
      ],
      limits: {
        maxDeployments: 10000,
        maxConcurrentDeployments: 20,
        maxBuildTime: 3600, // 60 minutes
        maxFileSize: 500 * 1024 * 1024 // 500MB
      },
      pricing: {
        basePrice: 10,
        buildPrice: 0.05,
        bandwidthPrice: 0.087
      }
    },
    render: {
      features: [
        'static-hosting',
        'serverless-functions',
        'custom-domains',
        'ssl-certificates',
        'monitoring',
        'logs'
      ],
      regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
      limits: {
        maxDeployments: 1000,
        maxConcurrentDeployments: 5,
        maxBuildTime: 1800, // 30 minutes
        maxFileSize: 100 * 1024 * 1024 // 100MB
      },
      pricing: {
        basePrice: 7,
        buildPrice: 0.02,
        bandwidthPrice: 0.1
      }
    },
    digitalocean: {
      features: [
        'virtual-machines',
        'kubernetes',
        'managed-databases',
        'cdn',
        'load-balancing',
        'monitoring'
      ],
      regions: ['nyc1', 'sfo2', 'fra1', 'sgp1'],
      limits: {
        maxDeployments: 5000,
        maxConcurrentDeployments: 10,
        maxBuildTime: 2400, // 40 minutes
        maxFileSize: 200 * 1024 * 1024 // 200MB
      },
      pricing: {
        basePrice: 5,
        buildPrice: 0.02,
        bandwidthPrice: 0.01
      }
    },
    linode: {
      features: [
        'virtual-machines',
        'kubernetes',
        'managed-databases',
        'cdn',
        'load-balancing',
        'monitoring'
      ],
      regions: ['us-east', 'us-west', 'eu-west', 'ap-south'],
      limits: {
        maxDeployments: 3000,
        maxConcurrentDeployments: 8,
        maxBuildTime: 2400, // 40 minutes
        maxFileSize: 150 * 1024 * 1024 // 150MB
      },
      pricing: {
        basePrice: 5,
        buildPrice: 0.02,
        bandwidthPrice: 0.01
      }
    },
    vultr: {
      features: [
        'virtual-machines',
        'kubernetes',
        'managed-databases',
        'cdn',
        'load-balancing',
        'monitoring'
      ],
      regions: ['ewr', 'lax', 'fra', 'nrt'],
      limits: {
        maxDeployments: 2000,
        maxConcurrentDeployments: 5,
        maxBuildTime: 1800, // 30 minutes
        maxFileSize: 100 * 1024 * 1024 // 100MB
      },
      pricing: {
        basePrice: 3.5,
        buildPrice: 0.01,
        bandwidthPrice: 0.01
      }
    },
    fly: {
      features: [
        'edge-functions',
        'global-deployment',
        'custom-domains',
        'ssl-certificates',
        'monitoring',
        'logs'
      ],
      regions: ['iad', 'lhr', 'nrt', 'syd'],
      limits: {
        maxDeployments: 500,
        maxConcurrentDeployments: 3,
        maxBuildTime: 1200, // 20 minutes
        maxFileSize: 50 * 1024 * 1024 // 50MB
      },
      pricing: {
        basePrice: 0,
        buildPrice: 0,
        bandwidthPrice: 0.02
      }
    },
    cloudflare: {
      features: [
        'edge-functions',
        'cdn',
        'custom-domains',
        'ssl-certificates',
        'analytics',
        'monitoring'
      ],
      regions: ['global'],
      limits: {
        maxDeployments: 10000,
        maxConcurrentDeployments: 50,
        maxBuildTime: 600, // 10 minutes
        maxFileSize: 10 * 1024 * 1024 // 10MB
      },
      pricing: {
        basePrice: 0,
        buildPrice: 0,
        bandwidthPrice: 0
      }
    }
  },
  defaultProvider: 'vercel',
  globalLimits: {
    maxConcurrentDeployments: 10,
    maxBuildTime: 3600, // 60 minutes
    maxFileSize: 500 * 1024 * 1024 // 500MB
  },
  monitoring: {
    enabled: true,
    retentionDays: 30
  },
  costOptimization: {
    enabled: true,
    budgetLimit: 1000, // $1000
    alertThreshold: 0.8 // 80%
  }
};

/**
 * Get cloud configuration
 */
export function getCloudConfig(): CloudConfig {
  return DEFAULT_CLOUD_CONFIG;
}
