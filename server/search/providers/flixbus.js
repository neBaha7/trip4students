/**
 * providers/flixbus.js
 * FlixBus bus route provider.
 * Real FlixBus API requires a commercial partner agreement.
 * This module returns realistic mock data structured as a real integration would.
 * Replace the `_fetchFromAPI` stub with real API calls when access is granted.
 */

// Representative bus routes across Europe (price in EUR)
const BUS_ROUTES = [
    { from: 'LHR', to: 'CDG', durationH: 8.5, price: 15.99, carrier: 'FlixBus', stops: 0 },
    { from: 'CDG', to: 'BCN', durationH: 14.0, price: 24.99, carrier: 'FlixBus', stops: 1 },
    { from: 'BCN', to: 'MAD', durationH: 8.0, price: 12.99, carrier: 'FlixBus', stops: 0 },
    { from: 'MAD', to: 'LIS', durationH: 7.5, price: 14.99, carrier: 'FlixBus', stops: 0 },
    { from: 'BER', to: 'PRG', durationH: 4.5, price: 9.99, carrier: 'FlixBus', stops: 0 },
    { from: 'PRG', to: 'VIE', durationH: 4.0, price: 8.99, carrier: 'FlixBus', stops: 0 },
    { from: 'VIE', to: 'BUD', durationH: 3.0, price: 7.99, carrier: 'FlixBus', stops: 0 },
    { from: 'BUD', to: 'BRU', durationH: 16.0, price: 29.99, carrier: 'FlixBus', stops: 2 },
    { from: 'WAW', to: 'BER', durationH: 8.0, price: 14.99, carrier: 'FlixBus', stops: 0 },
    { from: 'RIX', to: 'TLL', durationH: 4.5, price: 9.99, carrier: 'Lux Express', stops: 0 },
    { from: 'TLL', to: 'HEL', durationH: 2.5, price: 34.99, carrier: 'Tallink', stops: 0 }, // ferry
    { from: 'VNO', to: 'WAW', durationH: 9.0, price: 12.99, carrier: 'FlixBus', stops: 0 },
    { from: 'AMS', to: 'BER', durationH: 6.5, price: 14.99, carrier: 'FlixBus', stops: 0 },
    { from: 'AMS', to: 'BRU', durationH: 3.0, price: 6.99, carrier: 'FlixBus', stops: 0 },
    { from: 'BRU', to: 'PAR', durationH: 4.0, price: 8.99, carrier: 'FlixBus', stops: 0 },
    { from: 'FRA', to: 'AMS', durationH: 5.5, price: 12.99, carrier: 'FlixBus', stops: 0 },
    { from: 'MUC', to: 'VIE', durationH: 4.5, price: 9.99, carrier: 'FlixBus', stops: 0 },
    { from: 'ZRH', to: 'MUC', durationH: 3.5, price: 11.99, carrier: 'FlixBus', stops: 0 },
];

function toISO(date, offsetHours) {
    const d = new Date(`${date}T06:00:00`);
    d.setMinutes(d.getMinutes() + offsetHours * 60);
    return d.toISOString().slice(0, 19);
}

function durationISO(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `PT${h}H${m > 0 ? m + 'M' : ''}`;
}

async function search(origin, dest, date) {
    const route = BUS_ROUTES.find(r => r.from === origin && r.to === dest) ||
        BUS_ROUTES.find(r => r.from === dest && r.to === origin);
    if (!route) return [];

    const depOffset = 6 + Math.random() * 6; // depart between 06:00–12:00
    const depTime = toISO(date, depOffset - 6);
    const arrTime = toISO(date, depOffset - 6 + route.durationH);

    return [{
        id: `flixbus-${origin}-${dest}-${date}`,
        type: 'bus',
        provider: 'FlixBus',
        carrier: route.carrier,
        flightNumber: `FB${Math.floor(1000 + Math.random() * 9000)}`,
        from: route.from,
        to: route.to,
        departureTime: depTime,
        arrivalTime: arrTime,
        duration: durationISO(route.durationH),
        stops: route.stops,
        price: route.price,
        currency: 'EUR',
        reliability: 0.85,
    }];
}

module.exports = { search };
