import Redis from "ioredis";
import { addLog, updateJob } from "../../lib/jobManager";

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string,
) => {
  const source = new Redis(sourceUri);
  const target = new Redis(targetUri);

  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Connected to source and target Redis instances");

    let cursor = "0";
    let totalKeys = 0;

    // First count to estimate progress (optional, but good for UX)
    // Note: dbsize is fast but might not be 100% accurate if keys are expiring, but good enough
    const dbsize = await source.dbsize();
    addLog(jobId, `Estimated total keys: ${dbsize}`);

    let processedKeys = 0;

    do {
      const result = await source.scan(cursor, "MATCH", "*", "COUNT", 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        const pipeline = source.pipeline();
        keys.forEach((key) => {
          addLog(jobId, `Copying key: ${key}`);
          pipeline.dumpBuffer(key);
          pipeline.pttl(key);
        });

        const dumpResults = await pipeline.exec();

        if (dumpResults) {
          const targetPipeline = target.pipeline();

          for (let i = 0; i < dumpResults.length; i += 2) {
            const [dumpErr, dumpVal] = dumpResults[i];
            const [pttlErr, pttlVal] = dumpResults[i + 1];
            const key = keys[i / 2];

            if (dumpErr || pttlErr) {
              addLog(
                jobId,
                `Error getting data for key ${key}: ${dumpErr || pttlErr}`,
              );
              continue;
            }

            if (dumpVal === null) {
              // Key might have expired or been deleted
              continue;
            }

            // TTL: If -1, no expiry (use 0 for restore command).
            // Restore command expects ttl in ms. 0 means no ttl.
            const ttl =
              typeof pttlVal === "number" && pttlVal > 0 ? pttlVal : 0;

            // RESTORE key ttl serialized-value [REPLACE]
            // We use REPLACE to overwrite if exists
            targetPipeline.restore(key, ttl, dumpVal as Buffer, "REPLACE");
          }

          const targetResults = await targetPipeline.exec();
          if (targetResults) {
            targetResults.forEach(([err], idx) => {
              if (err) {
                addLog(jobId, `Error restoring key: ${err.message}`);
              }
            });
          }

          processedKeys += keys.length;

          // Update progress and stats
          const progress = Math.min(
            Math.round((processedKeys / dbsize) * 100),
            99,
          );
          updateJob(jobId, {
            progress,
            stats: {
              documents: processedKeys,
              keys: processedKeys,
              totalDocuments: dbsize,
            },
          });
        }
      }
    } while (cursor !== "0");

    addLog(jobId, `Migration completed. Processed ${processedKeys} keys.`);
    updateJob(jobId, { status: "completed", progress: 100 });
  } catch (error) {
    console.error("Redis migration failed:", error);
    addLog(jobId, `Migration failed: ${error}`);
    updateJob(jobId, { status: "failed" });
    throw error;
  } finally {
    source.disconnect();
    target.disconnect();
  }
};
