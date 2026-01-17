import { Client } from 'pg';
import { Readable } from 'stream';
import archiver from 'archiver';

const getDbName = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, '').split('?')[0];
  } catch (e) {
    const match = uri.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
    return match ? match[1] : '';
  }
};

export const runDownload = async (sourceUri: string, archive: archiver.Archiver) => {
  let client: Client | null = null;

  try {
    client = new Client({ connectionString: sourceUri });
    await client.connect();

    // Get list of tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map((row) => row.table_name);

    for (const tableName of tables) {
      // Get all rows from table
      const rowsResult = await client.query(`SELECT * FROM "${tableName}"`);

      // Convert rows to JSON
      const jsonData = JSON.stringify(rowsResult.rows, null, 2);

      // Add to archive
      archive.append(Buffer.from(jsonData), {
        name: `${tableName}.json`,
      });
    }

    await archive.finalize();
  } catch (e) {
    console.error('Download error:', e);
    // Don't destroy archive here - let the adapter handle it
    // Just ensure client is closed
    throw e;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        // Ignore close errors
        console.warn('Error closing client:', closeError);
      }
    }
  }
};
