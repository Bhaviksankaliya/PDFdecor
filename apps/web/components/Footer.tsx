import Link from "next/link";
import { ToolIcon } from "./ToolIcon";

const COLUMNS = [
  {
    title: "Product",
    links: [
      ["All tools", "/"],
      ["Features", "/features"],
      ["Workflows", "/workflows"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["FAQ", "/faq"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Security", "/security"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-grad text-white shadow-brand">
              <ToolIcon name="FileStack" className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold text-ink-900">
              PDF<span className="text-brand-500">decor</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            Every PDF tool you need, in one clean workspace. Files auto-delete
            after 2 hours.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {col.title}
            </p>
            <ul className="mt-3 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-ink-600 hover:text-brand-600">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-100 py-6 text-center text-xs text-ink-400">
        © 2026 PDFdecor. All rights reserved.
      </div>
    </footer>
  );
}
