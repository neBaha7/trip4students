// -------------------------
// Constants & State
// -------------------------
const TRANSLATIONS = {
    en: {
        "nav-search": "Search",
        "nav-wallet": "Wallet",
        "hero-title": "Where are we flying this time?",
        "hero-subtitle": "The best student prices in one tap.",
        "mode-all": "🌍 All",
        "mode-flights": "✈️ Flights",
        "mode-trains": "🚆 Trains",
        "mode-buses": "🚌 Buses",
        "input-from": "From",
        "input-to": "To",
        "calendar-title": "Flexible Dates",
        "calendar-subtext": "Best prices in green",
        "search-btn": "Find Tickets",
        "search-hint": "We show only verified student fares.",
        "filter-best": "Best Value. Perfect for your budget.",
        "filter-fast": "Fastest. Make it to class.",
        "filter-eco": "Student Pick. More baggage, less money.",
        "flight-direct": "Direct",
        "price-tag": "Low price. Book now.",
        "btn-select": "Select",
        "wallet-title": "My Trips",
        "wallet-trip-to": "Trip to",
        "status-booked": "Almost ready. Pay within 2 hours.",
        "wallet-date": "Date",
        "wallet-departs": "Departs",
        "checklist-title": "Forgotten anything?",
        "check-1": "Student ID (ISIC). They check it at boarding.",
        "check-2": "Flight check-in. Opens 24 hours before.",
        "check-3": "Passport & visa. Just in case.",
        "status-paid": "Have a great flight!",
        "status-past": "Past",
        "wallet-completed": "That was awesome. Where to next?",
        "wallet-empty-title": "The world is waiting for you.",
        "wallet-empty-msg": "Start with your first trip search.",
        "empty-title": "No trips found.",
        "empty-msg": "Try different dates or another destination.",
        "empty-btn": "Try different dates",
        "cookie-text": "We use cookies to give you the best student travel experience. \uD83C\uDF6A",
        "cookie-accept": "Accept all",
        "cookie-decline": "Essential only"
    },
    ru: {
        "nav-search": "Поиск",
        "nav-wallet": "Билеты",
        "hero-title": "Куда летим в этот раз?",
        "hero-subtitle": "Лучшие цены для студентов в один тап.",
        "mode-all": "🌍 Все",
        "mode-flights": "✈️ Авиа",
        "mode-trains": "🚆 Поезда",
        "mode-buses": "🚌 Автобусы",
        "input-from": "Откуда?",
        "input-to": "Куда?",
        "calendar-title": "Гибкие даты",
        "calendar-subtext": "Выгодные дни выделены",
        "search-btn": "Найти билеты",
        "search-hint": "Показываем только проверенные студенческие тарифы.",
        "filter-best": "Самый выгодный. Идеально для бюджета.",
        "filter-fast": "Самый быстрый. Успеешь на пары.",
        "filter-eco": "Студ-выбор. Больше багажа за меньшие деньги.",
        "flight-direct": "Прямой",
        "price-tag": "Низкая цена. Рекомендуем брать сейчас.",
        "btn-select": "Выбрать",
        "wallet-title": "Мои поездки",
        "wallet-trip-to": "Поездка в",
        "status-booked": "Почти готово. Оплатите в течение 2 часов.",
        "wallet-date": "Дата",
        "wallet-departs": "Отправление",
        "checklist-title": "Ничего не забыли?",
        "check-1": "Студенческий билет (ISIC). Проверят при посадке.",
        "check-2": "Регистрация на рейс. Откроется через 24 часа.",
        "check-3": "Паспорт и виза. Просто на всякий случай.",
        "status-paid": "Приятного полёта!",
        "status-past": "Прошедшее",
        "wallet-completed": "Это было круто. Куда дальше?",
        "wallet-empty-title": "Мир ждёт тебя.",
        "wallet-empty-msg": "Начни с поиска первого путешествия.",
        "empty-title": "Ничего не найдено.",
        "empty-msg": "Попробуй другие даты или другой маршрут.",
        "empty-btn": "Попробовать другие даты",
        "cookie-text": "Мы используем cookies, чтобы сделать путешествия ещё удобнее. \uD83C\uDF6A",
        "cookie-accept": "Принять всё",
        "cookie-decline": "Только необходимые"
    }
};

let currentLang = 'en';

document.addEventListener('DOMContentLoaded', () => {
    // ── Set default date to tomorrow ─────────────────────────
    const dateInput = document.getElementById('selected-date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0]; // block past dates in picker
    }

    // -------------------------
    // Navigation Logic
    // -------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all views
            views.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });

            // Show target view
            const targetId = item.getAttribute('data-target');
            const targetView = document.getElementById(targetId);

            targetView.classList.remove('hidden');
            // Small delay to allow display block to apply before animating opacity
            setTimeout(() => {
                targetView.classList.add('active');
            }, 10);
        });
    });

    // -------------------------
    // Generate Calendar Slider
    // -------------------------
    const track = document.getElementById('calendar-track');
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate 14 days starting from today
    for (let i = 0; i < 14; i++) {
        let date = new Date();
        date.setDate(today.getDate() + i);

        let price = Math.floor(Math.random() * 150) + 30; // Random price 30 - 180
        let isBestPrice = price < 50;

        const card = document.createElement('div');
        card.className = `date-card ${isBestPrice ? 'best-price' : ''} ${i === 1 ? 'active' : ''}`;

        card.innerHTML = `
            <span class="day">${days[date.getDay()]}</span>
            <span class="date">${date.getDate()}</span>
            <span class="price">€${price}</span>
        `;

        track.appendChild(card);
    }

    // -------------------------
    // Date Cards Selection
    // -------------------------
    const dateCards = document.querySelectorAll('.date-card');
    dateCards.forEach(card => {
        card.addEventListener('click', () => {
            dateCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // -------------------------
    // Transport Mode Selection
    // -------------------------
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // -------------------------
    // Custom Filters Logic
    // -------------------------
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // -------------------------
    // Anti-gravity 3D Effect for Flight Cards
    // -------------------------
    const flightCards = document.querySelectorAll('.flight-card');

    flightCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element.
            const y = e.clientY - rect.top;  // y position within the element.

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // max rotation 5deg
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });

    // -------------------------
    // Theme Toggle Logic
    // -------------------------
    const themeToggleBtn = document.getElementById('theme-toggle');
    const rootEl = document.documentElement;

    // Check initial OS preference or stored theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = prefersDark ? 'dark' : 'light';

    // Set explicit theme for consistency
    rootEl.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        rootEl.setAttribute('data-theme', currentTheme);
        updateThemeIcon(currentTheme);
    });

    function updateThemeIcon(theme) {
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // -------------------------
    // Language Toggle Logic
    // -------------------------
    const langToggleBtn = document.getElementById('lang-toggle');

    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ru' : 'en';
        langToggleBtn.textContent = currentLang === 'en' ? 'RU' : 'EN';

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (TRANSLATIONS[currentLang][key]) {
                el.textContent = TRANSLATIONS[currentLang][key];
            }
        });

        // Update specific input placeholders
        const inputFrom = document.getElementById('input-from-el');
        const inputTo = document.getElementById('input-to-el');

        if (inputFrom && inputTo) {
            inputFrom.setAttribute('placeholder', currentLang === 'en' ? "City or Airport" : "Город или Аэропорт");
            inputTo.setAttribute('placeholder', currentLang === 'en' ? "Where are you going?" : "Куда вы направляетесь?");
        }
    });

    // -------------------------
    // Cookie Consent
    // -------------------------
    const cookieBanner = document.getElementById('cookie-banner');
    const cookieAccept = document.getElementById('cookie-accept');
    const cookieDecline = document.getElementById('cookie-decline');

    if (localStorage.getItem('cookie_consent')) {
        cookieBanner.classList.add('hidden');
    }

    cookieAccept.addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'all');
        cookieBanner.classList.add('hidden');
    });

    cookieDecline.addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'essential');
        cookieBanner.classList.add('hidden');
    });

    // -------------------------
    // Form Validation + Search
    // -------------------------
    const searchForm = document.getElementById('search-form');
    const inputFrom = document.getElementById('input-from-el');
    const inputTo = document.getElementById('input-to-el');
    const fromError = document.getElementById('from-error');
    const toError = document.getElementById('to-error');
    const flightsList = document.getElementById('flights-list');
    const emptyState = document.getElementById('empty-state');

    function showError(input, errorEl, msg) {
        input.classList.add('invalid');
        errorEl.textContent = msg;
        errorEl.classList.add('visible');
    }

    function clearError(input, errorEl) {
        input.classList.remove('invalid');
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
    }

    // Clear errors on input
    [inputFrom, inputTo].forEach(inp => {
        inp.addEventListener('input', () => {
            clearError(inp, inp === inputFrom ? fromError : toError);
        });
    });

    // Validate: at least 2 letters, no pure numbers
    function isValidLocation(val) {
        return val.trim().length >= 2 && !/^\d+$/.test(val.trim());
    }

    document.getElementById('search-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        let valid = true;

        if (!isValidLocation(inputFrom.value)) {
            const msg = currentLang === 'ru'
                ? 'Введите название города или аэропорта'
                : 'Please enter a valid city or airport';
            showError(inputFrom, fromError, msg);
            valid = false;
        }

        if (!isValidLocation(inputTo.value)) {
            const msg = currentLang === 'ru'
                ? 'Введите название пункта назначения'
                : 'Please enter a valid destination';
            showError(inputTo, toError, msg);
            valid = false;
        }

        if (!valid) return;

        // ── 1. Show skeleton loaders ──────────────────────────────────
        const skeletonHTML = `
            <div class="flight-card skeleton-card" aria-hidden="true">
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line medium"></div>
            </div>
            <div class="flight-card skeleton-card" aria-hidden="true">
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line medium"></div>
            </div>`;

        flightsList.innerHTML = skeletonHTML;
        emptyState.classList.add('hidden');

        // ── 2. Build query params ─────────────────────────────────────
        // Extract IATA code if user typed "London (LHR)" → "LHR"
        function extractIATA(val) {
            const match = val.match(/\(([A-Z]{3})\)/);
            if (match) return match[1];
            return val.trim().toUpperCase().slice(0, 3);
        }

        const from = extractIATA(inputFrom.value);
        const to = extractIATA(inputTo.value);
        const dateEl = document.getElementById('selected-date');
        const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
        const activeMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'all';
        const token = localStorage.getItem('auth_token') || '';

        const params = new URLSearchParams({ from, to, date, mode: activeMode });
        // dev → localhost:3001 | Vercel → same origin /api | other → Railway fallback
        const host = window.location.hostname;
        const API_BASE = window.location.port === '8000'
            ? 'http://localhost:3001'
            : host.includes('vercel.app') || host.includes('trip4students.com')
                ? ''                                                    // Vercel: same-origin /api
                : 'https://trip4students-production.up.railway.app';   // Railway fallback

        // ── 3. Fetch from API ─────────────────────────────────────────
        let results = [];
        let apiError = null;

        try {
            const res = await fetch(`${API_BASE}/api/flights/search?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `API error ${res.status}`);
            }

            const data = await res.json();
            results = data.results || [];

        } catch (err) {
            apiError = err.message;
            console.warn('API unreachable, using demo data:', err.message);

            // ── Fallback demo data (shown when server is offline) ──────
            results = [
                {
                    type: 'flight', carrier: 'Ryanair', flightNumber: 'FR1234',
                    from, to,
                    departureTime: `${date}T08:00:00`, arrivalTime: `${date}T11:15:00`,
                    duration: 'PT2H15M', stops: 0,
                    basePrice: 45.00, studentPrice: 39.99, currency: 'EUR'
                },
                {
                    type: 'flight', carrier: 'easyJet', flightNumber: 'U21812',
                    from, to,
                    departureTime: `${date}T14:30:00`, arrivalTime: `${date}T17:50:00`,
                    duration: 'PT2H20M', stops: 0,
                    basePrice: 52.00, studentPrice: null, currency: 'EUR'
                }
            ];
        }

        // ── 4. Render results ─────────────────────────────────────────
        if (results.length === 0) {
            flightsList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        const typeIcon = { flight: '✈️', train: '🚆', bus: '🚌' };

        function parseDuration(iso) {
            // PT2H15M → "2h 15m"
            const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            if (!m) return iso;
            const h = m[1] ? `${m[1]}h ` : '';
            const min = m[2] ? `${m[2]}m` : '';
            return (h + min).trim();
        }

        function fmtTime(isoStr) {
            const d = new Date(isoStr);
            return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }

        // ── Official booking URL per carrier ──────────────────────────
        function bookingUrl(f) {
            // Skyscanner date format: YYMMDD  e.g. 2026-05-15 → 260515
            const raw = f.departureTime.slice(0, 10);          // "2026-05-15"
            const skDate = raw.slice(2).replace(/-/g, '');     // "260515"
            const fromIata = f.from.toUpperCase();
            const toIata = f.to.toUpperCase();

            if (f.type === 'train' || f.type === 'bus') {
                // Rome2rio handles trains, buses, ferries — just needs city codes
                return `https://www.rome2rio.com/s/${fromIata}/${toIata}`;
            }

            // Skyscanner flight deep link — accepts IATA codes directly, always works
            return `https://www.skyscanner.net/transport/flights/${fromIata}/${toIata}/${skDate}/?adults=1&children=0&cabinclass=economy`;
        }

        const cardsHTML = results.map(f => {
            const icon = typeIcon[f.type] || '✈️';
            const depTime = fmtTime(f.departureTime);
            const arrTime = fmtTime(f.arrivalTime);
            const duration = parseDuration(f.duration);
            const stopsText = f.stops === 0
                ? (currentLang === 'ru' ? 'Прямой' : 'Direct')
                : `${f.stops} stop${f.stops > 1 ? 's' : ''}`;
            const price = f.studentPrice
                ? `<span class="amount">${f.currency === 'EUR' ? '€' : f.currency}${f.studentPrice.toFixed(2)}</span>
                   <span class="price-tag student-price">${currentLang === 'ru' ? 'Студенческая цена 🎓' : 'Student price 🎓'}</span>`
                : `<span class="amount">${f.currency === 'EUR' ? '€' : f.currency}${f.basePrice.toFixed(2)}</span>
                   <span class="price-tag" data-i18n="price-tag">${TRANSLATIONS[currentLang]['price-tag']}</span>`;
            const btnLabel = TRANSLATIONS[currentLang]['btn-select'];
            const url = bookingUrl(f);

            return `
            <div class="flight-card">
                <div class="airline-info">
                    <span class="airline-logo">${icon}</span>
                    <span class="airline-name">${f.carrier}</span>
                    <span class="flight-num">${f.flightNumber}</span>
                </div>
                <div class="flight-times">
                    <div class="time-block">
                        <span class="time">${depTime}</span>
                        <span class="airport">${f.from}</span>
                    </div>
                    <div class="flight-duration">
                        <span class="duration">${duration}</span>
                        <div class="line"></div>
                        <span class="stops">${stopsText}</span>
                    </div>
                    <div class="time-block">
                        <span class="time">${arrTime}</span>
                        <span class="airport">${f.to}</span>
                    </div>
                </div>
                <div class="flight-price">
                    <div class="price-block">${price}</div>
                    <a class="select-btn" href="${url}" target="_blank" rel="noopener noreferrer"
                       aria-label="Book ${f.carrier} flight on official site">${btnLabel}</a>
                </div>
            </div>`;
        }).join('');

        flightsList.innerHTML = cardsHTML;

        // Re-apply 3D effect to newly rendered cards
        apply3DEffect(document.querySelectorAll('.flight-card:not(.skeleton-card)'));

        // Show banner if we fell back to demo data
        if (apiError) {
            const notice = document.createElement('p');
            notice.className = 'api-notice';
            notice.textContent = currentLang === 'ru'
                ? '⚠️ Сервер недоступен — показаны демо-данные.'
                : '⚠️ Server offline — showing demo data.';
            flightsList.prepend(notice);
        }
    });

});

// ── Standalone 3D tilt helper (called on initial + dynamically generated cards) ──
function apply3DEffect(cards) {
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}
