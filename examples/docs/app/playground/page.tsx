import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { Playground } from '@/components/playground';

export const metadata = {
  title: 'Playground',
  description: 'Try Texion inputs, attachments and previews in your browser.',
};
export default function Page() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="home-page lab-page">
        <p className="home-eyebrow">Texion playground</p>
        <h1>Make it yours.</h1>
        <p className="page-intro">
          Write, attach, save. See exactly what your app receives.
        </p>
        <Playground />
      </main>
    </HomeLayout>
  );
}
