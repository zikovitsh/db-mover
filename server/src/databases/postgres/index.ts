import { IDatabaseAdapter } from "../types";
import { verifyConnection } from "./connection";
import { runCopyMigration } from "./migration";
import { runDownload as runPostgresDownload } from "./download";
import { Writable } from "stream";
import archiver from "archiver";

export class PostgresAdapter implements IDatabaseAdapter {
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

    // Create a promise that resolves when the stream finishes
    const streamFinished = new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      stream.destroy(err);
    });

    archive.pipe(stream);

    try {
      await runPostgresDownload(sourceUri, archive);
      // Wait for the stream to finish writing
      await streamFinished;
    } catch (error) {
      // If download fails, destroy archive which will trigger error handler
      archive.destroy(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
}

export const postgresAdapter = new PostgresAdapter();
