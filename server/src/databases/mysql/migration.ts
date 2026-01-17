import mysql from "mysql2/promise";
import { addLog, updateJob } from "../../lib/jobManager";

const getDbName = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, "").split("?")[0];
  } catch (e) {
    const match = uri.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
    return match ? match[1] : "";
  }
};

const buildUriWithoutDb = (uri: string): string => {
  try {
    const url = new URL(uri);
    url.pathname = "/";
    return url.toString();
  } catch (e) {
    // Fallback: remove database name from URI
    return uri.replace(/\/[^\/\?]+(\?|$)/, "/$1");
  }
};

const createDatabaseIfNotExists = async (
  adminConnection: mysql.Connection,
  dbName: string,
  jobId: string,
): Promise<void> => {
  try {
    // Check if database exists
    const [databases] = await adminConnection.query<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName],
    );

    if (databases.length === 0) {
      addLog(jobId, `Creating target database: ${dbName}`);
      // Create database (cannot use parameterized query for database name)
      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      addLog(jobId, `Database created successfully: ${dbName}`);
    } else {
      addLog(jobId, `Target database already exists: ${dbName}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If database already exists, that's fine
    if (
      errorMessage.includes("already exists") ||
      errorMessage.includes("Duplicate")
    ) {
      addLog(jobId, `Database already exists: ${dbName}`);
    } else if (errorMessage.includes("Access denied")) {
      addLog(
        jobId,
        `Error: Access denied. Your MySQL user needs CREATE DATABASE privileges. Details: ${errorMessage}`,
      );
      throw error;
    } else {
      throw error;
    }
  }
};

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string,
) => {
  let sourceConnection: mysql.Connection | null = null;
  let targetConnection: mysql.Connection | null = null;

  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Starting MySQL migration...");

    // Connect to source
    addLog(jobId, "Connecting to source database...");
    sourceConnection = await mysql.createConnection(sourceUri);
    addLog(jobId, "Connected to source.");

    const sourceDbName = getDbName(sourceUri);
    const targetDbName = getDbName(targetUri);

    // Create target database if it doesn't exist
    if (targetDbName) {
      addLog(jobId, `Checking if target database exists: ${targetDbName}`);
      const adminUri = buildUriWithoutDb(targetUri);
      const adminConnection = await mysql.createConnection(adminUri);

      try {
        await createDatabaseIfNotExists(adminConnection, targetDbName, jobId);
      } catch (dbCreateError) {
        // Log the error but don't fail - the database might already exist
        // or the user might not have CREATE permission but already created it
        const errorMsg =
          dbCreateError instanceof Error
            ? dbCreateError.message
            : String(dbCreateError);
        addLog(
          jobId,
          `Warning: Could not create database automatically: ${errorMsg}`,
        );
        addLog(
          jobId,
          `Continuing - ensure the target database exists and is accessible`,
        );
      } finally {
        await adminConnection.end();
      }
    }

    // Connect to target
    addLog(jobId, "Connecting to target database...");
    targetConnection = await mysql.createConnection(targetUri);
    addLog(jobId, "Connected to target.");

    // Use the database
    if (sourceDbName) {
      await sourceConnection.query(`USE ${mysql.escapeId(sourceDbName)}`);
    }
    if (targetDbName) {
      await targetConnection.query(`USE ${mysql.escapeId(targetDbName)}`);
    }

    // Get list of tables
    const [tables] =
      await sourceConnection.query<mysql.RowDataPacket[]>("SHOW TABLES");

    const tableKey = `Tables_in_${sourceDbName || "database"}`;
    const tablesList = tables.map((row) => row[tableKey] as string);

    if (tablesList.length === 0) {
      addLog(jobId, "No tables found in source database.");
      updateJob(jobId, { status: "completed", progress: 100 });
      return;
    }

    addLog(
      jobId,
      `Found ${tablesList.length} tables to migrate: ${tablesList.join(", ")}`,
    );

    let totalRowsCopied = 0;
    const totalTables = tablesList.length;
    let tablesProcessed = 0;

    // Migrate each table
    for (const tableName of tablesList) {
      addLog(jobId, `Processing table: ${tableName}`);

      try {
        // Get CREATE TABLE statement
        const [createTableRows] = await sourceConnection.query<
          mysql.RowDataPacket[]
        >(`SHOW CREATE TABLE ${mysql.escapeId(tableName)}`);

        const createTableSQL = createTableRows[0]["Create Table"] as string;

        // Drop table if exists on target
        await targetConnection.query(
          `DROP TABLE IF EXISTS ${mysql.escapeId(tableName)}`,
        );

        // Create table on target
        await targetConnection.query(createTableSQL);
        addLog(jobId, `Created table structure: ${tableName}`);

        // Get column information for data copying
        const [columns] = await sourceConnection.query<mysql.RowDataPacket[]>(
          `DESCRIBE ${mysql.escapeId(tableName)}`,
        );
        const columnNames = columns.map((col) => col.Field as string);

        // Copy data in batches
        const BATCH_SIZE = 1000;
        let offset = 0;
        let batchRows = 0;

        while (true) {
          const [rows] = await sourceConnection.query<mysql.RowDataPacket[]>(
            `SELECT * FROM ${mysql.escapeId(tableName)} LIMIT ? OFFSET ?`,
            [BATCH_SIZE, offset],
          );

          if (rows.length === 0) break;

          // Build INSERT statement
          const escapedTableName = mysql.escapeId(tableName);
          const escapedColumns = columnNames
            .map((col) => mysql.escapeId(col))
            .join(", ");
          const placeholders =
            "(" + columnNames.map(() => "?").join(", ") + ")";
          const valuesPlaceholders = rows.map(() => placeholders).join(", ");

          const insertSQL = `INSERT INTO ${escapedTableName} (${escapedColumns}) VALUES ${valuesPlaceholders}`;

          // Flatten values array
          const values = rows.flatMap((row) =>
            columnNames.map((col) => row[col]),
          );

          await targetConnection.query(insertSQL, values);

          batchRows += rows.length;
          totalRowsCopied += rows.length;
          offset += BATCH_SIZE;

          updateJob(jobId, {
            stats: {
              tables: tablesProcessed,
              documents: totalRowsCopied,
            },
          });

          if (rows.length < BATCH_SIZE) break;
        }

        addLog(jobId, `Copied ${batchRows} rows from table: ${tableName}`);

        tablesProcessed++;
        const progress = (tablesProcessed / totalTables) * 100;
        updateJob(jobId, {
          progress,
          stats: {
            tables: tablesProcessed,
            documents: totalRowsCopied,
          },
        });

        addLog(jobId, `Finished table: ${tableName}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(jobId, `Error processing table ${tableName}: ${errorMessage}`);
        // Continue with next table
      }
    }

    addLog(jobId, "Migration completed successfully!");
    updateJob(jobId, { status: "completed", progress: 100 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Migration failed:", error);
    addLog(jobId, `Error: ${errorMessage}`);
    updateJob(jobId, { status: "failed", error: errorMessage });
  } finally {
    if (sourceConnection) await sourceConnection.end();
    if (targetConnection) await targetConnection.end();
  }
};
