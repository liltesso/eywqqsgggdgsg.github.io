/**
 * Telegram Mini App — Gifts Rental
 * Frontend calls only the bot's backend (/api/*).
 * The backend proxies to api.marketapp.ws and applies the markup.
 *
 * Configure BACKEND_URL before deployment, e.g.:
 *   <script>window.BACKEND_URL = 'https://your-bot-server.example.com';</script>
 *   <script src="rent.js"></script>
 */

const BACKEND_URL = window.BACKEND_URL || '';

const tg = window.Telegram?.WebApp ?? null;

if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0a0a0a');
    tg.setBackgroundColor('#0a0a0a');
}

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
    gifts: [],
    cursor: null,
    hasMore: false,
    loading: false,
    sort: 'popular',
    selectedGift: null,
    duration: 7,
};

// ─── API ──────────────────────────────────────────────────────────────────────

function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (tg?.initData) h['X-Telegram-Init-Data'] = tg.initData;
    return h;
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ─── Load gifts ───────────────────────────────────────────────────────────────

async function loadGifts(reset = false) {
    if (state.loading) return;
    state.loading = true;

    if (reset) {
        state.gifts = [];
        state.cursor = null;
        renderSkeletons();
    }

    const sortMap = {
        popular: 'popular',
        price_asc: 'price',
        price_desc: '-price',
        duration: '-max_duration',
    };

    const params = new URLSearchParams({ limit: 20, sort_by: sortMap[state.sort] || 'popular' });
    if (state.cursor) params.set('cursor', state.cursor);

    try {
        const data = await apiFetch(`/api/rent/gifts?${params}`);

        // Accept either { results: [...], next_cursor } or a plain array
        const items = Array.isArray(data) ? data : (data.results ?? data.items ?? []);
        state.gifts.push(...items);
        state.cursor = data.next_cursor ?? data.cursor ?? null;
        state.hasMore = !!state.cursor;

        renderGrid();
    } catch {
        renderError();
    } finally {
        state.loading = false;
        updateLoadMoreBtn();
    }
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function el(id) {
    return document.getElementById(id);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function pluralDays(n) {
    n = Math.abs(n);
    if (n === 1) return 'день';
    if (n >= 2 && n <= 4) return 'дні';
    return 'днів';
}

// stars per day (price_per_day is in TON; 1 TON ≈ 77 Stars at current rate)
// The backend should ideally send the already-marked-up Stars price directly.
// If the backend sends `stars_per_day`, use it; otherwise fall back to conversion.
function starsPerDay(gift) {
    return gift.stars_per_day ?? Math.ceil((gift.price_per_day ?? gift.min_price ?? 0) * 77);
}

function renderSkeletons() {
    el('gifts-grid').innerHTML = Array(6).fill('<div class="gift-skeleton"></div>').join('');
}

function renderGrid() {
    const grid = el('gifts-grid');

    if (!state.gifts.length) {
        grid.innerHTML = `
            <div class="state-cell">
                <div class="state-icon">🎁</div>
                <div class="state-title">Немає доступних подарунків</div>
                <div class="state-desc">Спробуйте пізніше або змініть фільтр</div>
            </div>`;
        return;
    }

    grid.innerHTML = state.gifts.map((g, i) => giftCardHtml(g, i)).join('');

    grid.querySelectorAll('.gift-card').forEach((card, i) => {
        card.addEventListener('click', () => openModal(state.gifts[i]));
    });
}

function giftCardHtml(g, i) {
    const name = escapeHtml(g.name ?? g.title ?? 'Подарунок');
    const img = escapeHtml(g.image_url ?? g.image ?? g.thumbnail ?? '');
    const spd = starsPerDay(g);
    const minD = g.min_duration ?? 1;
    const maxD = g.max_duration ?? 30;

    const imgMarkup = img
        ? `<img class="gift-card-img" src="${img}" alt="${name}" loading="lazy">`
        : `<div class="gift-card-placeholder">🎁</div>`;

    return `
        <div class="gift-card" data-idx="${i}" role="button" tabindex="0" aria-label="Орендувати ${name}">
            <div class="gift-card-img-wrap">
                ${imgMarkup}
                <div class="gift-card-days-badge">${minD}–${maxD}д</div>
            </div>
            <div class="gift-card-body">
                <div class="gift-card-name">${name}</div>
                <div class="gift-card-footer">
                    <div class="gift-card-price-block">
                        <div class="gift-card-stars">⭐ ${spd}</div>
                        <div class="gift-card-ppd">за день</div>
                    </div>
                    <div class="gift-card-days-label">до<br>${maxD} днів</div>
                </div>
                <button class="gift-card-rent-btn" tabindex="-1">Орендувати</button>
            </div>
        </div>`;
}

function renderError() {
    el('gifts-grid').innerHTML = `
        <div class="state-cell">
            <div class="state-icon">⚠️</div>
            <div class="state-title">Помилка завантаження</div>
            <div class="state-desc">Перевірте з'єднання та спробуйте ще раз</div>
            <button class="state-btn" onclick="loadGifts(true)">Спробувати знову</button>
        </div>`;
}

function updateLoadMoreBtn() {
    el('load-more-container').style.display = state.hasMore ? 'flex' : 'none';
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(gift) {
    state.selectedGift = gift;
    state.duration = gift.min_duration ?? 7;

    const img = gift.image_url ?? gift.image ?? gift.thumbnail ?? '';
    el('modal-img').src = img;
    el('modal-name').textContent = gift.name ?? gift.title ?? 'Подарунок';

    const addr = gift.nft_address ?? '';
    el('modal-addr').textContent = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

    el('modal-ppd-stars').textContent = `⭐ ${starsPerDay(gift)}`;

    const slider = el('duration-slider');
    slider.min = gift.min_duration ?? 1;
    slider.max = gift.max_duration ?? 30;
    slider.value = state.duration;
    updateSliderFill(slider);

    el('duration-min-label').textContent = `${gift.min_duration ?? 1} дн`;
    el('duration-max-label').textContent = `${gift.max_duration ?? 30} дн`;

    refreshTotals();

    el('rental-modal').style.display = 'flex';

    if (tg) {
        tg.HapticFeedback?.impactOccurred('light');
        tg.BackButton.show();
        tg.BackButton.onClick(closeModal);
    }
}

function closeModal() {
    el('rental-modal').style.display = 'none';
    state.selectedGift = null;
    if (tg) tg.BackButton.hide();
}

function refreshTotals() {
    const g = state.selectedGift;
    if (!g) return;

    const days = state.duration;
    const spd = starsPerDay(g);
    const totalStars = spd * days;
    const tonPerDay = g.price_per_day ?? g.min_price ?? 0;
    const totalTon = (tonPerDay * days).toFixed(2);

    el('duration-display').textContent = `${days} ${pluralDays(days)}`;
    el('total-stars').textContent = `⭐ ${totalStars} Stars`;
    el('total-ton').textContent = `≈ ${totalTon} TON`;

    const discountRow = el('discount-row');
    if (days >= 7 && g.discount_pd) {
        const pct = Math.round(g.discount_pd * 100);
        el('discount-text').textContent = `🎉 Знижка ${pct}% за довгострокову оренду`;
        discountRow.style.display = 'block';
    } else {
        discountRow.style.display = 'none';
    }
}

function updateSliderFill(slider) {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const val = Number(slider.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    slider.style.background =
        `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`;
}

// ─── Rental flow ──────────────────────────────────────────────────────────────

async function initiateRental() {
    const g = state.selectedGift;
    if (!g) return;

    const btn = el('rent-btn');
    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:.6">Обробка…</span>';

    if (tg) tg.HapticFeedback?.impactOccurred('medium');

    try {
        const body = {
            nft_address: g.nft_address,
            duration_days: state.duration,
            user_id: tg?.initDataUnsafe?.user?.id ?? null,
        };

        const { invoice_link } = await apiFetch('/api/rent/invoice', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (tg && invoice_link) {
            tg.openInvoice(invoice_link, (status) => {
                if (status === 'paid') {
                    closeModal();
                    showSuccess(g);
                } else {
                    resetRentBtn(btn);
                    if (status !== 'cancelled') {
                        tg.showAlert('Оплата не пройшла. Спробуйте ще раз.');
                    }
                }
            });
        } else {
            // Dev fallback — no Telegram context
            console.warn('Telegram not available; would open invoice:', invoice_link);
            resetRentBtn(btn);
        }
    } catch (err) {
        console.error('Invoice error:', err);
        resetRentBtn(btn);
        if (tg) tg.showAlert('Сталася помилка. Спробуйте пізніше.');
    }
}

function resetRentBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Орендувати`;
}

function showSuccess(gift) {
    const name = gift.name ?? gift.title ?? 'Подарунок';
    el('success-desc').textContent =
        `"${name}" орендовано на ${state.duration} ${pluralDays(state.duration)}. Подарунок вже у вашому Telegram!`;
    el('success-screen').style.display = 'flex';
    if (tg) {
        tg.HapticFeedback?.notificationOccurred('success');
        tg.BackButton.hide();
    }
}

function closeSuccess() {
    el('success-screen').style.display = 'none';
    loadGifts(true);
}

// ─── User chip ────────────────────────────────────────────────────────────────

function initUserChip() {
    const user = tg?.initDataUnsafe?.user;
    if (!user) return;
    const chip = el('user-chip');
    el('user-name').textContent = user.first_name ?? user.username ?? '';
    chip.style.display = 'block';
}

// ─── Event listeners ──────────────────────────────────────────────────────────

el('rental-modal').addEventListener('click', (e) => {
    if (e.target === el('rental-modal')) closeModal();
});

el('duration-slider').addEventListener('input', (e) => {
    state.duration = parseInt(e.target.value, 10);
    updateSliderFill(e.target);
    refreshTotals();
    if (tg) tg.HapticFeedback?.selectionChanged();
});

el('rent-btn').addEventListener('click', initiateRental);
el('success-btn').addEventListener('click', closeSuccess);
el('load-more-btn').addEventListener('click', () => loadGifts(false));

document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.sort = chip.dataset.sort;
        loadGifts(true);
        if (tg) tg.HapticFeedback?.selectionChanged();
    });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

initUserChip();
loadGifts(true);
