export type UploadResult = {
  fileId: string;
  originalName: string;
  mime: string;
  size: number;
};

export type ProcessResult = {
  fileId: string;
  filename: string;
  size: number;
  downloadUrl: string;
};

async function asError(res: Response): Promise<never> {
  let message = `Request failed (${res.status}).`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    /* non-JSON body */
  }
  throw new Error(message);
}

/** Upload a single file; returns its server-side fileId. */
export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) await asError(res);
  return res.json();
}

/** Run a sync tool over previously uploaded files. */
export async function processTool(
  slug: string,
  fileIds: string[],
  options: Record<string, unknown> = {},
): Promise<ProcessResult> {
  const res = await fetch(`/api/tools/${slug}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileIds, options }),
  });
  if (!res.ok) await asError(res);
  return res.json();
}
