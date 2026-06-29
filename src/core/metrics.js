const createMetrics = () => {
  const providerStats = new Map();

  const getStats = (providerId) => {
    if (!providerStats.has(providerId)) {
      providerStats.set(providerId, {
        successCount: 0,
        failureCount: 0,
        cacheHitCount: 0,
        staleServedCount: 0,
        snapshotServedCount: 0,
        circuitOpenCount: 0,
        totalDurationMs: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastErrorType: null,
      });
    }
    return providerStats.get(providerId);
  };

  return {
    record(providerId, event) {
      const stats = getStats(providerId);
      if (event.type === "success") {
        stats.successCount++;
        stats.totalDurationMs += event.durationMs || 0;
        stats.lastSuccessAt = event.at;
      }
      if (event.type === "failure") {
        stats.failureCount++;
        stats.lastFailureAt = event.at;
        stats.lastErrorType = event.errorType;
      }
      if (event.type === "cache-hit") stats.cacheHitCount++;
      if (event.type === "stale-served") stats.staleServedCount++;
      if (event.type === "snapshot-served") stats.snapshotServedCount++;
      if (event.type === "circuit-open") stats.circuitOpenCount++;
    },
    snapshot() {
      return [...providerStats.entries()].map(([providerId, stats]) => ({
        providerId,
        ...stats,
        avgDurationMs: stats.successCount
          ? Math.round(stats.totalDurationMs / stats.successCount)
          : null,
      }));
    },
  };
};

module.exports = {
  createMetrics,
};
