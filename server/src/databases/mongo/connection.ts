import { MongoClient } from "mongodb";

export const connectToMongo = async (uri: string) => {
  const client = new MongoClient(uri);
  await client.connect();
  return client;
};

export const verifyConnection = async (uri: string) => {
  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    await client.db().command({ ping: 1 });
    return true;
  } catch (error) {
    console.error("Connection verification failed:", error);
    return false;
  } finally {
    if (client) await client.close();
  }
};
