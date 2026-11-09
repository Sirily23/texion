import type { DocumentInput, TexionDocument } from '../document/types';
import type { FormatAdapter } from '../adapters/contract';
import type { Limits } from '../policy/limits';
import { defaultLimits, resolveLimits } from '../policy/limits';
import { duplicateKey, inputName, isBlob } from '../policy/duplicates';
import { createRegistry } from '../adapters/registry';
import { IngestionError } from '../errors/codes';
import { runPipeline } from '../ingestion/pipeline';
import { createOperation, isCurrent } from './cancellation';
import type { Operation } from './cancellation';
import { createStore } from './store';
import { freezeDocument } from './snapshot';

export interface ControllerOptions extends Partial<Limits> {
  readonly adapters?: readonly FormatAdapter[];
  readonly acceptedFormats?: readonly string[];
}

interface ProcessingJob {
  readonly operation: Operation;
  readonly promise: Promise<TexionDocument | undefined>;
  readonly resolve: (document: TexionDocument | undefined) => void;
}

function createPendingDocument(
  id: string,
  input: DocumentInput,
): TexionDocument {
  const base = {
    id,
    name: inputName(input),
    format: 'unknown',
    status: 'pending' as const,
    metadata: {},
    warnings: [],
  };

  if (isBlob(input)) {
    return freezeDocument({
      ...base,
      source: 'file',
      size: input.size,
      blob: input,
      ...('name' in input ? { file: input as File } : {}),
    });
  }

  const raw = typeof input === 'string' ? input : input.text;
  const source = typeof input === 'string' ? 'text' : (input.source ?? 'text');

  return freezeDocument({
    ...base,
    source,
    raw,
    size: new TextEncoder().encode(raw).byteLength,
  });
}

let nextId = 0;

export function createController(options: ControllerOptions = {}) {
  const limitOptions = Object.fromEntries(
    Object.entries(options).filter(([key]) =>
      Object.hasOwn(defaultLimits, key),
    ),
  );
  const limits = resolveLimits(limitOptions);
  const adapters = createRegistry(options.adapters, options.acceptedFormats);
  const store = createStore();
  const documents = new Map<string, TexionDocument>();
  const keys = new Map<string, string>();
  const jobs = new Map<string, ProcessingJob>();
  const publish = () => store.publish([...documents.values()]);

  function remove(id: string) {
    const job = jobs.get(id);
    job?.operation.abort.abort();
    job?.resolve(undefined);
    jobs.delete(id);

    for (const [key, value] of keys) {
      if (value === id) {
        keys.delete(key);
      }
    }
    documents.delete(id);
    publish();
  }

  function add(input: DocumentInput, internalText = false): string {
    const key = duplicateKey(input);
    const duplicate = keys.get(key);

    if (duplicate && documents.get(duplicate)?.status !== 'error') {
      return duplicate;
    }
    const id = internalText ? 'text' : `document-${++nextId}`;
    const base = createPendingDocument(id, input);
    const count = [...documents.values()].filter(
      (doc) => doc.id !== 'text' && doc.status !== 'error',
    ).length;

    if (!internalText && count >= limits.maxFiles) {
      documents.set(
        id,
        freezeDocument({
          ...base,
          status: 'error',
          error: {
            code: 'too-many',
            message: `Maximum attachment count is ${limits.maxFiles}.`,
          },
        }),
      );
      publish();

      return id;
    }

    documents.set(id, base);
    keys.set(key, id);
    const operation = createOperation();
    let resolve!: (document: TexionDocument | undefined) => void;
    const promise = new Promise<TexionDocument | undefined>((done) => {
      resolve = done;
    });
    jobs.set(id, { operation, promise, resolve });
    publish();
    queueMicrotask(async () => {
      if (!isCurrent(jobs.get(id)?.operation, operation)) {
        return;
      }
      documents.set(id, freezeDocument({ ...base, status: 'processing' }));
      publish();

      try {
        const result = await runPipeline(
          input,
          adapters,
          limits,
          operation.abort.signal,
        );

        if (!isCurrent(jobs.get(id)?.operation, operation)) {
          return;
        }
        const document = freezeDocument({
          ...base,
          ...result,
          status: 'ready',
        });
        documents.set(id, document);
        jobs.delete(id);
        publish();
        resolve(document);
      } catch (error) {
        if (!isCurrent(jobs.get(id)?.operation, operation)) {
          return;
        }
        const failure =
          error instanceof IngestionError
            ? error
            : new IngestionError(
                'read-failed',
                'The document could not be read.',
              );
        const document = freezeDocument({
          ...base,
          status: 'error',
          error: { code: failure.code, message: failure.message },
        });
        documents.set(id, document);
        jobs.delete(id);
        publish();
        resolve(document);
      }
    });

    return id;
  }

  function clear() {
    for (const job of jobs.values()) {
      job.operation.abort.abort();
      job.resolve(undefined);
    }

    jobs.clear();
    documents.clear();
    keys.clear();
    publish();
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    add: (input: DocumentInput) => add(input),
    remove,
    cancel: remove,
    clear,
    setText(text: string) {
      remove('text');

      if (text) {
        add({ text, source: 'text', name: 'Text' }, true);
      }
    },
    whenSettled(id: string): Promise<TexionDocument | undefined> {
      return jobs.get(id)?.promise ?? Promise.resolve(documents.get(id));
    },
    async waitForIdle(): Promise<void> {
      while (jobs.size) {
        await Promise.all([...jobs.values()].map((job) => job.promise));
      }
    },
  };
}

export type DocumentController = ReturnType<typeof createController>;
