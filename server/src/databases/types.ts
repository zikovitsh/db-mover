import { Writable } from "stream";

export type DatabaseType = "mongodb" | "postgres" | "mysql";

export interface IDatabaseAdapter {
  verifyConnection(uri: string): Promise<boolean>;
  runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string
  ): Promise<void>;
  runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable
  ): Promise<void>;
}
