-- ============================================================
--  Trip4Students — Database Schema
--  Version: 1.0
--  Engine:  PostgreSQL 15+
-- ============================================================

-- Enable UUID generation (PostgreSQL built-in)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    user_id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(255)  NOT NULL,
    email               VARCHAR(255)  NOT NULL UNIQUE,
    password_hash       TEXT          NOT NULL,
    is_student_verified BOOLEAN       NOT NULL DEFAULT FALSE,
    -- Optional student verification metadata
    student_id_url      TEXT,                          -- stored URL of uploaded student card image
    verified_at         TIMESTAMPTZ,                   -- when verification was approved
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users                    IS 'Student accounts and their verification status.';
COMMENT ON COLUMN users.is_student_verified IS 'TRUE when the student card has been reviewed and approved.';
COMMENT ON COLUMN users.student_id_url      IS 'URL of the uploaded student ID image (e.g., S3 object key).';

CREATE INDEX idx_users_email ON users(email);


-- ============================================================
-- 2. FLIGHTS  (populated from external aggregator APIs)
-- ============================================================
CREATE TYPE transport_mode AS ENUM ('flight', 'train', 'bus', 'trolleybus');

CREATE TABLE flights (
    flight_id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_type         transport_mode NOT NULL DEFAULT 'flight',
    carrier                VARCHAR(255)  NOT NULL,          -- airline / train operator / bus company
    flight_number          VARCHAR(20)   NOT NULL,
    departure_station      VARCHAR(10)   NOT NULL,          -- IATA code for flights, station code for trains/buses
    arrival_station        VARCHAR(10)   NOT NULL,
    departure_time         TIMESTAMPTZ   NOT NULL,
    arrival_time           TIMESTAMPTZ   NOT NULL,
    duration_minutes       INT           GENERATED ALWAYS AS (
                               EXTRACT(EPOCH FROM (arrival_time - departure_time)) / 60
                           ) STORED,
    base_price             NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    student_discount_price NUMERIC(10,2)          CHECK (student_discount_price >= 0),
    currency               CHAR(3)       NOT NULL DEFAULT 'EUR',
    seats_available        INT                    CHECK (seats_available >= 0),
    external_id            VARCHAR(255),                    -- ID from source API (de-duplication)
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  flights                         IS 'Available routes fetched from external aggregator APIs.';
COMMENT ON COLUMN flights.transport_type          IS 'Mode of transport: flight, train, bus, trolleybus.';
COMMENT ON COLUMN flights.student_discount_price  IS 'Special price for verified Trip4Students users.';
COMMENT ON COLUMN flights.external_id             IS 'Original ID from the data source; used to prevent duplicate imports.';

CREATE INDEX idx_flights_departure_station ON flights(departure_station);
CREATE INDEX idx_flights_arrival_station   ON flights(arrival_station);
CREATE INDEX idx_flights_departure_time    ON flights(departure_time);
CREATE INDEX idx_flights_transport_type    ON flights(transport_type);


-- ============================================================
-- 3. BOOKINGS  (the "Personal Wallet")
-- ============================================================
CREATE TYPE booking_status AS ENUM (
    'reserved',   -- Booked — Electric Blue / Orange in UI
    'paid',       -- Paid   — Green in UI
    'cancelled',  -- Cancelled
    'completed'   -- Past   — Grey in UI
);

CREATE TABLE bookings (
    booking_id   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID           NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    flight_id    UUID           NOT NULL REFERENCES flights(flight_id) ON DELETE RESTRICT,
    status       booking_status NOT NULL DEFAULT 'reserved',
    pnr_code     VARCHAR(10)    NOT NULL UNIQUE,    -- Passenger Name Record / confirmation code
    booking_date TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    total_price  NUMERIC(10,2)  NOT NULL CHECK (total_price >= 0),
    currency     CHAR(3)        NOT NULL DEFAULT 'EUR',
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  bookings          IS 'Links a user to a flight; the source of truth for the Wallet UI.';
COMMENT ON COLUMN bookings.pnr_code IS '6-10 character confirmation / PNR code for check-in.';
COMMENT ON COLUMN bookings.status   IS 'reserved → paid → completed, or cancelled at any point.';

CREATE INDEX idx_bookings_user_id   ON bookings(user_id);
CREATE INDEX idx_bookings_status    ON bookings(status);


-- ============================================================
-- 4. CHECKLIST_ITEMS  (pre-trip to-do list per booking)
-- ============================================================
CREATE TABLE checklist_items (
    item_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id   UUID         NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    task_name    VARCHAR(255) NOT NULL,
    is_completed BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order   SMALLINT     NOT NULL DEFAULT 0,        -- controls display order in UI
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  checklist_items          IS 'User-editable to-do list associated with a booking.';
COMMENT ON COLUMN checklist_items.sort_order IS 'Ascending integer for custom task ordering inside the UI.';

CREATE INDEX idx_checklist_booking_id ON checklist_items(booking_id);


-- ============================================================
-- 5. FAVORITES  ("Save for later — waiting for the stipend")
-- ============================================================
CREATE TABLE favorites (
    favorite_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    flight_id   UUID        NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, flight_id)   -- prevent duplicate favorites
);

COMMENT ON TABLE favorites IS 'Saved flights: the student wishlist / "waiting for stipend" list.';

CREATE INDEX idx_favorites_user_id ON favorites(user_id);


-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_checklist_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- SEED: default checklist items for every new booking
-- ============================================================
-- Example: insert a booking and seed its checklist via a function
CREATE OR REPLACE FUNCTION seed_checklist(p_booking_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO checklist_items (booking_id, task_name, sort_order) VALUES
        (p_booking_id, 'Online check-in (24h before)',  1),
        (p_booking_id, 'Pack student ID',               2),
        (p_booking_id, 'Download boarding pass',        3),
        (p_booking_id, 'Travel insurance',              4),
        (p_booking_id, 'Airport transfer booked',       5);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Full booking card shape (matches the JSON the frontend consumes)
CREATE OR REPLACE VIEW v_booking_cards AS
SELECT
    b.booking_id,
    b.status,
    b.pnr_code,
    b.total_price,
    b.currency,
    b.booking_date,
    -- User
    u.user_id,
    u.full_name,
    u.is_student_verified,
    -- Flight
    f.transport_type,
    f.carrier,
    f.flight_number,
    f.departure_station,
    f.arrival_station,
    f.departure_time,
    f.arrival_time,
    f.duration_minutes,
    -- UI accent colour derived from status
    CASE b.status
        WHEN 'reserved'  THEN '#FF9500'   -- Orange
        WHEN 'paid'      THEN '#34C759'   -- Green
        WHEN 'cancelled' THEN '#FF3B30'   -- Red
        WHEN 'completed' THEN '#AEAEB2'   -- Grey
    END AS accent_color
FROM bookings b
JOIN users   u ON u.user_id   = b.user_id
JOIN flights f ON f.flight_id = b.flight_id;

COMMENT ON VIEW v_booking_cards IS 'Flat projection of a booking with user, flight, and UI metadata combined.';
