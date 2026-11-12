import { useCallback, useEffect, useRef, useState } from 'react';
import type { OcrApproval } from '@texion/core';

export interface PendingOcrApproval {
  readonly id: string;
  readonly request: OcrApproval;
}
/** Host-controlled consent presentation. No dialog or remote request is opened automatically. */
export function useOcrApproval() {
  const [pending, setPending] = useState<readonly PendingOcrApproval[]>([]);
  const requests = useRef(
    new Map<string, { finish(approved: boolean): void }>(),
  );
  const next = useRef(0);
  const requestApproval = useCallback(
    (request: OcrApproval): Promise<boolean> => {
      if (request.signal.aborted) return Promise.resolve(false);
      const id = `ocr-approval-${++next.current}`;
      return new Promise((resolve) => {
        const abort = () => finish(false);
        function finish(approved: boolean) {
          if (!requests.current.delete(id)) return;
          request.signal.removeEventListener('abort', abort);
          setPending((values) => values.filter((value) => value.id !== id));
          resolve(approved);
        }
        requests.current.set(id, { finish });
        request.signal.addEventListener('abort', abort, { once: true });
        setPending((values) => [...values, { id, request }]);
      });
    },
    [],
  );
  const approve = useCallback(
    (id: string) => requests.current.get(id)?.finish(true),
    [],
  );
  const deny = useCallback(
    (id: string) => requests.current.get(id)?.finish(false),
    [],
  );
  useEffect(
    () => () => {
      for (const request of [...requests.current.values()])
        request.finish(false);
    },
    [],
  );
  return { pending, requestApproval, approve, deny };
}
