/**
 * @fileoverview Framework Detection Constants
 * @description Centralized framework categorization and detection patterns
 *
 * This file organizes all supported frameworks by category, providing
 * utilities for framework detection, categorization, and capability queries.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { FrameworkType } from '../types/common.types.js';

/**
 * Framework categories for logical grouping
 */
export type FrameworkCategory =
  | 'frontend'
  | 'static-site-generator'
  | 'backend-nodejs'
  | 'backend-python'
  | 'backend-ruby'
  | 'backend-go'
  | 'backend-rust'
  | 'backend-java'
  | 'backend-php'
  | 'backend-elixir'
  | 'build-tool';

/**
 * Frontend frameworks and libraries
 */
export const FRONTEND_FRAMEWORKS: readonly FrameworkType[] = [
  'nextjs',
  'react',
  'vue',
  'nuxt',
  'svelte',
  'sveltekit',
  'angular',
  'solid',
  'qwik',
  'preact',
  'lit',
  'stencil',
  'alpine',
  'htmx',
] as const;

/**
 * Build tools and bundlers
 */
export const BUILD_TOOLS: readonly FrameworkType[] = [
  'vite',
  'webpack',
  'rollup',
  'parcel',
] as const;

/**
 * Static site generators
 */
export const STATIC_SITE_GENERATORS: readonly FrameworkType[] = [
  'gatsby',
  'jekyll',
  'hugo',
  'eleventy',
  'astro',
  'gridsome',
  'docusaurus',
  'vuepress',
  'hexo',
  'static',
] as const;

/**
 * Node.js backend frameworks
 */
export const NODEJS_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'express',
  'fastify',
  'nestjs',
  'koa',
  'hapi',
  'adonis',
  'strapi',
  'meteor',
  'sails',
] as const;

/**
 * Python backend frameworks
 */
export const PYTHON_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'django',
  'flask',
  'fastapi',
  'tornado',
  'pyramid',
  'bottle',
  'cherrypy',
  'aiohttp',
] as const;

/**
 * Ruby backend frameworks
 */
export const RUBY_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'rails',
  'sinatra',
  'padrino',
  'grape',
  'roda',
  'hanami',
] as const;

/**
 * Go backend frameworks
 */
export const GO_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'gin',
  'fiber',
  'echo',
  'chi',
  'gorilla',
  'beego',
  'iris',
  'buffalo',
] as const;

/**
 * Rust backend frameworks
 */
export const RUST_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'rocket',
  'actix',
  'warp',
  'tide',
  'tower',
  'axum',
  'poem',
] as const;

/**
 * Java backend frameworks
 */
export const JAVA_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'spring',
  'quarkus',
  'micronaut',
  'dropwizard',
  'sparkjava',
  'vert-x',
  'javalin',
] as const;

/**
 * PHP backend frameworks
 */
export const PHP_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'laravel',
  'symfony',
  'codeigniter',
  'cakephp',
  'yii',
  'phalcon',
  'zend',
  'slim',
] as const;

/**
 * Elixir backend frameworks
 */
export const ELIXIR_BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  'phoenix',
] as const;

/**
 * All backend frameworks combined
 */
export const BACKEND_FRAMEWORKS: readonly FrameworkType[] = [
  ...NODEJS_BACKEND_FRAMEWORKS,
  ...PYTHON_BACKEND_FRAMEWORKS,
  ...RUBY_BACKEND_FRAMEWORKS,
  ...GO_BACKEND_FRAMEWORKS,
  ...RUST_BACKEND_FRAMEWORKS,
  ...JAVA_BACKEND_FRAMEWORKS,
  ...PHP_BACKEND_FRAMEWORKS,
  ...ELIXIR_BACKEND_FRAMEWORKS,
] as const;

/**
 * Frameworks that support serverless deployment
 */
export const SERVERLESS_COMPATIBLE_FRAMEWORKS: readonly FrameworkType[] = [
  'nextjs',
  'nuxt',
  'express',
  'fastify',
  'nestjs',
  'flask',
  'fastapi',
  'django',
] as const;

/**
 * Frameworks that support static export
 */
export const STATIC_EXPORT_FRAMEWORKS: readonly FrameworkType[] = [
  'nextjs',
  'react',
  'vue',
  'svelte',
  'angular',
  ...STATIC_SITE_GENERATORS,
] as const;

/**
 * Frameworks that require build step
 */
export const BUILD_REQUIRED_FRAMEWORKS: readonly FrameworkType[] = [
  ...FRONTEND_FRAMEWORKS,
  ...STATIC_SITE_GENERATORS,
  'nestjs',
] as const;

/**
 * Frameworks that support hot reload in development
 */
export const HOT_RELOAD_FRAMEWORKS: readonly FrameworkType[] = [
  'nextjs',
  'react',
  'vue',
  'nuxt',
  'svelte',
  'sveltekit',
  'angular',
  'vite',
  'webpack',
  'express',
  'fastify',
  'nestjs',
  'flask',
  'django',
  'rails',
] as const;

/**
 * Framework category mapping
 */
export const FRAMEWORK_CATEGORIES: Readonly<Record<FrameworkCategory, readonly FrameworkType[]>> = {
  'frontend': FRONTEND_FRAMEWORKS,
  'static-site-generator': STATIC_SITE_GENERATORS,
  'backend-nodejs': NODEJS_BACKEND_FRAMEWORKS,
  'backend-python': PYTHON_BACKEND_FRAMEWORKS,
  'backend-ruby': RUBY_BACKEND_FRAMEWORKS,
  'backend-go': GO_BACKEND_FRAMEWORKS,
  'backend-rust': RUST_BACKEND_FRAMEWORKS,
  'backend-java': JAVA_BACKEND_FRAMEWORKS,
  'backend-php': PHP_BACKEND_FRAMEWORKS,
  'backend-elixir': ELIXIR_BACKEND_FRAMEWORKS,
  'build-tool': BUILD_TOOLS,
} as const;

/**
 * Get the category of a framework
 *
 * @param framework - Framework to categorize
 * @returns Framework category or undefined if not found
 *
 * @example
 * ```typescript
 * const category = getFrameworkCategory('nextjs');
 * // Returns: 'frontend'
 * ```
 */
export function getFrameworkCategory(framework: FrameworkType): FrameworkCategory | undefined {
  for (const [category, frameworks] of Object.entries(FRAMEWORK_CATEGORIES)) {
    if (frameworks.includes(framework)) {
      return category as FrameworkCategory;
    }
  }
  return undefined;
}

/**
 * Check if a framework is a frontend framework
 *
 * @param framework - Framework to check
 * @returns True if framework is frontend
 *
 * @example
 * ```typescript
 * isFrontendFramework('react')    // true
 * isFrontendFramework('express')  // false
 * ```
 */
export function isFrontendFramework(framework: FrameworkType): boolean {
  return FRONTEND_FRAMEWORKS.includes(framework);
}

/**
 * Check if a framework is a backend framework
 *
 * @param framework - Framework to check
 * @returns True if framework is backend
 *
 * @example
 * ```typescript
 * isBackendFramework('express')  // true
 * isBackendFramework('react')    // false
 * ```
 */
export function isBackendFramework(framework: FrameworkType): boolean {
  return BACKEND_FRAMEWORKS.includes(framework);
}

/**
 * Check if a framework is a static site generator
 *
 * @param framework - Framework to check
 * @returns True if framework is SSG
 *
 * @example
 * ```typescript
 * isStaticSiteGenerator('gatsby')  // true
 * isStaticSiteGenerator('react')   // false
 * ```
 */
export function isStaticSiteGenerator(framework: FrameworkType): boolean {
  return STATIC_SITE_GENERATORS.includes(framework);
}

/**
 * Check if a framework supports serverless deployment
 *
 * @param framework - Framework to check
 * @returns True if framework supports serverless
 *
 * @example
 * ```typescript
 * supportsServerless('nextjs')   // true
 * supportsServerless('angular')  // false
 * ```
 */
export function supportsServerless(framework: FrameworkType): boolean {
  return SERVERLESS_COMPATIBLE_FRAMEWORKS.includes(framework);
}

/**
 * Check if a framework supports static export
 *
 * @param framework - Framework to check
 * @returns True if framework supports static export
 *
 * @example
 * ```typescript
 * supportsStaticExport('nextjs')   // true
 * supportsStaticExport('express')  // false
 * ```
 */
export function supportsStaticExport(framework: FrameworkType): boolean {
  return STATIC_EXPORT_FRAMEWORKS.includes(framework);
}

/**
 * Check if a framework requires a build step
 *
 * @param framework - Framework to check
 * @returns True if framework requires building
 *
 * @example
 * ```typescript
 * requiresBuild('react')    // true
 * requiresBuild('express')  // false
 * ```
 */
export function requiresBuild(framework: FrameworkType): boolean {
  return BUILD_REQUIRED_FRAMEWORKS.includes(framework);
}

/**
 * Check if a framework supports hot reload
 *
 * @param framework - Framework to check
 * @returns True if framework supports hot reload
 *
 * @example
 * ```typescript
 * supportsHotReload('nextjs')  // true
 * supportsHotReload('hugo')    // false
 * ```
 */
export function supportsHotReload(framework: FrameworkType): boolean {
  return HOT_RELOAD_FRAMEWORKS.includes(framework);
}

/**
 * Get frameworks by category
 *
 * @param category - Framework category
 * @returns Array of frameworks in that category
 *
 * @example
 * ```typescript
 * const frontendFrameworks = getFrameworksByCategory('frontend');
 * // Returns: ['nextjs', 'react', 'vue', ...]
 * ```
 */
export function getFrameworksByCategory(category: FrameworkCategory): readonly FrameworkType[] {
  return FRAMEWORK_CATEGORIES[category] ?? [];
}

/**
 * Get all framework names as array
 *
 * @returns All supported frameworks
 */
export function getAllFrameworks(): readonly FrameworkType[] {
  const allFrameworks = new Set<FrameworkType>();

  for (const frameworks of Object.values(FRAMEWORK_CATEGORIES)) {
    frameworks.forEach(fw => allFrameworks.add(fw));
  }

  return Array.from(allFrameworks);
}

/**
 * Check if a string is a valid framework type
 *
 * @param value - String to check
 * @returns True if value is a valid framework
 *
 * @example
 * ```typescript
 * isValidFramework('nextjs')     // true
 * isValidFramework('invalid')    // false
 * ```
 */
export function isValidFramework(value: string): value is FrameworkType {
  return getAllFrameworks().includes(value as FrameworkType);
}
