/**
 * providers/trainline.js
 * European rail provider (Trainline / Deutsche Bahn / Eurostar etc.)
 * Real API requires commercial agreement with Trainline or individual operators.
 * Returns realistic mock data. Replace `search()` body with live API call.
 */

const TRAIN_ROUTES = [
    { from: 'LHR', to: 'CDG', durationH: 2.5, price: 59.00, carrier: 'Eurostar', stops: 0 },
    { from: 'CDG', to: 'BRU', durationH: 1.5, price: 39.00, carrier: 'Thalys', stops: 0 },
    { from: 'BRU', to: 'AMS', durationH: 1.8, price: 29.00, carrier: 'Thalys', stops: 0 },
    { from: 'AMS', to: 'BER', durationH: 6.0, price: 49.00, carrier: 'ICE', stops: 1 },
    { from: 'BER', to: 'VIE', durationH: 8.0, price: 49.90, carrier: 'Nightjet', stops: 0 },
    { from: 'BER', to: 'PRG', durationH: 4.5, price: 29.00, carrier: 'Deutsche Bahn', stops: 0 },
    { from: 'PRG', to: 'VIE', durationH: 4.0, price: 32.00, carrier: 'ÖBB', stops: 0 },
    { from: 'VIE', to: 'BUD', durationH: 2.5, price: 29.00, carrier: 'Railjet', stops: 0 },
    { from: 'BUD', to: 'BUC', durationH: 8.5, price: 35.00, carrier: 'CFR', stops: 1 },
    { from: 'FRA', to: 'PAR', durationH: 3.7, price: 59.00, carrier: 'TGV', stops: 0 },
    { from: 'FRA', to: 'ZRH', durationH: 3.0, price: 42.00, carrier: 'ICE', stops: 0 },
    { from: 'ZRH', to: 'MIL', durationH: 3.6, price: 45.00, carrier: 'SBB', stops: 0 },
    { from: 'MXP', to: 'FCO', durationH: 3.0, price: 39.00, carrier: 'Frecciarossa', stops: 0 },
    { from: 'WAW', to: 'BER', durationH: 6.5, price: 35.00, carrier: 'PKP IC', stops: 0 },
    { from: 'WAW', to: 'VNO', durationH: 9.0, price: 28.00, carrier: 'LKL', stops: 1 },
    { from: 'RIX', to: 'TLL', durationH: 4.5, price: 19.00, carrier: 'Elron', stops: 0 },
    { from: 'MUC', to: 'VIE', durationH: 4.0, price: 39.00, carrier: 'Railjet', stops: 0 },
    { from: 'MAD', to: 'BCN', durationH: 2.5, price: 45.00, carrier: 'AVE', stops: 0 },
    { from: 'LIS', to: 'MAD', durationH: 9.5, price: 55.00, carrier: 'RENFE', stops: 1 },
    { from: 'CDG', to: 'LYO', durationH: 2.0, price: 35.00, carrier: 'TGV', stops: 0 },
];

function toISO(date, offsetHours) {
    const d = new Date(`${date}T07:00:00`);
    d.setMinutes(d.getMinutes() + offsetHours * 60);
    return d.toISOString().slice(0, 19);
}
function durationISO(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `PT${h}H${m > 0 ? m + 'M' : ''}`;
}

async function search(origin, dest, date) {
    const route = TRAIN_ROUTES.find(r => r.from === origin && r.to === dest) ||
        TRAIN_ROUTES.find(r => r.from === dest && r.to === origin);
    if (!route) return [];

    const depOffset = Math.random() * 8;
    const depTime = toISO(date, depOffset);
    const arrTime = toISO(date, depOffset + route.durationH);

    // Return up to 2 departure options
    const results = [];
    for (let i = 0; i < 2; i++) {
        const dep2 = toISO(date, depOffset + i * 4);
        const arr2 = toISO(date, depOffset + i * 4 + route.durationH);
        results.push({
            id: `train-${origin}-${dest}-${date}-${i}`,
            type: 'train',
            provider: 'Trainline',
            carrier: route.carrier,
            flightNumber: `${route.carrier.slice(0, 3).toUpperCase()}${1000 + i * 111}`,
            from: route.from,
            to: route.to,
            departureTime: dep2,
            arrivalTime: arr2,
            duration: durationISO(route.durationH),
            stops: route.stops,
            price: parseFloat((route.price * (1 + i * 0.15)).toFixed(2)),
            currency: 'EUR',
            reliability: 0.92,
        });
    }
    return results;
}

module.exports = { search };
