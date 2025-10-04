#!/usr/bin/env node

/**
 * @fileoverview Test script for NL Planner
 * @description Standalone test to verify NL planner functionality
 */

import { parseNaturalLanguage } from './nl-planner/index.js';

// Test utterances
const testUtterances = [
  // Deploy scenarios
  'deploy web-app to production',
  'I need to deploy the latest version of the web application to production',
  'push api to staging',
  'ship web to prod',

  // Status scenarios
  'what is the status of api',
  'how is web-app doing',
  'is production healthy',
  'status',

  // Logs scenarios
  'show me api error logs from the last 15 minutes',
  'get logs for web-app',
  'display errors in production',

  // Rollback scenarios
  'rollback web-app in production',
  'revert api to staging',
  'undo the deployment',

  // Why slow scenarios
  'why is the api slow',
  'diagnose performance of web-app',
  'what is slowing down production',

  // Scale scenarios
  'scale web-app to 5 replicas',
  'increase instances of api to 10',
  'scale api',

  // Connect scenarios
  'connect to vercel',
  'add provider netlify',
  'link aws',

  // Cost scenarios
  'how much does this cost',
  'show me the spending',
  'cost estimate',

  // Analyze scenarios
  'analyze the project',
  'what kind of app is this',
  'detect the framework',

  // Recommend scenarios
  'recommend a provider',
  'which platform should I use',
  'best provider for my app',

  // Ambiguous scenarios
  'deploy',
  'logs',
  'scale',
  'help'
];

console.log('\n');
console.log('═'.repeat(100));
console.log('  AIOS Natural Language Planner - Test Suite');
console.log('═'.repeat(100));
console.log('\n');

testUtterances.forEach((utterance, index) => {
  console.log(`\n[${ index + 1 }/${testUtterances.length}] Input: "${utterance}"`);
  console.log('─'.repeat(100));

  const result = parseNaturalLanguage(utterance);

  console.log(`  Intent:     ${result.intent}`);
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`  Risk:       ${result.risk.toUpperCase()}`);
  console.log(`  Command:    ${result.cli}`);

  if (result.entities && Object.keys(result.entities).length > 0) {
    console.log(`  Entities:   ${JSON.stringify(result.entities)}`);
  }

  if (result.confirmRequired) {
    console.log(`  ⚠️  Confirm:   ${result.confirmPrompt}`);
  }

  if (result.clarifyingQuestion) {
    console.log(`  ❓ Question:  ${result.clarifyingQuestion}`);
  }

  if (result.notes) {
    console.log(`  📝 Notes:     ${result.notes}`);
  }
});

console.log('\n');
console.log('═'.repeat(100));
console.log('  Test Complete');
console.log('═'.repeat(100));
console.log('\n');
