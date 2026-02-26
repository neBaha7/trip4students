/**
 * aggregator.js
 * Merges results from all providers into a single unified format.
 * Deduplicates by flight number + departure time.
 * Adds a Skyscanner booking URL for each result.
 */

function skyscannerUrl(from, to, date, type) {
    const skDate = date.slice(2).replace(/-/g, ''); // 2026-05-15 → 260515
    if (type === 'flight')
        return `https://www.skyscanner.net/transport/flights/${from}/${to}/${skDate}/?adults=1`;
    return `https://www.rome2rio.com/s/${from}/${to}`;
}

function parseDurationMinutes(iso) {
    // PT2H30M → 150
    const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    return m ? (parseInt(m[1] || 0) * 60) + parseInt(m[2] || 0) : 0;
}

/**
 * Merge, deduplicate, and normalise an array of raw provider results.
 * @param {Object[][]} providerResults  — arrays from each provider
 * @param {string}     date             — YYYY-MM-DD (for booking URL)
 * @returns {Object[]}                  — unified, deduplicated results
 */
function aggregate(providerResults, date) {
    const all = providerResults.flat();
    const seen = new Set();
    const unified = [];

    for (const leg of all) {
        const dedupeKey = `${leg.carrier}-${leg.flightNumber}-${leg.departureTime}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        unified.push({
            id: leg.id,
            type: leg.type || 'flight',
            provider: leg.provider || 'Unknown',
            carrier: leg.carrier,
            flightNumber: leg.flightNumber,
            from: leg.from,
            to: leg.to,
            departureTime: leg.departureTime,
            arrivalTime: leg.arrivalTime,
            durationMin: parseDurationMinutes(leg.duration),
            durationISO: leg.duration,
            stops: leg.stops || 0,
            price: parseFloat((leg.price || leg.basePrice || 0).toFixed(2)),
            currency: leg.currency || 'EUR',
            reliability: leg.reliability || 0.8,
            bookingUrl: skyscannerUrl(leg.from, leg.to, date, leg.type),
            score: 0, // filled in by ranker
        });
    }

    return unified;
}

module.exports = { aggregate, parseDurationMinutes };
