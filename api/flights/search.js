// Vercel Serverless Function — /api/flights/search
// Proxies Amadeus flight search. Deployed automatically from GitHub.
// CORS allows nebaha7.github.io (GitHub Pages) → no Railway needed.

export default async function handler(req, res) {
    // ── CORS ──────────────────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { from, to, date, mode = 'all' } = req.query;

    if (!from || !to || !date) {
        return res.status(400).json({ error: 'from, to and date are required.' });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(date) < today) {
        return res.status(400).json({ error: 'Please choose a future date.' });
    }

    // ── Demo data factory ──────────────────────────────────────────────
    function demoResults(from, to, date) {
        const f = from.toUpperCase(), t = to.toUpperCase();
        return [
            {
                id: 'd1', type: 'flight', carrier: 'Ryanair', flightNumber: 'FR1234', from: f, to: t,
                departureTime: `${date}T08:00:00`, arrivalTime: `${date}T11:15:00`,
                duration: 'PT2H15M', stops: 0, basePrice: 45.00, studentPrice: 38.25, currency: 'EUR'
            },
            {
                id: 'd2', type: 'flight', carrier: 'easyJet', flightNumber: 'U21812', from: f, to: t,
                departureTime: `${date}T14:30:00`, arrivalTime: `${date}T17:50:00`,
                duration: 'PT2H20M', stops: 0, basePrice: 52.00, studentPrice: null, currency: 'EUR'
            },
            {
                id: 'd3', type: 'train', carrier: 'Eurostar', flightNumber: 'ES9031', from: f, to: t,
                departureTime: `${date}T08:30:00`, arrivalTime: `${date}T13:00:00`,
                duration: 'PT4H30M', stops: 0, basePrice: 79.00, studentPrice: 67.15, currency: 'EUR'
            },
            {
                id: 'd4', type: 'bus', carrier: 'FlixBus', flightNumber: 'FB2201', from: f, to: t,
                departureTime: `${date}T07:00:00`, arrivalTime: `${date}T19:30:00`,
                duration: 'PT12H30M', stops: 1, basePrice: 24.99, studentPrice: 19.99, currency: 'EUR'
            },
        ].filter(r => mode === 'all' || r.type === mode)
            .sort((a, b) => a.basePrice - b.basePrice);
    }

    // ── No Amadeus keys → demo ─────────────────────────────────────────
    const hasKeys = process.env.AMADEUS_API_KEY &&
        process.env.AMADEUS_API_KEY !== 'your_amadeus_key_here';

    if (!hasKeys) {
        const results = demoResults(from, to, date);
        return res.json({ results, count: results.length, demo: true });
    }

    // ── Amadeus OAuth ──────────────────────────────────────────────────
    try {
        const tokenRes = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.AMADEUS_API_KEY,
                client_secret: process.env.AMADEUS_API_SECRET,
            }),
        });

        if (!tokenRes.ok) throw new Error(`Amadeus auth: ${tokenRes.status}`);
        const { access_token } = await tokenRes.json();

        const params = new URLSearchParams({
            originLocationCode: from.toUpperCase(),
            destinationLocationCode: to.toUpperCase(),
            departureDate: date,
            adults: '1',
            currencyCode: 'EUR',
            max: '10',
        });

        const flightRes = await fetch(
            `https://test.api.amadeus.com/v2/shopping/flight-offers?${params}`,
            { headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (!flightRes.ok) throw new Error(`Amadeus search: ${flightRes.status}`);
        const data = await flightRes.json();

        const flights = (data.data || []).map(offer => {
            const seg = offer.itineraries[0].segments[0];
            const basePrice = parseFloat(offer.price.total);
            return {
                id: offer.id, type: 'flight',
                carrier: seg.carrierCode, flightNumber: `${seg.carrierCode}${seg.number}`,
                from: seg.departure.iataCode, to: seg.arrival.iataCode,
                departureTime: seg.departure.at, arrivalTime: seg.arrival.at,
                duration: offer.itineraries[0].duration,
                stops: offer.itineraries[0].segments.length - 1,
                basePrice, studentPrice: parseFloat((basePrice * 0.85).toFixed(2)),
                currency: offer.price.currency,
            };
        }).sort((a, b) => a.basePrice - b.basePrice);

        return res.json({ results: flights, count: flights.length });

    } catch (err) {
        console.error('Amadeus error, falling back to demo:', err.message);
        const results = demoResults(from, to, date);
        return res.json({ results, count: results.length, demo: true });
    }
}
