import type { LegalDoc } from '@/content/legal';

/** A long legal text, readable: one column, headings for each section. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto grid max-w-2xl gap-8 px-5 py-12">
      <header className="grid gap-2">
        <h1 className="text-display">{doc.title}</h1>
        <p className="text-text-secondary">{doc.updated}</p>
      </header>
      {doc.sections.map((section) => (
        <section key={section.heading} className="grid gap-3">
          <h2 className="text-heading-md">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
