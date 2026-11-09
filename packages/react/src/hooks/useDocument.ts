import { useEffect, useState, useSyncExternalStore } from 'react';
import { createController } from '@texion/core';
import type { ControllerOptions, DocumentInput } from '@texion/core';

export function useDocument(
  input?: DocumentInput,
  options: ControllerOptions = {},
) {
  const [controller] = useState(() => createController(options));
  const [current, setCurrent] = useState<{
    input: DocumentInput;
    id: string;
  }>();
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    if (input === undefined) {
      setCurrent(undefined);

      return;
    }

    const id = controller.add(input);
    setCurrent({ input, id });

    return () => {
      controller.remove(id);
    };
  }, [controller, input]);

  return current?.input === input
    ? snapshot.documents.find((document) => document.id === current?.id)
    : undefined;
}
