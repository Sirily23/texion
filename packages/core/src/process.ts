import type { DocumentInput, TexionDocument } from './document/types';
import { createController } from './lifecycle/controller';
import type { ControllerOptions } from './lifecycle/controller';
import { abortError } from './lifecycle/cancellation';

export async function processDocument(
  input: DocumentInput,
  options: ControllerOptions & { readonly signal?: AbortSignal } = {},
): Promise<TexionDocument> {
  const { signal, ...controllerOptions } = options;

  if (signal?.aborted) {
    throw abortError();
  }
  const controller = createController(controllerOptions);
  const id = controller.add(input);
  const cancel = () => controller.cancel(id);
  signal?.addEventListener('abort', cancel, { once: true });

  try {
    const document = await controller.whenSettled(id);

    if (!document || signal?.aborted) {
      throw abortError();
    }
    return document;
  } finally {
    signal?.removeEventListener('abort', cancel);
    controller.clear();
  }
}
