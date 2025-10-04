/**
 * @fileoverview Testing Frameworks - Comprehensive testing framework detection patterns
 * 
 * This module contains testing framework detection patterns for all major
 * testing frameworks and tools across different programming languages.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * Testing framework definition interface.
 */
export interface TestingFramework {
  /** The name of the testing framework */
  name: string;
  /** Configuration files to look for */
  configFiles: string[];
  /** Code patterns to match in files */
  patterns: string[];
}

/**
 * Testing frameworks organized by language for easy lookup and filtering.
 */
export const TESTING_FRAMEWORKS: Record<string, TestingFramework[]> = {
  javascript: [
    { name: 'jest', configFiles: ['jest.config.js', 'jest.config.json'], patterns: ['jest', 'describe\\(', 'test\\(', 'it\\('] },
    { name: 'mocha', configFiles: ['.mocharc.js', 'mocha.opts'], patterns: ['mocha', 'describe\\(', 'it\\('] },
    { name: 'jasmine', configFiles: ['jasmine.json'], patterns: ['jasmine', 'describe\\(', 'it\\('] },
    { name: 'vitest', configFiles: ['vitest.config.ts'], patterns: ['vitest', 'import.*vitest'] },
    { name: 'cypress', configFiles: ['cypress.config.js', 'cypress.json'], patterns: ['cypress', 'cy\\.'] },
    { name: 'playwright', configFiles: ['playwright.config.ts'], patterns: ['playwright', 'test\\.'] },
    { name: 'puppeteer', configFiles: ['jest-puppeteer.config.js'], patterns: ['puppeteer', 'page\\.'] }
  ],
  python: [
    { name: 'pytest', configFiles: ['pytest.ini', 'pyproject.toml'], patterns: ['pytest', 'def test_'] },
    { name: 'unittest', configFiles: ['test_*.py'], patterns: ['unittest', 'class.*Test'] },
    { name: 'nose', configFiles: ['nose.cfg'], patterns: ['nose', 'def test_'] },
    { name: 'tox', configFiles: ['tox.ini'], patterns: ['tox', 'testenv'] }
  ],
  java: [
    { name: 'junit', configFiles: ['pom.xml'], patterns: ['junit', '@Test', 'org.junit'] },
    { name: 'testng', configFiles: ['testng.xml'], patterns: ['testng', '@Test', 'org.testng'] },
    { name: 'spock', configFiles: ['build.gradle'], patterns: ['spock', 'spockframework'] },
    { name: 'mockito', configFiles: ['pom.xml'], patterns: ['mockito', 'Mockito'] }
  ],
  go: [
    { name: 'testing', configFiles: ['*_test.go'], patterns: ['testing', 'func Test'] },
    { name: 'testify', configFiles: ['*_test.go'], patterns: ['testify', 'assert\\.', 'require\\.', 'suite\\.'] },
    { name: 'ginkgo', configFiles: ['*_test.go'], patterns: ['ginkgo', 'Describe\\(', 'It\\(', 'BeforeEach'] },
    { name: 'gomega', configFiles: ['*_test.go'], patterns: ['gomega', 'Expect\\(', 'Eventually', 'Consistently'] },
    { name: 'gomock', configFiles: ['*_test.go'], patterns: ['gomock', 'mockgen', 'Mock.*Interface'] },
    { name: 'httpexpect', configFiles: ['*_test.go'], patterns: ['httpexpect', 'NewRequest', 'Expect'] },
    { name: 'go-cmp', configFiles: ['*_test.go'], patterns: ['go-cmp', 'cmp\\.Equal', 'cmp\\.Diff'] }
  ],
  rust: [
    { name: 'cargo-test', configFiles: ['Cargo.toml'], patterns: ['cargo test', '#\\[test\\]'] },
    { name: 'proptest', configFiles: ['Cargo.toml'], patterns: ['proptest', 'proptest!'] },
    { name: 'mockall', configFiles: ['Cargo.toml'], patterns: ['mockall', 'mock!', 'Mock.*'] },
    { name: 'tokio-test', configFiles: ['Cargo.toml'], patterns: ['tokio-test', 'tokio::test'] },
    { name: 'criterion', configFiles: ['Cargo.toml'], patterns: ['criterion', 'criterion_group', 'criterion_main'] },
    { name: 'insta', configFiles: ['Cargo.toml'], patterns: ['insta', 'assert_snapshot!', 'assert_debug_snapshot!'] },
    { name: 'rstest', configFiles: ['Cargo.toml'], patterns: ['rstest', '#\\[rstest\\]', '#\\[fixture\\]'] }
  ],
  dotnet: [
    { name: 'nunit', configFiles: ['*.csproj'], patterns: ['nunit', '\\[Test\\]'] },
    { name: 'xunit', configFiles: ['*.csproj'], patterns: ['xunit', '\\[Fact\\]'] },
    { name: 'mstest', configFiles: ['*.csproj'], patterns: ['mstest', '\\[TestMethod\\]'] }
  ],
  php: [
    { name: 'phpunit', configFiles: ['phpunit.xml', 'phpunit.xml.dist'], patterns: ['phpunit', 'class.*Test'] },
    { name: 'codeception', configFiles: ['codeception.yml'], patterns: ['codeception', '\\$I->'] }
  ],
  ruby: [
    { name: 'rspec', configFiles: ['spec_helper.rb', '.rspec'], patterns: ['rspec', 'describe', 'it'] },
    { name: 'minitest', configFiles: ['test_*.rb'], patterns: ['minitest', 'def test_'] },
    { name: 'test-unit', configFiles: ['test_*.rb'], patterns: ['test-unit', 'class.*Test'] }
  ]
};

/**
 * Gets all testing frameworks for a specific language.
 * 
 * @param {string} language - The target language
 * @returns {TestingFramework[]} Array of testing frameworks for the language
 */
export function getTestingFrameworks(language: string): TestingFramework[] {
  return TESTING_FRAMEWORKS[language] || [];
}

/**
 * Gets a specific testing framework by name and language.
 * 
 * @param {string} frameworkName - The name of the testing framework
 * @param {string} language - The target language
 * @returns {TestingFramework | undefined} The testing framework or undefined if not found
 */
export function getTestingFramework(frameworkName: string, language: string): TestingFramework | undefined {
  const frameworks = getTestingFrameworks(language);
  return frameworks.find(fw => fw.name === frameworkName);
}

/**
 * Gets all supported testing framework names for a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of testing framework names
 */
export function getSupportedTestingFrameworks(language: string): string[] {
  return getTestingFrameworks(language).map(fw => fw.name);
}

/**
 * Gets all languages that have testing frameworks defined.
 * 
 * @returns {string[]} Array of language names with testing frameworks
 */
export function getLanguagesWithTestingFrameworks(): string[] {
  return Object.keys(TESTING_FRAMEWORKS);
}

/**
 * Checks if a testing framework is supported for a specific language.
 * 
 * @param {string} frameworkName - The name of the testing framework
 * @param {string} language - The target language
 * @returns {boolean} True if the testing framework is supported for the language
 */
export function isTestingFrameworkSupported(frameworkName: string, language: string): boolean {
  const frameworks = getTestingFrameworks(language);
  return frameworks.some(fw => fw.name === frameworkName);
}

/**
 * Gets the primary testing framework for a language (most commonly used).
 * 
 * @param {string} language - The target language
 * @returns {TestingFramework | undefined} The primary testing framework or undefined if not found
 */
export function getPrimaryTestingFramework(language: string): TestingFramework | undefined {
  // Define primary testing frameworks for each language
  const primaryFrameworks: Record<string, string> = {
    javascript: 'jest',
    python: 'pytest',
    java: 'junit',
    go: 'testing',
    rust: 'cargo-test',
    dotnet: 'xunit',
    php: 'phpunit',
    ruby: 'rspec'
  };

  const primaryName = primaryFrameworks[language];
  if (primaryName) {
    return getTestingFramework(primaryName, language);
  }

  return undefined;
}

/**
 * Gets all configuration files for testing frameworks of a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of configuration file patterns
 */
export function getTestingFrameworkConfigFiles(language: string): string[] {
  const frameworks = getTestingFrameworks(language);
  return Array.from(new Set(frameworks.flatMap(fw => fw.configFiles)));
}

/**
 * Gets all code patterns for testing frameworks of a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of code patterns
 */
export function getTestingFrameworkPatterns(language: string): string[] {
  const frameworks = getTestingFrameworks(language);
  return Array.from(new Set(frameworks.flatMap(fw => fw.patterns)));
}

/**
 * Finds testing frameworks that match given configuration files.
 * 
 * @param {string} language - The target language
 * @param {string[]} configFiles - Configuration files to match
 * @returns {TestingFramework[]} Array of matching testing frameworks
 */
export function findTestingFrameworksByConfigFiles(language: string, configFiles: string[]): TestingFramework[] {
  const frameworks = getTestingFrameworks(language);
  return frameworks.filter(fw => 
    fw.configFiles.some(configFile => 
      configFiles.some(file => file.includes(configFile.replace('*', '')))
    )
  );
}

/**
 * Gets unit testing frameworks for a language (excluding integration/e2e).
 * 
 * @param {string} language - The target language
 * @returns {TestingFramework[]} Array of unit testing frameworks
 */
export function getUnitTestingFrameworks(language: string): TestingFramework[] {
  const frameworks = getTestingFrameworks(language);
  // Filter out integration/e2e testing frameworks
  const e2eFrameworks = ['cypress', 'playwright', 'puppeteer', 'codeception'];
  return frameworks.filter(fw => !e2eFrameworks.includes(fw.name));
}

/**
 * Gets integration/e2e testing frameworks for a language.
 * 
 * @param {string} language - The target language
 * @returns {TestingFramework[]} Array of integration/e2e testing frameworks
 */
export function getE2ETestingFrameworks(language: string): TestingFramework[] {
  const frameworks = getTestingFrameworks(language);
  // Filter for integration/e2e testing frameworks
  const e2eFrameworks = ['cypress', 'playwright', 'puppeteer', 'codeception'];
  return frameworks.filter(fw => e2eFrameworks.includes(fw.name));
}
