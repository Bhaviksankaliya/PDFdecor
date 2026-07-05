import JSZip from "jszip";

export type ZipEntry = { name: string; bytes: Uint8Array };

/** Bundle multiple output files into a single .zip archive. */
export async function zipFiles(entries: ZipEntry[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const e of entries) zip.file(e.name, e.bytes);
  const buf = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return buf;
}
