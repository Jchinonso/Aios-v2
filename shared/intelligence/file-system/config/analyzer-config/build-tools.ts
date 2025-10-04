/**
 * @fileoverview Build Tools - Comprehensive build tool detection patterns
 * 
 * This module contains build tool detection patterns for all major
 * build systems and tools across different programming languages.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * Build tool definition interface.
 */
export interface BuildTool {
  /** The name of the build tool */
  name: string;
  /** Configuration files to look for */
  configFiles: string[];
  /** Code patterns to match in files */
  patterns: string[];
}

/**
 * Build tools organized by language for easy lookup and filtering.
 */
export const BUILD_TOOLS: Record<string, BuildTool[]> = {
  javascript: [
    { name: 'webpack', configFiles: ['webpack.config.js', 'webpack.config.ts'], patterns: ['webpack', 'module.exports'] },
    { name: 'vite', configFiles: ['vite.config.js', 'vite.config.ts'], patterns: ['vite', 'defineConfig'] },
    { name: 'rollup', configFiles: ['rollup.config.js', 'rollup.config.ts'], patterns: ['rollup', 'rollup-plugin'] },
    { name: 'parcel', configFiles: ['parcel.config.js', '.parcelrc'], patterns: ['parcel', 'parcel-bundler'] },
    { name: 'esbuild', configFiles: ['esbuild.config.js'], patterns: ['esbuild', 'buildSync'] },
    { name: 'gulp', configFiles: ['gulpfile.js', 'gulpfile.ts'], patterns: ['gulp', 'gulp\\.'] },
    { name: 'grunt', configFiles: ['Gruntfile.js', 'Gruntfile.ts'], patterns: ['grunt', 'grunt\\.'] },
    { name: 'babel', configFiles: ['babel.config.js', '.babelrc'], patterns: ['babel', '@babel/'] }
  ],
  python: [
    { name: 'setuptools', configFiles: ['setup.py', 'setup.cfg'], patterns: ['setuptools', 'setup\\('] },
    { name: 'poetry', configFiles: ['pyproject.toml'], patterns: ['poetry', 'tool.poetry'] },
    { name: 'pipenv', configFiles: ['Pipfile'], patterns: ['pipenv', 'pipfile'] },
    { name: 'conda-build', configFiles: ['meta.yaml'], patterns: ['conda-build', 'conda'] },
    { name: 'make', configFiles: ['Makefile'], patterns: ['make', 'Makefile'] },
    { name: 'cmake', configFiles: ['CMakeLists.txt'], patterns: ['cmake', 'cmake_minimum_required'] }
  ],
  java: [
    { name: 'maven', configFiles: ['pom.xml'], patterns: ['maven', 'maven-compiler-plugin'] },
    { name: 'gradle', configFiles: ['build.gradle', 'build.gradle.kts'], patterns: ['gradle', 'apply plugin'] },
    { name: 'ant', configFiles: ['build.xml'], patterns: ['ant', 'project.*name'] },
    { name: 'sbt', configFiles: ['build.sbt'], patterns: ['sbt', 'scalaVersion'] }
  ],
  go: [
    { name: 'make', configFiles: ['Makefile'], patterns: ['make', 'Makefile'] },
    { name: 'go-build', configFiles: ['main.go'], patterns: ['go build', 'go run'] },
    { name: 'bazel', configFiles: ['BUILD', 'WORKSPACE'], patterns: ['bazel', 'go_binary'] }
  ],
  rust: [
    { name: 'cargo', configFiles: ['Cargo.toml'], patterns: ['cargo', 'cargo build'] },
    { name: 'make', configFiles: ['Makefile'], patterns: ['make', 'Makefile'] }
  ],
  dotnet: [
    { name: 'msbuild', configFiles: ['*.csproj'], patterns: ['msbuild', 'Project.*Sdk'] },
    { name: 'dotnet-cli', configFiles: ['*.csproj'], patterns: ['dotnet', 'dotnet build'] },
    { name: 'cake', configFiles: ['build.cake'], patterns: ['cake', 'Cake'] }
  ],
  php: [
    { name: 'composer', configFiles: ['composer.json'], patterns: ['composer', 'composer install'] },
    { name: 'make', configFiles: ['Makefile'], patterns: ['make', 'Makefile'] }
  ],
  ruby: [
    { name: 'rake', configFiles: ['Rakefile'], patterns: ['rake', 'Rake::'] },
    { name: 'bundler', configFiles: ['Gemfile'], patterns: ['bundler', 'bundle exec'] },
    { name: 'make', configFiles: ['Makefile'], patterns: ['make', 'Makefile'] }
  ]
};

/**
 * Gets all build tools for a specific language.
 * 
 * @param {string} language - The target language
 * @returns {BuildTool[]} Array of build tools for the language
 */
export function getBuildTools(language: string): BuildTool[] {
  return BUILD_TOOLS[language] || [];
}

/**
 * Gets a specific build tool by name and language.
 * 
 * @param {string} toolName - The name of the build tool
 * @param {string} language - The target language
 * @returns {BuildTool | undefined} The build tool or undefined if not found
 */
export function getBuildTool(toolName: string, language: string): BuildTool | undefined {
  const tools = getBuildTools(language);
  return tools.find(tool => tool.name === toolName);
}

/**
 * Gets all supported build tool names for a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of build tool names
 */
export function getSupportedBuildTools(language: string): string[] {
  return getBuildTools(language).map(tool => tool.name);
}

/**
 * Gets all languages that have build tools defined.
 * 
 * @returns {string[]} Array of language names with build tools
 */
export function getLanguagesWithBuildTools(): string[] {
  return Object.keys(BUILD_TOOLS);
}

/**
 * Checks if a build tool is supported for a specific language.
 * 
 * @param {string} toolName - The name of the build tool
 * @param {string} language - The target language
 * @returns {boolean} True if the build tool is supported for the language
 */
export function isBuildToolSupported(toolName: string, language: string): boolean {
  const tools = getBuildTools(language);
  return tools.some(tool => tool.name === toolName);
}

/**
 * Gets the primary build tool for a language (most commonly used).
 * 
 * @param {string} language - The target language
 * @returns {BuildTool | undefined} The primary build tool or undefined if not found
 */
export function getPrimaryBuildTool(language: string): BuildTool | undefined {
  // Define primary build tools for each language
  const primaryTools: Record<string, string> = {
    javascript: 'webpack',
    python: 'setuptools',
    java: 'maven',
    go: 'make',
    rust: 'cargo',
    dotnet: 'dotnet-cli',
    php: 'composer',
    ruby: 'rake'
  };

  const primaryName = primaryTools[language];
  if (primaryName) {
    return getBuildTool(primaryName, language);
  }

  return undefined;
}

/**
 * Gets all configuration files for build tools of a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of configuration file patterns
 */
export function getBuildToolConfigFiles(language: string): string[] {
  const tools = getBuildTools(language);
  return Array.from(new Set(tools.flatMap(tool => tool.configFiles)));
}

/**
 * Gets all code patterns for build tools of a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of code patterns
 */
export function getBuildToolPatterns(language: string): string[] {
  const tools = getBuildTools(language);
  return Array.from(new Set(tools.flatMap(tool => tool.patterns)));
}

/**
 * Finds build tools that match given configuration files.
 * 
 * @param {string} language - The target language
 * @param {string[]} configFiles - Configuration files to match
 * @returns {BuildTool[]} Array of matching build tools
 */
export function findBuildToolsByConfigFiles(language: string, configFiles: string[]): BuildTool[] {
  const tools = getBuildTools(language);
  return tools.filter(tool => 
    tool.configFiles.some(configFile => 
      configFiles.some(file => file.includes(configFile.replace('*', '')))
    )
  );
}
