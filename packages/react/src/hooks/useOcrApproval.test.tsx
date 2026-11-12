import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useOcrApproval } from './useOcrApproval';

it('keeps concurrent file approvals separate and resolves explicit choices', async () => {
  const { result, unmount } = renderHook(useOcrApproval);
  let first!: Promise<boolean>;
  let second!: Promise<boolean>;
  act(() => {
    first = result.current.requestApproval({
      engineId: 'local',
      uploadsData: false,
      pageNumbers: [1],
      signal: new AbortController().signal,
    });
    second = result.current.requestApproval({
      engineId: 'server',
      uploadsData: true,
      pageNumbers: [2],
      signal: new AbortController().signal,
    });
  });
  expect(result.current.pending).toHaveLength(2);
  act(() => result.current.approve(result.current.pending[0]!.id));
  expect(await first).toBe(true);
  unmount();
  expect(await second).toBe(false);
});
it('removes approval prompts when the document is canceled', async () => {
  const operation = new AbortController();
  const { result, unmount } = renderHook(useOcrApproval);
  let response!: Promise<boolean>;
  act(() => {
    response = result.current.requestApproval({
      engineId: 'server',
      uploadsData: true,
      pageNumbers: [1],
      signal: operation.signal,
    });
  });
  act(() => operation.abort());
  expect(await response).toBe(false);
  await waitFor(() => expect(result.current.pending).toHaveLength(0));
  unmount();
});
