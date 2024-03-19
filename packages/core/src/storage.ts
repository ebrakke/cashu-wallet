export interface StorageProvider<T extends object> {
  get(): Promise<T | null>;
  set(value: T): Promise<void>;
}
