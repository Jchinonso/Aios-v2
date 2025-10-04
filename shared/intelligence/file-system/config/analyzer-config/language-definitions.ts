/**
 * @fileoverview Language Definitions - Comprehensive language configurations
 * 
 * This module contains detailed language definitions with file extensions,
 * manifest files, configuration files, build files, and lock files for
 * all supported programming languages.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { LanguageDefinition } from '../../../types/config.types.js'

/**
 * Comprehensive language definitions for all supported programming languages.
 * Each definition includes file extensions, manifest files, config files,
 * build files, and lock files specific to that language ecosystem.
 */
export const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  {
    name: 'javascript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    manifestFiles: ['package.json'],
    configFiles: ['.eslintrc.js', '.eslintrc.json', 'jsconfig.json', '.prettierrc', 'prettier.config.js'],
    buildFiles: ['webpack.config.js', 'rollup.config.js', 'vite.config.js', 'gulpfile.js', 'Gruntfile.js'],
    lockFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']
  },
  {
    name: 'typescript',
    extensions: ['.ts', '.tsx', '.d.ts'],
    manifestFiles: ['package.json', 'tsconfig.json'],
    configFiles: ['tsconfig.json', 'tslint.json', 'jsconfig.json'],
    buildFiles: ['webpack.config.ts', 'vite.config.ts', 'rollup.config.ts'],
    lockFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']
  },
  {
    name: 'python',
    extensions: ['.py', '.pyx', '.pyi', '.pyc'],
    manifestFiles: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'poetry.lock'],
    configFiles: ['.pylintrc', 'setup.cfg', 'tox.ini', 'pytest.ini', 'pyproject.toml'],
    buildFiles: ['setup.py', 'pyproject.toml', 'Makefile'],
    lockFiles: ['Pipfile.lock', 'poetry.lock', 'requirements-dev.txt']
  },
  {
    name: 'java',
    extensions: ['.java', '.class', '.jar'],
    manifestFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    configFiles: ['gradle.properties', 'settings.gradle', 'application.properties'],
    buildFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    lockFiles: []
  },
  {
    name: 'go',
    extensions: ['.go', '.mod', '.sum'],
    manifestFiles: ['go.mod', 'go.sum'],
    configFiles: ['go.mod', 'go.work', 'go.work.sum'],
    buildFiles: ['Makefile', 'build.go'],
    lockFiles: ['go.sum']
  },
  {
    name: 'rust',
    extensions: ['.rs', '.rlib', '.so', '.dylib'],
    manifestFiles: ['Cargo.toml', 'Cargo.lock'],
    configFiles: ['Cargo.toml', 'rust-toolchain', 'rust-toolchain.toml'],
    buildFiles: ['Cargo.toml', 'build.rs'],
    lockFiles: ['Cargo.lock']
  },
  {
    name: 'dotnet',
    extensions: ['.cs', '.fs', '.vb', '.csproj', '.fsproj', '.vbproj'],
    manifestFiles: ['*.csproj', '*.fsproj', '*.vbproj', 'packages.config', 'project.json'],
    configFiles: ['appsettings.json', 'web.config', 'app.config'],
    buildFiles: ['*.csproj', '*.fsproj', '*.vbproj'],
    lockFiles: ['packages.lock.json']
  },
  {
    name: 'php',
    extensions: ['.php', '.phtml', '.php3', '.php4', '.php5', '.php7', '.php8'],
    manifestFiles: ['composer.json', 'composer.lock'],
    configFiles: ['.phpunit.xml', 'phpunit.xml', 'phpcs.xml', '.php_cs'],
    buildFiles: ['composer.json', 'Makefile'],
    lockFiles: ['composer.lock']
  },
  {
    name: 'ruby',
    extensions: ['.rb', '.rbw', '.rake', '.gemspec'],
    manifestFiles: ['Gemfile', 'Gemfile.lock', '*.gemspec'],
    configFiles: ['.rubocop.yml', '.rspec', 'Rakefile'],
    buildFiles: ['Gemfile', 'Rakefile', 'Makefile'],
    lockFiles: ['Gemfile.lock']
  }
];

/**
 * Gets a language definition by name.
 * 
 * @param {string} languageName - The name of the language
 * @returns {LanguageDefinition | undefined} The language definition or undefined if not found
 */
export function getLanguageDefinition(languageName: string): LanguageDefinition | undefined {
  return LANGUAGE_DEFINITIONS.find(lang => lang.name === languageName);
}

/**
 * Gets all language names.
 * 
 * @returns {string[]} Array of supported language names
 */
export function getSupportedLanguages(): string[] {
  return LANGUAGE_DEFINITIONS.map(lang => lang.name);
}

/**
 * Gets file extensions for a specific language.
 * 
 * @param {string} languageName - The name of the language
 * @returns {string[]} Array of file extensions
 */
export function getLanguageExtensions(languageName: string): string[] {
  const lang = getLanguageDefinition(languageName);
  return lang?.extensions || [];
}

/**
 * Gets manifest files for a specific language.
 * 
 * @param {string} languageName - The name of the language
 * @returns {string[]} Array of manifest file patterns
 */
export function getLanguageManifestFiles(languageName: string): string[] {
  const lang = getLanguageDefinition(languageName);
  return lang?.manifestFiles || [];
}

/**
 * Gets configuration files for a specific language.
 * 
 * @param {string} languageName - The name of the language
 * @returns {string[]} Array of configuration file patterns
 */
export function getLanguageConfigFiles(languageName: string): string[] {
  const lang = getLanguageDefinition(languageName);
  return lang?.configFiles || [];
}

/**
 * Gets build files for a specific language.
 * 
 * @param {string} languageName - The name of the language
 * @returns {string[]} Array of build file patterns
 */
export function getLanguageBuildFiles(languageName: string): string[] {
  const lang = getLanguageDefinition(languageName);
  return lang?.buildFiles || [];
}

/**
 * Gets lock files for a specific language.
 * 
 * @param {string} languageName - The name of the language
 * @returns {string[]} Array of lock file patterns
 */
export function getLanguageLockFiles(languageName: string): string[] {
  const lang = getLanguageDefinition(languageName);
  return lang?.lockFiles || [];
}
