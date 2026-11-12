import { useState } from 'react';
import { AttachmentList, useTexion } from '@texion/react';
import type { Submission } from '@texion/react';

export function CustomForm({
  onSubmit,
}: {
  onSubmit: (submission: Submission) => void;
}) {
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const texion = useTexion({ onSubmit, submitOnEnter: false });

  const attachments = (
    <AttachmentList
      documents={texion.documents}
      onRemove={texion.removeDocument}
    />
  );

  return (
    <div {...texion.getRootProps()}>
      <label>
        Preview position
        <select
          value={position}
          onChange={(event) =>
            setPosition(event.currentTarget.value as 'above' | 'below')
          }
        >
          <option value="above">Above input</option>
          <option value="below">Below input</option>
        </select>
      </label>
      {position === 'above' && attachments}
      <label htmlFor="custom-message">Message</label>
      <textarea {...texion.getTextareaProps({ id: 'custom-message' })} />
      {position === 'below' && attachments}
      <input {...texion.getInputProps({ 'aria-label': 'Markdown files' })} />
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
