/**
 * @fileoverview Container Factory for unified DependencyContainer management
 * @description Provides singleton access to DependencyContainer across CLI and interactive modes
 * @module node-cli/services/container-factory
 */

import { DependencyContainer, disposeContainer } from './dependency-container.js';

/**
 * Container initialization options
 */
export interface ContainerOptionsType {
  readonly debug?: boolean;
  readonly verbose?: boolean;
}

/**
 * Factory for managing DependencyContainer lifecycle
 *
 * Provides singleton access with proper caching and configuration merging
 */
export class ContainerFactory {
  private static instance: DependencyContainer | null = null;

  /**
   * Get or create the DependencyContainer instance
   *
   * @param options - Optional configuration overrides
   * @returns Initialized DependencyContainer
   */
  static async getOrCreate(options?: ContainerOptionsType): Promise<DependencyContainer> {
    if (!this.instance || this.instance.isDisposed()) {
      const config = await DependencyContainer.loadConfig();

      // Merge debug/verbose flags into config
      const mergedConfig = {
        ...config,
        ...(options?.debug || options?.verbose ? { debug: true } : {})
      };

      this.instance = await DependencyContainer.initialize(mergedConfig);
    }

    return this.instance;
  }

  /**
   * Dispose of the current container instance
   */
  static async dispose(): Promise<void> {
    if (this.instance) {
      await disposeContainer();
      this.instance = null;
    }
  }

  /**
   * Check if a container instance exists and is active
   */
  static hasInstance(): boolean {
    return this.instance !== null && !this.instance.isDisposed();
  }

  /**
   * Get the current instance (if exists)
   *
   * @returns Current instance or null
   */
  static getInstance(): DependencyContainer | null {
    if (this.instance && !this.instance.isDisposed()) {
      return this.instance;
    }
    return null;
  }
}
