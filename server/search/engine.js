/**
 * engine.js
 * Main search engine orchestrator.
 *
 * Flow:
 *  1. Normalize origin/dest → IATA codes
 *  2. Check cache → return immediately on HIT
 *  3. Run all providers in parallel (Promise.allSettled)
 *  4. Aggregate + rank direct results
 *  5. Run Dijkstra for cheaper multi-hop route
 *  6. Store in cache
 *  7. Return unified response
 */

const normalizer = require('./normalizer');
const cache = require('./cache');
const aggregator = require('./aggregator');
const ranker = require('./ranker');
const { cheapestPath } = require('./graph');

const amadeus = require('./providers/amadeus');
const flixbus = require('./providers/flixbus');
const trainline = require('./providers/trainline');

// ── Fallback demo data when all providers return nothing ──────────────────────
function demoDirect(origin, dest, date) {
    return [
        {
            id: 'd1', type: 'flight', provider: 'Demo', carrier: 'Ryanair', flightNumber: 'FR1234',
            from: origin, to: dest, departureTime: `${date}T08:00:00`, arrivalTime: `${date}T11:15:00`,
            duration: 'PT2H15M', stops: 0, price: 45.00, currency: 'EUR', reliability: 0.9
        },
        {
            id: 'd2', type: 'flight', provider: 'Demo', carrier: 'easyJet', flightNumber: 'U21812',
            from: origin, to: dest, departureTime: `${date}T14:30:00`, arrivalTime: `${date}T17:50:00`,
            duration: 'PT2H20M', stops: 0, price: 52.00, currency: 'EUR', reliability: 0.9
        },
        {
            id: 'd3', type: 'train', provider: 'Demo', carrier: 'Eurostar', flightNumber: 'ES9031',
            from: origin, to: dest, departureTime: `${date}T08:30:00`, arrivalTime: `${date}T13:00:00`,
            duration: 'PT4H30M', stops: 0, price: 79.00, currency: 'EUR', reliability: 0.95
        },
        {
            id: 'd4', type: 'bus', provider: 'Demo', carrier: 'FlixBus', flightNumber: 'FB2201',
            from: origin, to: dest, departureTime: `${date}T07:00:00`, arrivalTime: `${date}T19:30:00`,
            duration: 'PT12H30M', stops: 1, price: 24.99, currency: 'EUR', reliability: 0.85
        },
    ];
}

/**
 * @param {Object} opts
 * @param {string} opts.origin       — city name or IATA code
 * @param {string} opts.destination  — city name or IATA code
 * @param {string} opts.date         — YYYY-MM-DD
 * @param {string} [opts.mode]       — flight|train|bus|all (default all)
 * @param {boolean}[opts.multiHop]   — run Dijkstra (default true)
 */
async function search({ origin, destination, date, mode = 'all', multiHop = true }) {
    const startMs = Date.now();

    // 1. Normalize
    const from = normalizer.normalize(origin);
    const to = normalizer.normalize(destination);

    // 2. Cache check
    const cacheKey = cache.buildKey(from, to, date, mode);
    const cached = await cache.get(cacheKey);
    if (cached) {
        return { ...cached, cached: true, responseMs: Date.now() - startMs };
    }

    // 3. Parallel provider queries
    const [amadeusRes, flixbusRes, trainlineRes] = await Promise.allSettled([
        (mode === 'all' || mode === 'flight') ? amadeus.search(from, to, date) : Promise.resolve([]),
        (mode === 'all' || mode === 'bus') ? flixbus.search(from, to, date) : Promise.resolve([]),
        (mode === 'all' || mode === 'train') ? trainline.search(from, to, date) : Promise.resolve([]),
    ]);

    const raw = [
        amadeusRes.status === 'fulfilled' ? amadeusRes.value : [],
        flixbusRes.status === 'fulfilled' ? flixbusRes.value : [],
        trainlineRes.status === 'fulfilled' ? trainlineRes.value : [],
    ];

    // 4. Aggregate + rank
    let direct = aggregator.aggregate(raw, date);
    if (direct.length === 0) {
        direct = aggregator.aggregate([demoDirect(from, to, date)], date);
    }
    direct = ranker.rank(direct);

    const cheapestDirect = direct.length ? direct[direct.length - 1].price : Infinity;

    // 5. Multi-hop Dijkstra (run concurrently with ranking)
    let multiHopResult = null;
    if (multiHop && mode === 'all') {
        multiHopResult = await cheapestPath(from, to, date, cheapestDirect);
        if (multiHopResult) {
            multiHopResult.saving = parseFloat((cheapestDirect - multiHopResult.totalPrice).toFixed(2));
            multiHopResult.bookingUrls = multiHopResult.legs.map(leg =>
                `https://www.skyscanner.net/transport/flights/${leg.from}/${leg.to}/${date.slice(2).replace(/-/g, '')}/`
            );
        }
    }

    const response = {
        origin: from,
        destination: to,
        date,
        mode,
        results: direct,
        multiHop: multiHopResult,
        count: direct.length,
        cached: false,
        responseMs: Date.now() - startMs,
    };

    // 6. Cache the result
    await cache.set(cacheKey, response);

    return response;
}

module.exports = { search };
