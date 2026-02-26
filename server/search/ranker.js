/**
 * ranker.js
 * Scores and ranks unified search results.
 *
 * Formula (0–1, higher = better):
 *   score = 0.50 × (1 - normalizedPrice)
 *         + 0.30 × (1 - normalizedDuration)
 *         + 0.15 × (1 - normalizedStops)
 *         + 0.05 × reliability
 *
 * Normalisation: each dimension is min-max scaled across the result set.
 */

function minMax(arr, key) {
    const vals = arr.map(r => r[key]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { min, max, range: max - min || 1 };
}

/**
 * @param {Object[]} results  — aggregated legs
 * @returns {Object[]}        — sorted by score descending (index 0 = best)
 */
function rank(results) {
    if (!results.length) return [];

    const price = minMax(results, 'price');
    const dur = minMax(results, 'durationMin');
    const stops = minMax(results, 'stops');

    return results
        .map(r => ({
            ...r,
            score: parseFloat((
                0.50 * (1 - (r.price - price.min) / price.range) +
                0.30 * (1 - (r.durationMin - dur.min) / dur.range) +
                0.15 * (1 - (r.stops - stops.min) / stops.range) +
                0.05 * r.reliability
            ).toFixed(3)),
        }))
        .sort((a, b) => b.score - a.score);
}

module.exports = { rank };
