import mysql from "mysql2/promise";
import archiver from "archiver";

const getDbName = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, "").split("?")[0];
  } catch (e) {
    const match = uri.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
    return match ? match[1] : "";
  }
};

export const runDownload = async (
  sourceUri: string,
  archive: archiver.Archiver,
) => {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(sourceUri);

    const sourceDbName = getDbName(sourceUri);
    if (sourceDbName) {
      await connection.query(`USE ${mysql.escapeId(sourceDbName)}`);
    }

    // Get list of tables
    const [tables] =
      await connection.query<mysql.RowDataPacket[]>("SHOW TABLES");

    const tableKey = `Tables_in_${sourceDbName || "database"}`;
    const tablesList = tables.map((row) => row[tableKey] as string);

    if (tablesList.length === 0) {
      // Create empty manifest if no tables
      archive.append(Buffer.from(JSON.stringify({ tables: [] }, null, 2)), {
        name: "_manifest.json",
      });
    }

    for (const tableName of tablesList) {
      try {
        // Get all rows from table
        const [rows] = await connection.query<mysql.RowDataPacket[]>(
          `SELECT * FROM ${mysql.escapeId(tableName)}`,
        );

        // Convert rows to JSON
        const jsonData = JSON.stringify(rows, null, 2);

        // Add to archive
        archive.append(Buffer.from(jsonData), {
          name: `${tableName}.json`,
        });
      } catch (tableError) {
        console.error(`Error exporting table ${tableName}:`, tableError);
        // Continue with next table instead of failing entirely
        const errorMsg =
          tableError instanceof Error ? tableError.message : String(tableError);
        archive.append(
          Buffer.from(
            JSON.stringify({ error: `Failed to export: ${errorMsg}` }, null, 2),
          ),
          {
            name: `${tableName}_ERROR.json`,
          },
        );
      }
    }

    await archive.finalize();
  } catch (e) {
    console.error("Download error:", e);
    // Don't destroy archive here - let the adapter handle it
    // Just ensure connection is closed
    throw e;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        // Ignore close errors
        console.warn("Error closing connection:", closeError);
      }
    }
  }
};
