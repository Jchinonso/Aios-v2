/**
 * @fileoverview Package Manager Patterns - Comprehensive package manager detection patterns
 * 
 * This module contains package manager detection patterns for all major
 * package managers across different programming languages and ecosystems.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { PackageManagerPattern } from '../../../types/config.types.js'

/**
 * Comprehensive package manager patterns for all supported languages and ecosystems.
 * Organized by language for easy filtering and lookup.
 */
export const PACKAGE_MANAGER_PATTERNS: PackageManagerPattern[] = [
  // JavaScript/TypeScript package managers
  {
    name: 'npm',
    language: 'javascript',
    manifestFile: 'package.json',
    lockFile: 'package-lock.json',
    configFile: '.npmrc'
  },
  {
    name: 'yarn',
    language: 'javascript',
    manifestFile: 'package.json',
    lockFile: 'yarn.lock',
    configFile: '.yarnrc'
  },
  {
    name: 'pnpm',
    language: 'javascript',
    manifestFile: 'package.json',
    lockFile: 'pnpm-lock.yaml',
    configFile: '.pnpmrc'
  },
  {
    name: 'bun',
    language: 'javascript',
    manifestFile: 'package.json',
    lockFile: 'bun.lockb',
    configFile: 'bunfig.toml'
  },
  {
    name: 'deno',
    language: 'javascript',
    manifestFile: 'deno.json',
    lockFile: 'deno.lock',
    configFile: 'deno.json'
  },

  // Python package managers
  {
    name: 'pip',
    language: 'python',
    manifestFile: 'requirements.txt',
    lockFile: 'requirements-lock.txt',
    configFile: 'pip.conf'
  },
  {
    name: 'pipenv',
    language: 'python',
    manifestFile: 'Pipfile',
    lockFile: 'Pipfile.lock',
    configFile: '.env'
  },
  {
    name: 'poetry',
    language: 'python',
    manifestFile: 'pyproject.toml',
    lockFile: 'poetry.lock',
    configFile: 'pyproject.toml'
  },
  {
    name: 'conda',
    language: 'python',
    manifestFile: 'environment.yml',
    lockFile: 'conda-lock.yml',
    configFile: '.condarc'
  },
  {
    name: 'uv',
    language: 'python',
    manifestFile: 'pyproject.toml',
    lockFile: 'uv.lock',
    configFile: 'uv.toml'
  },

  // Java package managers
  {
    name: 'maven',
    language: 'java',
    manifestFile: 'pom.xml',
    lockFile: 'maven.lock',
    configFile: 'settings.xml'
  },
  {
    name: 'gradle',
    language: 'java',
    manifestFile: 'build.gradle',
    lockFile: 'gradle.lockfile',
    configFile: 'gradle.properties'
  },
  {
    name: 'sbt',
    language: 'java',
    manifestFile: 'build.sbt',
    lockFile: 'sbt.lock',
    configFile: 'build.properties'
  },

  // Go package managers
  {
    name: 'go-modules',
    language: 'go',
    manifestFile: 'go.mod',
    lockFile: 'go.sum',
    configFile: 'go.mod'
  },
  {
    name: 'dep',
    language: 'go',
    manifestFile: 'Gopkg.toml',
    lockFile: 'Gopkg.lock',
    configFile: 'Gopkg.toml'
  },
  {
    name: 'glide',
    language: 'go',
    manifestFile: 'glide.yaml',
    lockFile: 'glide.lock',
    configFile: 'glide.yaml'
  },

  // Rust package managers
  {
    name: 'cargo',
    language: 'rust',
    manifestFile: 'Cargo.toml',
    lockFile: 'Cargo.lock',
    configFile: '.cargo/config.toml'
  },

  // .NET package managers
  {
    name: 'nuget',
    language: 'dotnet',
    manifestFile: '*.csproj',
    lockFile: 'packages.lock.json',
    configFile: 'nuget.config'
  },
  {
    name: 'paket',
    language: 'dotnet',
    manifestFile: 'paket.dependencies',
    lockFile: 'paket.lock',
    configFile: 'paket.dependencies'
  },

  // PHP package managers
  {
    name: 'composer',
    language: 'php',
    manifestFile: 'composer.json',
    lockFile: 'composer.lock',
    configFile: 'composer.json'
  },

  // Ruby package managers
  {
    name: 'bundler',
    language: 'ruby',
    manifestFile: 'Gemfile',
    lockFile: 'Gemfile.lock',
    configFile: '.bundle/config'
  },
  {
    name: 'rubygems',
    language: 'ruby',
    manifestFile: '*.gemspec',
    lockFile: 'Gemfile.lock',
    configFile: '.gemrc'
  }
];

/**
 * Gets all package manager patterns for a specific language.
 * 
 * @param {string} language - The target language
 * @returns {PackageManagerPattern[]} Array of package manager patterns for the language
 */
export function getPackageManagerPatterns(language: string): PackageManagerPattern[] {
  return PACKAGE_MANAGER_PATTERNS.filter(pm => pm.language === language);
}

/**
 * Gets a specific package manager pattern by name and language.
 * 
 * @param {string} packageManagerName - The name of the package manager
 * @param {string} language - The target language
 * @returns {PackageManagerPattern | undefined} The package manager pattern or undefined if not found
 */
export function getPackageManagerPattern(packageManagerName: string, language: string): PackageManagerPattern | undefined {
  return PACKAGE_MANAGER_PATTERNS.find(pm => pm.name === packageManagerName && pm.language === language);
}

/**
 * Gets all supported package managers for a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of package manager names
 */
export function getSupportedPackageManagers(language: string): string[] {
  return getPackageManagerPatterns(language).map(pm => pm.name);
}

/**
 * Gets all languages that have package manager patterns defined.
 * 
 * @returns {string[]} Array of language names with package manager patterns
 */
export function getLanguagesWithPackageManagers(): string[] {
  return Array.from(new Set(PACKAGE_MANAGER_PATTERNS.map(pm => pm.language)));
}

/**
 * Checks if a package manager is supported for a specific language.
 * 
 * @param {string} packageManagerName - The name of the package manager
 * @param {string} language - The target language
 * @returns {boolean} True if the package manager is supported for the language
 */
export function isPackageManagerSupported(packageManagerName: string, language: string): boolean {
  return PACKAGE_MANAGER_PATTERNS.some(pm => pm.name === packageManagerName && pm.language === language);
}

/**
 * Gets the primary package manager for a language (most commonly used).
 * 
 * @param {string} language - The target language
 * @returns {PackageManagerPattern | undefined} The primary package manager pattern or undefined if not found
 */
export function getPrimaryPackageManager(language: string): PackageManagerPattern | undefined {
  // Define primary package managers for each language
  const primaryManagers: Record<string, string> = {
    javascript: 'npm',
    python: 'pip',
    java: 'maven',
    go: 'go-modules',
    rust: 'cargo',
    dotnet: 'nuget',
    php: 'composer',
    ruby: 'bundler'
  };

  const primaryName = primaryManagers[language];
  if (primaryName) {
    return getPackageManagerPattern(primaryName, language);
  }

  return undefined;
}

/**
 * Gets manifest files for all package managers of a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of manifest file patterns
 */
export function getManifestFiles(language: string): string[] {
  const patterns = getPackageManagerPatterns(language);
  return Array.from(new Set(patterns.map(pm => pm.manifestFile)));
}

/**
 * Gets lock files for all package managers of a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of lock file patterns
 */
export function getLockFiles(language: string): string[] {
  const patterns = getPackageManagerPatterns(language);
  return Array.from(new Set(patterns.map(pm => pm.lockFile).filter((lockFile): lockFile is string => Boolean(lockFile))));
}
