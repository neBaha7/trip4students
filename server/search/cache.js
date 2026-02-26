/**
 * cache.js
 * Redis-backed search result cache using Upstash REST API.
 * Falls back gracefully to in-memory LRU if Redis is unavailable.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DEFAULT_TTL = 300; // 5 minutes

// ── In-memory fallback ────────────────────────────────────────────────────────
const memCache = new Map();
const MEM_MAX = 200; // max entries

function memGet(key) {
    const entry = memCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
    return entry.value;
}
function memSet(key, value, ttl) {
    if (memCache.size >= MEM_MAX) {
        // Evict oldest
        memCache.delete(memCache.keys().next().value);
    }
    memCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

// ── Upstash Redis REST ────────────────────────────────────────────────────────
async function redisCmd(...args) {
    if (!REDIS_URL || !REDIS_TOKEN) return null;
    try {
        const res = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
        });
        const json = await res.json();
        return json.result;
    } catch {
        return null;
    }
}

// ── Public API ────────────────────────────────────────────────────────────────
function buildKey(origin, dest, date, mode) {
    return `t4s:search:${origin}:${dest}:${date}:${mode}`;
}

async function get(key) {
    // Try Redis first
    const raw = await redisCmd('GET', key);
    if (raw) {
        try { return JSON.parse(raw); } catch { return null; }
    }
    // Fallback to memory
    return memGet(key);
}

async function set(key, value, ttl = DEFAULT_TTL) {
    const str = JSON.stringify(value);
    // Redis SET with EX
    await redisCmd('SET', key, str, 'EX', String(ttl));
    // Always also store in memory for sub-ms local reads
    memSet(key, value, ttl);
}

async function invalidate(pattern) {
    // Simple in-memory invalidation
    for (const k of memCache.keys()) {
        if (k.includes(pattern)) memCache.delete(k);
    }
}

module.exports = { buildKey, get, set, invalidate };
