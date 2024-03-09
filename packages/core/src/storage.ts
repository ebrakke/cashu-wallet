export interface StorageGetter<T extends object> {
  get(): T | null;
}

export interface StorageSetter<T extends object> {
  set(value: T): void;
}

export interface StorageProvider<T extends object>
  extends StorageGetter<T>,
    StorageSetter<T> {}

export interface AsyncStorageProvider<T extends object> {
  get(): Promise<T | null>;
  set(value: T): Promise<void>;
}

export class LocalStorageProvider<T extends object>
  implements StorageProvider<T>
{
  constructor(private readonly key: string) {}
  get() {
    const value = localStorage.getItem(this.key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  }
  set(value: T) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
}
