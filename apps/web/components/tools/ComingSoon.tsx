import Link from "next/link";
import { Construction } from "lucide-react";
import type { Tool } from "@pdfforge/config";

export function ComingSoon({ tool }: { tool: Tool }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Construction className="mx-auto h-12 w-12 text-brand-400" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {tool.title} is on the way
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        This tool is scheduled for build phase {tool.phase}. The page, registry
        entry, and routing are already wired — only the processor remains.
      </p>
      <Link href="/" className="btn-brand mt-6">
        Browse available tools
      </Link>
    </div>
  );
}
