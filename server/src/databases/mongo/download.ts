import { MongoClient } from "mongodb";
import { Readable } from "stream";
import archiver from "archiver";

export const runDownload = async (sourceUri: string, archive: archiver.Archiver) => {
  let client: MongoClient | null = null;

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
  } catch (e) {
    console.error("Download error:", e);
    // Don't destroy archive here - let the adapter handle it
    // Just ensure client is closed
    throw e;
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        // Ignore close errors
        console.warn('Error closing client:', closeError);
      }
    }
  }
};
