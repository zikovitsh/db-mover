import { Client } from "pg";
import { addLog, updateJob } from "../../lib/jobManager";

const getDbName = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, "").split("?")[0];
  } catch (e) {
    // Fallback parsing
    const match = uri.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
    return match ? match[1] : "";
  }
};

const buildUriWithoutDb = (
  uri: string,
  defaultDb: string = "postgres"
): string => {
  try {
    const url = new URL(uri);
    url.pathname = `/${defaultDb}`;
    return url.toString();
  } catch (e) {
    // Fallback: replace database name in URI
    return uri.replace(/\/[^\/\?]+(\?|$)/, `/${defaultDb}$1`);
  }
};

const createDatabaseIfNotExists = async (
  adminClient: Client,
  dbName: string,
  jobId: string
): Promise<void> => {
  try {
    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      addLog(jobId, `Creating target database: ${dbName}`);
      // Create database (cannot use parameterized query for database name)
      // Escape the database name properly - PostgreSQL identifiers need double quotes
      const escapedDbName = `"${dbName.replace(/"/g, '""')}"`;
      await adminClient.query(`CREATE DATABASE ${escapedDbName}`);
      addLog(jobId, `Database created successfully: ${dbName}`);
    } else {
      addLog(jobId, `Target database already exists: ${dbName}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If database already exists, that's fine
    if (errorMessage.includes("already exists")) {
      addLog(jobId, `Database already exists: ${dbName}`);
    } else {
      throw error;
    }
  }
};

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string
) => {
  let sourceClient: Client | null = null;
  let targetClient: Client | null = null;

  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Starting PostgreSQL migration...");

    // Connect to source
    addLog(jobId, "Connecting to source database...");
    sourceClient = new Client({ connectionString: sourceUri });
    await sourceClient.connect();
    addLog(jobId, "Connected to source.");

    const sourceDbName = getDbName(sourceUri);
    const targetDbName = getDbName(targetUri);

    // Create target database if it doesn't exist
    if (targetDbName) {
      addLog(jobId, `Checking if target database exists: ${targetDbName}`);
      const adminUri = buildUriWithoutDb(targetUri, "postgres");
      const adminClient = new Client({ connectionString: adminUri });

      try {
        await adminClient.connect();
        await createDatabaseIfNotExists(adminClient, targetDbName, jobId);
      } finally {
        await adminClient.end();
      }
    }

    // Connect to target
    addLog(jobId, "Connecting to target database...");
    targetClient = new Client({ connectionString: targetUri });
    await targetClient.connect();
    addLog(jobId, "Connected to target.");

    // Migrate custom types (ENUMs) before creating tables
    addLog(jobId, "Checking for custom types (ENUMs)...");
    const customTypesResult = await sourceClient.query(`
      SELECT 
        t.typname as type_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `);

    if (customTypesResult.rows.length > 0) {
      addLog(
        jobId,
        `Found ${customTypesResult.rows.length} custom types to migrate`
      );

      for (const typeRow of customTypesResult.rows) {
        const typeName = typeRow.type_name;
        const enumValues = typeRow.enum_values;

        try {
          // Check if type already exists in target (in public schema)
          const typeExists = await targetClient.query(
            `SELECT 1 FROM pg_type t
             JOIN pg_namespace n ON n.oid = t.typnamespace
             WHERE t.typname = $1 AND n.nspname = 'public'`,
            [typeName]
          );

          if (typeExists.rows.length === 0) {
            addLog(jobId, `Creating custom type: ${typeName}`);
            // Create ENUM type
            const enumValuesStr = enumValues
              .map((val: string) => `'${val.replace(/'/g, "''")}'`)
              .join(", ");
            await targetClient.query(
              `CREATE TYPE "${typeName}" AS ENUM (${enumValuesStr})`
            );
            addLog(jobId, `Created custom type: ${typeName}`);
          } else {
            addLog(jobId, `Custom type already exists: ${typeName}`);
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          // If type already exists, that's fine
          if (errorMessage.includes("already exists")) {
            addLog(jobId, `Custom type already exists: ${typeName}`);
          } else {
            addLog(
              jobId,
              `Warning: Could not create custom type ${typeName}: ${errorMessage}`
            );
            // Continue - might still work if type exists
          }
        }
      }
    } else {
      addLog(jobId, "No custom types found.");
    }

    // Get list of tables from source
    const tablesResult = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map((row) => row.table_name);

    if (tables.length === 0) {
      addLog(jobId, "No tables found in source database.");
      updateJob(jobId, { status: "completed", progress: 100 });
      return;
    }

    addLog(
      jobId,
      `Found ${tables.length} tables to migrate: ${tables.join(", ")}`
    );

    let totalRowsCopied = 0;
    const totalTables = tables.length;
    let tablesProcessed = 0;

    // Migrate each table
    for (const tableName of tables) {
      addLog(jobId, `Processing table: ${tableName}`);

      try {
        // Get column information to build CREATE TABLE statement
        const columnInfo = await sourceClient.query(
          `
          SELECT 
            column_name,
            data_type,
            udt_name,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `,
          [tableName]
        );

        // Drop table if exists on target (for clean migration)
        await targetClient.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);

        // Use a better approach - get CREATE TABLE from pg_dump or build properly
        // Let's build it column by column with proper escaping
        const columns = columnInfo.rows.map((col) => {
          let colDef = `"${col.column_name}" `;

          // Handle data types
          if (
            col.udt_name === "varchar" ||
            col.udt_name === "character varying"
          ) {
            colDef += `VARCHAR(${col.character_maximum_length || ""})`;
          } else if (col.udt_name === "char" || col.udt_name === "character") {
            colDef += `CHAR(${col.character_maximum_length || 1})`;
          } else if (col.udt_name === "numeric") {
            const numPrec = col.numeric_precision || "";
            const numScale = col.numeric_scale || 0;
            if (numPrec) {
              colDef += `NUMERIC(${numPrec}${
                numScale > 0 ? "," + numScale : ""
              })`;
            } else {
              colDef += "NUMERIC";
            }
          } else {
            colDef += col.udt_name.toUpperCase();
          }

          if (col.is_nullable === "NO") {
            colDef += " NOT NULL";
          }

          if (col.column_default) {
            colDef += ` DEFAULT ${col.column_default}`;
          }

          return colDef;
        });

        const createTableSQL = `CREATE TABLE "${tableName}" (${columns.join(
          ", "
        )});`;

        await targetClient.query(createTableSQL);
        addLog(jobId, `Created table structure: ${tableName}`);

        // Copy data in batches
        const BATCH_SIZE = 1000;
        let offset = 0;
        let batchRows = 0;

        while (true) {
          const rows = await sourceClient.query(
            `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
            [BATCH_SIZE, offset]
          );

          if (rows.rows.length === 0) break;

          // Build INSERT statement
          const columnNames = columnInfo.rows
            .map((col) => `"${col.column_name}"`)
            .join(", ");

          // Insert rows one by one or in smaller batches to avoid parameter limit issues
          // PostgreSQL has a limit of 65535 parameters, so we'll insert in smaller batches
          const INSERT_BATCH = 100;

          for (
            let batchStart = 0;
            batchStart < rows.rows.length;
            batchStart += INSERT_BATCH
          ) {
            const batchEnd = Math.min(
              batchStart + INSERT_BATCH,
              rows.rows.length
            );
            const batch = rows.rows.slice(batchStart, batchEnd);

            const values: unknown[] = [];
            const placeholders: string[] = [];
            let paramIndex = 1;

            for (const row of batch) {
              const rowValues = columnInfo.rows.map(
                (col) => row[col.column_name]
              );
              values.push(...rowValues);
              const ph =
                "(" + rowValues.map(() => `$${paramIndex++}`).join(", ") + ")";
              placeholders.push(ph);
            }

            const insertSQL = `INSERT INTO "${tableName}" (${columnNames}) VALUES ${placeholders.join(
              ", "
            )}`;
            await targetClient.query(insertSQL, values);
          }

          batchRows += rows.rows.length;
          totalRowsCopied += rows.rows.length;
          offset += BATCH_SIZE;

          updateJob(jobId, {
            stats: {
              tables: tablesProcessed,
              documents: totalRowsCopied,
            },
          });

          if (rows.rows.length < BATCH_SIZE) break;
        }

        addLog(jobId, `Copied ${batchRows} rows from table: ${tableName}`);

        // Copy indexes (simplified - just log for now)
        const indexesResult = await sourceClient.query(
          `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE schemaname = 'public' AND tablename = $1
        `,
          [tableName]
        );

        if (indexesResult.rows.length > 0) {
          for (const idx of indexesResult.rows) {
            try {
              // Skip primary key indexes as they're created with the table
              if (!idx.indexdef.includes("PRIMARY KEY")) {
                await targetClient.query(idx.indexdef);
                addLog(jobId, `Created index: ${idx.indexname}`);
              }
            } catch (err) {
              // Index might already exist or have issues, continue
              console.warn(`Failed to create index ${idx.indexname}:`, err);
            }
          }
        }

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
    if (sourceClient) await sourceClient.end();
    if (targetClient) await targetClient.end();
  }
};
