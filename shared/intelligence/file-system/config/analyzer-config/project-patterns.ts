/**
 * @fileoverview Project Patterns - Common project file patterns and detection rules
 * 
 * This module contains patterns for detecting common project files like
 * documentation, Docker, CI/CD, and environment configurations.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * Documentation file patterns for detecting project documentation.
 */
export const DOCUMENTATION_PATTERNS = {
  /** Common documentation file names */
  files: [
    'readme.md',
    'readme.txt', 
    'readme.rst',
    'readme.adoc',
    'readme.asciidoc',
    'readme.org',
    'readme.tex',
    'changelog.md',
    'changelog.txt',
    'contributing.md',
    'license',
    'license.txt',
    'license.md',
    'authors',
    'authors.txt',
    'maintainers',
    'maintainers.txt'
  ],
  
  /** Documentation directory patterns */
  directories: [
    'docs',
    'documentation',
    'doc',
    'wiki',
    'manual',
    'guides',
    'tutorials',
    'examples',
    'samples'
  ],
  
  /** Documentation file extensions */
  extensions: ['.md', '.txt', '.rst', '.adoc', '.asciidoc', '.org', '.tex', '.pdf']
};

/**
 * Docker-related file patterns.
 */
export const DOCKER_PATTERNS = {
  /** Docker configuration files */
  files: [
    'Dockerfile',
    'dockerfile',
    'Dockerfile.prod',
    'Dockerfile.dev',
    'Dockerfile.test',
    'docker-compose.yml',
    'docker-compose.yaml',
    'docker-compose.override.yml',
    'docker-compose.prod.yml',
    'docker-compose.dev.yml',
    'docker-compose.test.yml',
    '.dockerignore',
    'docker-entrypoint.sh',
    'docker-entrypoint.py'
  ],
  
  /** Docker-related directories */
  directories: [
    'docker',
    'dockerfiles',
    '.docker'
  ]
};

/**
 * CI/CD pipeline file patterns.
 */
export const CI_CD_PATTERNS = {
  /** CI/CD configuration files */
  files: [
    // GitHub Actions
    '.github/workflows/*.yml',
    '.github/workflows/*.yaml',
    
    // GitLab CI
    '.gitlab-ci.yml',
    '.gitlab-ci.yaml',
    
    // Jenkins
    'Jenkinsfile',
    'Jenkinsfile.groovy',
    '.jenkins.yml',
    
    // CircleCI
    'circle.yml',
    '.circleci/config.yml',
    
    // Azure DevOps
    'azure-pipelines.yml',
    'azure-pipelines.yaml',
    '.azure/pipelines.yml',
    
    // AWS CodeBuild
    'buildspec.yml',
    'buildspec.yaml',
    
    // Travis CI
    '.travis.yml',
    
    // AppVeyor
    'appveyor.yml',
    
    // TeamCity
    '.teamcity',
    
    // Bamboo
    'bamboo.yml',
    
    // Drone
    '.drone.yml',
    
    // Semaphore
    '.semaphore/semaphore.yml',
    
    // Buddy
    '.buddy/buddy.yml',
    
    // Buildkite
    '.buildkite/pipeline.yml',
    
    // Codefresh
    'codefresh.yml',
    
    // Shippable
    'shippable.yml',
    
    // Wercker
    'wercker.yml',
    
    // Deployment platforms
    'vercel.json',
    'netlify.toml',
    'netlify.yml',
    'surge.sh',
    'now.json',
    'firebase.json',
    'heroku.yml',
    'app.json'
  ],
  
  /** CI/CD related directories */
  directories: [
    '.github',
    '.gitlab',
    '.circleci',
    '.azure',
    '.teamcity',
    '.buddy',
    '.buildkite',
    '.semaphore',
    '.drone'
  ]
};

/**
 * Environment variable file patterns.
 */
export const ENVIRONMENT_PATTERNS = {
  /** Environment configuration files */
  files: [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test',
    '.env.staging',
    '.env.example',
    '.env.template',
    '.env.sample',
    '.envrc',
    'environment.yml',
    'environment.yaml',
    '.environment',
    'config.env',
    'secrets.env'
  ],
  
  /** Environment-related directories */
  directories: [
    'env',
    'environments',
    'config',
    'secrets'
  ]
};

/**
 * Secret and sensitive data patterns for environment variable detection.
 */
export const SECRET_PATTERNS = {
  /** Keywords that typically indicate sensitive data */
  keywords: [
    'key',
    'secret',
    'token',
    'password',
    'pass',
    'pwd',
    'auth',
    'api',
    'credential',
    'private',
    'certificate',
    'cert',
    'signature',
    'signing',
    'encryption',
    'encrypt',
    'hash',
    'salt',
    'nonce',
    'jwt',
    'bearer',
    'oauth',
    'client_secret',
    'access_token',
    'refresh_token',
    'session',
    'cookie',
    'database',
    'db',
    'connection',
    'url',
    'endpoint',
    'host',
    'port',
    'username',
    'user',
    'email',
    'phone',
    'ssn',
    'social',
    'license',
    'serial',
    'uuid',
    'id'
  ],
  
  /** Common secret variable naming patterns */
  patterns: [
    /.*[_-]?key[_-]?.*/i,
    /.*[_-]?secret[_-]?.*/i,
    /.*[_-]?token[_-]?.*/i,
    /.*[_-]?password[_-]?.*/i,
    /.*[_-]?pass[_-]?.*/i,
    /.*[_-]?auth[_-]?.*/i,
    /.*[_-]?api[_-]?.*/i,
    /.*[_-]?cred[_-]?.*/i,
    /.*[_-]?private[_-]?.*/i,
    /.*[_-]?cert[_-]?.*/i,
    /.*[_-]?jwt[_-]?.*/i,
    /.*[_-]?oauth[_-]?.*/i,
    /.*[_-]?session[_-]?.*/i,
    /.*[_-]?db[_-]?.*/i,
    /.*[_-]?database[_-]?.*/i
  ]
};

/**
 * Test directory patterns for detecting test files and directories.
 */
export const TEST_PATTERNS = {
  /** Common test directory names */
  directories: [
    'test',
    'tests',
    '__tests__',
    'spec',
    'specs',
    '__spec__',
    'testing',
    'test_suite',
    'test_suites',
    'unit',
    'unit_tests',
    'integration',
    'integration_tests',
    'e2e',
    'end_to_end',
    'acceptance',
    'acceptance_tests',
    'fixtures',
    'mocks',
    'stubs',
    'testdata',
    'test_data',
    'testdata',
    'samples'
  ],
  
  /** Common test file patterns */
  filePatterns: [
    '*test*',
    '*spec*',
    '*_test.*',
    '*_spec.*',
    'test_*',
    'spec_*',
    '*.test.*',
    '*.spec.*'
  ],
  
  /** Test file extensions by language */
  extensions: {
    javascript: ['.test.js', '.test.ts', '.test.jsx', '.test.tsx', '.spec.js', '.spec.ts'],
    python: ['.py'],
    java: ['.java'],
    go: ['.go'],
    rust: ['.rs'],
    csharp: ['.cs'],
    php: ['.php'],
    ruby: ['.rb']
  }
};

/**
 * Gets all documentation file patterns.
 * 
 * @returns {typeof DOCUMENTATION_PATTERNS} Documentation patterns
 */
export function getDocumentationPatterns(): typeof DOCUMENTATION_PATTERNS {
  return DOCUMENTATION_PATTERNS;
}

/**
 * Gets all Docker file patterns.
 * 
 * @returns {typeof DOCKER_PATTERNS} Docker patterns
 */
export function getDockerPatterns(): typeof DOCKER_PATTERNS {
  return DOCKER_PATTERNS;
}

/**
 * Gets all CI/CD file patterns.
 * 
 * @returns {typeof CI_CD_PATTERNS} CI/CD patterns
 */
export function getCICDPatterns(): typeof CI_CD_PATTERNS {
  return CI_CD_PATTERNS;
}

/**
 * Gets all environment file patterns.
 * 
 * @returns {typeof ENVIRONMENT_PATTERNS} Environment patterns
 */
export function getEnvironmentPatterns(): typeof ENVIRONMENT_PATTERNS {
  return ENVIRONMENT_PATTERNS;
}

/**
 * Gets all secret detection patterns.
 * 
 * @returns {typeof SECRET_PATTERNS} Secret patterns
 */
export function getSecretPatterns(): typeof SECRET_PATTERNS {
  return SECRET_PATTERNS;
}

/**
 * Gets all test file patterns.
 * 
 * @returns {typeof TEST_PATTERNS} Test patterns
 */
export function getTestPatterns(): typeof TEST_PATTERNS {
  return TEST_PATTERNS;
}

/**
 * Checks if a file name matches documentation patterns.
 * 
 * @param {string} fileName - The file name to check
 * @returns {boolean} True if the file matches documentation patterns
 */
export function isDocumentationFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  const patterns = getDocumentationPatterns();
  
  return patterns.files.some(file => lowerName === file) ||
         patterns.directories.some(dir => lowerName.includes(dir)) ||
         patterns.extensions.some(ext => lowerName.endsWith(ext));
}

/**
 * Checks if a file name matches Docker patterns.
 * 
 * @param {string} fileName - The file name to check
 * @returns {boolean} True if the file matches Docker patterns
 */
export function isDockerFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  const patterns = getDockerPatterns();
  
  return patterns.files.some(file => lowerName === file || lowerName.includes(file)) ||
         patterns.directories.some(dir => lowerName.includes(dir));
}

/**
 * Checks if a file name matches CI/CD patterns.
 * 
 * @param {string} fileName - The file name to check
 * @returns {boolean} True if the file matches CI/CD patterns
 */
export function isCICDFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  const patterns = getCICDPatterns();
  
  return patterns.files.some(file => {
    // Handle wildcard patterns
    if (file.includes('*')) {
      const regex = new RegExp(file.replace(/\*/g, '.*'));
      return regex.test(lowerName);
    }
    return lowerName === file || lowerName.includes(file);
  }) || patterns.directories.some(dir => lowerName.includes(dir));
}

/**
 * Checks if a file name matches environment file patterns.
 * 
 * @param {string} fileName - The file name to check
 * @returns {boolean} True if the file matches environment patterns
 */
export function isEnvironmentFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  const patterns = getEnvironmentPatterns();
  
  return patterns.files.some(file => lowerName === file || lowerName.includes(file)) ||
         patterns.directories.some(dir => lowerName.includes(dir));
}

/**
 * Checks if a variable name indicates it contains secret data.
 * 
 * @param {string} variableName - The variable name to check
 * @returns {boolean} True if the variable likely contains secret data
 */
export function isSecretVariable(variableName: string): boolean {
  const lowerName = variableName.toLowerCase();
  const patterns = getSecretPatterns();
  
  return patterns.keywords.some(keyword => lowerName.includes(keyword)) ||
         patterns.patterns.some(pattern => pattern.test(variableName));
}

/**
 * Checks if a directory name matches test patterns.
 * 
 * @param {string} dirName - The directory name to check
 * @returns {boolean} True if the directory matches test patterns
 */
export function isTestDirectory(dirName: string): boolean {
  const lowerName = dirName.toLowerCase();
  const patterns = getTestPatterns();
  
  return patterns.directories.some(dir => lowerName === dir || lowerName.includes(dir));
}

/**
 * Checks if a file name matches test file patterns.
 * 
 * @param {string} fileName - The file name to check
 * @returns {boolean} True if the file matches test patterns
 */
export function isTestFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  const patterns = getTestPatterns();
  
  return patterns.filePatterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(lowerName);
  });
}
