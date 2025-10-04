/**
 * Intelligence Constants - Configuration and Constants
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for intelligence constants
 * - OCP: Open for extension through new constant categories
 */

// Analysis Configuration
export const ANALYSIS_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_TO_ANALYZE: 10000,
  CONFIDENCE_THRESHOLD: 0.7,
  CACHE_TTL: 3600000, // 1 hour
} as const;

// Pattern Detection Thresholds
export const PATTERN_THRESHOLDS = {
  FRAMEWORK_CONFIDENCE: 0.8,
  LANGUAGE_CONFIDENCE: 0.9,
  ARCHITECTURE_CONFIDENCE: 0.75,
  DEPENDENCY_CONFIDENCE: 0.85,
} as const;

// AI Analysis Configuration
export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-4',
  MAX_CONTEXT_LENGTH: 8000,
  TEMPERATURE: 0.3,
  MAX_TOKENS: 2000,
  RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 5,
} as const;

// File Extensions and Categories
export const FILE_CATEGORIES = {
  SOURCE_CODE: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c'],
  CONFIG_FILES: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'],
  DOCUMENTATION: ['.md', '.txt', '.rst', '.adoc'],
  BUILD_FILES: ['Dockerfile', 'docker-compose.yml', 'Makefile', '.gitignore'],
  PACKAGE_FILES: ['package.json', 'requirements.txt', 'Cargo.toml', 'pom.xml'],
} as const;

// Enhanced Framework Detection Patterns - Multi-Language Support
export const FRAMEWORK_PATTERNS = {
  // JavaScript/TypeScript Frameworks
  REACT: ['react', '@types/react', 'react-dom'],
  VUE: ['vue', '@vue/cli', 'nuxt'],
  ANGULAR: ['@angular/core', '@angular/cli'],
  NEXT: ['next', 'next.js'],
  SVELTE: ['svelte', '@sveltejs/kit'],

  // Node.js Backend Frameworks
  EXPRESS: ['express', 'express.js'],
  FASTIFY: ['fastify'],
  NESTJS: ['@nestjs/core', '@nestjs/common'],
  KOA: ['koa'],

  // Python Frameworks
  DJANGO: ['django', 'Django'],
  FLASK: ['flask', 'Flask'],
  FASTAPI: ['fastapi'],
  STREAMLIT: ['streamlit'],
  TORNADO: ['tornado'],

  // Java Frameworks
  SPRING: ['spring-boot', 'spring-framework', 'org.springframework'],
  STRUTS: ['struts2-core', 'struts-core'],
  HIBERNATE: ['hibernate-core'],
  DROPWIZARD: ['io.dropwizard'],
  MICRONAUT: ['io.micronaut'],
  QUARKUS: ['io.quarkus'],

  // .NET Frameworks
  ASP_NET: ['Microsoft.AspNetCore'],
  BLAZOR: ['Microsoft.AspNetCore.Blazor'],
  ENTITY_FRAMEWORK: ['Microsoft.EntityFrameworkCore'],

  // Go Frameworks
  GIN: ['github.com/gin-gonic/gin'],
  ECHO: ['github.com/labstack/echo'],
  FIBER: ['github.com/gofiber/fiber'],
  BEEGO: ['github.com/beego/beego'],

  // Rust Frameworks
  ACTIX: ['actix-web'],
  ROCKET: ['rocket'],
  WARP: ['warp'],
  AXUM: ['axum'],

  // PHP Frameworks
  LARAVEL: ['laravel/framework'],
  SYMFONY: ['symfony/symfony'],
  CODEIGNITER: ['codeigniter/framework'],

  // Ruby Frameworks
  RAILS: ['rails'],
  SINATRA: ['sinatra'],
  HANAMI: ['hanami'],

  // Mobile Frameworks
  REACT_NATIVE: ['react-native'],
  FLUTTER: ['flutter'],
  XAMARIN: ['Xamarin.Forms'],
  IONIC: ['@ionic/angular', '@ionic/react'],

  // Desktop Frameworks
  ELECTRON: ['electron'],
  TAURI: ['tauri'],
  FLUTTER_DESKTOP: ['flutter'],
} as const;

// Analysis Types
export const ANALYSIS_TYPES = {
  STRUCTURE: 'structure',
  TECHNOLOGY: 'technology',
  DEPENDENCY: 'dependency',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  QUALITY: 'quality',
  ARCHITECTURE: 'architecture',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Complexity Levels
export const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  MODERATE: 'moderate',
  COMPLEX: 'complex',
  ENTERPRISE: 'enterprise',
} as const;

// Analysis Status
export const ANALYSIS_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Error Codes
export const ERROR_CODES = {
  INVALID_PATH: 'INVALID_PATH',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TIMEOUT: 'TIMEOUT',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
} as const;

// Type definitions for constants
export type AnalysisType = typeof ANALYSIS_TYPES[keyof typeof ANALYSIS_TYPES];
export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];
export type ComplexityLevel = typeof COMPLEXITY_LEVELS[keyof typeof COMPLEXITY_LEVELS];
export type AnalysisStatus = typeof ANALYSIS_STATUS[keyof typeof ANALYSIS_STATUS];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];