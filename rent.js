/**
 * Merchant Partners — Gifts Rental & Sale Mini App
 *
 * Talks ONLY to the bot's backend (window.BACKEND_URL):
 *   GET  /api/rent/gifts        GET  /api/sale/gifts
 *   POST /api/rent/checkout     POST /api/sale/checkout
 *
 * Two payment methods:
 *   tonconnect — backend returns an unsigned TON tx; the customer signs it
 *                with their own wallet (TonConnect). Gift lands on their account.
 *   stars      — backend returns a Telegram Stars invoice link.
 */

const BACKEND_URL = window.BACKEND_URL || '';
const tg = window.Telegram?.WebApp ?? null;

if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#0a0a0a');
    tg.setBackgroundColor?.('#0a0a0a');
}

// ─── TonConnect ─────────────────────────────────────────────────────────────

let tonConnectUI = null;
try {
    if (window.TON_CONNECT_UI) {
        tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
            manifestUrl: window.TONCONNECT_MANIFEST,
            buttonRootId: 'ton-connect',
        });
    }
} catch (e) {
    console.warn('TonConnect init failed:', e);
}

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
    mode: 'rent',          // 'rent' | 'sale'
    sort: 'popular',
    method: 'tonconnect',  // 'tonconnect' | 'stars'
    items: [],
    cursor: null,
    hasMore: false,
    loading: false,
    selected: null,
    duration: 7,
};

// ─── API ────────────────────────────────────────────────────────────────────

function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (tg?.initData) h['X-Telegram-Init-Data'] = tg.initData;
    return h;
}

async function api(path, options = {}) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
    }
    return res.json();
}

// ─── Load catalog ───────────────────────────────────────────────────────────

async function loadItems(reset = false) {
    if (state.loading) return;
    state.loading = true;

    if (reset) {
        state.items = [];
        state.cursor = null;
        renderSkeletons();
    }

    const params = new URLSearchParams({ sort: state.sort });
    if (state.cursor) params.set('cursor', state.cursor);
    const endpoint = state.mode === 'rent' ? '/api/rent/gifts' : '/api/sale/gifts';

    try {
        const data = await api(`${endpoint}?${params}`);
        state.items.push(...(data.items || []));
        state.cursor = data.cursor || null;
        state.hasMore = !!state.cursor;
        renderGrid();
    } catch (e) {
        renderError(e.message);
    } finally {
        state.loading = false;
        el('load-more-container').style.display = state.hasMore ? 'flex' : 'none';
    }
}

// ─── Rendering ──────────────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function pluralDays(n) {
    n = Math.abs(n);
    if (n === 1) return 'день';
    if (n >= 2 && n <= 4) return 'дні';
    return 'днів';
}

function renderSkeletons() {
    el('gifts-grid').innerHTML = Array(6).fill('<div class="gift-skeleton"></div>').join('');
}

function renderGrid() {
    const grid = el('gifts-grid');
    if (!state.items.length) {
        grid.innerHTML = stateCell('🎁', 'Нічого не знайдено',
            state.mode === 'rent' ? 'Немає подарунків для оренди' : 'Немає подарунків у продажу');
        return;
    }
    grid.innerHTML = state.items.map((g, i) =>
        state.mode === 'rent' ? rentCard(g, i) : saleCard(g, i)).join('');
    grid.querySelectorAll('.gift-card').forEach((card, i) =>
        card.addEventListener('click', () => openModal(state.items[i])));
}

function imgMarkup(g) {
    return g.image_url
        ? `<img class="gift-card-img" src="${esc(g.image_url)}" alt="${esc(g.name)}" loading="lazy"
             onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'gift-card-placeholder',textContent:'🎁'}))">`
        : `<div class="gift-card-placeholder">🎁</div>`;
}

function rentCard(g, i) {
    return `
        <div class="gift-card" data-idx="${i}" role="button" tabindex="0">
            <div class="gift-card-img-wrap">
                ${imgMarkup(g)}
                <div class="gift-card-days-badge">${g.min_duration_days}–${g.max_duration_days}д</div>
            </div>
            <div class="gift-card-body">
                <div class="gift-card-name">${esc(g.name)}</div>
                <div class="gift-card-footer">
                    <div class="gift-card-price-block">
                        <div class="gift-card-stars">💎 ${g.price_per_day_ton}</div>
                        <div class="gift-card-ppd">TON / день</div>
                    </div>
                    <div class="gift-card-days-label">⭐ ${g.price_per_day_stars}</div>
                </div>
                <button class="gift-card-rent-btn" tabindex="-1">Орендувати</button>
            </div>
        </div>`;
}

function saleCard(g, i) {
    const cur = g.currency || 'TON';
    return `
        <div class="gift-card" data-idx="${i}" role="button" tabindex="0">
            <div class="gift-card-img-wrap">${imgMarkup(g)}</div>
            <div class="gift-card-body">
                <div class="gift-card-name">${esc(g.name)}</div>
                <div class="gift-card-footer">
                    <div class="gift-card-price-block">
                        <div class="gift-card-stars">💎 ${g.price_with_markup}</div>
                        <div class="gift-card-ppd">${esc(cur)}</div>
                    </div>
                    <div class="gift-card-days-label">⭐ ${g.price_stars}</div>
                </div>
                <button class="gift-card-rent-btn" tabindex="-1">Купити</button>
            </div>
        </div>`;
}

function stateCell(icon, title, desc, withRetry = false) {
    return `
        <div class="state-cell">
            <div class="state-icon">${icon}</div>
            <div class="state-title">${esc(title)}</div>
            <div class="state-desc">${esc(desc)}</div>
            ${withRetry ? '<button class="state-btn" onclick="window.__reload()">Спробувати знову</button>' : ''}
        </div>`;
}

function renderError(msg) {
    el('gifts-grid').innerHTML = stateCell('⚠️', 'Помилка завантаження', msg || 'Перевірте з\'єднання', true);
}
window.__reload = () => loadItems(true);

// ─── Modal ──────────────────────────────────────────────────────────────────

function openModal(item) {
    state.selected = item;
    const isRent = state.mode === 'rent';

    el('modal-img').src = item.image_url || '';
    el('modal-name').textContent = item.name || 'Подарунок';
    const a = item.nft_address || '';
    el('modal-addr').textContent = a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

    el('duration-section').style.display = isRent ? 'block' : 'none';

    if (isRent) {
        state.duration = item.min_duration_days || 1;
        el('modal-ppd-stars').textContent = `💎 ${item.price_per_day_ton} TON`;
        el('modal-ppd-label').textContent = '/ день';
        const sl = el('duration-slider');
        sl.min = item.min_duration_days || 1;
        sl.max = item.max_duration_days || 30;
        sl.value = state.duration;
        updateSliderFill(sl);
        el('duration-min-label').textContent = `${item.min_duration_days} дн`;
        el('duration-max-label').textContent = `${item.max_duration_days} дн`;
    } else {
        el('modal-ppd-stars').textContent = `💎 ${item.price_with_markup} ${item.currency || 'TON'}`;
        el('modal-ppd-label').textContent = 'ціна';
    }

    el('rent-btn-text').textContent = isRent ? 'Орендувати' : 'Купити';
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
    state.selected = null;
    if (tg) tg.BackButton.hide();
}

function refreshTotals() {
    const g = state.selected;
    if (!g) return;

    if (state.mode === 'rent') {
        const days = state.duration;
        let total = g.price_per_day_ton * days;
        if (days > 1 && g.discount_per_day) total *= (1 - g.discount_per_day);
        total = Math.round(total * 1000) / 1000;
        const stars = g.price_per_day_stars * days;
        el('duration-display').textContent = `${days} ${pluralDays(days)}`;
        el('total-ton').textContent = `💎 ${total} TON`;
        el('total-stars').textContent = `≈ ⭐ ${stars} Stars`;

        const dr = el('discount-row');
        if (days > 1 && g.discount_per_day) {
            el('discount-text').textContent = `🎉 Знижка ${Math.round(g.discount_per_day * 100)}% враховано`;
            dr.style.display = 'block';
        } else dr.style.display = 'none';
    } else {
        el('total-ton').textContent = `💎 ${g.price_with_markup} ${g.currency || 'TON'}`;
        el('total-stars').textContent = `≈ ⭐ ${g.price_stars} Stars`;
        el('discount-row').style.display = 'none';
    }
}

function updateSliderFill(sl) {
    const min = +sl.min, max = +sl.max, val = +sl.value;
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    sl.style.background =
        `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`;
}

// ─── Checkout ───────────────────────────────────────────────────────────────

async function checkout() {
    const g = state.selected;
    if (!g) return;

    const btn = el('rent-btn');
    const original = el('rent-btn-text').textContent;
    btn.disabled = true;
    el('rent-btn-text').textContent = 'Обробка…';
    if (tg) tg.HapticFeedback?.impactOccurred('medium');

    try {
        const endpoint = state.mode === 'rent' ? '/api/rent/checkout' : '/api/sale/checkout';
        const body = state.mode === 'rent'
            ? { nft_address: g.nft_address, duration_days: state.duration, method: state.method }
            : { nft_address: g.nft_address, method: state.method };

        const resp = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });

        if (resp.method === 'stars') {
            await payWithStars(resp, g, btn, original);
        } else {
            await payWithTon(resp, g, btn, original);
        }
    } catch (e) {
        console.error(e);
        resetBtn(btn, original);
        notify(e.message || 'Сталася помилка. Спробуйте пізніше.');
    }
}

async function payWithTon(resp, g, btn, original) {
    if (!tonConnectUI) {
        resetBtn(btn, original);
        notify('Підключіть TON-гаманець (кнопка зверху), щоб оплатити.');
        return;
    }
    if (!tonConnectUI.connected) {
        resetBtn(btn, original);
        await tonConnectUI.openModal();
        notify('Підключіть гаманець і повторіть оплату.');
        return;
    }
    try {
        await tonConnectUI.sendTransaction({
            validUntil: resp.transaction.valid_until || Math.floor(Date.now() / 1000) + 300,
            messages: resp.transaction.messages.map((m) => ({
                address: m.address,
                amount: m.amount,
                payload: m.payload || undefined,
                stateInit: m.stateInit || undefined,
            })),
        });
        closeModal();
        showSuccess(g);
    } catch (e) {
        resetBtn(btn, original);
        if (!/reject|cancel/i.test(e?.message || '')) notify('Транзакцію не підтверджено.');
    }
}

async function payWithStars(resp, g, btn, original) {
    if (tg && resp.invoice_link) {
        tg.openInvoice(resp.invoice_link, (status) => {
            if (status === 'paid') {
                closeModal();
                showSuccess(g);
            } else {
                resetBtn(btn, original);
                if (status !== 'cancelled') notify('Оплата не пройшла.');
            }
        });
    } else {
        resetBtn(btn, original);
        notify('Stars-оплата доступна лише всередині Telegram.');
    }
}

function resetBtn(btn, text) {
    btn.disabled = false;
    el('rent-btn-text').textContent = text;
}

function notify(msg) {
    if (tg) tg.showAlert(msg);
    else alert(msg);
}

// ─── Success ────────────────────────────────────────────────────────────────

function showSuccess(g) {
    const isRent = state.mode === 'rent';
    el('success-title').textContent = isRent ? 'Оренду оформлено!' : 'Покупку оформлено!';
    el('success-desc').textContent = isRent
        ? `"${g.name}" орендовано на ${state.duration} ${pluralDays(state.duration)}. Подарунок вже на вашому акаунті!`
        : `"${g.name}" придбано. Подарунок зараховано на ваш акаунт!`;
    el('success-screen').style.display = 'flex';
    if (tg) { tg.HapticFeedback?.notificationOccurred('success'); tg.BackButton.hide(); }
}

function closeSuccess() {
    el('success-screen').style.display = 'none';
    loadItems(true);
}

// ─── Mode / sort switching ──────────────────────────────────────────────────

function setMode(mode) {
    state.mode = mode;
    state.sort = mode === 'rent' ? 'popular' : 'price_asc';
    document.querySelectorAll('.r-tab').forEach((t) =>
        t.classList.toggle('active', t.dataset.mode === mode));
    document.querySelectorAll('.rent-only').forEach((e) =>
        e.style.display = mode === 'rent' ? '' : 'none');
    document.querySelectorAll('.filter-chip').forEach((c) =>
        c.classList.toggle('active', c.dataset.sort === state.sort));
    loadItems(true);
}

// ─── Wire up ────────────────────────────────────────────────────────────────

el('rental-modal').addEventListener('click', (e) => {
    if (e.target === el('rental-modal')) closeModal();
});

el('duration-slider').addEventListener('input', (e) => {
    state.duration = parseInt(e.target.value, 10);
    updateSliderFill(e.target);
    refreshTotals();
    if (tg) tg.HapticFeedback?.selectionChanged();
});

el('rent-btn').addEventListener('click', checkout);
el('success-btn').addEventListener('click', closeSuccess);
el('load-more-btn').addEventListener('click', () => loadItems(false));

document.querySelectorAll('.r-tab').forEach((t) =>
    t.addEventListener('click', () => { setMode(t.dataset.mode); if (tg) tg.HapticFeedback?.selectionChanged(); }));

document.querySelectorAll('.filter-chip').forEach((chip) =>
    chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.sort = chip.dataset.sort;
        loadItems(true);
        if (tg) tg.HapticFeedback?.selectionChanged();
    }));

document.querySelectorAll('.method-btn').forEach((b) =>
    b.addEventListener('click', () => {
        document.querySelectorAll('.method-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        state.method = b.dataset.method;
        const d = el('modal-disclaimer');
        d.textContent = state.method === 'tonconnect'
            ? 'Оплата TON-гаманцем: подарунок одразу зараховується на ваш акаунт.'
            : 'Оплата Telegram Stars: видача обробляється сервісом після оплати.';
        if (tg) tg.HapticFeedback?.selectionChanged();
    }));

// ─── Init ───────────────────────────────────────────────────────────────────

loadItems(true);
