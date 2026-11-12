import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Brand } from '@/components/brand';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <Brand /> },
    themeSwitch: { enabled: true },
    githubUrl: 'https://github.com/Sirily23/texion',
    links: [
      { text: 'Documentation', url: '/docs' },
      { text: 'Playground', url: '/playground' },
    ],
  };
}
