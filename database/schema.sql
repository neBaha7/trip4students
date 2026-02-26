-- ─── airports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airports (
    iata        CHAR(3)      PRIMARY KEY,
    icao        CHAR(4),
    name        VARCHAR(120) NOT NULL,
    city        VARCHAR(80)  NOT NULL,
    country     CHAR(2)      NOT NULL,   -- ISO 3166-1 alpha-2
    lat         DECIMAL(9,6),
    lng         DECIMAL(9,6),
    timezone    VARCHAR(40),
    is_hub      BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── providers ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(60)  NOT NULL UNIQUE,  -- 'Amadeus', 'FlixBus', 'Trainline'
    type         VARCHAR(20)  NOT NULL,          -- 'flight', 'bus', 'train', 'all'
    base_url     TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    reliability  DECIMAL(3,2) DEFAULT 0.90,      -- 0.00–1.00
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── routes (known connections between airports) ────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
    id             SERIAL PRIMARY KEY,
    from_iata      CHAR(3) NOT NULL REFERENCES airports(iata),
    to_iata        CHAR(3) NOT NULL REFERENCES airports(iata),
    provider_id    INT     REFERENCES providers(id),
    type           VARCHAR(20) NOT NULL,   -- flight|train|bus
    avg_price_eur  DECIMAL(8,2),
    avg_duration_m INT,                    -- minutes
    is_direct      BOOLEAN DEFAULT TRUE,
    last_seen      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (from_iata, to_iata, provider_id, type)
);

CREATE INDEX IF NOT EXISTS idx_routes_from ON routes(from_iata);
CREATE INDEX IF NOT EXISTS idx_routes_to   ON routes(to_iata);

-- ─── search_cache (persistent fallback beyond Redis TTL) ────────────────────────
CREATE TABLE IF NOT EXISTS search_cache (
    cache_key    TEXT PRIMARY KEY,          -- 't4s:search:LHR:BCN:2026-05-15:all'
    result_json  JSONB NOT NULL,
    hit_count    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON search_cache(expires_at);

-- ─── users (updated with Clerk field) ──────────────────────────────────────────
-- Run this only if the users table already exists:
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(80) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_student_verified BOOLEAN DEFAULT FALSE;

-- ─── bookings ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         INT REFERENCES users(id) ON DELETE SET NULL,
    carrier         VARCHAR(60),
    flight_number   VARCHAR(20),
    from_iata       CHAR(3),
    to_iata         CHAR(3),
    departure_time  TIMESTAMPTZ,
    arrival_time    TIMESTAMPTZ,
    price_eur       DECIMAL(8,2),
    currency        CHAR(3) DEFAULT 'EUR',
    type            VARCHAR(20),        -- flight|train|bus
    status          VARCHAR(20) DEFAULT 'pending',  -- pending|paid|cancelled
    stripe_session  TEXT,               -- Stripe checkout session ID
    booking_url     TEXT,               -- link to carrier booking page
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ─── Seed providers ─────────────────────────────────────────────────────────────
INSERT INTO providers (name, type, base_url, reliability) VALUES
    ('Amadeus',    'flight', 'https://test.api.amadeus.com', 0.95),
    ('FlixBus',    'bus',    'https://api.flixbus.com',      0.85),
    ('Trainline',  'train',  'https://api.trainline.eu',     0.92)
ON CONFLICT (name) DO NOTHING;
