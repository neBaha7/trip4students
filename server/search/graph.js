/**
 * graph.js
 * Dijkstra's algorithm for finding cheapest multi-hop travel routes.
 *
 * Nodes  = IATA airport/station codes
 * Edges  = available transport legs (from provider search results)
 * Weight = price (EUR)
 *
 * Usage:
 *   const { cheapestPath } = require('./graph');
 *   const best = await cheapestPath('RIX', 'MXP', date, providers);
 *   // → { path: ['RIX','BCN','MXP'], totalPrice: 115, legs: [...] }
 */

const amadeus = require('./providers/amadeus');
const flixbus = require('./providers/flixbus');
const trainline = require('./providers/trainline');

// Intermediate hub airports worth checking for connections
const HUB_AIRPORTS = [
    'LHR', 'CDG', 'AMS', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP',
    'BER', 'VIE', 'ZRH', 'BRU', 'PRG', 'WAW', 'ATH', 'IST',
    'MUC', 'CPH', 'ARN', 'HEL',
];

/**
 * Build a price-weighted edge list from parallel provider searches.
 * Only searches one hop (direct legs) between all hubs to origin/dest.
 */
async function buildGraph(origin, dest, date) {
    const endpoints = [...new Set([origin, dest, ...HUB_AIRPORTS])];
    const edges = []; // { from, to, price, leg }

    // Fan-out: query all hubs in parallel for direct legs to/from origin & dest
    const pairs = [];
    for (const a of endpoints) {
        for (const b of endpoints) {
            if (a !== b) pairs.push([a, b]);
        }
    }

    // Limit to relevant pairs to avoid explosion (max 2-hop paths)
    const relevant = pairs.filter(([a, b]) =>
        a === origin || b === dest || a === dest || b === origin ||
        HUB_AIRPORTS.includes(a) && HUB_AIRPORTS.includes(b)
    ).slice(0, 60); // cap at 60 queries (each runs in parallel)

    const results = await Promise.allSettled(
        relevant.map(([a, b]) =>
            Promise.all([
                amadeus.search(a, b, date),
                flixbus.search(a, b, date),
                trainline.search(a, b, date),
            ]).then(rs => rs.flat())
        )
    );

    for (let i = 0; i < relevant.length; i++) {
        const [a, b] = relevant[i];
        if (results[i].status !== 'fulfilled') continue;
        for (const leg of results[i].value) {
            edges.push({ from: a, to: b, price: leg.price, leg });
        }
    }

    return edges;
}

/**
 * Dijkstra shortest (cheapest) path from origin → dest through the edge graph.
 * @param {string}   origin
 * @param {string}   dest
 * @param {Object[]} edges   — [{ from, to, price, leg }]
 * @param {number}   maxHops — default 2 (1 connection)
 * @returns {{ path, totalPrice, legs }|null}
 */
function dijkstra(origin, dest, edges, maxHops = 2) {
    // Adjacency list
    const adj = {};
    for (const e of edges) {
        if (!adj[e.from]) adj[e.from] = [];
        adj[e.from].push(e);
    }

    // Priority queue: [cost, hops, node, path, legs]
    const queue = [[0, 0, origin, [origin], []]];
    const visited = new Map(); // node → min cost

    while (queue.length) {
        // Simple linear min-extract (replace with heap for scale)
        queue.sort((a, b) => a[0] - b[0]);
        const [cost, hops, node, path, legs] = queue.shift();

        if (node === dest) {
            return { path, totalPrice: parseFloat(cost.toFixed(2)), legs };
        }
        if (hops >= maxHops) continue;

        const key = `${node}:${hops}`;
        if (visited.has(key) && visited.get(key) <= cost) continue;
        visited.set(key, cost);

        for (const edge of (adj[node] || [])) {
            if (path.includes(edge.to)) continue; // no cycles
            queue.push([
                cost + edge.price,
                hops + 1,
                edge.to,
                [...path, edge.to],
                [...legs, edge.leg],
            ]);
        }
    }
    return null; // no path found
}

/**
 * High-level function: find the cheapest multi-hop route.
 * Returns null if no cheaper connection exists vs. direct flights.
 *
 * @param {string} origin
 * @param {string} dest
 * @param {string} date      — YYYY-MM-DD
 * @param {number} directMin — price of cheapest direct option (skip if multi-hop isn't cheaper)
 */
async function cheapestPath(origin, dest, date, directMin = Infinity) {
    try {
        const edges = await buildGraph(origin, dest, date);
        const result = dijkstra(origin, dest, edges);
        if (!result) return null;
        if (result.totalPrice >= directMin) return null; // not cheaper than direct
        return result;
    } catch (err) {
        console.warn('[graph] dijkstra failed:', err.message);
        return null;
    }
}

module.exports = { cheapestPath };
