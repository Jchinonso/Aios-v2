/**
 * @fileoverview Dependency Types - Type definitions for dependency analysis
 * 
 * This module contains type definitions for dependency analysis, including
 * dependency graphs, nodes, edges, and circular dependency detection.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * Represents a dependency node in the dependency graph
 */
export interface DependencyNode {
  /** Unique identifier for the node */
  readonly id: string;
  
  /** Human-readable name of the node */
  readonly name: string;
  
  /** File path of the node */
  readonly path: string;
  
  /** Type of the node (module, script, test, types, package) */
  readonly type: 'module' | 'script' | 'test' | 'types' | 'package';
  
  /** Size of the file in bytes */
  readonly size: number;
  
  /** Number of dependencies this node has */
  readonly dependencies: number;
  
  /** Additional metadata about the node */
  readonly metadata?: Record<string, any>;
}

/**
 * Represents a dependency edge between two nodes
 */
export interface DependencyEdge {
  /** Source node ID */
  readonly from: string;
  
  /** Target node ID */
  readonly to: string;
  
  /** Type of dependency (import, require, extends, implements) */
  readonly type: 'import' | 'require' | 'extends' | 'implements' | 'dynamic';
  
  /** Weight of the edge (importance/frequency) */
  readonly weight: number;
  
  /** Additional metadata about the edge */
  readonly metadata?: Record<string, any>;
}

/**
 * Represents a circular dependency path
 */
export interface CircularPath {
  /** Array of node IDs forming the cycle */
  readonly nodes: string[];
  
  /** Severity level of the circular dependency */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Description of the circular dependency */
  readonly description: string;
  
  /** Suggested resolution for the circular dependency */
  readonly resolution?: string;
  
  /** Additional metadata about the circular path */
  readonly metadata?: Record<string, any>;
}

/**
 * Represents a complete dependency graph
 */
export interface DependencyGraph {
  /** Array of all nodes in the graph */
  readonly nodes: DependencyNode[];
  
  /** Array of all edges in the graph */
  readonly edges: DependencyEdge[];
  
  /** Total number of nodes */
  readonly totalNodes: number;
  
  /** Total number of edges */
  readonly totalEdges: number;
  
  /** Array of circular dependency paths found */
  readonly circularPaths?: CircularPath[];
  
  /** Additional metadata about the graph */
  readonly metadata?: Record<string, any>;
}

/**
 * Represents a circular dependency report
 */
export interface CircularDependencyReport {
  /** Array of all circular paths found */
  readonly circularPaths: CircularPath[];
  
  /** Total number of circular dependencies found */
  readonly totalCircularDependencies: number;
  
  /** Severity distribution of circular dependencies */
  readonly severityDistribution: {
    readonly low: number;
    readonly medium: number;
    readonly high: number;
    readonly critical: number;
  };
  
  /** Summary statistics */
  readonly summary: {
    readonly totalNodes: number;
    readonly totalEdges: number;
    readonly circularityRatio: number;
    readonly averagePathLength: number;
  };
  
  /** Recommendations for resolving circular dependencies */
  readonly recommendations: string[];
  
  /** Additional metadata about the report */
  readonly metadata?: Record<string, any>;
}

/**
 * Configuration for dependency analysis
 */
export interface DependencyAnalysisConfig {
  /** Maximum depth to analyze dependencies */
  readonly maxDepth: number;
  
  /** Whether to include test files in analysis */
  readonly includeTests: boolean;
  
  /** Whether to include node_modules in analysis */
  readonly includeNodeModules: boolean;
  
  /** File extensions to analyze */
  readonly extensions: string[];
  
  /** Directories to exclude from analysis */
  readonly excludeDirectories: string[];
  
  /** Whether to detect dynamic imports */
  readonly detectDynamicImports: boolean;
  
  /** Additional configuration options */
  readonly options?: Record<string, any>;
}

/**
 * Dependency graph analysis result
 */
export interface DependencyGraphAnalysisResult {
  /** The dependency graph */
  readonly graph: DependencyGraph;
  
  /** Circular dependency report */
  readonly circularDependencies: CircularDependencyReport;
  
  /** Analysis configuration used */
  readonly config: DependencyAnalysisConfig;
  
  /** Analysis duration in milliseconds */
  readonly duration: number;
  
  /** Whether the analysis was successful */
  readonly success: boolean;
  
  /** Error message if analysis failed */
  readonly error?: string;
  
  /** Additional metadata about the analysis */
  readonly metadata?: Record<string, any>;
}
