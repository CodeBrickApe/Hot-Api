const { MongoClient } = require("mongodb");

const createMongoSnapshotStore = ({ uri, dbName = "dailyhot" }) => {
  if (!uri) return null;

  const client = new MongoClient(uri, {
    maxPoolSize: 5,
  });
  let connection;

  const connect = async () => {
    if (!connection) {
      connection = client.connect();
    }
    await connection;
    return client.db(dbName);
  };

  const collection = async () => (await connect()).collection("provider_snapshots");

  return {
    async saveSnapshot(snapshot) {
      const snapshots = await collection();
      await snapshots.insertOne({
        ...snapshot,
        createdAt: new Date(snapshot.fetchedAt),
      });
    },
    async getLatestSnapshot(providerId) {
      const snapshots = await collection();
      const snapshot = await snapshots.findOne(
        { providerId, success: true },
        { sort: { fetchedAt: -1 } },
      );
      if (!snapshot) return null;
      return snapshot;
    },
    async listLatest() {
      const snapshots = await collection();
      return snapshots
        .aggregate([
          { $match: { success: true } },
          { $sort: { fetchedAt: -1 } },
          {
            $group: {
              _id: "$providerId",
              snapshot: { $first: "$$ROOT" },
            },
          },
          { $replaceRoot: { newRoot: "$snapshot" } },
        ])
        .toArray();
    },
  };
};

module.exports = {
  createMongoSnapshotStore,
};
