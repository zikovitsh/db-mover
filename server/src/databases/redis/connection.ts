import Redis from "ioredis";

export const verifyConnection = async (uri: string): Promise<boolean> => {
  try {
    const redis = new Redis(uri, {
      msgRetryEvts: 0,
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
    }); // Fail fast

    await new Promise<void>((resolve, reject) => {
      redis.on("connect", () => {
        resolve();
      });
      redis.on("error", (err) => {
        reject(err);
      });
    });

    await redis.ping();
    redis.disconnect();
    return true;
  } catch (error) {
    console.error("Redis connection verification failed:", error);
    return false;
  }
};
