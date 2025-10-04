/**
 * @fileoverview Cloud and AI Provider Regions
 * @description Centralized region definitions for all cloud and AI providers
 * @module shared/constants
 * @version 2.0.0
 * @since 2.0.0
 */

import type { CloudProviderType } from '../cloud/types/cloud-provider.types.js';

/**
 * AWS Regions
 * @description Available AWS regions for cloud deployments
 * @see https://docs.aws.amazon.com/general/latest/gr/rande.html
 */
export const AWS_REGIONS = [
  // US Regions
  'us-east-1',      // N. Virginia (Primary)
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon

  // Europe Regions
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'eu-central-1',   // Frankfurt
  'eu-north-1',     // Stockholm
  'eu-south-1',     // Milan

  // Asia Pacific Regions
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-southeast-3', // Jakarta
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-northeast-3', // Osaka
  'ap-south-1',     // Mumbai
  'ap-east-1',      // Hong Kong

  // Other Regions
  'sa-east-1',      // São Paulo
  'ca-central-1',   // Canada (Central)
  'me-south-1',     // Bahrain
  'af-south-1',     // Cape Town
] as const;

/**
 * Google Cloud Platform (GCP) Regions
 * @description Available GCP regions for cloud deployments
 * @see https://cloud.google.com/compute/docs/regions-zones
 */
export const GCP_REGIONS = [
  // Americas
  'us-central1',          // Iowa
  'us-east1',            // South Carolina
  'us-east4',            // N. Virginia
  'us-west1',            // Oregon
  'us-west2',            // Los Angeles
  'us-west3',            // Salt Lake City
  'us-west4',            // Las Vegas
  'northamerica-northeast1',  // Montreal
  'southamerica-east1',  // São Paulo

  // Europe
  'europe-west1',        // Belgium
  'europe-west2',        // London
  'europe-west3',        // Frankfurt
  'europe-west4',        // Netherlands
  'europe-west6',        // Zurich
  'europe-north1',       // Finland
  'europe-central2',     // Warsaw

  // Asia Pacific
  'asia-east1',          // Taiwan
  'asia-east2',          // Hong Kong
  'asia-northeast1',     // Tokyo
  'asia-northeast2',     // Osaka
  'asia-northeast3',     // Seoul
  'asia-south1',         // Mumbai
  'asia-south2',         // Delhi
  'asia-southeast1',     // Singapore
  'asia-southeast2',     // Jakarta

  // Australia
  'australia-southeast1', // Sydney
  'australia-southeast2', // Melbourne
] as const;

/**
 * Azure Regions
 * @description Available Azure regions for cloud deployments
 * @see https://azure.microsoft.com/en-us/explore/global-infrastructure/geographies/
 */
export const AZURE_REGIONS = [
  // Americas
  'eastus',           // East US
  'eastus2',          // East US 2
  'westus',           // West US
  'westus2',          // West US 2
  'westus3',          // West US 3
  'centralus',        // Central US
  'northcentralus',   // North Central US
  'southcentralus',   // South Central US
  'canadacentral',    // Canada Central
  'canadaeast',       // Canada East
  'brazilsouth',      // Brazil South

  // Europe
  'northeurope',      // North Europe (Ireland)
  'westeurope',       // West Europe (Netherlands)
  'uksouth',          // UK South
  'ukwest',           // UK West
  'francecentral',    // France Central
  'francesouth',      // France South
  'germanywestcentral', // Germany West Central
  'norwayeast',       // Norway East
  'switzerlandnorth', // Switzerland North
  'swedencentral',    // Sweden Central

  // Asia Pacific
  'southeastasia',    // Southeast Asia (Singapore)
  'eastasia',         // East Asia (Hong Kong)
  'japaneast',        // Japan East
  'japanwest',        // Japan West
  'koreacentral',     // Korea Central
  'koreasouth',       // Korea South
  'australiaeast',    // Australia East
  'australiasoutheast', // Australia Southeast
  'australiacentral', // Australia Central
  'centralindia',     // Central India
  'southindia',       // South India
  'westindia',        // West India

  // Middle East & Africa
  'uaenorth',         // UAE North
  'southafricanorth', // South Africa North
] as const;

/**
 * Vercel Edge Network Regions
 * @description Available Vercel edge regions for deployments
 * @see https://vercel.com/docs/edge-network/regions
 */
export const VERCEL_REGIONS = [
  // Americas
  'iad1',    // Washington, D.C., USA
  'sfo1',    // San Francisco, CA, USA
  'pdx1',    // Portland, OR, USA
  'cle1',    // Cleveland, OH, USA
  'gru1',    // São Paulo, Brazil

  // Europe
  'lhr1',    // London, United Kingdom
  'cdg1',    // Paris, France
  'ams1',    // Amsterdam, Netherlands
  'fra1',    // Frankfurt, Germany
  'dub1',    // Dublin, Ireland

  // Asia Pacific
  'hnd1',    // Tokyo, Japan
  'sin1',    // Singapore
  'syd1',    // Sydney, Australia
  'hkg1',    // Hong Kong
  'icn1',    // Seoul, South Korea
  'bom1',    // Mumbai, India
] as const;

/**
 * Netlify Edge Locations
 * @description Netlify edge locations (based on AWS CloudFront)
 * @see https://docs.netlify.com/edge-functions/overview/
 */
export const NETLIFY_REGIONS = [
  // Uses AWS regions
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-south-1',
  'ca-central-1',
  'sa-east-1',
] as const;

/**
 * Cloudflare Regions
 * @description Cloudflare edge locations (300+ cities globally)
 * Listed are major colos
 * @see https://www.cloudflare.com/network/
 */
export const CLOUDFLARE_REGIONS = [
  'global',           // Global edge network
  'us-east',          // US East Coast
  'us-west',          // US West Coast
  'us-central',       // US Central
  'eu-west',          // Europe West
  'eu-central',       // Europe Central
  'asia-pacific',     // Asia Pacific
  'south-america',    // South America
  'middle-east',      // Middle East
  'africa',           // Africa
  'australia',        // Australia
] as const;

/**
 * Railway Regions
 * @description Available Railway deployment regions
 * @see https://railway.app/
 */
export const RAILWAY_REGIONS = [
  'us-west1',         // US West (Primary)
  'us-east1',         // US East
  'eu-west1',         // Europe West
] as const;

/**
 * Render Regions
 * @description Available Render deployment regions
 * @see https://render.com/docs/regions
 */
export const RENDER_REGIONS = [
  'oregon',           // US West (Oregon)
  'ohio',             // US East (Ohio)
  'frankfurt',        // Europe (Frankfurt)
  'singapore',        // Asia (Singapore)
] as const;

/**
 * Fly.io Regions
 * @description Available Fly.io regions
 * @see https://fly.io/docs/reference/regions/
 */
export const FLY_REGIONS = [
  // Americas
  'iad',     // Ashburn, Virginia (US)
  'ord',     // Chicago, Illinois (US)
  'dfw',     // Dallas, Texas (US)
  'lax',     // Los Angeles, California (US)
  'sea',     // Seattle, Washington (US)
  'sjc',     // San Jose, California (US)
  'ewr',     // Secaucus, NJ (US)
  'yyz',     // Toronto, Canada
  'qro',     // Querétaro, Mexico
  'scl',     // Santiago, Chile
  'gru',     // São Paulo, Brazil

  // Europe
  'ams',     // Amsterdam, Netherlands
  'lhr',     // London, United Kingdom
  'cdg',     // Paris, France
  'fra',     // Frankfurt, Germany
  'mad',     // Madrid, Spain
  'waw',     // Warsaw, Poland

  // Asia Pacific
  'nrt',     // Tokyo, Japan
  'sin',     // Singapore
  'syd',     // Sydney, Australia
  'hkg',     // Hong Kong
  'bom',     // Mumbai, India
] as const;

/**
 * Heroku Regions
 * @description Available Heroku regions
 * @see https://devcenter.heroku.com/articles/regions
 */
export const HEROKU_REGIONS = [
  'us',      // United States
  'eu',      // Europe
] as const;

/**
 * DigitalOcean Regions
 * @description Available DigitalOcean datacenter regions
 * @see https://docs.digitalocean.com/products/platform/availability-matrix/
 */
export const DIGITALOCEAN_REGIONS = [
  // Americas
  'nyc1',    // New York City 1
  'nyc2',    // New York City 2
  'nyc3',    // New York City 3
  'sfo1',    // San Francisco 1
  'sfo2',    // San Francisco 2
  'sfo3',    // San Francisco 3
  'tor1',    // Toronto 1

  // Europe
  'lon1',    // London 1
  'ams2',    // Amsterdam 2
  'ams3',    // Amsterdam 3
  'fra1',    // Frankfurt 1

  // Asia Pacific
  'sgp1',    // Singapore 1
  'blr1',    // Bangalore 1
  'syd1',    // Sydney 1
] as const;

/**
 * AI Provider Regions
 * @description Regions for AI/LLM providers
 */

/**
 * OpenAI Regions
 * @description OpenAI API regions
 */
export const OPENAI_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'asia-pacific-1',
] as const;

/**
 * Anthropic Claude Regions
 * @description Anthropic API regions
 */
export const ANTHROPIC_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
] as const;

/**
 * Google Vertex AI Regions
 * @description Google Vertex AI regions
 */
export const GOOGLE_AI_REGIONS = [
  'us-central1',
  'us-east1',
  'us-west1',
  'europe-west1',
  'europe-west4',
  'asia-northeast1',
  'asia-southeast1',
] as const;

/**
 * Cohere Regions
 * @description Cohere API regions
 */
export const COHERE_REGIONS = [
  'us-east-1',
  'eu-west-1',
] as const;

/**
 * HuggingFace Regions
 * @description HuggingFace Inference API regions
 */
export const HUGGINGFACE_REGIONS = [
  'us-east-1',
  'eu-west-1',
] as const;

/**
 * Replicate Regions
 * @description Replicate API regions
 */
export const REPLICATE_REGIONS = [
  'us-east-1',
  'us-west-2',
] as const;

/**
 * Groq Regions
 * @description Groq API regions
 */
export const GROQ_REGIONS = [
  'us-central-1',
] as const;

/**
 * Ollama Regions (Local)
 */
export const OLLAMA_REGIONS = [
  'local',
] as const;

/**
 * Linode Regions
 * @description Available Linode datacenter regions
 */
export const LINODE_REGIONS = [
  'us-east',     // Newark, NJ
  'us-central',  // Dallas, TX
  'us-west',     // Fremont, CA
  'ca-central',  // Toronto, Canada
  'eu-west',     // London, UK
  'eu-central',  // Frankfurt, Germany
  'ap-south',    // Singapore
  'ap-northeast', // Tokyo, Japan
  'ap-southeast', // Sydney, Australia
] as const;

/**
 * Vultr Regions
 * @description Available Vultr datacenter regions
 */
export const VULTR_REGIONS = [
  'ewr',     // New Jersey
  'ord',     // Chicago
  'dfw',     // Dallas
  'sea',     // Seattle
  'lax',     // Los Angeles
  'atl',     // Atlanta
  'ams',     // Amsterdam
  'lhr',     // London
  'fra',     // Frankfurt
  'cdg',     // Paris
  'waw',     // Warsaw
  'nrt',     // Tokyo
  'sgp',     // Singapore
  'syd',     // Sydney
  'mel',     // Melbourne
  'icn',     // Seoul
] as const;

/**
 * Provider Regions Map
 * @description Map of cloud providers to their available regions
 */
export const PROVIDER_REGIONS_MAP: Readonly<Record<CloudProviderType, readonly string[]>> = {
  aws: AWS_REGIONS,
  gcp: GCP_REGIONS,
  azure: AZURE_REGIONS,
  vercel: VERCEL_REGIONS,
  netlify: NETLIFY_REGIONS,
  cloudflare: CLOUDFLARE_REGIONS,
  railway: RAILWAY_REGIONS,
  render: RENDER_REGIONS,
  fly: FLY_REGIONS,
  digitalocean: DIGITALOCEAN_REGIONS,
  linode: LINODE_REGIONS,
  vultr: VULTR_REGIONS,
} as const;

/**
 * Region Categories
 */
export const REGION_CATEGORIES = {
  AMERICAS: 'americas',
  EUROPE: 'europe',
  ASIA_PACIFIC: 'asia-pacific',
  MIDDLE_EAST: 'middle-east',
  AFRICA: 'africa',
  AUSTRALIA: 'australia',
  GLOBAL: 'global',
} as const;

export type RegionCategory = typeof REGION_CATEGORIES[keyof typeof REGION_CATEGORIES];

/**
 * Region Metadata
 */
export interface RegionMetadata {
  readonly code: string;
  readonly name: string;
  readonly category: RegionCategory;
  readonly location: string;
  readonly latency?: {
    readonly typical: number; // milliseconds
    readonly unit: 'ms';
  };
}

/**
 * AWS Region Metadata
 */
export const AWS_REGION_METADATA: Readonly<Record<string, RegionMetadata>> = {
  'us-east-1': {
    code: 'us-east-1',
    name: 'US East (N. Virginia)',
    category: REGION_CATEGORIES.AMERICAS,
    location: 'N. Virginia, USA',
    latency: { typical: 20, unit: 'ms' },
  },
  'us-west-2': {
    code: 'us-west-2',
    name: 'US West (Oregon)',
    category: REGION_CATEGORIES.AMERICAS,
    location: 'Oregon, USA',
    latency: { typical: 30, unit: 'ms' },
  },
  'eu-west-1': {
    code: 'eu-west-1',
    name: 'EU (Ireland)',
    category: REGION_CATEGORIES.EUROPE,
    location: 'Dublin, Ireland',
    latency: { typical: 80, unit: 'ms' },
  },
  'ap-southeast-1': {
    code: 'ap-southeast-1',
    name: 'Asia Pacific (Singapore)',
    category: REGION_CATEGORIES.ASIA_PACIFIC,
    location: 'Singapore',
    latency: { typical: 180, unit: 'ms' },
  },
} as const;

/**
 * Utility Functions
 */

/**
 * Get regions for a specific provider
 */
export function getProviderRegions(provider: CloudProviderType): readonly string[] {
  return PROVIDER_REGIONS_MAP[provider] || [];
}

/**
 * Check if a provider supports a specific region
 */
export function providerSupportsRegion(provider: CloudProviderType, region: string): boolean {
  const regions = PROVIDER_REGIONS_MAP[provider];
  return regions ? regions.includes(region as any) : false;
}

/**
 * Get default region for a provider
 */
export function getDefaultRegion(provider: CloudProviderType): string {
  const regions = PROVIDER_REGIONS_MAP[provider];
  if (!regions || regions.length === 0) {
    return 'us-east-1'; // Fallback
  }
  return regions[0] as string;
}

/**
 * Get region category
 */
export function getRegionCategory(region: string): RegionCategory {
  const lowerRegion = region.toLowerCase();

  if (lowerRegion.includes('us-') || lowerRegion.includes('ca-') ||
      lowerRegion.includes('brazil') || lowerRegion.includes('gru')) {
    return REGION_CATEGORIES.AMERICAS;
  }

  if (lowerRegion.includes('eu-') || lowerRegion.includes('europe') ||
      lowerRegion.includes('uk') || lowerRegion.includes('lhr') ||
      lowerRegion.includes('cdg') || lowerRegion.includes('fra')) {
    return REGION_CATEGORIES.EUROPE;
  }

  if (lowerRegion.includes('ap-') || lowerRegion.includes('asia') ||
      lowerRegion.includes('sin') || lowerRegion.includes('hkg') ||
      lowerRegion.includes('nrt') || lowerRegion.includes('tokyo')) {
    return REGION_CATEGORIES.ASIA_PACIFIC;
  }

  if (lowerRegion.includes('australia') || lowerRegion.includes('syd')) {
    return REGION_CATEGORIES.AUSTRALIA;
  }

  if (lowerRegion.includes('middle-east') || lowerRegion.includes('uae') ||
      lowerRegion.includes('bahrain')) {
    return REGION_CATEGORIES.MIDDLE_EAST;
  }

  if (lowerRegion.includes('africa') || lowerRegion.includes('capetown')) {
    return REGION_CATEGORIES.AFRICA;
  }

  if (lowerRegion === 'global') {
    return REGION_CATEGORIES.GLOBAL;
  }

  return REGION_CATEGORIES.AMERICAS; // Default fallback
}

/**
 * Get regions by category
 */
export function getRegionsByCategory(provider: CloudProviderType, category: RegionCategory): readonly string[] {
  const regions = PROVIDER_REGIONS_MAP[provider] || [];
  return regions.filter(region => getRegionCategory(region) === category);
}

/**
 * Find nearest region based on common geographic patterns
 */
export function findNearestRegion(provider: CloudProviderType, userLocation: RegionCategory): string {
  const regionsByCategory = getRegionsByCategory(provider, userLocation);
  if (regionsByCategory.length > 0) {
    return regionsByCategory[0] as string;
  }
  return getDefaultRegion(provider);
}

/**
 * Get all unique regions across all providers
 */
export function getAllRegions(): readonly string[] {
  const allRegions = new Set<string>();

  Object.values(PROVIDER_REGIONS_MAP).forEach(regions => {
    regions.forEach(region => allRegions.add(region));
  });

  return Array.from(allRegions).sort();
}

/**
 * Get providers that support a specific region
 */
export function getProvidersByRegion(region: string): readonly CloudProviderType[] {
  const providers: CloudProviderType[] = [];

  Object.entries(PROVIDER_REGIONS_MAP).forEach(([provider, regions]) => {
    if (regions.includes(region as any)) {
      providers.push(provider as CloudProviderType);
    }
  });

  return providers;
}
