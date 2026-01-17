import mysql from "mysql2/promise";

export const connectToMysql = async (uri: string) => {
  const connection = await mysql.createConnection(uri);
  return connection;
};

export const verifyConnection = async (uri: string) => {
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(uri);
    await connection.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Connection verification failed:", error);
    return false;
  } finally {
    if (connection) await connection.end();
  }
};
