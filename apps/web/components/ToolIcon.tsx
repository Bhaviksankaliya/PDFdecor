import { icons, type LucideProps } from "lucide-react";

/** Render a lucide icon by its registry name, falling back to a file icon. */
export function ToolIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? icons.FileText;
  return <Icon {...props} />;
}
