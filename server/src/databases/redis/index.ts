import { IDatabaseAdapter } from "../types";
import { verifyConnection } from "./connection";
import { runCopyMigration } from "./migration";
import { runDownload } from "./download";
import { Writable } from "stream";
import archiver from "archiver";

export class RedisAdapter implements IDatabaseAdapter {
  async verifyConnection(uri: string): Promise<boolean> {
    return verifyConnection(uri);
  }

  async runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string,
  ): Promise<void> {
    return runCopyMigration(jobId, sourceUri, targetUri);
  }

  async runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable,
  ): Promise<void> {
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const streamFinished = new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      stream.destroy(err);
    });

    archive.pipe(stream);

    try {
      await runDownload(jobId, sourceUri, archive);
      await streamFinished;
    } catch (error) {
      if (!archive.destroyed) {
        archive.destroy(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
      throw error;
    }
  }
}

export const redisAdapter = new RedisAdapter();
