const createMemorySnapshotStore = () => {
  const snapshots = [];

  return {
    async saveSnapshot(snapshot) {
      snapshots.push(snapshot);
    },
    async getLatestSnapshot(providerId) {
      return [...snapshots]
        .reverse()
        .find((snapshot) => snapshot.providerId === providerId && snapshot.success);
    },
    async listLatest() {
      const latest = new Map();
      for (const snapshot of snapshots) {
        if (snapshot.success) latest.set(snapshot.providerId, snapshot);
      }
      return [...latest.values()];
    },
  };
};

module.exports = {
  createMemorySnapshotStore,
};
