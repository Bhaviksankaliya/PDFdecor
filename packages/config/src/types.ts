export type ToolCategory =
  | "organize"
  | "optimize"
  | "convert"
  | "edit"
  | "security"
  | "ai";

export type ProcessingMode = "sync" | "async";

export type Tool = {
  /** URL slug, e.g. "merge-pdf" */
  slug: string;
  /** Display title, e.g. "Merge PDF" */
  title: string;
  category: ToolCategory;
  /** One-line description shown on the card and tool hero. */
  description: string;
  /** lucide-react icon name, e.g. "Combine" */
  icon: string;
  /** Accepted MIME types for the dropzone. */
  accepts: string[];
  /** Whether the tool accepts multiple files. */
  multiple: boolean;
  /** sync = processed in the request; async = queued as a background job. */
  processing: ProcessingMode;
  /** Max files this tool accepts (defaults to 1, or many when multiple). */
  maxFiles?: number;
  /** Build phase this tool ships in (for tracking). */
  phase: 0 | 1 | 2 | 3 | 4 | 5;
  /** True when the processor is implemented and wired end-to-end. */
  implemented: boolean;
};

export type CategoryMeta = {
  id: ToolCategory;
  label: string;
  description: string;
};

export const CATEGORIES: CategoryMeta[] = [
  { id: "organize", label: "Organize PDF", description: "Merge, split, and rearrange pages." },
  { id: "optimize", label: "Optimize PDF", description: "Compress, repair, and OCR." },
  { id: "convert", label: "Convert PDF", description: "To and from PDF." },
  { id: "edit", label: "Edit PDF", description: "Rotate, number, watermark, and annotate." },
  { id: "security", label: "PDF Security", description: "Protect, unlock, sign, and redact." },
  { id: "ai", label: "AI Tools", description: "Summarize and translate with AI." },
];
