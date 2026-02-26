/**
 * providers/amadeus.js
 * Amadeus Flight Offers Search API v2 provider.
 * Returns results in the unified Leg format.
 */

require('dotenv').config({ path: '../../.env' });

let _token = null;
let _tokenExpiry = 0;

async function getToken() {
    if (_token && Date.now() < _tokenExpiry - 60_000) return _token;
    const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.AMADEUS_API_KEY || '',
            client_secret: process.env.AMADEUS_API_SECRET || '',
        }),
    });
    if (!res.ok) throw new Error(`Amadeus auth: ${res.status}`);
    const data = await res.json();
    _token = data.access_token;
    _tokenExpiry = Date.now() + data.expires_in * 1000;
    return _token;
}

/**
 * @param {string} origin  — IATA code
 * @param {string} dest    — IATA code
 * @param {string} date    — YYYY-MM-DD
 * @returns {Leg[]}
 */
async function search(origin, dest, date) {
    const hasKeys = process.env.AMADEUS_API_KEY &&
        process.env.AMADEUS_API_KEY !== 'your_amadeus_key_here';
    if (!hasKeys) return [];

    try {
        const token = await getToken();
        const params = new URLSearchParams({
            originLocationCode: origin,
            destinationLocationCode: dest,
            departureDate: date,
            adults: '1',
            currencyCode: 'EUR',
            max: '15',
        });
        const res = await fetch(
            `https://test.api.amadeus.com/v2/shopping/flight-offers?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return [];
        const data = await res.json();

        return (data.data || []).map(offer => {
            const itin = offer.itineraries[0];
            const seg = itin.segments[0];
            const price = parseFloat(offer.price.total);
            return {
                id: `amadeus-${offer.id}`,
                type: 'flight',
                provider: 'Amadeus',
                carrier: seg.carrierCode,
                flightNumber: `${seg.carrierCode}${seg.number}`,
                from: seg.departure.iataCode,
                to: seg.arrival.iataCode,
                departureTime: seg.departure.at,
                arrivalTime: seg.arrival.at,
                duration: itin.duration,          // ISO 8601 e.g. PT2H30M
                stops: itin.segments.length - 1,
                price,
                currency: offer.price.currency,
                reliability: 0.95,                   // Amadeus data quality score
            };
        });
    } catch (err) {
        console.warn('[amadeus] search failed:', err.message);
        return [];
    }
}

module.exports = { search };
