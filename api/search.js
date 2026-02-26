/**
 * Vercel Serverless Function — /api/search
 * Wraps server/search/engine.js so the full search engine runs on Vercel.
 */

const engine = require('../server/search/engine');

module.exports = async function handler(req, res) {
    // ── CORS ──────────────────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const {
        origin,
        destination,
        date,
        mode = 'all',
        multiHop = 'true',
        return: returnDate
    } = req.query;

    if (!origin || !destination || !date) {
        return res.status(400).json({
            error: 'origin, destination, and date are required.',
            example: '/api/search?origin=LHR&destination=BCN&date=2026-05-15'
        });
    }

    const d = new Date(date);
    if (isNaN(d) || d < new Date().setHours(0, 0, 0, 0)) {
        return res.status(400).json({ error: 'date must be today or in the future.' });
    }

    try {
        const result = await engine.search({
            origin,
            destination,
            date,
            mode,
            multiHop: multiHop !== 'false',
        });

        if (returnDate) {
            const returnResult = await engine.search({
                origin: destination,
                destination: origin,
                date: returnDate,
                mode,
                multiHop: false,
            });
            result.returnTrip = {
                results: returnResult.results,
                multiHop: returnResult.multiHop,
            };
        }

        return res.json(result);
    } catch (err) {
        console.error('[/api/search] error:', err);
        return res.status(500).json({ error: 'Search temporarily unavailable.' });
    }
}
