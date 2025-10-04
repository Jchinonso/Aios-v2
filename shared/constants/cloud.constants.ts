export const CLOUD_PROVIDERS = {
  VERCEL: 'vercel',
  NETLIFY: 'netlify',
  AWS: 'aws',
  RAILWAY: 'railway',
  RENDER: 'render',
  DIGITALOCEAN: 'digitalocean'
} as const;

export const FRAMEWORKS = {
  NEXT_JS: 'nextjs',
  REACT: 'react',
  VUE: 'vue',
  NUXT: 'nuxt',
  SVELTE: 'svelte',
  ANGULAR: 'angular',
  EXPRESS: 'express',
  FASTAPI: 'fastapi',
  DJANGO: 'django',
  STATIC: 'static'
} as const;

export const PACKAGE_MANAGERS = {
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm'
} as const;

export const DEPLOYMENT_STATUS = {
  PENDING: 'pending',
  BUILDING: 'building',
  READY: 'ready',
  ERROR: 'error'
} as const;

export const PROVIDER_LIMITS = {
  [CLOUD_PROVIDERS.VERCEL]: {
    maxProjects: 100,
    maxDeployments: 3000,
    buildTimeout: 45 * 60 * 1000 // 45 minutes
  },
  [CLOUD_PROVIDERS.NETLIFY]: {
    maxSites: 500,
    maxBuilds: 300,
    buildTimeout: 15 * 60 * 1000 // 15 minutes
  },
  [CLOUD_PROVIDERS.RAILWAY]: {
    maxProjects: 500,
    maxServices: 20,
    buildTimeout: 30 * 60 * 1000 // 30 minutes
  }
} as const;