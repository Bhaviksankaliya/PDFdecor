import type { ReactNode } from "react";

/** Consistent hero + container for the static marketing/legal pages. */
export function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
  wide = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto px-4 py-14 sm:px-6 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
      <header className="mb-10">
        {eyebrow && (
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-500">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-lg text-ink-500">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

/** Simple prose block for legal/long-form pages. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 text-ink-600 [&_a]:font-medium [&_a]:text-brand-600 [&_a:hover]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink-900 [&_li]:ml-1 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      {children}
    </div>
  );
}
