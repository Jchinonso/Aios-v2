#!/usr/bin/env node

/**
 * @fileoverview Test NL Mode Integration
 * @description Automated test demonstrating NL session capabilities
 */

import { parseNaturalLanguage } from './nl-planner/index.js';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n╔═══════════════════════════════════════════════════════════════╗'));
console.log(chalk.blue.bold('║                                                               ║'));
console.log(chalk.blue.bold('║          Natural Language Mode - Integration Test            ║'));
console.log(chalk.blue.bold('║                                                               ║'));
console.log(chalk.blue.bold('╚═══════════════════════════════════════════════════════════════╝\n'));

const testScenarios = [
  {
    name: 'Production Deployment (High Risk)',
    utterance: 'deploy web-app to production',
    expectConfirm: true,
    expectRisk: 'high'
  },
  {
    name: 'Staging Deployment (Moderate Risk)',
    utterance: 'push api to staging',
    expectConfirm: false,
    expectRisk: 'moderate'
  },
  {
    name: 'Service Status Check (Low Risk)',
    utterance: 'what is the status of api',
    expectConfirm: false,
    expectRisk: 'low'
  },
  {
    name: 'Error Logs with Time Duration',
    utterance: 'show me api error logs from the last 15 minutes',
    expectConfirm: false,
    expectRisk: 'low'
  },
  {
    name: 'Production Rollback (High Risk)',
    utterance: 'rollback web-app in production',
    expectConfirm: true,
    expectRisk: 'high'
  },
  {
    name: 'Scaling Operation (Moderate Risk)',
    utterance: 'scale web-app to 5 replicas',
    expectConfirm: false,
    expectRisk: 'moderate'
  },
  {
    name: 'Performance Diagnostics',
    utterance: 'why is the api slow',
    expectConfirm: false,
    expectRisk: 'low'
  },
  {
    name: 'Provider Connection',
    utterance: 'connect to vercel',
    expectConfirm: false,
    expectRisk: 'moderate'
  },
  {
    name: 'Cost Analysis',
    utterance: 'how much does this cost',
    expectConfirm: false,
    expectRisk: 'low'
  },
  {
    name: 'Project Analysis',
    utterance: 'analyze the project',
    expectConfirm: false,
    expectRisk: 'low'
  },
  {
    name: 'Provider Recommendation',
    utterance: 'recommend a provider',
    expectConfirm: false,
    expectRisk: 'low'
  },
  {
    name: 'Ambiguous Deploy (Needs Clarification)',
    utterance: 'deploy',
    expectClarification: true,
    expectRisk: 'moderate'
  },
  {
    name: 'Ambiguous Scale (Needs Clarification)',
    utterance: 'scale api',
    expectClarification: true,
    expectRisk: 'moderate'
  },
  {
    name: 'Multiple Entity Extraction',
    utterance: 'deploy api to staging on vercel in us-east-1',
    expectConfirm: false,
    expectRisk: 'moderate'
  },
  {
    name: 'Canary Deployment Strategy',
    utterance: 'deploy web-app to production with canary strategy at 20%',
    expectConfirm: true,
    expectRisk: 'high'
  }
];

let passed = 0;
let failed = 0;

testScenarios.forEach((scenario, index) => {
  console.log(chalk.cyan(`\n[${index + 1}/${testScenarios.length}] ${scenario.name}`));
  console.log(chalk.gray(`Input: "${scenario.utterance}"`));
  console.log(chalk.gray('─'.repeat(70)));

  try {
    const result = parseNaturalLanguage(scenario.utterance);

    // Display result
    console.log(chalk.white(`  Intent:     ${chalk.cyan(result.intent)}`));
    console.log(chalk.white(`  Confidence: ${chalk.yellow(Math.round(result.confidence * 100))}%`));
    console.log(chalk.white(`  Risk:       ${getRiskColor(result.risk)(result.risk.toUpperCase())}`));
    console.log(chalk.white(`  Command:    ${chalk.gray(result.cli)}`));

    if (result.entities && Object.keys(result.entities).length > 0) {
      const entityStr = Object.entries(result.entities)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(chalk.white(`  Entities:   ${chalk.yellow(entityStr)}`));
    }

    if (result.confirmRequired) {
      console.log(chalk.red(`  ⚠️  Confirm:  ${result.confirmPrompt}`));
    }

    if (result.clarifyingQuestion) {
      console.log(chalk.yellow(`  ❓ Question: ${result.clarifyingQuestion}`));
    }

    if (result.notes) {
      console.log(chalk.gray(`  📝 Notes:    ${result.notes}`));
    }

    // Validate expectations
    const checks: Array<{ name: string; passed: boolean }> = [];

    if (scenario.expectRisk) {
      checks.push({
        name: `Risk level = ${scenario.expectRisk}`,
        passed: result.risk === scenario.expectRisk
      });
    }

    if (scenario.expectConfirm !== undefined) {
      checks.push({
        name: `Confirmation ${scenario.expectConfirm ? 'required' : 'not required'}`,
        passed: result.confirmRequired === scenario.expectConfirm
      });
    }

    if (scenario.expectClarification !== undefined) {
      checks.push({
        name: `Clarification ${scenario.expectClarification ? 'needed' : 'not needed'}`,
        passed: !!result.clarifyingQuestion === scenario.expectClarification
      });
    }

    // Check if intent is not unknown
    checks.push({
      name: 'Intent detected (not unknown)',
      passed: result.intent !== 'unknown'
    });

    // Check if command is generated
    checks.push({
      name: 'Command generated',
      passed: result.cli.length > 0 && result.cli !== 'aios --help'
    });

    const allChecksPassed = checks.every(c => c.passed);

    console.log(chalk.white('\n  Validation:'));
    checks.forEach(check => {
      const icon = check.passed ? chalk.green('✓') : chalk.red('✗');
      const color = check.passed ? chalk.green : chalk.red;
      console.log(`    ${icon} ${color(check.name)}`);
    });

    if (allChecksPassed) {
      console.log(chalk.green('\n  ✅ PASSED'));
      passed++;
    } else {
      console.log(chalk.red('\n  ❌ FAILED'));
      failed++;
    }

  } catch (error) {
    console.log(chalk.red('\n  ❌ ERROR'));
    console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
    failed++;
  }
});

// Summary
console.log(chalk.blue.bold('\n\n╔═══════════════════════════════════════════════════════════════╗'));
console.log(chalk.blue.bold('║                         TEST SUMMARY                          ║'));
console.log(chalk.blue.bold('╚═══════════════════════════════════════════════════════════════╝\n'));

const total = testScenarios.length;
const passRate = Math.round((passed / total) * 100);

console.log(chalk.white(`  Total Tests:  ${total}`));
console.log(chalk.green(`  Passed:       ${passed}`));
console.log(chalk.red(`  Failed:       ${failed}`));
console.log(chalk.cyan(`  Pass Rate:    ${passRate}%\n`));

if (failed === 0) {
  console.log(chalk.green.bold('  🎉 All tests passed! Natural Language mode is ready.\n'));
  process.exit(0);
} else {
  console.log(chalk.red.bold(`  ⚠️  ${failed} test(s) failed. Review the output above.\n`));
  process.exit(1);
}

/**
 * Get color function for risk level
 */
function getRiskColor(risk: string): (text: string) => string {
  switch (risk) {
    case 'low':
      return chalk.green;
    case 'moderate':
      return chalk.yellow;
    case 'high':
      return chalk.red;
    case 'destructive':
      return chalk.red.bold;
    default:
      return chalk.gray;
  }
}
