import { AttachmentList, useTexion } from '@texion/react';
import type { Submission } from '@texion/react';

export function CustomForm({
  onSubmit,
}: {
  onSubmit: (submission: Submission) => void;
}) {
  const texion = useTexion({ onSubmit, submitOnEnter: false });

  return (
    <div {...texion.getRootProps()}>
      <label htmlFor="custom-message">Message</label>
      <textarea {...texion.getTextareaProps({ id: 'custom-message' })} />
      <input {...texion.getInputProps({ 'aria-label': 'Markdown files' })} />
      <AttachmentList
        documents={texion.documents}
        onRemove={texion.removeDocument}
      />
      <button
        type="button"
        onClick={() => {
          void texion.submit();
        }}
      >
        Submit
      </button>
    </div>
  );
}
