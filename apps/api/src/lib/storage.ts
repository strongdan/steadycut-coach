import { Storage } from "@google-cloud/storage";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "../config/env.js";

const gcs = new Storage();

export type StoredFile = {
  storageKey: string;
  publicUrl: string;
};

export interface StorageProvider {
  save(params: {
    filename: string;
    contentType: string;
    buffer: Buffer;
    folder?: string;
  }): Promise<StoredFile>;
  getSignedReadUrl?(storageKey: string): Promise<string>;
}

class LocalStorageProvider implements StorageProvider {
  async save(params: {
    filename: string;
    contentType: string;
    buffer: Buffer;
    folder?: string;
  }): Promise<StoredFile> {
    const folder = params.folder ?? "progress-photos";
    const targetDir = path.resolve(process.cwd(), env.UPLOADS_DIR, folder);
    await mkdir(targetDir, { recursive: true });

    const safeName = `${Date.now()}-${params.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const absolutePath = path.join(targetDir, safeName);
    await writeFile(absolutePath, params.buffer);

    const relativeStorageKey = path.relative(path.resolve(process.cwd(), env.UPLOADS_DIR), absolutePath);

    return {
      storageKey: relativeStorageKey,
      publicUrl: `/uploads/${relativeStorageKey.replaceAll(path.sep, "/")}`,
    };
  }
}

class GcsStorageProvider implements StorageProvider {
  async save(params: {
    filename: string;
    contentType: string;
    buffer: Buffer;
    folder?: string;
  }): Promise<StoredFile> {
    if (!env.GCS_BUCKET_NAME) {
      throw new Error("GCS_BUCKET_NAME must be configured when STORAGE_DRIVER=gcs.");
    }

    const folder = params.folder ?? "progress-photos";
    const storageKey = `${folder}/${Date.now()}-${params.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const bucket = gcs.bucket(env.GCS_BUCKET_NAME);
    const file = bucket.file(storageKey);

    await file.save(params.buffer, {
      contentType: params.contentType,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    return {
      storageKey,
      publicUrl: `https://storage.googleapis.com/${env.GCS_BUCKET_NAME}/${storageKey}`,
    };
  }

  async getSignedReadUrl(storageKey: string) {
    if (!env.GCS_BUCKET_NAME) {
      throw new Error("GCS_BUCKET_NAME must be configured when STORAGE_DRIVER=gcs.");
    }

    const bucket = gcs.bucket(env.GCS_BUCKET_NAME);
    const file = bucket.file(storageKey);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return url;
  }
}

export const storageProvider: StorageProvider =
  env.STORAGE_DRIVER === "gcs" ? new GcsStorageProvider() : new LocalStorageProvider();
