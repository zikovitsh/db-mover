import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { stream, streamSSE } from "hono/streaming";
import { MongoClient } from "mongodb";
import { verifyConnection } from "./lib/mongo";
import { createJob, getJob, Job } from "./lib/jobManager";
import { runCopyMigration } from "./services/migration";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { Readable } from "stream";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  })
);

// API Routes
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/stats", (c) => {
  return c.json({
    stars: 124,
    forks: 18,
    contributors: 5,
  });
});

app.post("/api/migrate/verify", async (c) => {
  const body = await c.req.json();
  const { uri } = body;

  if (!uri || !uri.startsWith("mongodb")) {
    return c.json({ success: false, message: "Invalid MongoDB URI" }, 400);
  }

  const isValid = await verifyConnection(uri);
  return c.json({
    success: isValid,
    message: isValid ? "Connection successful" : "Connection failed",
  });
});

app.post("/api/migrate/start", async (c) => {
  const body = await c.req.json();
  const { type, sourceUri, targetUri } = body;

  if (type === "copy") {
    if (!sourceUri || !targetUri) return c.json({ error: "Missing URIs" }, 400);

    const job = createJob("copy");
    runCopyMigration(job.id, sourceUri, targetUri);
    return c.json({ jobId: job.id, message: "Migration started" });
  }

  return c.json({ error: "Invalid migration type" }, 400);
});

app.get("/api/migrate/:jobId/status", async (c) => {
  const jobId = c.req.param("jobId");
  const job = getJob(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: JSON.stringify({
        status: job.status,
        progress: job.progress,
        logs: job.logs,
        stats: job.stats,
      }),
    });

    const onUpdate = (updatedJob: Job) => {
      stream.writeSSE({
        data: JSON.stringify({
          status: updatedJob.status,
          progress: updatedJob.progress,
          logs: updatedJob.logs,
          stats: updatedJob.stats,
        }),
      });
    };

    job.emitter.on("update", onUpdate);

    stream.onAbort(() => {
      job.emitter.off("update", onUpdate);
    });

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (job.status === "completed" || job.status === "failed") {
        await stream.writeSSE({
          data: JSON.stringify({
            status: job.status,
            progress: job.progress,
            logs: job.logs,
            stats: job.stats,
          }),
        });
        break;
      }
    }
  });
});

app.post("/api/download", async (c) => {
  const body = await c.req.json();
  const { sourceUri } = body;

  if (!sourceUri) return c.json({ error: "Missing Source URI" }, 400);

  c.header("Content-Type", "application/zip");
  c.header(
    "Content-Disposition",
    `attachment; filename="dump_${Date.now()}.zip"`
  );

  return stream(c, async (stream) => {
    let client: MongoClient | null = null;
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const consumptionTask = (async () => {
      for await (const chunk of archive) {
        await stream.write(chunk);
      }
    })();

    try {
      client = new MongoClient(sourceUri);
      await client.connect();

      const dbNames: string[] = [];

      // Parse the URI carefully
      let uriDbName = "";
      try {
        const url = new URL(sourceUri);
        uriDbName = url.pathname.replace(/^\//, "").split("?")[0];
      } catch (e) {
        // Fallback for non-standard URIs if URL fails
        const parts = sourceUri.split("/");
        if (parts.length > 3) {
          uriDbName = parts[3].split("?")[0];
        }
      }

      if (uriDbName) {
        dbNames.push(uriDbName);
      } else {
        const dbs = await client.db("admin").admin().listDatabases();
        dbNames.push(
          ...dbs.databases
            .map((d) => d.name)
            .filter((name) => !["admin", "local", "config"].includes(name))
        );
      }

      for (const dbName of dbNames) {
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();

        for (const colInfo of collections) {
          const colName = colInfo.name;
          if (colName.startsWith("system.")) continue;

          const col = db.collection(colName);
          const cursor = col.find();

          const collectionStream = Readable.from(
            (async function* () {
              yield "[";
              let isFirst = true;
              for await (const doc of cursor) {
                if (!isFirst) yield ",";
                yield JSON.stringify(doc);
                isFirst = false;
              }
              yield "]";
            })()
          );

          // Use dbName in path to avoid name collisions between different DBs
          archive.append(collectionStream, {
            name: `${dbName}/${colName}.json`,
          });
        }
      }

      await archive.finalize();
      await consumptionTask;
    } catch (e) {
      console.error("Download error:", e);
      archive.destroy(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (client) await client.close();
    }
  });
});

// Serve Static Files (Frontend) in Production
// We expect client dist to be copied to ./public or similar in Docker
// Or we can serve from relative path
app.use(
  "/*",
  serveStatic({
    root: "./public",
    rewriteRequestPath: (path) => (path === "/" ? "/index.html" : path),
  })
);

// Fallback for SPA routing
app.use(
  "*",
  serveStatic({
    path: "./public/index.html",
  })
);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
