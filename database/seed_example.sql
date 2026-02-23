-- ============================================================
--  Trip4Students — Example Seed Data
--  Run AFTER schema.sql
-- ============================================================

-- 1. Create a student user
INSERT INTO users (user_id, full_name, email, password_hash, is_student_verified, verified_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Alex Ivanov',
    'alex@university.de',
    'hashed_password_here',
    TRUE,
    NOW()
);

-- 2. Add a flight (Berlin → Barcelona)
INSERT INTO flights (
    flight_id, transport_type, carrier, flight_number,
    departure_station, arrival_station,
    departure_time, arrival_time,
    base_price, student_discount_price, currency, seats_available
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'flight', 'Ryanair', 'FR1234',
    'BER', 'BCN',
    '2026-05-15 10:30:00+00', '2026-05-15 12:45:00+00',
    62.99, 45.00, 'EUR', 80
);

-- 3. Create a booking (the "Wallet" card)
INSERT INTO bookings (booking_id, user_id, flight_id, status, pnr_code, total_price, currency)
VALUES (
    '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'reserved',
    'T4S9QX',
    45.00,
    'EUR'
);

-- 4. Seed the default checklist for that booking
SELECT seed_checklist('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');

-- 5. Mark "Pack student ID" as done
UPDATE checklist_items
SET is_completed = TRUE
WHERE booking_id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
  AND task_name  = 'Pack student ID';

-- 6. Save a flight to favourites
INSERT INTO favorites (user_id, flight_id)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
);

-- ---------------------------------
-- Query: the exact JSON shape from the spec
-- ---------------------------------
SELECT
    b.booking_id,
    b.status,
    vc.accent_color,
    json_build_object(
        'from', f.departure_station || ' (' || f.departure_station || ')',
        'to',   f.arrival_station   || ' (' || f.arrival_station   || ')',
        'date', f.departure_time
    ) AS flight_details,
    (
        SELECT json_agg(json_build_object('task', ci.task_name, 'done', ci.is_completed)
                        ORDER BY ci.sort_order)
        FROM checklist_items ci
        WHERE ci.booking_id = b.booking_id
    ) AS checklist
FROM bookings b
JOIN flights f ON f.flight_id = b.flight_id
JOIN v_booking_cards vc ON vc.booking_id = b.booking_id
WHERE b.booking_id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
