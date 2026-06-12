/**
 * Merchant Partners — Gifts Market Mini App
 *
 * Three tabs (Каталог / Замовлення / Профіль) wired to a single backend.
 * Pure ES modules-less code so it runs from any static host (GitHub Pages).
 *
 * Endpoints used (all under window.BACKEND_URL):
 *   GET  /api/rent/gifts                GET  /api/sale/gifts
 *   POST /api/rent/checkout             POST /api/sale/checkout
 *   POST /api/rent/extend
 *   GET  /api/orders                    GET  /api/orders/{id}
 *   POST /api/orders/{id}/confirm       POST /api/orders/{id}/cancel
 *   GET  /health
 */

const BACKEND_URL      = (window.BACKEND_URL || '').replace(/\/$/, '');
const TON_TO_UAH       = window.TON_TO_UAH || 180;
const MERCHANT_WALLET  = window.MERCHANT_WALLET || '';
const tg = window.Telegram?.WebApp ?? null;

function tonToUah(ton) {
    const uah = Math.round(parseFloat(ton || 0) * TON_TO_UAH);
    return uah.toLocaleString('uk-UA') + ' ₴';
}

if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#0a0a0a');
    tg.setBackgroundColor?.('#0a0a0a');
    tg.enableClosingConfirmation?.();
}

// ─── TonConnect ─────────────────────────────────────────────────────────────

let tonConnectUI = null;
try {
    if (window.TON_CONNECT_UI) {
        tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
            manifestUrl: window.TONCONNECT_MANIFEST,
            buttonRootId: 'ton-connect',
        });
        tonConnectUI.onStatusChange?.(refreshWalletUi);
    }
} catch (e) {
    console.warn('TonConnect init failed:', e);
}

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
    tab: 'catalog',                  // catalog | orders | settings
    mode: 'rent',                    // rent | sale
    sort: 'popular',
    method: 'tonconnect',            // tonconnect | stars
    query: '',
    items: [],
    cursor: null,
    hasMore: false,
    loading: false,
    selected: null,
    duration: 7,
    ordersKind: '',                  // '' | 'rent' | 'sale'
};

// ─── DOM helpers ────────────────────────────────────────────────────────────

const $  = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pluralDays(n) {
    n = Math.abs(n);
    if (n === 1) return 'день';
    if (n >= 2 && n <= 4) return 'дні';
    return 'днів';
}

function truncAddr(a) {
    if (!a) return '';
    return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

// ─── API ────────────────────────────────────────────────────────────────────

function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (tg?.initData) h['X-Telegram-Init-Data'] = tg.initData;
    return h;
}

async function api(path, options = {}) {
    if (!BACKEND_URL) {
        throw new Error('BACKEND_URL не задано — додайте window.BACKEND_URL у rent.html');
    }
    const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}), 'ngrok-skip-browser-warning': '1' },
    });
    let body = {};
    try { body = await res.json(); } catch { /* may be empty */ }
    if (!res.ok) {
        const msg = body?.error?.message || body?.detail || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.code = body?.error?.code;
        err.status = res.status;
        throw err;
    }
    return body;
}

// ─── Toasts ─────────────────────────────────────────────────────────────────

function toast(message, kind = 'info', durationMs = 3500) {
    const ic = { success: '✅', error: '⚠️', info: '💬' }[kind] || '💬';
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = `<span class="toast-ic">${ic}</span><span>${esc(message)}</span>`;
    $('toasts').appendChild(t);
    setTimeout(() => {
        t.style.transition = 'opacity 0.25s, transform 0.25s';
        t.style.opacity = '0';
        t.style.transform = 'translateY(10px)';
        setTimeout(() => t.remove(), 260);
    }, durationMs);
}

function notify(msg, kind = 'info') {
    // Use Telegram's native dialog only for genuine errors that need attention.
    if (tg && kind === 'error') tg.showAlert(msg);
    else toast(msg, kind);
}

// ─── Catalog ────────────────────────────────────────────────────────────────

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
        $('load-more-container').style.display = state.hasMore ? 'flex' : 'none';
    }
}

function renderSkeletons() {
    $('gifts-grid').innerHTML = Array(6).fill('<div class="gift-skeleton"></div>').join('');
}

function visibleItems() {
    const q = state.query.trim().toLowerCase();
    if (!q) return state.items;
    return state.items.filter((g) =>
        (g.name || '').toLowerCase().includes(q) ||
        (g.nft_address || '').toLowerCase().includes(q));
}

function renderGrid() {
    const grid = $('gifts-grid');
    const items = visibleItems();
    if (!items.length) {
        grid.innerHTML = stateCell(
            '🎁',
            state.query ? 'Нічого не знайдено' : 'Каталог поки порожній',
            state.query ? `За запитом «${esc(state.query)}» немає результатів` : 'Спробуйте інший фільтр',
        );
        return;
    }
    grid.innerHTML = items.map((g, i) =>
        state.mode === 'rent' ? rentCard(g, i) : saleCard(g, i)).join('');
    grid.querySelectorAll('.gift-card').forEach((card) => {
        const idx = +card.dataset.idx;
        card.addEventListener('click', () => openModal(items[idx]));
    });
}

function imgMarkup(g) {
    return g.image_url
        ? `<img class="gift-card-img" src="${esc(g.image_url)}" alt="${esc(g.name)}" loading="lazy"
             onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'gift-card-placeholder',textContent:'🎁'}))">`
        : `<div class="gift-card-placeholder">🎁</div>`;
}

function rentCard(g, i) {
    const uahPerDay = tonToUah(g.price_per_day_ton);
    return `
        <div class="gift-card" data-idx="${i}" role="button" tabindex="0" style="--i:${i}">
            <div class="gift-card-img-wrap">
                ${imgMarkup(g)}
                <div class="gift-card-img-overlay"></div>
                <div class="gift-card-img-glow"></div>
                <div class="gift-card-days-badge">📅 ${g.min_duration_days}–${g.max_duration_days}д</div>
                <div class="gift-card-ton-badge">💎 ${g.price_per_day_ton}</div>
                <div class="gift-card-over">
                    <div class="gift-card-name">${esc(g.name)}</div>
                    <div class="gift-card-price-row">
                        <span class="gift-card-ton">💎 ${g.price_per_day_ton}<span class="cur-label">TON/д</span></span>
                        <span class="gift-card-uah">${uahPerDay}</span>
                    </div>
                </div>
            </div>
            <button class="gift-card-rent-btn" tabindex="-1"><span>Орендувати</span></button>
        </div>`;
}

function saleCard(g, i) {
    const cur = g.currency || 'TON';
    const uah = tonToUah(g.price_with_markup);
    return `
        <div class="gift-card" data-idx="${i}" role="button" tabindex="0" style="--i:${i}">
            <div class="gift-card-img-wrap">
                ${imgMarkup(g)}
                <div class="gift-card-img-overlay"></div>
                <div class="gift-card-img-glow"></div>
                <div class="gift-card-ton-badge">💎 ${g.price_with_markup}</div>
                <div class="gift-card-over">
                    <div class="gift-card-name">${esc(g.name)}</div>
                    <div class="gift-card-price-row">
                        <span class="gift-card-ton">💎 ${g.price_with_markup}<span class="cur-label">${esc(cur)}</span></span>
                        <span class="gift-card-uah">${uah}</span>
                    </div>
                </div>
            </div>
            <button class="gift-card-rent-btn" tabindex="-1"><span>Купити</span></button>
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
    $('gifts-grid').innerHTML = stateCell('⚠️', 'Помилка завантаження', msg || 'Перевірте з\'єднання', true);
}
window.__reload = () => loadItems(true);

// ─── Modal ──────────────────────────────────────────────────────────────────

function openModal(item) {
    state.selected = item;
    const isRent = state.mode === 'rent';

    $('modal-img').src = item.image_url || '';
    $('modal-name').textContent = item.name || 'Подарунок';
    $('modal-addr').textContent = truncAddr(item.nft_address);

    $('duration-section').style.display = isRent ? 'block' : 'none';

    if (isRent) {
        state.duration = item.min_duration_days || 1;
        $('modal-ppd-stars').textContent = `💎 ${item.price_per_day_ton} TON`;
        $('modal-ppd-label').textContent = '/ день';
        const sl = $('duration-slider');
        sl.min = item.min_duration_days || 1;
        sl.max = item.max_duration_days || 30;
        sl.value = state.duration;
        updateSliderFill(sl);
        $('duration-min-label').textContent = `${item.min_duration_days} дн`;
        $('duration-max-label').textContent = `${item.max_duration_days} дн`;
    } else {
        $('modal-ppd-stars').textContent = `💎 ${item.price_with_markup} ${item.currency || 'TON'}`;
        $('modal-ppd-label').textContent = 'ціна';
    }

    $('rent-btn-text').textContent = isRent ? 'Орендувати' : 'Купити';
    refreshTotals();
    $('rental-modal').hidden = false;

    if (tg) {
        tg.HapticFeedback?.impactOccurred('light');
        tg.BackButton.show();
        tg.BackButton.onClick(closeModal);
    }
}

function closeModal() {
    $('rental-modal').hidden = true;
    state.selected = null;
    hideModalError();
    setRentBtnLoading(false);
    if (tg) tg.BackButton.hide();
}

function showModalError(title, desc) {
    const box = $('modal-error');
    if (!box) return;
    $('modal-error-title').textContent = title || 'Не вдалося оформити';
    $('modal-error-desc').textContent = desc || '';
    box.hidden = false;
    // Re-trigger shake animation if shown again
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
}

function hideModalError() {
    const box = $('modal-error');
    if (box) box.hidden = true;
}

function setRentBtnLoading(on, text) {
    const btn = $('rent-btn');
    if (!btn) return;
    btn.disabled = !!on;
    btn.classList.toggle('loading', !!on);
    if (text) $('rent-btn-text').textContent = text;
}

function refreshTotals() {
    const g = state.selected;
    if (!g) return;

    const sec = document.querySelector('.total-section');
    if (sec) {
        sec.classList.remove('bump');
        void sec.offsetWidth;
        sec.classList.add('bump');
    }

    if (state.mode === 'rent') {
        const days = state.duration;
        let total = g.price_per_day_ton * days;
        if (days > 1 && g.discount_per_day) total *= (1 - g.discount_per_day);
        total = Math.round(total * 1000) / 1000;
        $('duration-display').textContent = `${days} ${pluralDays(days)}`;
        $('total-ton').textContent = `💎 ${total} TON`;
        $('total-stars').textContent = `≈ ${tonToUah(total)}`;

        const dr = $('discount-row');
        if (days > 1 && g.discount_per_day) {
            $('discount-text').textContent = `🎉 Знижка ${Math.round(g.discount_per_day * 100)}% враховано`;
            dr.style.display = 'block';
        } else dr.style.display = 'none';
    } else {
        $('total-ton').textContent = `💎 ${g.price_with_markup} ${g.currency || 'TON'}`;
        $('total-stars').textContent = `≈ ${tonToUah(g.price_with_markup)}`;
        $('discount-row').style.display = 'none';
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

    const btn = $('rent-btn');
    const original = state.mode === 'rent' ? 'Орендувати' : 'Купити';
    hideModalError();
    setRentBtnLoading(true, 'Створюємо замовлення…');
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
        console.error('Checkout failed:', e);
        setRentBtnLoading(false, original);
        showCheckoutError(e);
        if (tg) tg.HapticFeedback?.notificationOccurred('error');
    }
}

function showCheckoutError(e) {
    const status = e.status || 0;
    const msg = e.message || 'Сталася невідома помилка';
    let title = 'Не вдалося оформити';
    let desc  = msg;

    if (status === 401 || /init data|telegram/i.test(msg)) {
        title = 'Потрібен Telegram';
        desc  = 'Відкрийте Mini App через бота — без Telegram авторизації оформити неможливо.';
    } else if (status === 404 || /no longer|unavailable|недост/i.test(msg)) {
        title = 'Подарунок щойно став недоступним';
        desc  = 'Імовірно його вже орендували. Поверніться до каталогу і оновіть список.';
    } else if (status === 429 || /rate|обмежує/i.test(msg)) {
        title = 'Забагато запитів';
        desc  = 'Зачекайте 10-20 секунд і спробуйте знову.';
    } else if (status === 502 || /marketapp|upstream/i.test(msg)) {
        title = 'Помилка MarketApp';
        desc  = msg;
    } else if (/fetch|network|backend_url/i.test(msg)) {
        title = 'Немає зв\'язку з бекендом';
        desc  = 'Перевірте, що ngrok-тунель запущено і BACKEND_URL у rent.html актуальний.';
    }
    showModalError(title, desc);
}

function showTopupHint(show) {
    const hint = $('topup-hint');
    if (!hint) return;
    hint.style.display = show ? 'block' : 'none';
    if (show && MERCHANT_WALLET) {
        $('topup-addr').textContent = MERCHANT_WALLET;
    }
}

async function payWithTon(resp, g, btn, original) {
    if (!tonConnectUI) {
        setRentBtnLoading(false, original);
        showTopupHint(true);
        showModalError('Підключіть TON-гаманець', 'TonConnect не ініціалізувався — оновіть сторінку.');
        return;
    }
    if (!tonConnectUI.connected) {
        setRentBtnLoading(false, original);
        showTopupHint(true);
        showModalError('Гаманець не підключено', 'Натисніть «Підключити гаманець» вгорі сторінки, потім повторіть оплату.');
        await tonConnectUI.openModal();
        return;
    }
    showTopupHint(false);
    setRentBtnLoading(true, 'Підпишіть транзакцію в гаманці…');
    let result;
    try {
        result = await tonConnectUI.sendTransaction({
            validUntil: resp.transaction.valid_until || Math.floor(Date.now() / 1000) + 300,
            messages: resp.transaction.messages.map((m) => ({
                address: m.address,
                amount: m.amount,
                payload: m.payload || undefined,
                stateInit: m.stateInit || undefined,
            })),
        });
    } catch (e) {
        setRentBtnLoading(false, original);
        if (!/reject|cancel/i.test(e?.message || '')) {
            showModalError('Транзакцію не підтверджено', e?.message || 'Гаманець відхилив підпис.');
        }
        return;
    }

    setRentBtnLoading(true, 'Підтвердження в мережі TON…');
    const wallet = tonConnectUI.account?.address || null;
    try {
        await api(`/api/orders/${resp.order_id}/confirm`, {
            method: 'POST',
            body: JSON.stringify({ boc: result?.boc || null, wallet_address: wallet }),
        });
    } catch (e) {
        console.warn('confirm submit failed, will still poll:', e);
    }
    const ok = await pollOrder(resp.order_id);
    if (ok) {
        closeModal();
        showSuccess(g);
    } else {
        setRentBtnLoading(false, original);
        notify('Транзакцію надіслано. Дочекайтеся підтвердження в «Замовленнях».', 'info');
        closeModal();
        setTab('orders');
    }
}

async function payWithStars(resp, g, btn, original) {
    if (tg && resp.invoice_link) {
        tg.openInvoice(resp.invoice_link, async (status) => {
            if (status === 'paid') {
                setRentBtnLoading(true, 'Видача подарунка…');
                const ok = await pollOrder(resp.order_id);
                if (ok) {
                    closeModal();
                    showSuccess(g);
                } else {
                    setRentBtnLoading(false, original);
                    notify('Оплату отримано — видача обробляється', 'info');
                }
            } else {
                setRentBtnLoading(false, original);
                if (status !== 'cancelled') showModalError('Оплата не пройшла', 'Telegram повідомив про збій оплати Stars.');
            }
        });
    } else {
        setRentBtnLoading(false, original);
        showModalError('Stars недоступні', 'Stars-оплата доступна лише всередині Telegram Mini App.');
    }
}

async function pollOrder(orderId, { tries = 30, intervalMs = 3000 } = {}) {
    for (let i = 0; i < tries; i++) {
        try {
            const s = await api(`/api/orders/${orderId}`);
            if (s.status === 'fulfilled') return true;
            if (s.status === 'failed' || s.status === 'expired') return false;
        } catch { /* transient — keep polling */ }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
}

function resetBtn(btn, text) {
    setRentBtnLoading(false, text);
}

function showSuccess(g) {
    const isRent = state.mode === 'rent';
    $('success-title').textContent = isRent ? 'Оренду оформлено!' : 'Покупку оформлено!';
    $('success-desc').textContent = isRent
        ? `"${g.name}" орендовано на ${state.duration} ${pluralDays(state.duration)}. Подарунок вже на вашому акаунті!`
        : `"${g.name}" придбано. Подарунок зараховано на ваш акаунт!`;
    $('success-screen').hidden = false;
    if (tg) { tg.HapticFeedback?.notificationOccurred('success'); tg.BackButton.hide(); }
}

function closeSuccess() {
    $('success-screen').hidden = true;
    loadItems(true);
}

// ─── Orders view ────────────────────────────────────────────────────────────

const STATUS_LABEL = {
    created: 'створено',
    awaiting_signature: 'очікує підпису',
    invoiced: 'очікує оплати',
    submitted: 'надіслано',
    confirming: 'підтвердження',
    paid: 'оплачено',
    fulfilled: 'виконано',
    paid_unfulfilled: 'оплачено · видача вручну',
    failed: 'скасовано',
    expired: 'термін минув',
};

async function loadOrders() {
    const list = $('orders-list');
    list.innerHTML = '<div class="gift-skeleton wide"></div><div class="gift-skeleton wide"></div><div class="gift-skeleton wide"></div>';
    try {
        const qs = state.ordersKind ? `?kind=${state.ordersKind}` : '';
        const orders = await api(`/api/orders${qs}`);
        if (!orders.length) {
            list.innerHTML = stateCell('📭', 'Поки немає замовлень', 'Замовляйте подарунки в «Каталозі»');
            return;
        }
        list.innerHTML = orders.map(orderCard).join('');
        list.querySelectorAll('.order-cancel-btn').forEach((b) => {
            b.addEventListener('click', () => cancelOrder(+b.dataset.id));
        });
    } catch (e) {
        list.innerHTML = stateCell('⚠️', 'Помилка', e.message, false);
    }
}

function orderCard(o) {
    const dur = o.kind === 'rent' && o.duration_days ? ` · ${o.duration_days} ${pluralDays(o.duration_days)}` : '';
    const cancelBtn = o.can_cancel
        ? `<button class="order-cancel-btn" data-id="${o.order_id}">скасувати</button>`
        : '';
    const imgContent = o.image_url
        ? `<img src="${esc(o.image_url)}" alt="" loading="lazy" onerror="this.textContent='${o.kind === 'rent' ? '🎁' : '🛒'}';this.style.fontSize='28px'">`
        : (o.kind === 'rent' ? '🎁' : '🛒');
    const uahPrice = o.currency !== 'XTR' ? `<span style="font-size:11px;color:var(--text-muted);margin-left:4px">≈ ${tonToUah(o.our_price)}</span>` : '';
    return `
        <div class="order-card">
            <div class="order-img">${imgContent}</div>
            <div class="order-info">
                <div class="order-name">${esc(o.nft_name || 'Подарунок')}</div>
                <div class="order-meta">${esc(o.kind === 'rent' ? 'Оренда' : 'Купівля')}${dur} · ${esc(truncAddr(o.nft_address))}</div>
                <div class="order-bottom">
                    <span class="badge badge-${esc(o.status)}">${STATUS_LABEL[o.status] || o.status}</span>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <span class="order-price">💎 ${o.our_price}${o.currency === 'XTR' ? ' ⭐' : ''}</span>
                        ${uahPrice}
                        ${cancelBtn}
                    </div>
                </div>
            </div>
        </div>`;
}

async function cancelOrder(id) {
    try {
        await api(`/api/orders/${id}/cancel`, { method: 'POST' });
        notify('Замовлення скасовано', 'success');
        loadOrders();
    } catch (e) {
        notify(e.message, 'error');
    }
}

// ─── Settings view ──────────────────────────────────────────────────────────

async function loadSettings() {
    const user = tg?.initDataUnsafe?.user;
    if (user) {
        $('user-name').textContent = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
        $('user-uid').textContent = user.username ? `@${user.username}` : `id ${user.id}`;
        $('user-avatar').textContent = (user.first_name || '?').charAt(0).toUpperCase();
    }
    refreshWalletUi();

    try {
        const h = await api('/health');
        $('net-info').textContent = h.network === 'testnet' ? 'TON Testnet' : 'TON Mainnet';
        $('markup-info').textContent = `~${h.markup_percent}%`;
    } catch { /* ignore */ }
}

function refreshWalletUi() {
    const btn = $('wallet-action-btn');
    const status = $('wallet-status');
    if (tonConnectUI?.connected) {
        const addr = tonConnectUI.account?.address;
        status.textContent = truncAddr(addr);
        status.style.color = 'var(--green)';
        btn.textContent = 'Від\'єднати гаманець';
        btn.classList.add('disconnect');
    } else {
        status.textContent = 'не підключено';
        status.style.color = '';
        btn.textContent = 'Підключити гаманець';
        btn.classList.remove('disconnect');
    }
}

async function toggleWallet() {
    if (!tonConnectUI) return notify('TonConnect недоступний', 'error');
    if (tonConnectUI.connected) await tonConnectUI.disconnect();
    else                       await tonConnectUI.openModal();
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function setTab(tab) {
    state.tab = tab;
    document.body.dataset.tab = tab;
    $$('.view').forEach((v) => v.classList.toggle('hidden', v.dataset.view !== tab));
    $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));

    if (tab === 'orders') loadOrders();
    else if (tab === 'settings') loadSettings();
    if (tg) tg.HapticFeedback?.selectionChanged();
}

function setMode(mode) {
    state.mode = mode;
    state.sort = mode === 'rent' ? 'popular' : 'price_asc';
    $$('.r-tabs [data-mode]').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
    $$('.rent-only').forEach((e) => e.style.display = mode === 'rent' ? '' : 'none');
    $$('.filter-chip').forEach((c) => c.classList.toggle('active', c.dataset.sort === state.sort));
    loadItems(true);
}

// ─── Wire up ────────────────────────────────────────────────────────────────

$('rental-modal').addEventListener('click', (e) => {
    if (e.target === $('rental-modal')) closeModal();
});

$('duration-slider').addEventListener('input', (e) => {
    state.duration = parseInt(e.target.value, 10);
    updateSliderFill(e.target);
    refreshTotals();
    if (tg) tg.HapticFeedback?.selectionChanged();
});

$('rent-btn').addEventListener('click', checkout);
$('success-btn').addEventListener('click', closeSuccess);
$('load-more-btn').addEventListener('click', () => loadItems(false));
$('wallet-action-btn').addEventListener('click', toggleWallet);
$('modal-error-close')?.addEventListener('click', hideModalError);
$('topup-copy-btn').addEventListener('click', () => {
    const addr = MERCHANT_WALLET;
    if (!addr) return;
    navigator.clipboard?.writeText(addr).then(() => {
        notify('Адресу скопійовано', 'success');
        if (tg) tg.HapticFeedback?.notificationOccurred('success');
    }).catch(() => {
        const el = document.createElement('input');
        el.value = addr; document.body.appendChild(el);
        el.select(); document.execCommand('copy');
        document.body.removeChild(el);
        notify('Адресу скопійовано', 'success');
    });
});

$$('.r-tabs [data-mode]').forEach((t) =>
    t.addEventListener('click', () => setMode(t.dataset.mode)));

$$('.filter-chip').forEach((chip) =>
    chip.addEventListener('click', () => {
        $$('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.sort = chip.dataset.sort;
        loadItems(true);
        if (tg) tg.HapticFeedback?.selectionChanged();
    }));

$$('.method-btn').forEach((b) =>
    b.addEventListener('click', () => {
        $$('.method-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        state.method = b.dataset.method;
        $('modal-disclaimer').textContent = state.method === 'tonconnect'
            ? 'Оплата TON-гаманцем: подарунок одразу зараховується на ваш акаунт.'
            : 'Оплата Telegram Stars: видача обробляється сервісом після оплати.';
        if (tg) tg.HapticFeedback?.selectionChanged();
    }));

$$('.nav-btn').forEach((b) =>
    b.addEventListener('click', () => setTab(b.dataset.tab)));

$$('#orders-filter [data-kind]').forEach((t) =>
    t.addEventListener('click', () => {
        $$('#orders-filter .r-tab').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        state.ordersKind = t.dataset.kind;
        loadOrders();
    }));

let searchTimer;
$('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.query = e.target.value;
        renderGrid();
    }, 150);
});

// ─── Init ───────────────────────────────────────────────────────────────────

loadItems(true);
