/**
 * @fileoverview Pattern Detection Utilities - Enhanced pattern detection with proper interfaces
 * 
 * This module provides utilities for detecting various patterns in project files,
 * including framework patterns, architecture patterns, deployment patterns, and testing patterns.
 * All patterns conform to the IDetectedPattern interface.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IDetectedPattern } from '../file-system/types/analyzer.interface.js'

/**
 * Utility class for detecting patterns in project files and dependencies
 */
export class PatternUtils {
  /**
   * Detect framework patterns from dependencies
   */
  static detectFrameworkPatterns(dependencies: string[]): IDetectedPattern[] {
    const patterns: IDetectedPattern[] = [];
    
    const frameworks = {
      'react': ['react', 'react-dom'],
      'vue': ['vue', 'vue-router'],
      'angular': ['@angular/core', '@angular/common'],
      'express': ['express'],
      'fastapi': ['fastapi'],
      'django': ['django'],
      'spring': ['spring-boot', 'spring-framework'],
      'gin': ['github.com/gin-gonic/gin'],
      'actix': ['actix-web']
    };

    Object.entries(frameworks).forEach(([framework, indicators]) => {
      const matches = indicators.filter(indicator =>
        dependencies.some(dep => dep.includes(indicator))
      );

      if (matches.length > 0) {
        const confidence = Math.min(matches.length / indicators.length, 1.0);
        patterns.push({
          pattern: `framework:${framework}`,
          type: 'framework',
          name: `${framework}-framework`,
          confidence,
          location: { file: 'package.json', line: 1 },
          evidence: matches,
          metadata: {
            description: `${framework} framework detected`,
            recommendations: this.getFrameworkRecommendations(framework.toLowerCase())
          }
        });
      }
    });

    return patterns;
  }

  /**
   * Detect architecture patterns from file structure
   */
  static detectArchitecturePatterns(files: string[]): IDetectedPattern[] {
    const patterns: IDetectedPattern[] = [];

    // MVC Pattern
    if (this.hasMVCStructure(files)) {
      patterns.push({
        pattern: 'mvc-architecture',
        type: 'config',
        name: 'mvc-pattern',
        confidence: 0.8,
        location: { file: 'project-structure', line: 1 },
        evidence: ['models', 'views', 'controllers'],
        metadata: {
          description: 'MVC (Model-View-Controller) architecture pattern detected',
          recommendations: ['Ensure clear separation between models, views, and controllers']
        }
      });
    }

    // Microservices Pattern
    if (this.hasMicroservicesStructure(files)) {
      patterns.push({
        pattern: 'microservices-architecture',
        type: 'config',
        name: 'microservices-pattern',
        confidence: 0.85,
        location: { file: 'project-structure', line: 1 },
        evidence: ['services', 'api', 'gateway'],
        metadata: {
          description: 'Microservices architecture pattern detected',
          recommendations: [
            'Implement service discovery and load balancing',
            'Consider distributed tracing for debugging',
            'Ensure proper inter-service communication protocols'
          ]
        }
      });
    }

    // Monorepo Pattern
    if (this.hasMonorepoStructure(files)) {
      patterns.push({
        pattern: 'monorepo-architecture',
        type: 'config',
        name: 'monorepo-pattern',
        confidence: 0.9,
        location: { file: 'project-structure', line: 1 },
        evidence: ['packages', 'workspaces', 'lerna'],
        metadata: {
          description: 'Monorepo architecture pattern detected',
          recommendations: [
            'Use consistent tooling across packages',
            'Implement proper build orchestration',
            'Consider package dependency management'
          ]
        }
      });
    }

    return patterns;
  }

  /**
   * Detect deployment patterns from configuration files
   */
  static detectDeploymentPatterns(files: string[]): IDetectedPattern[] {
    const patterns: IDetectedPattern[] = [];

    // Docker deployment
    if (files.some(f => f.includes('Dockerfile') || f.includes('docker-compose'))) {
      patterns.push({
        pattern: 'docker-deployment',
        type: 'config',
        name: 'docker-pattern',
        confidence: 0.95,
        location: { file: 'Dockerfile', line: 1 },
        evidence: ['Dockerfile', 'docker-compose'],
        metadata: {
          description: 'Docker containerization pattern detected',
          recommendations: [
            'Optimize Docker image size',
            'Use multi-stage builds for production',
            'Implement proper health checks'
          ]
        }
      });
    }

    // Kubernetes deployment
    if (files.some(f => f.includes('k8s') || f.includes('kubernetes') || f.includes('deployment.yaml'))) {
      patterns.push({
        pattern: 'kubernetes-deployment',
        type: 'config',
        name: 'kubernetes-pattern',
        confidence: 0.9,
        location: { file: 'deployment.yaml', line: 1 },
        evidence: ['k8s', 'kubernetes', 'deployment.yaml'],
        metadata: {
          description: 'Kubernetes orchestration pattern detected',
          recommendations: [
            'Configure proper resource limits and requests',
            'Implement horizontal pod autoscaling',
            'Set up monitoring and logging'
          ]
        }
      });
    }

    // Serverless deployment
    if (files.some(f => f.includes('serverless') || f.includes('lambda') || f.includes('functions'))) {
      patterns.push({
        pattern: 'serverless-deployment',
        type: 'config',
        name: 'serverless-pattern',
        confidence: 0.85,
        location: { file: 'serverless.yml', line: 1 },
        evidence: ['serverless', 'lambda', 'functions'],
        metadata: {
          description: 'Serverless deployment pattern detected',
          recommendations: [
            'Optimize cold start performance',
            'Implement proper error handling',
            'Consider function timeout limits'
          ]
        }
      });
    }

    return patterns;
  }

  /**
   * Detect testing patterns from test files
   */
  static detectTestingPatterns(files: string[]): IDetectedPattern[] {
    const patterns: IDetectedPattern[] = [];

    const testFrameworks = {
      'jest': ['jest', '.test.', '.spec.'],
      'mocha': ['mocha', 'chai'],
      'pytest': ['pytest', 'test_'],
      'junit': ['junit', 'Test.java'],
      'rspec': ['rspec', '_spec.rb'],
      'cypress': ['cypress', 'cypress/'],
      'playwright': ['playwright', '@playwright']
    };

    Object.entries(testFrameworks).forEach(([framework, indicators]) => {
      const matches = indicators.filter(indicator =>
        files.some(file => file.toLowerCase().includes(indicator.toLowerCase()))
      );

      if (matches.length > 0) {
        patterns.push({
          pattern: `testing:${framework}`,
          type: 'config',
          name: `${framework}-testing`,
          confidence: 0.9,
          location: { file: 'test-files', line: 1 },
          evidence: matches,
          metadata: {
            description: `${framework} testing framework detected`,
            recommendations: [
              'Implement comprehensive test coverage',
              'Set up continuous integration testing',
              'Use proper test data management'
            ]
          }
        });
      }
    });

    return patterns;
  }

  /**
   * Merge and deduplicate patterns
   */
  static mergePatterns(patternArrays: IDetectedPattern[][]): IDetectedPattern[] {
    const patternMap = new Map<string, IDetectedPattern>();

    patternArrays.flat().forEach(pattern => {
      const key = `${pattern.type}:${pattern.name}`;
      const existing = patternMap.get(key);
      
      if (!existing) {
        patternMap.set(key, pattern);
      } else {
        // Merge evidence and update confidence
        const mergedPattern: IDetectedPattern = {
          ...existing,
          evidence: Array.from(new Set([...existing.evidence, ...pattern.evidence])),
          confidence: Math.max(existing.confidence, pattern.confidence),
          metadata: {
            ...existing.metadata,
            ...pattern.metadata
          }
        };
        patternMap.set(key, mergedPattern);
      }
    });

    return Array.from(patternMap.values());
  }

  // Helper methods for pattern detection
  private static hasMVCStructure(files: string[]): boolean {
    const lowerFiles = files.map(f => f.toLowerCase());
    return lowerFiles.some(f => f.includes('model')) &&
           lowerFiles.some(f => f.includes('view')) &&
           lowerFiles.some(f => f.includes('controller'));
  }

  private static hasMicroservicesStructure(files: string[]): boolean {
    const lowerFiles = files.map(f => f.toLowerCase());
    return lowerFiles.some(f => f.includes('service')) &&
           (lowerFiles.some(f => f.includes('api')) || lowerFiles.some(f => f.includes('gateway')));
  }

  private static hasMonorepoStructure(files: string[]): boolean {
    const lowerFiles = files.map(f => f.toLowerCase());
    return lowerFiles.some(f => f.includes('package')) &&
           (lowerFiles.some(f => f.includes('workspace')) || lowerFiles.some(f => f.includes('lerna')));
  }

  private static getFrameworkRecommendations(framework: string): string[] {
    const recommendations: Record<string, string[]> = {
      'react': [
        'Use React hooks for state management',
        'Implement proper component composition',
        'Consider using React Query for data fetching'
      ],
      'vue': [
        'Use Vuex for state management in complex apps',
        'Implement proper component communication',
        'Consider using Nuxt.js for SSR'
      ],
      'angular': [
        'Use Angular services for business logic',
        'Implement proper dependency injection',
        'Consider using Angular Material for UI components'
      ],
      'express': [
        'Implement proper middleware for cross-cutting concerns',
        'Use Helmet.js for security headers',
        'Consider using Express rate limiting'
      ]
    };

    return recommendations[framework] || [
      'Follow framework best practices',
      'Implement proper error handling',
      'Consider performance optimizations'
    ];
  }
}