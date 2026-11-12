import { highlight } from 'fumadocs-core/highlight';
import { installCommands } from '@/lib/install-commands';
import { InstallCommand } from './install-command';

const themes = {
  light: 'github-light',
  dark: 'github-dark-high-contrast',
} as const;

export async function InstallSnippet() {
  const highlightedCommands = Object.fromEntries(
    await Promise.all(
      Object.entries(installCommands).map(async ([manager, command]) => [
        manager,
        await highlight(command, { lang: 'bash', themes, defaultColor: false }),
      ]),
    ),
  );
  return <InstallCommand highlightedCommands={highlightedCommands} />;
}

export async function ComposerSnippet() {
  const code = `import { TexionInput } from '@texion/react';
import '@texion/react/styles.css';

<TexionInput
  preview
  onSubmit={({ content, attachments }) => {
    save(content, attachments);
  }}
/>`;

  return (
    <div className="home-code">
      <div>
        <span>composer.tsx</span>
        <span>React · TSX</span>
      </div>
      {await highlight(code, { lang: 'tsx', themes, defaultColor: false })}
    </div>
  );
}
