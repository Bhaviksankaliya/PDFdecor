import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config.js";
import { LIMITS } from "@pdfforge/config";

export type FileKind = "upload" | "output";

export type FileRecord = {
  id: string;
  originalName: string;
  mime: string;
  size: number;
  kind: FileKind;
  expiresAt: number;
};

/**
 * Storage abstraction. Dev driver writes bytes to local disk and keeps
 * metadata in memory. In prod this becomes an S3-compatible driver with
 * metadata persisted in Postgres (see Phase 5). The interface stays the same.
 */
export interface Storage {
  put(
    bytes: Uint8Array,
    meta: { originalName: string; mime: string; kind: FileKind },
  ): Promise<FileRecord>;
  get(id: string): Promise<{ record: FileRecord; bytes: Uint8Array } | null>;
  getRecord(id: string): FileRecord | null;
  delete(id: string): Promise<void>;
  sweepExpired(now: number): Promise<number>;
}

function sanitizeName(name: string): string {
  // Strip path components and anything but a safe filename charset.
  const base = name.replace(/^.*[\\/]/, "");
  return base.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200) || "file";
}

class LocalDiskStorage implements Storage {
  private records = new Map<string, FileRecord>();

  constructor(private dir: string) {}

  private path(id: string): string {
    return join(this.dir, id);
  }

  async put(
    bytes: Uint8Array,
    meta: { originalName: string; mime: string; kind: FileKind },
  ): Promise<FileRecord> {
    await mkdir(this.dir, { recursive: true });
    const id = randomUUID();
    await writeFile(this.path(id), bytes);
    const record: FileRecord = {
      id,
      originalName: sanitizeName(meta.originalName),
      mime: meta.mime,
      size: bytes.byteLength,
      kind: meta.kind,
      expiresAt: Date.now() + LIMITS.fileTtlMs,
    };
    this.records.set(id, record);
    return record;
  }

  async get(id: string) {
    const record = this.records.get(id);
    if (!record) return null;
    try {
      const bytes = new Uint8Array(await readFile(this.path(id)));
      return { record, bytes };
    } catch {
      return null;
    }
  }

  getRecord(id: string): FileRecord | null {
    return this.records.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
    try {
      await unlink(this.path(id));
    } catch {
      /* already gone */
    }
  }

  async sweepExpired(now: number): Promise<number> {
    let removed = 0;
    // Drop expired in-memory records first (keeps metadata tidy).
    for (const [id, rec] of this.records) {
      if (rec.expiresAt <= now) {
        await this.delete(id);
        removed++;
      }
    }
    // Authoritative pass: scan the disk by file age, so files survive server
    // restarts (which wipe the in-memory record map) still get cleaned up.
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return removed; // storage dir doesn't exist yet
    }
    for (const name of names) {
      const path = join(this.dir, name);
      try {
        const s = await stat(path);
        if (!s.isFile()) continue;
        if (now - s.mtimeMs >= LIMITS.fileTtlMs) {
          await unlink(path);
          this.records.delete(name);
          removed++;
        }
      } catch {
        /* raced with another delete — ignore */
      }
    }
    return removed;
  }
}

export const storage: Storage = new LocalDiskStorage(config.storageDir);
