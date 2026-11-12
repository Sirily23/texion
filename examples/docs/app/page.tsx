import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { baseOptions } from '@/lib/layout.shared';
import { HeroComposer } from '@/components/hero-composer';
import { ComposerSnippet, InstallSnippet } from '@/components/landing-code';
import { FeatureDiagram } from '@/components/feature-diagram';

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="home-page">
        <section className="home-hero" aria-labelledby="home-title">
          <h1 id="home-title">
            Write, attach, and paste.
            <br />
            <span>Give your AI the context.</span>
          </h1>
          <p className="home-intro">
            One input for text and files. Turn PDFs, Word documents, CSV, and
            Markdown into text your model can use, with previews before sending.
          </p>
          <HeroComposer />
          <div className="home-actions">
            <Link className="home-primary" href="#home-message">
              Try it with your own file <ArrowRight size={16} />
            </Link>
            <Link
              className="home-text-link"
              href="/docs/guides/getting-started"
            >
              Get started <ArrowUpRight size={15} />
            </Link>
          </div>
          <p className="home-formats">
            Markdown · TXT · JSON · CSV · PDF · DOCX · Images
          </p>
        </section>
        <section className="home-why" aria-labelledby="home-why-title">
          <div className="home-section-heading">
            <p className="home-eyebrow">Built to work together.</p>
            <h2 id="home-why-title">File inputs, without the loose ends.</h2>
          </div>
          <div className="home-principles">
            <article>
              <FeatureDiagram kind="cancel" />
              <h3>No more half-working uploads.</h3>
              <p>
                Users remove a file mid-processing and it cancels. Late results
                stay out of the draft.
              </p>
              <Link href="/docs/guides/formats">
                Explore file handling <ArrowUpRight size={14} />
              </Link>
            </article>
            <article>
              <FeatureDiagram kind="local" />
              <h3>No upload server needed to read a file.</h3>
              <p>
                Extraction runs in the browser. Your app chooses what gets sent
                to your backend.
              </p>
              <Link href="/docs/api-reference">
                See how it works <ArrowUpRight size={14} />
              </Link>
            </article>
            <article>
              <FeatureDiagram kind="formats" />
              <h3>No six parsers to wire up.</h3>
              <p>
                Every supported file becomes one predictable document object.
                Build one attachment list for every format.
              </p>
              <Link href="/docs/guides/formats">
                See supported formats <ArrowUpRight size={14} />
              </Link>
            </article>
            <article>
              <FeatureDiagram kind="preview" />
              <h3>No scary previews.</h3>
              <p>
                Raw HTML and dangerous links are blocked by default. Preview
                extracted content before sending.
              </p>
              <Link href="/docs/guides/security">
                Read the safeguards <ArrowUpRight size={14} />
              </Link>
            </article>
            <article>
              <FeatureDiagram kind="submit" />
              <h3>No accidental sends.</h3>
              <p>
                Submit waits for files still processing and refuses stale or
                unready input.
              </p>
              <Link href="/docs/api-reference">
                See the submission API <ArrowUpRight size={14} />
              </Link>
            </article>
          </div>
        </section>
        <section className="home-build" aria-labelledby="home-build-title">
          <div className="home-section-heading">
            <p className="home-eyebrow">Start building.</p>
            <h2 id="home-build-title">Install. Connect. Make it yours.</h2>
            <p>Source and attachments. One submission.</p>
          </div>
          <InstallSnippet />
          <ComposerSnippet />
          <Link className="home-text-link" href="/docs/guides/getting-started">
            See the setup <ArrowRight size={15} />
          </Link>
        </section>
        <footer className="home-footer">
          <span>texion</span>
          <div>
            <Link href="/docs">Documentation</Link>
            <a
              href="https://github.com/Sirily23/texion"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={13} />
            </a>
          </div>
        </footer>
      </main>
    </HomeLayout>
  );
}
