/**
 * Style Rules Definition - SRP Focused
 *
 * Single Responsibility: Define and manage TypeScript/JavaScript style rules
 */

export interface StyleRule {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning';
  fix?: string;
}

export interface StyleViolation {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  content: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: StyleViolation[];
  summary: {
    errors: number;
    warnings: number;
    filesChecked: number;
  };
}

export const STYLE_RULES: StyleRule[] = [
  // Import/Export rules
  {
    name: 'prefer-named-exports',
    pattern: /export\s+default\s+(?!class|function|interface|type)/,
    message: 'Prefer named exports over default exports for non-class/function declarations',
    severity: 'warning'
  },
  {
    name: 'import-order',
    pattern: /^import.*from\s+['"][^.]/m,
    message: 'External imports should come before relative imports',
    severity: 'warning'
  },
  {
    name: 'no-unused-imports',
    pattern: /^import.*{\s*(\w+).*}\s*from.*$/gm,
    message: 'Remove unused imports',
    severity: 'warning'
  },

  // TypeScript specific rules
  {
    name: 'explicit-return-types',
    pattern: /^export\s+(function|const\s+\w+\s*=\s*\([^)]*\)\s*=>)/m,
    message: 'Exported functions should have explicit return types',
    severity: 'warning'
  },
  {
    name: 'interface-naming',
    pattern: /^interface\s+(?![A-Z])/m,
    message: 'Interface names should start with uppercase letter',
    severity: 'error'
  },
  {
    name: 'type-naming',
    pattern: /^type\s+(?![A-Z])/m,
    message: 'Type names should start with uppercase letter',
    severity: 'error'
  },
  {
    name: 'enum-naming',
    pattern: /^enum\s+(?![A-Z])/m,
    message: 'Enum names should start with uppercase letter',
    severity: 'error'
  },

  // Code quality rules
  {
    name: 'no-console-log',
    pattern: /console\.log\(/,
    message: 'Use proper logging instead of console.log',
    severity: 'warning'
  },
  {
    name: 'no-any-type',
    pattern: /:\s*any(\s|;|,|\))/,
    message: 'Avoid using "any" type, use specific types instead',
    severity: 'warning'
  },
  {
    name: 'camelcase-variables',
    pattern: /(?:const|let|var)\s+([a-z]+_[a-z_]+)/,
    message: 'Variable names should use camelCase, not snake_case',
    severity: 'error'
  },

  // Function and class rules
  {
    name: 'function-naming',
    pattern: /^function\s+(?![a-z])/m,
    message: 'Function names should start with lowercase letter (camelCase)',
    severity: 'error'
  },
  {
    name: 'class-naming',
    pattern: /^class\s+(?![A-Z])/m,
    message: 'Class names should start with uppercase letter (PascalCase)',
    severity: 'error'
  },
  {
    name: 'method-naming',
    pattern: /^\s*(?:public|private|protected)?\s*(?:static)?\s*[A-Z]/m,
    message: 'Method names should start with lowercase letter (camelCase)',
    severity: 'error'
  },

  // Code formatting rules
  {
    name: 'semicolon-required',
    pattern: /^(?!.*\/\/).*[^;}]\s*$/m,
    message: 'Statements should end with semicolons',
    severity: 'warning'
  },
  {
    name: 'single-quotes',
    pattern: /"(?:[^"\\]|\\.)*"/,
    message: 'Use single quotes instead of double quotes',
    severity: 'warning'
  },
  {
    name: 'trailing-comma',
    pattern: /{\s*[\w'"]+:[^,}]+\s*}/,
    message: 'Add trailing comma in multiline objects',
    severity: 'warning'
  }
];

export class StyleRulesManager {
  private rules: StyleRule[] = [...STYLE_RULES];

  getAllRules(): StyleRule[] {
    return [...this.rules];
  }

  getRulesByCategory(category: 'import' | 'typescript' | 'quality' | 'naming' | 'formatting'): StyleRule[] {
    const categoryMap: Record<string, string[]> = {
      import: ['prefer-named-exports', 'import-order', 'no-unused-imports'],
      typescript: ['explicit-return-types', 'interface-naming', 'type-naming', 'enum-naming'],
      quality: ['no-console-log', 'no-any-type', 'camelcase-variables'],
      naming: ['function-naming', 'class-naming', 'method-naming'],
      formatting: ['semicolon-required', 'single-quotes', 'trailing-comma']
    };

    const ruleNames = categoryMap[category] || [];
    return this.rules.filter(rule => ruleNames.includes(rule.name));
  }

  addRule(rule: StyleRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }
}