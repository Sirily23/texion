import type { TextareaHTMLAttributes } from 'react';
import { useAttachmentController } from '../controllers/attachments';
import type { AttachmentOptions } from '../controllers/attachments';

export type UseTexionAttachmentsOptions = AttachmentOptions;

/** File behavior independent of draft editing, rendering and submission. */
export function useTexionAttachments(
  options: UseTexionAttachmentsOptions = {},
) {
  const attachments = useAttachmentController(options);
  function getTextareaProps(
    props: TextareaHTMLAttributes<HTMLTextAreaElement> = {},
  ) {
    return {
      ...props,
      onPaste(event: Parameters<NonNullable<typeof props.onPaste>>[0]) {
        props.onPaste?.(event);
        attachments.handlePaste(event);
      },
    };
  }
  return {
    documents: attachments.documents,
    isDragging: attachments.isDragging,
    inputError: attachments.inputError,
    addDocument: attachments.addDocument,
    removeDocument: attachments.controller.remove,
    cancelDocument: attachments.controller.cancel,
    clear: attachments.controller.clear,
    whenSettled: attachments.controller.whenSettled,
    waitForIdle: attachments.controller.waitForIdle,
    openPicker: attachments.openPicker,
    getRootProps: attachments.getRootProps,
    getInputProps: attachments.getInputProps,
    getTextareaProps,
    handlePaste: attachments.handlePaste,
  };
}
