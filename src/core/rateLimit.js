const createRateLimiter = ({ windowMs, max }) => {
  const hits = new Map();

  return (key) => {
    const now = Date.now();
    const current = hits.get(key);
    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
    }
    current.count++;
    return {
      allowed: current.count <= max,
      remaining: Math.max(0, max - current.count),
      resetAt: current.resetAt,
    };
  };
};

module.exports = {
  createRateLimiter,
};
