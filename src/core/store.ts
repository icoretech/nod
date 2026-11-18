import type { Relationship, RelationshipRecord } from "./relationships.js";

/** In-memory map of handle -> relationship for the current tab. Nothing is persisted. */
export class RelationshipStore {
  private readonly records = new Map<string, Relationship>();
  private readonly listeners = new Set<() => void>();

  get(handle: string): Relationship | undefined {
    return this.records.get(handle);
  }

  get size(): number {
    return this.records.size;
  }

  /** Stores the records and notifies listeners once, only if something changed. */
  upsertMany(records: readonly RelationshipRecord[]): boolean {
    let changed = false;
    for (const { handle, followedBy, following } of records) {
      const current = this.records.get(handle);
      if (current?.followedBy === followedBy && current.following === following) {
        continue;
      }
      this.records.set(handle, { followedBy, following });
      changed = true;
    }
    if (changed) {
      for (const listener of this.listeners) {
        listener();
      }
    }
    return changed;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
