/**
 * normalizer.js
 * Converts city names / partial codes → canonical IATA / station codes.
 * Uses a static lookup table + Levenshtein fuzzy matching for typos.
 */

// ── IATA lookup table ─────────────────────────────────────────────────────────
const IATA_MAP = {
    // City name → IATA(s) (first entry = main airport)
    'london': ['LHR', 'LGW', 'STN', 'LTN', 'LCY'],
    'paris': ['CDG', 'ORY'],
    'barcelona': ['BCN'],
    'madrid': ['MAD'],
    'amsterdam': ['AMS'],
    'berlin': ['BER'],
    'rome': ['FCO', 'CIA'],
    'milan': ['MXP', 'LIN', 'BGY'],
    'frankfurt': ['FRA'],
    'munich': ['MUC'],
    'zurich': ['ZRH'],
    'vienna': ['VIE'],
    'brussels': ['BRU'],
    'lisbon': ['LIS'],
    'prague': ['PRG'],
    'warsaw': ['WAW'],
    'budapest': ['BUD'],
    'athens': ['ATH'],
    'istanbul': ['IST', 'SAW'],
    'dubai': ['DXB', 'DWC'],
    'new york': ['JFK', 'EWR', 'LGA'],
    'los angeles': ['LAX'],
    'chicago': ['ORD', 'MDW'],
    'toronto': ['YYZ', 'YTZ'],
    'moscow': ['SVO', 'DME', 'VKO'],
    'st petersburg': ['LED'],
    'kyiv': ['KBP'],
    'riga': ['RIX'],
    'tallinn': ['TLL'],
    'vilnius': ['VNO'],
    'helsinki': ['HEL'],
    'oslo': ['OSL'],
    'stockholm': ['ARN', 'NYO'],
    'copenhagen': ['CPH'],
    'reykjavik': ['KEF'],
    'dublin': ['DUB'],
    'edinburgh': ['EDI'],
    'manchester': ['MAN'],
    'dubai': ['DXB'],
    'singapore': ['SIN'],
    'hong kong': ['HKG'],
    'tokyo': ['NRT', 'HND'],
    'bangkok': ['BKK', 'DMK'],
    'bali': ['DPS'],
    'tbilisi': ['TBS'],
    'yerevan': ['EVN'],
    'baku': ['GYD'],
    'almaty': ['ALA'],
    'tashkent': ['TAS'],
};

// Reverse map: IATA code → city name
const CODE_TO_CITY = {};
for (const [city, codes] of Object.entries(IATA_MAP)) {
    for (const code of codes) CODE_TO_CITY[code] = city;
}

// ── Levenshtein distance ──────────────────────────────────────────────────────
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
}

// ── Main normalizer ────────────────────────────────────────────────────────────
/**
 * @param {string} input  — city name or IATA code (e.g. "london", "LHR", "Барселона")
 * @returns {string}      — canonical IATA code (e.g. "LHR")
 */
function normalize(input) {
    if (!input) return null;
    const clean = input.trim().toLowerCase();

    // Direct IATA code (3 uppercase letters)
    if (/^[a-z]{3}$/.test(clean)) return clean.toUpperCase();

    // Exact city match
    if (IATA_MAP[clean]) return IATA_MAP[clean][0];

    // Prefix match (e.g. "barc" → "barcelona")
    const prefixMatch = Object.keys(IATA_MAP).find(k => k.startsWith(clean));
    if (prefixMatch) return IATA_MAP[prefixMatch][0];

    // Fuzzy match — find closest city name
    let bestCity = null, bestDist = Infinity;
    for (const city of Object.keys(IATA_MAP)) {
        const dist = levenshtein(clean, city);
        if (dist < bestDist && dist <= 3) {
            bestDist = dist;
            bestCity = city;
        }
    }
    if (bestCity) return IATA_MAP[bestCity][0];

    // Return as-is (let the provider API handle it)
    return input.toUpperCase();
}

/**
 * @param {string} iata — IATA code
 * @returns {string}    — city name
 */
function cityName(iata) {
    return CODE_TO_CITY[iata.toUpperCase()] || iata;
}

module.exports = { normalize, cityName, IATA_MAP };
