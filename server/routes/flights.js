const express = require('express');
// Node.js 18+ has fetch built-in globally — no import needed
const { requireAuth } = require('../middleware/auth');

require('dotenv').config({ path: '../.env' });

const router = express.Router();

// ─── Amadeus OAuth token cache ────────────────────────────────────────────────
let amadeusToken = null;
let amadeusTokenExpiry = 0;

async function getAmadeusToken() {
    if (amadeusToken && Date.now() < amadeusTokenExpiry - 60_000) return amadeusToken;

    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.AMADEUS_API_KEY,
            client_secret: process.env.AMADEUS_API_SECRET
        })
    });

    if (!response.ok) throw new Error(`Amadeus auth failed: ${response.status}`);

    const data = await response.json();
    amadeusToken = data.access_token;
    amadeusTokenExpiry = Date.now() + data.expires_in * 1000;
    return amadeusToken;
}

// ─── Demo data factory (always returns 200, never crashes) ────────────────────
function demoResults(from, to, date, isStudentVerified) {
    from = from.toUpperCase();
    to = to.toUpperCase();
    return [
        {
            id: 'demo-1', type: 'flight', carrier: 'Ryanair', flightNumber: 'FR1234',
            from, to, departureTime: `${date}T08:00:00`, arrivalTime: `${date}T11:15:00`,
            duration: 'PT2H15M', stops: 0,
            basePrice: 45.00, studentPrice: isStudentVerified ? 38.25 : null, currency: 'EUR'
        },
        {
            id: 'demo-2', type: 'flight', carrier: 'easyJet', flightNumber: 'U21812',
            from, to, departureTime: `${date}T14:30:00`, arrivalTime: `${date}T17:50:00`,
            duration: 'PT2H20M', stops: 0,
            basePrice: 52.00, studentPrice: isStudentVerified ? 44.20 : null, currency: 'EUR'
        },
        {
            id: 'demo-3', type: 'train', carrier: 'Eurostar', flightNumber: 'ES9031',
            from, to, departureTime: `${date}T08:30:00`, arrivalTime: `${date}T13:00:00`,
            duration: 'PT4H30M', stops: 0,
            basePrice: 79.00, studentPrice: isStudentVerified ? 67.15 : null, currency: 'EUR'
        },
        {
            id: 'demo-4', type: 'bus', carrier: 'FlixBus', flightNumber: 'FB2201',
            from, to, departureTime: `${date}T07:00:00`, arrivalTime: `${date}T19:30:00`,
            duration: 'PT12H30M', stops: 1,
            basePrice: 24.99, studentPrice: isStudentVerified ? 19.99 : null, currency: 'EUR'
        }
    ];
}

// ─── GET /api/flights/search ──────────────────────────────────────────────────
router.get('/search', async (req, res) => {
    const { from, to, date, adults = 1, mode = 'all' } = req.query;

    if (!from || !to || !date) {
        return res.status(400).json({ error: 'from, to and date are required.' });
    }

    const searchDate = new Date(date);
    if (isNaN(searchDate) || searchDate < new Date().setHours(0, 0, 0, 0)) {
        return res.status(400).json({ error: 'Please choose a future date.' });
    }

    // Optional: detect verified student for discount pricing
    let isStudentVerified = false;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        try {
            const jwt = require('jsonwebtoken');
            const payload = jwt.verify(authHeader.split(' ')[1], process.env.AUTH_SECRET);
            isStudentVerified = payload.is_student_verified;
        } catch (_) { /* anonymous search — no discount */ }
    }

    // ── No Amadeus keys → return demo data immediately (200 OK) ───────────────
    const hasAmadeusKeys =
        process.env.AMADEUS_API_KEY &&
        process.env.AMADEUS_API_KEY !== 'your_amadeus_key_here' &&
        process.env.AMADEUS_API_SECRET &&
        process.env.AMADEUS_API_SECRET !== 'your_amadeus_secret_here';

    if (!hasAmadeusKeys) {
        console.log('ℹ️  Amadeus keys not set — serving demo data');
        const results = demoResults(from, to, date, isStudentVerified)
            .filter(r => mode === 'all' || r.type === mode)
            .sort((a, b) => a.basePrice - b.basePrice);
        return res.json({ results, count: results.length, demo: true });
    }

    // ── Real Amadeus call ─────────────────────────────────────────────────────
    try {
        let flights = [];

        if (mode === 'flight' || mode === 'all') {
            const token = await getAmadeusToken();
            const params = new URLSearchParams({
                originLocationCode: from.toUpperCase(),
                destinationLocationCode: to.toUpperCase(),
                departureDate: date,
                adults: String(adults),
                currencyCode: 'EUR',
                max: '10'
            });

            const amadeusRes = await fetch(
                `https://test.api.amadeus.com/v2/shopping/flight-offers?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (amadeusRes.ok) {
                const amadeusData = await amadeusRes.json();
                flights = (amadeusData.data || []).map(offer => {
                    const seg = offer.itineraries[0].segments[0];
                    const basePrice = parseFloat(offer.price.total);
                    return {
                        id: offer.id, type: 'flight',
                        carrier: seg.carrierCode,
                        flightNumber: `${seg.carrierCode}${seg.number}`,
                        from: seg.departure.iataCode,
                        to: seg.arrival.iataCode,
                        departureTime: seg.departure.at,
                        arrivalTime: seg.arrival.at,
                        duration: offer.itineraries[0].duration,
                        stops: offer.itineraries[0].segments.length - 1,
                        basePrice,
                        studentPrice: isStudentVerified ? parseFloat((basePrice * 0.85).toFixed(2)) : null,
                        currency: offer.price.currency
                    };
                });
            }
        }

        // Train / bus: demo placeholders until Trainline / FlixBus integration
        if (mode === 'train' || mode === 'all') {
            flights.push({
                id: 'train-1', type: 'train', carrier: 'Eurostar', flightNumber: 'ES9031',
                from: from.toUpperCase(), to: to.toUpperCase(),
                departureTime: `${date}T08:30:00`, arrivalTime: `${date}T13:00:00`,
                duration: 'PT4H30M', stops: 0,
                basePrice: 79.00, studentPrice: isStudentVerified ? 67.15 : null, currency: 'EUR'
            });
        }
        if (mode === 'bus' || mode === 'all') {
            flights.push({
                id: 'bus-1', type: 'bus', carrier: 'FlixBus', flightNumber: 'FB2201',
                from: from.toUpperCase(), to: to.toUpperCase(),
                departureTime: `${date}T07:00:00`, arrivalTime: `${date}T19:30:00`,
                duration: 'PT12H30M', stops: 1,
                basePrice: 24.99, studentPrice: isStudentVerified ? 19.99 : null, currency: 'EUR'
            });
        }

        flights.sort((a, b) => a.basePrice - b.basePrice);
        return res.json({ results: flights, count: flights.length });

    } catch (err) {
        // Amadeus failed even with keys — fall back gracefully, never 502
        console.error('Amadeus error (falling back to demo):', err.message);
        const results = demoResults(from, to, date, isStudentVerified)
            .filter(r => mode === 'all' || r.type === mode)
            .sort((a, b) => a.basePrice - b.basePrice);
        return res.json({ results, count: results.length, demo: true });
    }
});

module.exports = router;
