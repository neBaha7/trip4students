/**
 * routes/search.js
 * GET /api/search — main travel search endpoint
 *
 * Query params:
 *   origin      — city name or IATA code (required)
 *   destination — city name or IATA code (required)
 *   date        — YYYY-MM-DD (required)
 *   return      — YYYY-MM-DD (optional, for round trip)
 *   mode        — flight|train|bus|all (default: all)
 *   multiHop    — true|false (default: true)
 *
 * Response:
 *   { origin, destination, date, results, multiHop, count, cached, responseMs }
 */

const express = require('express');
const router = express.Router();
const engine = require('../search/engine');

router.get('/', async (req, res) => {
    const { origin, destination, date, mode = 'all', multiHop = 'true', return: returnDate } = req.query;

    // Validate required params
    if (!origin || !destination || !date) {
        return res.status(400).json({
            error: 'origin, destination, and date are required.',
            example: '/api/search?origin=LHR&destination=BCN&date=2026-05-15'
        });
    }

    // Block past dates
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

        // Optional: round-trip (search return leg separately)
        if (returnDate) {
            const returnResult = await engine.search({
                origin: destination,
                destination: origin,
                date: returnDate,
                mode,
                multiHop: false, // skip graph for return leg for speed
            });
            result.returnTrip = {
                results: returnResult.results,
                multiHop: returnResult.multiHop,
            };
        }

        return res.json(result);

    } catch (err) {
        console.error('[/api/search] error:', err);
        return res.status(500).json({ error: 'Search temporarily unavailable.', message: err.message });
    }
});

module.exports = router;
