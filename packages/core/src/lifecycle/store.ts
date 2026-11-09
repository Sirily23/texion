import type { DocumentSnapshot, TexionDocument } from '../document/types';
import { createSnapshot } from './snapshot';

export function createStore() {
  let snapshot = createSnapshot([]);
  const listeners = new Set<() => void>();

  return {
    getSnapshot: (): DocumentSnapshot => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    publish(documents: readonly TexionDocument[]) {
      if (
        documents.length === snapshot.documents.length &&
        documents.every((document, i) => document === snapshot.documents[i])
      ) {
        return;
      }
      snapshot = createSnapshot(documents);

      for (const listener of [...listeners]) {
        listener();
      }
    },
  };
}
