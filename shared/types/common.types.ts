/**
 * Common Types - Shared types across the application
 */

export type Environment = 'development' | 'staging' | 'production';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

/**
 * Operation status
 */
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Result type for operation outcomes
 */
export interface Result<T, E = Error> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: E;
}

/**
 * Application error interface
 */
export interface AppError extends Omit<Error, 'stack'> {
  readonly code: string;
  readonly cause?: Error | undefined;
  readonly context?: Record<string, any> | undefined;
  readonly stack?: string | undefined;
}

/**
 * Project analysis types - comprehensive framework coverage
 */
export type FrameworkType =
  // Frontend Frameworks
  | 'nextjs'
  | 'react'
  | 'vue'
  | 'nuxt'
  | 'svelte'
  | 'sveltekit'
  | 'angular'
  | 'solid'
  | 'qwik'
  | 'preact'
  | 'lit'
  | 'stencil'
  | 'alpine'
  | 'htmx'
  | 'vite'
  | 'webpack'
  | 'rollup'
  | 'parcel'
  // Static Site Generators
  | 'gatsby'
  | 'jekyll'
  | 'hugo'
  | 'eleventy'
  | 'astro'
  | 'gridsome'
  | 'docusaurus'
  | 'vuepress'
  | 'hexo'
  | 'static'
  // Backend Frameworks - Node.js
  | 'express'
  | 'fastify'
  | 'nestjs'
  | 'koa'
  | 'hapi'
  | 'adonis'
  | 'strapi'
  | 'meteor'
  | 'sails'
  // Backend Frameworks - Python
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'tornado'
  | 'pyramid'
  | 'bottle'
  | 'cherrypy'
  | 'aiohttp'
  // Backend Frameworks - Ruby
  | 'rails'
  | 'sinatra'
  | 'padrino'
  | 'grape'
  | 'roda'
  | 'hanami'
  // Backend Frameworks - Go
  | 'gin'
  | 'fiber'
  | 'echo'
  | 'chi'
  | 'gorilla'
  | 'beego'
  | 'iris'
  | 'buffalo'
  // Backend Frameworks - Rust
  | 'rocket'
  | 'actix'
  | 'warp'
  | 'tide'
  | 'tower'
  | 'axum'
  | 'poem'
  // Backend Frameworks - Java
  | 'spring'
  | 'quarkus'
  | 'micronaut'
  | 'dropwizard'
  | 'sparkjava'
  | 'vert-x'
  | 'javalin'
  // Backend Frameworks - PHP
  | 'laravel'
  | 'symfony'
  | 'codeigniter'
  | 'cakephp'
  | 'yii'
  | 'phalcon'
  | 'zend'
  | 'slim'
  // Backend Frameworks - Elixir
  | 'phoenix'
  // Other
  | 'unknown';

export type ProgrammingLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'dart'
  | 'lua'
  | 'perl'
  | 'haskell'
  | 'elixir'
  | 'erlang'
  | 'clojure'
  | 'fsharp'
  | 'vbnet'
  | 'cpp'
  | 'c'
  | 'unknown';

export type PackageManager =
  | 'npm'
  | 'yarn'
  | 'pnpm'
  | 'bun'
  | 'pip'
  | 'poetry'
  | 'pipenv'
  | 'maven'
  | 'gradle'
  | 'nuget'
  | 'composer'
  | 'gem'
  | 'cargo'
  | 'go-mod'
  | 'mix'
  | 'unknown';

export type ProjectSize = 'small' | 'medium' | 'large' | 'enterprise';

export type ProjectComplexity = 'simple' | 'moderate' | 'complex' | 'advanced';

export interface ProjectDependency {
  readonly name: string;
  readonly version: string;
  readonly type: 'runtime' | 'development' | 'peer' | 'optional' | 'production';
  readonly isFramework?: boolean;
  readonly isBuildTool?: boolean;
  readonly isTestingTool?: boolean;
  readonly isDatabase?: boolean;
  readonly isTesting?: boolean;
}

export interface EnvironmentVariable {
  readonly key: string;
  readonly value?: string | undefined;
  readonly required?: boolean | undefined;
  readonly isSecret?: boolean | undefined;
  readonly isRequired?: boolean | undefined;
  readonly description?: string | undefined;
  readonly defaultValue?: string | undefined;
}

export type DatabaseType =
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'redis'
  | 'elasticsearch'
  | 'sqlite'
  | 'dynamodb'
  | 'firestore'
  | 'supabase'
  | 'planetscale'
  | 'cockroachdb';

export interface ProjectAnalysis {
  readonly language: ProgrammingLanguage;
  readonly framework: FrameworkType;
  readonly packageManager: PackageManager;
  readonly dependencies: ProjectDependency[];
  readonly buildTools?: string[] | undefined;
  readonly testingFrameworks?: string[] | undefined;
  readonly projectStructure?: {
    readonly type: string;
    readonly hasTests: boolean;
    readonly hasDocumentation: boolean;
    readonly sourceDirectories: string[];
    readonly testDirectories: string[];
  } | undefined;
  readonly manifestFiles?: string[] | undefined;
  readonly configFiles?: string[] | undefined;
  readonly lockFiles?: string[] | undefined;
  readonly buildCommand?: string | undefined;
  readonly startCommand?: string | undefined;
  readonly outputDirectory?: string | undefined;
  readonly hasDatabase?: boolean | undefined;
  readonly databaseType?: DatabaseType | undefined;
  readonly projectType?: string | undefined;
  readonly hasAPI?: boolean | undefined;
  readonly hasTests?: boolean | undefined;
  readonly testCommand?: string | undefined;
  readonly hasDockerfile?: boolean | undefined;
  readonly hasCI?: boolean | undefined;
  readonly environmentVariables: EnvironmentVariable[];
  readonly size: ProjectSize;
  readonly estimatedSize?: ProjectSize | undefined; // Deprecated, use 'size'
  readonly complexity: ProjectComplexity;
  readonly estimatedBuildTime: number;
  readonly recommendations: string[];
  readonly hasCircularDependencies?: boolean | undefined;
  readonly circularDependencyCount?: number | undefined;
  readonly circularDependencies?: Array<{
    readonly cycle: string[];
    readonly severity: 'low' | 'medium' | 'high';
  }> | undefined;
  readonly hasVulnerabilities?: boolean | undefined;
  readonly vulnerabilityCount?: number | undefined;
  readonly vulnerabilities?: Array<{
    readonly type: string;
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly description: string;
    readonly file?: string;
    readonly line?: number;
    readonly recommendation: string;
  }> | undefined;
}