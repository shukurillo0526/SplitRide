import { Redis } from '@upstash/redis';
import { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN, BLACKLIST_TTL_SECONDS, QUEUE_TIMEOUT_MS } from './config.js';

// ─── Singleton Redis Client ─────────────────────────────────────────────────
let redis = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: UPSTASH_REDIS_URL,
      token: UPSTASH_REDIS_TOKEN,
    });
  }
  return redis;
}

// ─── Queue Operations ────────────────────────────────────────────────────────

/**
 * Push a user into the matchmaking queue.
 * userData: { userId, firstName, username }
 */
export async function pushToQueue(stadiumId, zoneId, userData) {
  const r = getRedis();
  const key = `match:${stadiumId}:${zoneId}`;
  const entry = JSON.stringify({
    ...userData,
    joinedAt: Date.now(),
  });

  await r.rpush(key, entry);
  // Set TTL on the queue key so it auto-expires if abandoned
  await r.expire(key, Math.ceil(QUEUE_TIMEOUT_MS / 1000) + 60);

  // Track which queue this user is in
  await r.set(`userqueue:${userData.userId}`, `${stadiumId}:${zoneId}`, {
    ex: Math.ceil(QUEUE_TIMEOUT_MS / 1000) + 60,
  });

  return await r.llen(key);
}

/**
 * Get current queue length.
 */
export async function getQueueLength(stadiumId, zoneId) {
  const r = getRedis();
  return await r.llen(`match:${stadiumId}:${zoneId}`);
}

/**
 * Get all members in a queue.
 */
export async function getQueueMembers(stadiumId, zoneId) {
  const r = getRedis();
  const raw = await r.lrange(`match:${stadiumId}:${zoneId}`, 0, -1);
  return raw.map((entry) => (typeof entry === 'string' ? JSON.parse(entry) : entry));
}

/**
 * Pop a full group of 4 from the queue and delete the key.
 */
export async function popFullGroup(stadiumId, zoneId) {
  const r = getRedis();
  const key = `match:${stadiumId}:${zoneId}`;
  const raw = await r.lrange(key, 0, 3);
  await r.del(key);

  const members = raw.map((entry) => (typeof entry === 'string' ? JSON.parse(entry) : entry));

  // Clean up user queue mappings
  for (const member of members) {
    await r.del(`userqueue:${member.userId}`);
  }

  return members;
}

/**
 * Remove a specific user from a queue (for refunds/timeouts).
 */
export async function removeFromQueue(stadiumId, zoneId, userId) {
  const r = getRedis();
  const key = `match:${stadiumId}:${zoneId}`;
  const members = await getQueueMembers(stadiumId, zoneId);
  const entry = members.find((m) => m.userId === userId);
  if (entry) {
    await r.lrem(key, 1, JSON.stringify(entry));
    await r.del(`userqueue:${userId}`);
  }
}

/**
 * Check which queue a user is currently in.
 */
export async function getUserQueue(userId) {
  const r = getRedis();
  return await r.get(`userqueue:${userId}`);
}

// ─── Charge ID Storage (for refunds) ────────────────────────────────────────

/**
 * Store a payment charge ID for a user in a specific match context.
 */
export async function storeChargeId(userId, matchKey, chargeId) {
  const r = getRedis();
  const key = `charges:${matchKey}`;
  await r.hset(key, { [userId.toString()]: chargeId });
  await r.expire(key, 86400 * 7); // Keep for 7 days
}

/**
 * Get a specific user's charge ID.
 */
export async function getChargeId(userId, matchKey) {
  const r = getRedis();
  return await r.hget(`charges:${matchKey}`, userId.toString());
}

/**
 * Get all charge IDs for a match.
 */
export async function getAllChargeIds(matchKey) {
  const r = getRedis();
  return await r.hgetall(`charges:${matchKey}`);
}

// ─── Blacklist ───────────────────────────────────────────────────────────────

/**
 * Blacklist a user for BLACKLIST_TTL_SECONDS (default 3 days).
 */
export async function blacklistUser(userId) {
  const r = getRedis();
  await r.set(`blacklist:${userId}`, Date.now().toString(), {
    ex: BLACKLIST_TTL_SECONDS,
  });
}

/**
 * Check if a user is blacklisted.
 */
export async function isBlacklisted(userId) {
  const r = getRedis();
  return (await r.exists(`blacklist:${userId}`)) === 1;
}

/**
 * Get remaining blacklist TTL in seconds.
 */
export async function getBlacklistTTL(userId) {
  const r = getRedis();
  return await r.ttl(`blacklist:${userId}`);
}

// ─── Topic / Dispute Storage ─────────────────────────────────────────────────

/**
 * Store the members of a matched topic group.
 * members: [{ userId, firstName, username }]
 */
export async function storeTopicMembers(topicId, members) {
  const r = getRedis();
  await r.set(`topic_members:${topicId}`, JSON.stringify(members), {
    ex: 86400 * 7,
  });
}

/**
 * Retrieve topic members.
 */
export async function getTopicMembers(topicId) {
  const r = getRedis();
  const raw = await r.get(`topic_members:${topicId}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

/**
 * Store the match key associated with a topic (for charge ID lookups).
 */
export async function storeTopicMatchKey(topicId, matchKey) {
  const r = getRedis();
  await r.set(`topic_match:${topicId}`, matchKey, { ex: 86400 * 7 });
}

/**
 * Retrieve the match key for a topic.
 */
export async function getTopicMatchKey(topicId) {
  const r = getRedis();
  return await r.get(`topic_match:${topicId}`);
}

/**
 * Record a no-show report.
 */
export async function storeReport(topicId, reporterUserId, reportedUserId) {
  const r = getRedis();
  await r.sadd(`reports:${topicId}:${reportedUserId}`, reporterUserId.toString());
  await r.expire(`reports:${topicId}:${reportedUserId}`, 86400 * 3);
}

/**
 * Get the number of reports against a user in a topic.
 */
export async function getReportCount(topicId, reportedUserId) {
  const r = getRedis();
  return await r.scard(`reports:${topicId}:${reportedUserId}`);
}

/**
 * Check if a user has already reported in a topic.
 */
export async function hasReported(topicId, reporterUserId) {
  const r = getRedis();
  return (await r.exists(`reporter:${topicId}:${reporterUserId}`)) === 1;
}

/**
 * Mark that a user has submitted a report for a topic.
 */
export async function markReported(topicId, reporterUserId) {
  const r = getRedis();
  await r.set(`reporter:${topicId}:${reporterUserId}`, '1', { ex: 86400 * 3 });
}

/**
 * Store user's match status for frontend polling.
 */
export async function storeMatchStatus(userId, statusData) {
  const r = getRedis();
  await r.set(`matchstatus:${userId}`, JSON.stringify(statusData), { ex: 3600 });
}

/**
 * Get user's match status.
 */
export async function getMatchStatus(userId) {
  const r = getRedis();
  const raw = await r.get(`matchstatus:${userId}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}
