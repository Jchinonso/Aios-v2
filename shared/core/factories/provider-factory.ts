/**
 * Provider Factory Interface - Abstraction for provider management
 */

export interface IProviderRegistry {
  get(name: string): any;
  register(name: string, provider: any): void;
  list(): string[];
  has(name: string): boolean;
}
