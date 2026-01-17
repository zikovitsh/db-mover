import { Client } from "pg";

export const connectToPostgres = async (uri: string) => {
  const client = new Client({ connectionString: uri });
  await client.connect();
  return client;
};

export const verifyConnection = async (uri: string) => {
  let client: Client | null = null;
  try {
    client = new Client({
      connectionString: uri,
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Connection verification failed:", error);
    return false;
  } finally {
    if (client) await client.end();
  }
};
