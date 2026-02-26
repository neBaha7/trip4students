/**
 * Vercel Serverless Function — /api/search
 * Fully self-contained: no imports from server/.
 * Normalizes cities → IATA, queries Amadeus, ranks results, returns JSON.
 */

// ── IATA city lookup ──────────────────────────────────────────────────────────
const IATA = {
    'london': 'LHR', 'paris': 'CDG', 'barcelona': 'BCN', 'madrid': 'MAD',
    'amsterdam': 'AMS', 'berlin': 'BER', 'rome': 'FCO', 'milan': 'MXP',
    'frankfurt': 'FRA', 'munich': 'MUC', 'zurich': 'ZRH', 'vienna': 'VIE',
    'brussels': 'BRU', 'lisbon': 'LIS', 'prague': 'PRG', 'warsaw': 'WAW',
    'budapest': 'BUD', 'athens': 'ATH', 'istanbul': 'IST', 'dubai': 'DXB',
    'moscow': 'SVO', 'riga': 'RIX', 'tallinn': 'TLL', 'vilnius': 'VNO',
    'helsinki': 'HEL', 'oslo': 'OSL', 'stockholm': 'ARN', 'copenhagen': 'CPH',
    'dublin': 'DUB', 'edinburgh': 'EDI', 'manchester': 'MAN', 'singapore': 'SIN',
    'tokyo': 'NRT', 'bangkok': 'BKK', 'new york': 'JFK', 'los angeles': 'LAX',
    'toronto': 'YYZ', 'tbilisi': 'TBS', 'yerevan': 'EVN', 'baku': 'GYD',
    'kyiv': 'KBP', 'st petersburg': 'LED',
};

function normalize(input) {
    if (!input) return null;
    const s = input.trim().toLowerCase();
    if (/^[a-z]{3}$/.test(s)) return s.toUpperCase();
    if (IATA[s]) return IATA[s];
    const prefix = Object.keys(IATA).find(k => k.startsWith(s));
    if (prefix) return IATA[prefix];
    return input.toUpperCase();
}

// ── Duration parsing ──────────────────────────────────────────────────────────
function parseMins(iso) {
    const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    return m ? (+m[1] || 0) * 60 + (+m[2] || 0) : 0;
}

// ── Amadeus token cache ────────────────────────────────────────────────────────
let _tok = null, _tokExp = 0;
async function amadeusToken() {
    if (_tok && Date.now() < _tokExp - 60000) return _tok;
    const r = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.AMADEUS_API_KEY || '',
            client_secret: process.env.AMADEUS_API_SECRET || '',
        }),
    });
    if (!r.ok) throw new Error(`Amadeus auth: ${r.status}`);
    const d = await r.json();
    _tok = d.access_token;
    _tokExp = Date.now() + d.expires_in * 1000;
    return _tok;
}

// ── Skyscanner booking URL ─────────────────────────────────────────────────────
function bookingUrl(from, to, date, type) {
    const sk = date.slice(2).replace(/-/g, '');
    return type === 'flight'
        ? `https://www.skyscanner.net/transport/flights/${from}/${to}/${sk}/?adults=1`
        : `https://www.rome2rio.com/s/${from}/${to}`;
}

// ── Demo data (when Amadeus keys missing or returns nothing) ──────────────────
function demoData(from, to, date, mode) {
    const all = [
        {
            id: 'd1', type: 'flight', carrier: 'Ryanair', num: 'FR1234',
            dep: `${date}T08:00:00`, arr: `${date}T11:15:00`, dur: 'PT2H15M', stops: 0, price: 45
        },
        {
            id: 'd2', type: 'flight', carrier: 'easyJet', num: 'U21812',
            dep: `${date}T14:30:00`, arr: `${date}T17:50:00`, dur: 'PT2H20M', stops: 0, price: 52
        },
        {
            id: 'd3', type: 'train', carrier: 'Eurostar', num: 'ES9031',
            dep: `${date}T08:30:00`, arr: `${date}T13:00:00`, dur: 'PT4H30M', stops: 0, price: 79
        },
        {
            id: 'd4', type: 'bus', carrier: 'FlixBus', num: 'FB2201',
            dep: `${date}T07:00:00`, arr: `${date}T19:30:00`, dur: 'PT12H30M', stops: 1, price: 24.99
        },
    ].filter(r => mode === 'all' || r.type === mode);

    return all.map(r => ({
        id: r.id, type: r.type, carrier: r.carrier, flightNumber: r.num,
        from, to, departureTime: r.dep, arrivalTime: r.arr,
        durationMin: parseMins(r.dur), durationISO: r.dur,
        stops: r.stops, price: r.price, currency: 'EUR',
        score: 0, bookingUrl: bookingUrl(from, to, date, r.type),
    }));
}

// ── Rank results ──────────────────────────────────────────────────────────────
function rank(results) {
    if (!results.length) return results;
    const prices = results.map(r => r.price);
    const durs = results.map(r => r.durationMin);
    const minP = Math.min(...prices), rngP = Math.max(...prices) - minP || 1;
    const minD = Math.min(...durs), rngD = Math.max(...durs) - minD || 1;
    const maxS = Math.max(...results.map(r => r.stops)) || 1;
    return results
        .map(r => ({
            ...r, score: parseFloat((
                0.50 * (1 - (r.price - minP) / rngP) +
                0.30 * (1 - (r.durationMin - minD) / rngD) +
                0.20 * (1 - r.stops / maxS)
            ).toFixed(3))
        }))
        .sort((a, b) => b.score - a.score);
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { origin, destination, date, mode = 'all' } = req.query;

    if (!origin || !destination || !date) {
        return res.status(400).json({
            error: 'origin, destination, and date are required.',
            example: '/api/search?origin=London&destination=Barcelona&date=2026-05-15',
        });
    }

    const d = new Date(date);
    if (isNaN(d) || d < new Date().setHours(0, 0, 0, 0)) {
        return res.status(400).json({ error: 'date must be today or in the future.' });
    }

    const from = normalize(origin);
    const to = normalize(destination);
    const t0 = Date.now();

    const hasKeys = process.env.AMADEUS_API_KEY &&
        process.env.AMADEUS_API_KEY !== 'your_amadeus_key_here';

    let results = [];
    let demo = false;

    // ── Flights via Amadeus ──────────────────────────────────────────────────
    if (hasKeys && (mode === 'all' || mode === 'flight')) {
        try {
            const token = await amadeusToken();
            const params = new URLSearchParams({
                originLocationCode: from,
                destinationLocationCode: to,
                departureDate: date,
                adults: '1',
                currencyCode: 'EUR',
                max: '15',
            });
            const r = await fetch(
                `https://test.api.amadeus.com/v2/shopping/flight-offers?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (r.ok) {
                const data = await r.json();
                results = (data.data || []).map(offer => {
                    const itin = offer.itineraries[0];
                    const seg = itin.segments[0];
                    const price = parseFloat(offer.price.total);
                    return {
                        id: `am-${offer.id}`, type: 'flight',
                        carrier: seg.carrierCode,
                        flightNumber: `${seg.carrierCode}${seg.number}`,
                        from: seg.departure.iataCode, to: seg.arrival.iataCode,
                        departureTime: seg.departure.at, arrivalTime: seg.arrival.at,
                        durationMin: parseMins(itin.duration), durationISO: itin.duration,
                        stops: itin.segments.length - 1,
                        price, currency: offer.price.currency, score: 0,
                        bookingUrl: bookingUrl(seg.departure.iataCode, seg.arrival.iataCode, date, 'flight'),
                    };
                });
            }
        } catch (e) {
            console.warn('Amadeus error:', e.message);
        }
    }

    // ── Demo bus/train legs (always added for non-flight modes) ─────────────
    if (mode === 'all' || mode === 'train' || mode === 'bus') {
        const extra = demoData(from, to, date, mode === 'all' ? 'all' : mode)
            .filter(r => r.type !== 'flight');
        results = [...results, ...extra];
    }

    // ── Fallback to full demo if nothing found ───────────────────────────────
    if (results.length === 0) {
        results = demoData(from, to, date, mode);
        demo = true;
    }

    results = rank(results);

    return res.json({
        origin: from, destination: to, date, mode,
        results,
        count: results.length,
        demo,
        responseMs: Date.now() - t0,
    });
};
