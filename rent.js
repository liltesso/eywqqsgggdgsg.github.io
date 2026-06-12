/**
 * Gifts Market Mini App — rent.js
 * Three tabs: Catalog / Orders / Profile
 */

const BACKEND_URL     = (window.BACKEND_URL || '').replace(/\/$/, '');
const TON_TO_UAH      = window.TON_TO_UAH || 180;
const MERCHANT_WALLET = window.MERCHANT_WALLET || '';
const tg = window.Telegram?.WebApp ?? null;

// ─── i18n ────────────────────────────────────────────────────────────────────

const TR = {
    uk: {
        catalog:'Каталог', orders:'Замовлення', profile:'Профіль',
        rent:'Оренда', sale:'Продаж',
        popular:'Популярні', cheaper:'Дешевші', pricier:'Дорожчі', longer:'Довший термін',
        search:'Пошук подарунків…', load_more:'Завантажити ще',
        rent_btn:'Орендувати', buy_btn:'Купити',
        total:'Разом', rent_days:'Термін оренди',
        ton_payment:'Оплата TON',
        connect_wallet:'Підключити гаманець', disconnect_wallet:'Від\'єднати гаманець',
        ton_wallet:'TON-гаманець',
        filters:'Фільтри', reset_all:'Скинути', apply_filters:'Застосувати',
        collection:'Колекція', model:'Модель', backdrop:'Фон', symbol:'Символ', all:'Усі',
        view_on_fragment:'Переглянути NFT',
        per_day:'/ день', price_label:'ціна',
        topup_title:'💳 Як поповнити гаманець',
        topup_desc:'Переведіть TON на адресу або купіть через Tonkeeper / @wallet',
        copy_addr:'Скопіювати адресу',
        great:'Чудово!', about:'Про сервіс', network:'Мережа', fee:'Комісія',
        language_label:'Мова',
        err_no_backend:'BACKEND_URL не задано — додайте window.BACKEND_URL у rent.html',
        err_marketapp_setup:'Налаштуйте MarketApp: зайдіть на marketapp.ws, підключіть гаманець і вручну орендуйте будь-який NFT.',
        sign_tx:'Підпишіть транзакцію…', confirming_net:'Підтвердження в мережі…',
        creating_order:'Створюємо замовлення…',
        success_rent:'Оренду оформлено!', success_sale:'Покупку оформлено!',
        alerts_tab:'Тривоги', alerts_calm:'Тихо', alerts_no_threats:'Активних загроз не зафіксовано',
        alerts_no_threats_long:'Активних загроз немає. Бережіть себе.',
        alerts_active:'Активні загрози', alerts_recent:'Останні атаки',
        alerts_disclaimer:'⚠️ Дані mapa.ua наближені. Не використовуйте для прийняття рішень — слідкуйте за офіційними джерелами.',
        legend_threat:'Загроза', legend_city:'Місто',
    },
    en: {
        catalog:'Catalog', orders:'Orders', profile:'Profile',
        rent:'Rent', sale:'Sale',
        popular:'Popular', cheaper:'Cheapest', pricier:'Priciest', longer:'Longest',
        search:'Search gifts…', load_more:'Load more',
        rent_btn:'Rent', buy_btn:'Buy',
        total:'Total', rent_days:'Rental period',
        ton_payment:'Pay with TON',
        connect_wallet:'Connect wallet', disconnect_wallet:'Disconnect',
        ton_wallet:'TON Wallet',
        filters:'Filters', reset_all:'Reset', apply_filters:'Apply',
        collection:'Collection', model:'Model', backdrop:'Backdrop', symbol:'Symbol', all:'All',
        view_on_fragment:'View NFT',
        per_day:'/ day', price_label:'price',
        topup_title:'💳 How to top up',
        topup_desc:'Transfer TON to the address below or buy via Tonkeeper / @wallet',
        copy_addr:'Copy address',
        great:'Great!', about:'About', network:'Network', fee:'Fee',
        language_label:'Language',
        err_no_backend:'BACKEND_URL is not set — add window.BACKEND_URL to rent.html',
        err_marketapp_setup:'Setup required: go to marketapp.ws, connect your wallet, and manually rent any NFT first.',
        sign_tx:'Sign transaction…', confirming_net:'Confirming on-chain…',
        creating_order:'Creating order…',
        success_rent:'Rental confirmed!', success_sale:'Purchase confirmed!',
        alerts_tab:'Alerts', alerts_calm:'All calm', alerts_no_threats:'No active threats',
        alerts_no_threats_long:'No active threats. Stay safe.',
        alerts_active:'Active threats', alerts_recent:'Recent attacks',
        alerts_disclaimer:'⚠️ mapa.ua data is approximate. Don\'t use for safety decisions — follow official sources.',
        legend_threat:'Threat', legend_city:'City',
    },
    ru: {
        catalog:'Каталог', orders:'Заказы', profile:'Профиль',
        rent:'Аренда', sale:'Продажа',
        popular:'Популярные', cheaper:'Дешевле', pricier:'Дороже', longer:'Дольше',
        search:'Поиск подарков…', load_more:'Загрузить ещё',
        rent_btn:'Арендовать', buy_btn:'Купить',
        total:'Итого', rent_days:'Срок аренды',
        ton_payment:'Оплата TON',
        connect_wallet:'Подключить кошелёк', disconnect_wallet:'Отключить кошелёк',
        ton_wallet:'TON-кошелёк',
        filters:'Фильтры', reset_all:'Сбросить', apply_filters:'Применить',
        collection:'Коллекция', model:'Модель', backdrop:'Фон', symbol:'Символ', all:'Все',
        view_on_fragment:'Смотреть NFT',
        per_day:'/ день', price_label:'цена',
        topup_title:'💳 Как пополнить кошелёк',
        topup_desc:'Переведите TON на адрес ниже или купите через Tonkeeper / @wallet',
        copy_addr:'Скопировать адрес',
        great:'Отлично!', about:'О сервисе', network:'Сеть', fee:'Комиссия',
        language_label:'Язык',
        err_no_backend:'BACKEND_URL не задан — добавьте window.BACKEND_URL в rent.html',
        err_marketapp_setup:'Настройте MarketApp: зайдите на marketapp.ws, подключите кошелёк и вручную арендуйте любой NFT.',
        sign_tx:'Подпишите транзакцию…', confirming_net:'Подтверждение в сети…',
        creating_order:'Создаём заказ…',
        success_rent:'Аренда оформлена!', success_sale:'Покупка оформлена!',
        alerts_tab:'Тревоги', alerts_calm:'Спокойно', alerts_no_threats:'Активных угроз нет',
        alerts_no_threats_long:'Активных угроз нет. Берегите себя.',
        alerts_active:'Активные угрозы', alerts_recent:'Последние атаки',
        alerts_disclaimer:'⚠️ Данные mapa.ua приближённые. Не используйте для решений — следите за официальными источниками.',
        legend_threat:'Угроза', legend_city:'Город',
    },
};

let lang = localStorage.getItem('gm_lang') || 'uk';

function t(key) {
    return TR[lang]?.[key] ?? TR.uk[key] ?? key;
}

function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.dataset.i18n;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = t(k);
        else el.textContent = t(k);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPh);
    });
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    if ($('rent-btn-text') && state.selected) {
        $('rent-btn-text').textContent = state.mode === 'rent' ? t('rent_btn') : t('buy_btn');
    }
    $('modal-ppd-label').textContent = state.mode === 'rent' ? t('per_day') : t('price_label');
    $('modal-disclaimer').textContent = t('ton_payment') + ': NFT зараховується на ваш акаунт після підтвердження.';
}

// ─── Telegram ────────────────────────────────────────────────────────────────

if (tg) {
    tg.ready(); tg.expand();
    tg.setHeaderColor?.('#080808');
    tg.setBackgroundColor?.('#080808');
    tg.enableClosingConfirmation?.();
}

// ─── TonConnect ──────────────────────────────────────────────────────────────

let tonConnectUI = null;
try {
    if (window.TON_CONNECT_UI) {
        tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
            manifestUrl: window.TONCONNECT_MANIFEST,
            buttonRootId: 'ton-connect',
        });
        tonConnectUI.onStatusChange?.(refreshWalletUi);
    }
} catch (e) { console.warn('TonConnect init failed:', e); }

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
    tab: 'catalog',
    mode: 'rent',
    sort: 'popular',
    method: 'tonconnect',
    query: '',
    items: [],
    cursor: null,
    hasMore: false,
    loading: false,
    selected: null,
    duration: 7,
    ordersKind: '',
    filters: { model: null, backdrop: null, symbol: null },
    filterOptions: { models: [], backdrops: [], symbols: [] },
};

// ─── DOM ──────────────────────────────────────────────────────────────────────

const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function pluralDays(n) {
    n = Math.abs(n);
    if (n === 1) return lang === 'en' ? 'day' : 'день';
    if (lang === 'en') return 'days';
    if (n >= 2 && n <= 4) return 'дні';
    return 'днів';
}

function truncAddr(a) {
    if (!a) return '';
    return a.length > 14 ? `${a.slice(0,6)}…${a.slice(-4)}` : a;
}

function tonToUah(ton) {
    const uah = Math.round(parseFloat(ton || 0) * TON_TO_UAH);
    return uah.toLocaleString('uk-UA') + ' ₴';
}

// ─── API ──────────────────────────────────────────────────────────────────────

function authHeaders() {
    const h = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' };
    if (tg?.initData) h['X-Telegram-Init-Data'] = tg.initData;
    return h;
}

async function api(path, options = {}) {
    if (!BACKEND_URL) throw new Error(t('err_no_backend'));
    const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    let body = {};
    try { body = await res.json(); } catch { /* empty */ }
    if (!res.ok) {
        const msg = body?.error?.message || body?.detail || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.code = body?.error?.code;
        err.status = res.status;
        throw err;
    }
    return body;
}

// ─── Toasts ───────────────────────────────────────────────────────────────────

function toast(message, kind = 'info', ms = 3500) {
    const ic = { success:'✅', error:'⚠️', info:'💬' }[kind] || '💬';
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<span class="toast-ic">${ic}</span><span>${esc(message)}</span>`;
    $('toasts').appendChild(el);
    setTimeout(() => {
        el.style.transition = 'opacity 0.25s, transform 0.25s';
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => el.remove(), 260);
    }, ms);
}

function notify(msg, kind = 'info') {
    if (tg && kind === 'error') tg.showAlert(msg);
    else toast(msg, kind);
}

// ─── Scroll-hide header ───────────────────────────────────────────────────────

let lastScrollY = 0, headerHidden = false;
window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (state.tab !== 'catalog') return;
    const hdr = $('catalog-header');
    if (!hdr) return;
    if (y > lastScrollY + 10 && !headerHidden) {
        hdr.classList.add('hide-scroll');
        headerHidden = true;
    } else if (y < lastScrollY - 6 && headerHidden) {
        hdr.classList.remove('hide-scroll');
        headerHidden = false;
    }
    lastScrollY = y;
}, { passive: true });

// ─── Catalog ──────────────────────────────────────────────────────────────────

async function loadItems(reset = false) {
    if (state.loading) return;
    state.loading = true;

    if (reset) {
        state.items = [];
        state.cursor = null;
        renderSkeletons();
        window.scrollTo({ top: 0 });
        if (headerHidden) { $('catalog-header')?.classList.remove('hide-scroll'); headerHidden = false; }
    }

    const params = new URLSearchParams({ sort: state.sort });
    if (state.cursor) params.set('cursor', state.cursor);
    if (state.filters.model)   params.set('model',   state.filters.model);
    if (state.filters.backdrop) params.set('backdrop', state.filters.backdrop);
    if (state.filters.symbol)  params.set('symbol',  state.filters.symbol);

    const endpoint = state.mode === 'rent' ? '/api/rent/gifts' : '/api/sale/gifts';

    try {
        const data = await api(`${endpoint}?${params}`);
        state.items.push(...(data.items || []));
        state.cursor  = data.cursor || null;
        state.hasMore = !!state.cursor;
        extractFilterOptions();
        renderGrid();
    } catch (e) {
        renderError(e.message);
    } finally {
        state.loading = false;
        $('load-more-container').style.display = state.hasMore ? 'flex' : 'none';
    }
}

function extractFilterOptions() {
    const models   = new Set();
    const backdrops = new Set();
    const symbols  = new Set();
    state.items.forEach(g => {
        if (g.model)   models.add(g.model);
        if (g.backdrop) backdrops.add(g.backdrop);
        if (g.symbol)  symbols.add(g.symbol);
    });
    state.filterOptions.models   = [...models].sort();
    state.filterOptions.backdrops = [...backdrops].sort();
    state.filterOptions.symbols  = [...symbols].sort();
}

function renderSkeletons() {
    $('gifts-grid').innerHTML = Array(6).fill('<div class="gift-skeleton"></div>').join('');
    const bar = $('catalog-stats-bar');
    if (bar) bar.hidden = true;
}

function visibleItems() {
    const q = state.query.trim().toLowerCase();
    if (!q) return state.items;
    return state.items.filter(g =>
        (g.name || '').toLowerCase().includes(q) ||
        (g.nft_address || '').toLowerCase().includes(q));
}

function renderCatalogStats() {
    const bar = $('catalog-stats-bar');
    if (!bar) return;
    const n = visibleItems().length;
    if (!n) { bar.hidden = true; return; }

    const wordForm = n === 1 ? 'подарунок' : (n >= 2 && n <= 4 ? 'подарунки' : 'подарунків');
    let html = `<span class="catalog-stats-count">${n} ${wordForm}</span>`;

    const activeF = Object.entries(state.filters).filter(([,v]) => v);
    if (activeF.length) {
        html += `<span class="catalog-stats-sep">•</span>`;
        html += activeF.map(([k, v]) =>
            `<span class="catalog-stats-filter-tag">${esc(t(k))}: ${esc(v)}
             <button onclick="clearFilter('${esc(k)}')" aria-label="clear">×</button></span>`
        ).join('');
    }
    bar.innerHTML = html;
    bar.hidden = false;
}

window.clearFilter = function(key) {
    state.filters[key] = null;
    $('filter-active-dot').hidden = !hasActiveFilters();
    loadItems(true);
};

function renderGrid() {
    const grid  = $('gifts-grid');
    const items = visibleItems();
    if (!items.length) {
        grid.innerHTML = stateCell('🎁',
            state.query ? t('not_found') || 'Нічого не знайдено' : 'Каталог порожній',
            state.query ? `«${esc(state.query)}»` : 'Спробуйте інший фільтр');
        renderCatalogStats();
        return;
    }
    grid.innerHTML = items.map((g, i) =>
        state.mode === 'rent' ? rentCard(g, i) : saleCard(g, i)).join('');
    grid.querySelectorAll('.gift-card').forEach(card => {
        const idx = +card.dataset.idx;
        card.addEventListener('click', () => openModal(items[idx]));
    });
    renderCatalogStats();
}

// Gift card placeholder SVG
const PLACEHOLDER_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M32 12c0-4 6-8 8-4s-2 8-8 8-10-4-8-8 8 0 8 4z" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M12 22h40v4H12z" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M14 26h36v22a4 4 0 01-4 4H18a4 4 0 01-4-4V26z" stroke="#fff" stroke-width="1.5"/>
  <path d="M32 22v30" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

function imgMarkup(g) {
    return g.image_url
        ? `<img class="gift-card-img" src="${esc(g.image_url)}" alt="${esc(g.name)}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling?.style.setProperty('display','flex')">`
        : '';
}

function cardAttrChips(g) {
    const attrs = [g.model, g.backdrop, g.symbol].filter(Boolean).slice(0, 3);
    if (!attrs.length) return '';
    return `<div class="card-attrs">${attrs.map(a =>
        `<span class="card-attr">${esc(a)}</span>`).join('')}</div>`;
}

function rentCard(g, i) {
    const uah = tonToUah(g.price_per_day_ton);
    const discount = g.discount_per_day ? Math.round(g.discount_per_day * 100) : 0;
    const discBadge = discount > 0
        ? `<div class="card-discount">-${discount}%</div>` : '';
    return `
    <div class="gift-card" data-idx="${i}" role="button" tabindex="0" style="--i:${i}">
        <div class="gift-card-img-wrap">
            ${imgMarkup(g)}
            <div class="gift-card-placeholder" style="${g.image_url ? 'display:none' : ''}">${PLACEHOLDER_SVG}</div>
            <div class="gift-card-img-overlay"></div>
            <div class="gift-card-img-glow"></div>
            <div class="gift-card-days-badge">${g.min_duration_days}–${g.max_duration_days}d</div>
            <div class="gift-card-ton-badge">◈ ${g.price_per_day_ton}</div>
            ${discBadge}
            <div class="gift-card-over">
                <div class="gift-card-name">${esc(g.name)}</div>
                ${cardAttrChips(g)}
                <div class="gift-card-price-row">
                    <span class="gift-card-ton">◈ ${g.price_per_day_ton}<span class="cur-label">TON/d</span></span>
                    <span class="gift-card-uah">${uah}</span>
                </div>
            </div>
        </div>
        <button class="gift-card-rent-btn" tabindex="-1"><span>${t('rent_btn')}</span></button>
    </div>`;
}

function saleCard(g, i) {
    const cur = g.currency || 'TON';
    const uah = tonToUah(g.price_with_markup);
    return `
    <div class="gift-card" data-idx="${i}" role="button" tabindex="0" style="--i:${i}">
        <div class="gift-card-img-wrap">
            ${imgMarkup(g)}
            <div class="gift-card-placeholder" style="${g.image_url ? 'display:none' : ''}">${PLACEHOLDER_SVG}</div>
            <div class="gift-card-img-overlay"></div>
            <div class="gift-card-img-glow"></div>
            <div class="gift-card-ton-badge">◈ ${g.price_with_markup}</div>
            <div class="gift-card-over">
                <div class="gift-card-name">${esc(g.name)}</div>
                ${cardAttrChips(g)}
                <div class="gift-card-price-row">
                    <span class="gift-card-ton">◈ ${g.price_with_markup}<span class="cur-label">${esc(cur)}</span></span>
                    <span class="gift-card-uah">${uah}</span>
                </div>
            </div>
        </div>
        <button class="gift-card-rent-btn" tabindex="-1"><span>${t('buy_btn')}</span></button>
    </div>`;
}

function stateCell(icon, title, desc, withRetry = false) {
    return `<div class="state-cell">
        <div class="state-icon">${icon}</div>
        <div class="state-title">${esc(title)}</div>
        <div class="state-desc">${esc(desc)}</div>
        ${withRetry ? `<button class="state-btn" onclick="window.__reload()">${t('load_more')}</button>` : ''}
    </div>`;
}

function renderError(msg) {
    $('gifts-grid').innerHTML = stateCell('⚠️', 'Помилка завантаження', msg || '', true);
}
window.__reload = () => loadItems(true);

// ─── Filter sheet ─────────────────────────────────────────────────────────────

function hasActiveFilters() {
    return !!(state.filters.model || state.filters.backdrop || state.filters.symbol);
}

function openFilterSheet() {
    buildFilterSheet();
    $('filter-sheet').hidden = false;
    if (tg) tg.HapticFeedback?.impactOccurred('light');
}

function closeFilterSheet() { $('filter-sheet').hidden = true; }

function buildFilterSheet() {
    const body = $('filter-sheet-body');
    const sections = [
        { key: 'model',   label: t('model'),   opts: state.filterOptions.models   },
        { key: 'backdrop', label: t('backdrop'), opts: state.filterOptions.backdrops },
        { key: 'symbol',  label: t('symbol'),  opts: state.filterOptions.symbols  },
    ];
    body.innerHTML = sections.map(sec => {
        if (!sec.opts.length) return '';
        const chips = [{ val: null, label: t('all') }, ...sec.opts.map(v => ({ val: v, label: v }))]
            .map(o => {
                const active = state.filters[sec.key] === o.val;
                return `<button class="fs-chip${active ? ' active' : ''}"
                    data-sec="${esc(sec.key)}" data-val="${esc(o.val ?? '')}">${esc(o.label)}</button>`;
            }).join('');
        return `<div>
            <div class="fs-section-title">${esc(sec.label)}</div>
            <div class="fs-chips">${chips}</div>
        </div>`;
    }).join('');

    body.querySelectorAll('.fs-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const sec = chip.dataset.sec;
            const val = chip.dataset.val || null;
            state.filters[sec] = val;
            body.querySelectorAll(`.fs-chip[data-sec="${sec}"]`).forEach(c =>
                c.classList.toggle('active', c.dataset.val === (val || '')));
            if (tg) tg.HapticFeedback?.selectionChanged();
        });
    });
}

$('filter-btn').addEventListener('click', openFilterSheet);

$('filter-sheet').addEventListener('click', e => {
    if (e.target === $('filter-sheet')) closeFilterSheet();
});

$('filter-reset-btn').addEventListener('click', () => {
    state.filters = { model: null, backdrop: null, symbol: null };
    buildFilterSheet();
    $('filter-active-dot').hidden = true;
    if (tg) tg.HapticFeedback?.selectionChanged();
});

$('filter-apply-btn').addEventListener('click', () => {
    closeFilterSheet();
    $('filter-active-dot').hidden = !hasActiveFilters();
    loadItems(true);
    if (tg) tg.HapticFeedback?.impactOccurred('medium');
});

// ─── Modal ─────────────────────────────────────────────────────────────────────

function openModal(item) {
    state.selected = item;
    const isRent = state.mode === 'rent';

    $('modal-img').src = item.image_url || '';
    $('modal-name').textContent = item.name || 'Gift';
    $('modal-addr').textContent = truncAddr(item.nft_address);

    $('duration-section').style.display = isRent ? 'block' : 'none';

    if (isRent) {
        state.duration = item.min_duration_days || 1;
        $('modal-ppd-stars').textContent = `◈ ${item.price_per_day_ton} TON`;
        $('modal-ppd-label').textContent = t('per_day');
        const sl = $('duration-slider');
        sl.min = item.min_duration_days || 1;
        sl.max = item.max_duration_days || 30;
        sl.value = state.duration;
        updateSliderFill(sl);
        $('duration-min-label').textContent = `${item.min_duration_days} d`;
        $('duration-max-label').textContent = `${item.max_duration_days} d`;
    } else {
        $('modal-ppd-stars').textContent = `◈ ${item.price_with_markup} ${item.currency || 'TON'}`;
        $('modal-ppd-label').textContent = t('price_label');
    }

    $('rent-btn-text').textContent = isRent ? t('rent_btn') : t('buy_btn');

    // Build attribute chips + Fragment link
    buildNftAttrs(item);

    hideModalError();
    refreshTotals();
    showTopupHint(false);
    $('rental-modal').hidden = false;

    if (tg) {
        tg.HapticFeedback?.impactOccurred('light');
        tg.BackButton.show();
        tg.BackButton.onClick(closeModal);
    }
}

function buildNftAttrs(item) {
    const container = $('nft-attrs');
    const pairs = [
        ['Collection', item.collection_name],
        ['Model',   item.model],
        ['Backdrop', item.backdrop],
        ['Symbol',  item.symbol],
    ].filter(([, v]) => v);

    const chips = pairs.map(([k, v]) =>
        `<div class="nft-attr-chip"><span class="attr-key">${esc(k)}</span><span class="attr-val">${esc(v)}</span></div>`
    ).join('');

    const fragSlug = fragmentSlug(item.name);
    const fragLink = item.nft_address
        ? `<a class="nft-fragment-link" href="https://tonscan.org/nft/${esc(item.nft_address)}" target="_blank" rel="noopener">
               <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                   <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9"/><path d="M10 2h4v4"/><path d="M14 2L8 8"/>
               </svg>
               ${t('view_on_fragment')}
           </a>`
        : '';

    container.innerHTML = chips + fragLink;
    container.style.display = (chips || fragLink) ? '' : 'none';
}

function fragmentSlug(name) {
    if (!name || !name.includes('#')) return null;
    const [namePart, numPart] = name.split('#');
    return namePart.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
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
    $('modal-error-title').textContent = title || '';
    $('modal-error-desc').textContent  = desc  || '';
    box.hidden = false;
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

    const sec = document.querySelector('.totals-box');
    if (sec) { sec.classList.remove('bump'); void sec.offsetWidth; sec.classList.add('bump'); }

    if (state.mode === 'rent') {
        const days = state.duration;
        let total = g.price_per_day_ton * days;
        if (days > 1 && g.discount_per_day) total *= (1 - g.discount_per_day);
        total = Math.round(total * 1000) / 1000;
        $('duration-display').textContent = `${days} ${pluralDays(days)}`;
        $('total-ton').textContent  = `◈ ${total} TON`;
        $('total-stars').textContent = `≈ ${tonToUah(total)}`;
        const dr = $('discount-row');
        if (days > 1 && g.discount_per_day) {
            $('discount-text').textContent = `🎉 Знижка ${Math.round(g.discount_per_day * 100)}%`;
            dr.style.display = 'block';
        } else dr.style.display = 'none';
    } else {
        $('total-ton').textContent  = `◈ ${g.price_with_markup} ${g.currency || 'TON'}`;
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

// ─── Checkout ──────────────────────────────────────────────────────────────────

async function checkout() {
    const g = state.selected;
    if (!g) return;

    const original = state.mode === 'rent' ? t('rent_btn') : t('buy_btn');
    hideModalError();
    setRentBtnLoading(true, t('creating_order'));
    if (tg) tg.HapticFeedback?.impactOccurred('medium');

    try {
        const endpoint = state.mode === 'rent' ? '/api/rent/checkout' : '/api/sale/checkout';
        const body = state.mode === 'rent'
            ? { nft_address: g.nft_address, duration_days: state.duration, method: state.method }
            : { nft_address: g.nft_address, method: state.method };
        const resp = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });

        if (resp.method === 'stars') await payWithStars(resp, g, original);
        else                         await payWithTon(resp, g, original);
    } catch (e) {
        console.error('Checkout failed:', e);
        setRentBtnLoading(false, original);
        showCheckoutError(e);
        if (tg) tg.HapticFeedback?.notificationOccurred('error');
    }
}

function showCheckoutError(e) {
    const status = e.status || 0;
    const msg = e.message || '';
    let title, desc;

    if (status === 401 || /init data|telegram/i.test(msg)) {
        title = 'Потрібен Telegram'; desc = 'Відкрийте Mini App через бота Telegram.';
    } else if (/manually|same wallet|api toke/i.test(msg)) {
        title = 'Налаштуйте MarketApp'; desc = t('err_marketapp_setup');
    } else if (status === 404 || /no longer|unavailable|недост/i.test(msg)) {
        title = 'Подарунок недоступний'; desc = 'Спробуйте інший або оновіть каталог.';
    } else if (status === 429 || /rate|обмежує/i.test(msg)) {
        title = 'Забагато запитів'; desc = 'Зачекайте 15 секунд і спробуйте знову.';
    } else if (/fetch|network|backend_url/i.test(msg)) {
        title = 'Немає зв\'язку'; desc = 'Перевірте, що ngrok запущено і BACKEND_URL актуальний.';
    } else {
        title = 'Помилка MarketApp'; desc = msg.slice(0, 200);
    }
    showModalError(title, desc);
}

function showTopupHint(show) {
    const hint = $('topup-hint');
    if (!hint) return;
    hint.style.display = show ? 'block' : 'none';
    if (show && MERCHANT_WALLET) $('topup-addr').textContent = MERCHANT_WALLET;
}

async function payWithTon(resp, g, original) {
    if (!tonConnectUI) {
        setRentBtnLoading(false, original);
        showTopupHint(true);
        showModalError('TonConnect недоступний', 'Оновіть сторінку і спробуйте знову.');
        return;
    }
    if (!tonConnectUI.connected) {
        setRentBtnLoading(false, original);
        showTopupHint(true);
        showModalError('Гаманець не підключено', 'Підключіть гаманець у шапці і повторіть оплату.');
        await tonConnectUI.openModal();
        return;
    }
    showTopupHint(false);
    setRentBtnLoading(true, t('sign_tx'));
    let result;
    try {
        result = await tonConnectUI.sendTransaction({
            validUntil: resp.transaction.valid_until || Math.floor(Date.now() / 1000) + 300,
            messages: resp.transaction.messages.map(m => ({
                address: m.address, amount: m.amount,
                payload: m.payload || undefined,
                stateInit: m.stateInit || undefined,
            })),
        });
    } catch (e) {
        setRentBtnLoading(false, original);
        if (!/reject|cancel/i.test(e?.message || ''))
            showModalError('Транзакцію відхилено', e?.message || '');
        return;
    }

    setRentBtnLoading(true, t('confirming_net'));
    const wallet = tonConnectUI.account?.address || null;
    try {
        await api(`/api/orders/${resp.order_id}/confirm`, {
            method: 'POST',
            body: JSON.stringify({ boc: result?.boc || null, wallet_address: wallet }),
        });
    } catch (e) { console.warn('confirm submit failed:', e); }

    const ok = await pollOrder(resp.order_id);
    if (ok) { closeModal(); showSuccess(g); }
    else {
        setRentBtnLoading(false, original);
        notify('Транзакцію надіслано. Перевірте «Замовлення».', 'info');
        closeModal(); setTab('orders');
    }
}

async function payWithStars(resp, g, original) {
    if (tg && resp.invoice_link) {
        tg.openInvoice(resp.invoice_link, async status => {
            if (status === 'paid') {
                setRentBtnLoading(true, t('confirming_net'));
                const ok = await pollOrder(resp.order_id);
                if (ok) { closeModal(); showSuccess(g); }
                else { setRentBtnLoading(false, original); notify('Оплату отримано — видача в процесі.', 'info'); }
            } else {
                setRentBtnLoading(false, original);
                if (status !== 'cancelled') showModalError('Оплата не пройшла', '');
            }
        });
    } else {
        setRentBtnLoading(false, original);
        showModalError('Stars недоступні', 'Відкрийте Mini App через Telegram.');
    }
}

async function pollOrder(orderId, { tries = 30, intervalMs = 3000 } = {}) {
    for (let i = 0; i < tries; i++) {
        try {
            const s = await api(`/api/orders/${orderId}`);
            if (s.status === 'fulfilled') return true;
            if (s.status === 'failed' || s.status === 'expired') return false;
        } catch { /* transient */ }
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}

function resetBtn(_, text) { setRentBtnLoading(false, text); }

function showSuccess(g) {
    const isRent = state.mode === 'rent';
    $('success-title').textContent = t(isRent ? 'success_rent' : 'success_sale');
    $('success-desc').textContent = isRent
        ? `"${g.name}" — ${state.duration} ${pluralDays(state.duration)}`
        : `"${g.name}"`;
    $('success-screen').hidden = false;
    if (tg) { tg.HapticFeedback?.notificationOccurred('success'); tg.BackButton.hide(); }
}

function closeSuccess() {
    $('success-screen').hidden = true;
    loadItems(true);
}

// ─── Alerts / Air-raid map ─────────────────────────────────────────────────────

const KIND_META = {
    drone_piston:    { ua: 'Shahed / БПЛА',   en: 'Shahed / UAV',    ru: 'Shahed / БПЛА',    speed: 165 },
    drone_jet:       { ua: 'Реактивний БПЛА',  en: 'Jet drone',       ru: 'Реактивный БПЛА', speed: 450 },
    missile_cruise:  { ua: 'Крилата ракета',  en: 'Cruise missile',  ru: 'Крылатая ракета', speed: 800 },
    missile_ballistic: { ua: 'Балістична ракета', en: 'Ballistic missile', ru: 'Балл. ракета', speed: 7500 },
    bomb:            { ua: 'КАБ / Авіабомба',  en: 'Glide bomb',      ru: 'КАБ / Авиабомба',  speed: 750 },
};

const KIND_ICONS = {
    drone_piston: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 10V8M12 14v2M10 12H8M14 12h2"/></svg>`,
    drone_jet:    `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l8 16h-5l-3-6-3 6H4z"/></svg>`,
    missile_cruise:    `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 14l13-9 5 5-9 13-2-5z"/><path d="M3 14l5 2"/></svg>`,
    missile_ballistic: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v8M9 5l3-3 3 3M12 10c0 4 3 5 3 8a3 3 0 11-6 0c0-3 3-4 3-8z"/></svg>`,
    bomb:         `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="13" r="6"/><path d="M17 7l3-3M14 4l3 3"/></svg>`,
};

const ZONE_LABELS = {
    chauda:'Чауда (Крим)', crimea:'Крим', sevastopol:'Севастополь', gvardiiske:'Гвардійське',
    black_sea_w:'Чорне море (З)', black_sea_e:'Чорне море (С)', novorossiysk:'Новоросійськ',
    primorsk:'Приморсько-Ахтарськ', eysk:'Єйськ', rostov:'Ростов', millerovo:'Міллерово',
    morozovsk:'Морозовськ', kursk:'Курськ', belgorod:'Бєлгород', bryansk:'Брянськ',
    orel:'Орел', shaykivka:'Шайківка', baltimor:'Балтимор/Воронеж',
    buturlinovka:'Бутурлинівка', engels:'Енгельс', caspian:'Каспій',
    mozyr:'Мозир (РБ)', tot_donbas:'ТОТ Донбас', tot_zap:'ТОТ Запоріжжя',
    unknown:'Невідомо',
};

const UA_BOUNDS = { lonMin: 22.0, lonMax: 40.5, latMin: 44.0, latMax: 52.5 };

const FALLBACK_CITIES = {
    kyiv:         { ua: 'Київ',         en: 'Kyiv',         lat: 50.45, lon: 30.52 },
    kharkiv:      { ua: 'Харків',       en: 'Kharkiv',      lat: 49.99, lon: 36.23 },
    odesa:        { ua: 'Одеса',        en: 'Odesa',        lat: 46.48, lon: 30.73 },
    dnipro:       { ua: 'Дніпро',       en: 'Dnipro',       lat: 48.46, lon: 35.04 },
    lviv:         { ua: 'Львів',        en: 'Lviv',         lat: 49.84, lon: 24.03 },
    zaporizhzhia: { ua: 'Запоріжжя',   en: 'Zaporizhzhia', lat: 47.84, lon: 35.14 },
    mykolaiv:     { ua: 'Миколаїв',    en: 'Mykolaiv',     lat: 46.97, lon: 32.00 },
    kherson:      { ua: 'Херсон',      en: 'Kherson',      lat: 46.65, lon: 32.62 },
    poltava:      { ua: 'Полтава',     en: 'Poltava',      lat: 49.59, lon: 34.55 },
    sumy:         { ua: 'Суми',        en: 'Sumy',         lat: 50.92, lon: 34.80 },
    chernihiv:    { ua: 'Чернігів',    en: 'Chernihiv',    lat: 51.50, lon: 31.30 },
    vinnytsia:    { ua: 'Вінниця',     en: 'Vinnytsia',    lat: 49.23, lon: 28.47 },
    cherkasy:     { ua: 'Черкаси',     en: 'Cherkasy',     lat: 49.45, lon: 32.06 },
    zhytomyr:     { ua: 'Житомир',     en: 'Zhytomyr',     lat: 50.25, lon: 28.67 },
    rivne:        { ua: 'Рівне',       en: 'Rivne',        lat: 50.62, lon: 26.25 },
    ivano_frank:  { ua: 'Івано-Фр.',   en: 'Ivano-Fr.',    lat: 48.92, lon: 24.71 },
    ternopil:     { ua: 'Тернопіль',   en: 'Ternopil',     lat: 49.55, lon: 25.60 },
    lutsk:        { ua: 'Луцьк',       en: 'Lutsk',        lat: 50.74, lon: 25.32 },
    uzhhorod:     { ua: 'Ужгород',     en: 'Uzhhorod',     lat: 48.62, lon: 22.30 },
    kryvyi_rih:   { ua: 'Кривий Ріг',  en: 'Kryvyi Rih',   lat: 47.91, lon: 33.38 },
    khmelnitskyi: { ua: 'Хмельницький',en: 'Khmelnytskyi', lat: 49.42, lon: 27.00 },
};

let alertsTimer = null;
let citiesCache = null;

function lonLatToXY(lon, lat) {
    const { lonMin, lonMax, latMin, latMax } = UA_BOUNDS;
    const x = ((lon - lonMin) / (lonMax - lonMin)) * 1000;
    // Y inverted because SVG grows downward
    const y = (1 - (lat - latMin) / (latMax - latMin)) * 660;
    return { x, y };
}

// ─── Map zoom / pan ───────────────────────────────────────────────────────────

let mapVB = { x: 0, y: 0, w: 1000, h: 660 };
const MAP_MIN_W = 220;

function setMapViewBox() {
    const svg = $('alerts-map');
    if (svg) svg.setAttribute('viewBox', `${mapVB.x} ${mapVB.y} ${mapVB.w} ${mapVB.h}`);
}

function clientToSvgCoords(svg, cx, cy) {
    const rect = svg.getBoundingClientRect();
    return {
        x: mapVB.x + (cx - rect.left) * (mapVB.w / rect.width),
        y: mapVB.y + (cy - rect.top)  * (mapVB.h / rect.height),
    };
}

function mapZoom(scaleFactor, pivotX, pivotY) {
    const newW = Math.max(MAP_MIN_W, Math.min(1000, mapVB.w * scaleFactor));
    const newH = newW * (660 / 1000);
    mapVB.x = Math.max(0, Math.min(1000 - newW, mapVB.x + (pivotX - mapVB.x) * (1 - newW / mapVB.w)));
    mapVB.y = Math.max(0, Math.min(660  - newH, mapVB.y + (pivotY - mapVB.y) * (1 - newH / mapVB.h)));
    mapVB.w = newW;
    mapVB.h = newH;
    setMapViewBox();
}

function initMapInteraction() {
    const svg = $('alerts-map');
    if (!svg || svg._interactionBound) return;
    svg._interactionBound = true;

    // Wheel zoom
    svg.addEventListener('wheel', e => {
        e.preventDefault();
        const p = clientToSvgCoords(svg, e.clientX, e.clientY);
        mapZoom(e.deltaY > 0 ? 1.18 : 0.85, p.x, p.y);
    }, { passive: false });

    // Touch / pointer pan + pinch
    const ptrs = new Map();
    let panStart = null;
    let pinchDist0 = null;

    function getPointerPair() {
        const [a, b] = [...ptrs.values()];
        return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }

    svg.addEventListener('pointerdown', e => {
        svg.setPointerCapture(e.pointerId);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 1) {
            panStart = { cx: e.clientX, cy: e.clientY, vbX: mapVB.x, vbY: mapVB.y };
            pinchDist0 = null;
        } else if (ptrs.size === 2) {
            pinchDist0 = getPointerPair().dist;
            panStart = null;
        }
        svg.classList.add('dragging');
    });

    svg.addEventListener('pointermove', e => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (ptrs.size === 2 && pinchDist0 !== null) {
            const pair = getPointerPair();
            const scale = pinchDist0 / pair.dist;
            pinchDist0 = pair.dist;
            const p = clientToSvgCoords(svg, pair.cx, pair.cy);
            mapZoom(scale, p.x, p.y);
        } else if (ptrs.size === 1 && panStart) {
            const rect = svg.getBoundingClientRect();
            const scaleX = mapVB.w / rect.width;
            const scaleY = mapVB.h / rect.height;
            const dx = (e.clientX - panStart.cx) * scaleX;
            const dy = (e.clientY - panStart.cy) * scaleY;
            mapVB.x = Math.max(0, Math.min(1000 - mapVB.w, panStart.vbX - dx));
            mapVB.y = Math.max(0, Math.min(660  - mapVB.h, panStart.vbY - dy));
            setMapViewBox();
        }
    });

    function onPointerUp(e) {
        ptrs.delete(e.pointerId);
        if (ptrs.size < 2) pinchDist0 = null;
        if (ptrs.size === 0) { panStart = null; svg.classList.remove('dragging'); }
    }
    svg.addEventListener('pointerup',     onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
}

$('map-zoom-reset')?.addEventListener('click', () => {
    mapVB = { x: 0, y: 0, w: 1000, h: 660 };
    setMapViewBox();
    if (tg) tg.HapticFeedback?.impactOccurred('light');
});
$('map-zoom-in')?.addEventListener('click', () => {
    mapZoom(0.68, mapVB.x + mapVB.w / 2, mapVB.y + mapVB.h / 2);
    if (tg) tg.HapticFeedback?.impactOccurred('light');
});
$('map-zoom-out')?.addEventListener('click', () => {
    mapZoom(1.45, mapVB.x + mapVB.w / 2, mapVB.y + mapVB.h / 2);
    if (tg) tg.HapticFeedback?.impactOccurred('light');
});

// ─── Threat detail popup ──────────────────────────────────────────────────────

let _threatObjects = [];

function showThreatPopup(o) {
    const meta = KIND_META[o.kind] || KIND_META.drone_piston;
    const icon = KIND_ICONS[o.kind] || KIND_ICONS.drone_piston;
    const kindName = meta[lang] || meta.ua;
    const fromZone = ZONE_LABELS[o.from_zone] || o.from_zone || '?';
    const toCity = citiesCache?.[o.to_city]?.ua || o.to_city || '?';
    const speed = o.speed_kmh || meta.speed;
    const heading = o.heading_deg != null ? `${o.heading_deg}°` : null;
    const statusLabel = o.status === 'eliminated' ? '💥 Збито' : o.status === 'lost' ? '? Втрачено' : '🔴 Активний';

    $('threat-popup-icon').innerHTML = icon;
    $('threat-popup-name').textContent = o.title || kindName;
    $('threat-popup-route').innerHTML =
        `<span>${esc(fromZone)}</span><span style="opacity:0.5">→</span><span>${esc(toCity)}</span>`;
    $('threat-popup-tags').innerHTML = [
        `<span class="popup-tag popup-tag-speed">${speed} км/г</span>`,
        `<span class="popup-tag popup-tag-status">${statusLabel}</span>`,
        heading ? `<span class="popup-tag popup-tag-heading">↗ ${esc(heading)}</span>` : '',
    ].join('');

    $('threat-popup').hidden = false;
    if (tg) tg.HapticFeedback?.impactOccurred('light');
}

$('threat-popup-close')?.addEventListener('click', () => {
    $('threat-popup').hidden = true;
});

async function loadCities() {
    if (citiesCache) return citiesCache;
    try {
        const data = await api('/api/alerts/cities');
        citiesCache = data.cities || {};
    } catch {
        citiesCache = {};
    }
    return citiesCache;
}

async function loadAlerts() {
    try {
        const [current, attacks] = await Promise.all([
            api('/api/alerts/current'),
            api('/api/alerts/attacks?limit=5'),
        ]);
        await loadCities();
        renderAlertsStatus(current);
        renderAlertsMap(current);
        renderAlertsStats(current, attacks);
        renderThreatsList(current);
        renderRecentAttacks(attacks);
        updateNavIndicator(current);
    } catch (e) {
        console.warn('alerts load failed:', e);
        $('alerts-status-title').textContent = '⚠️ ' + (lang === 'en' ? 'Unable to load' : 'Не вдалося завантажити');
        $('alerts-status-sub').textContent = e.message || '';
    }
}

function renderAlertsStatus(current) {
    const box = $('alerts-status');
    const active = current?.attack?.status === 'active' && (current?.objects?.length || 0) > 0;
    box.classList.toggle('danger', active);
    if (active) {
        const objCount = current.objects.length;
        $('alerts-status-title').textContent = lang === 'en' ? '⚠ Active attack' : lang === 'ru' ? '⚠ Активная атака' : '⚠ Активна атака';
        $('alerts-status-sub').textContent =
            (lang === 'en' ? `${objCount} object${objCount > 1 ? 's' : ''} in the air` :
             lang === 'ru' ? `Объектов в воздухе: ${objCount}` :
                              `Об'єктів у повітрі: ${objCount}`);
    } else {
        $('alerts-status-title').textContent = lang === 'en' ? 'All calm' : lang === 'ru' ? 'Спокойно' : 'Тихо';
        $('alerts-status-sub').textContent =
            lang === 'en' ? 'No active threats detected' :
            lang === 'ru' ? 'Активных угроз нет' : 'Активних загроз не зафіксовано';
    }
}

function renderAlertsMap(current) {
    const cityG  = $('map-cities');
    const threatG = $('map-threats');

    // Reference cities
    if (!cityG.dataset.populated) {
        cityG.innerHTML = Object.entries(FALLBACK_CITIES).map(([key, c]) => {
            const { x, y } = lonLatToXY(c.lon, c.lat);
            const name = c[lang === 'en' ? 'en' : 'ua'];
            return `<circle class="map-city" cx="${x}" cy="${y}" r="3"/>
                    <text class="map-city-label" x="${x + 7}" y="${y + 4}">${esc(name)}</text>`;
        }).join('');
        cityG.dataset.populated = '1';
    }

    // Threats
    const threats = (current?.objects || []).filter(o => o.status === 'active' && Number.isFinite(o.lat) && Number.isFinite(o.lon));
    _threatObjects = threats;
    threatG.innerHTML = threats.map((o, idx) => {
        const { x, y } = lonLatToXY(o.lon, o.lat);
        const trail = Array.isArray(o.trail) && o.trail.length > 1
            ? `<polyline class="map-threat-trail" points="${o.trail.map(p => {
                const xy = lonLatToXY(p[0], p[1]); return `${xy.x},${xy.y}`;
              }).join(' ')}"/>`
            : '';
        return `<g class="map-threat" data-tidx="${idx}">
            ${trail}
            <circle class="map-threat-glow" cx="${x}" cy="${y}" r="12" fill="url(#tGlow)"/>
            <circle class="map-threat-core" cx="${x}" cy="${y}" r="4"/>
        </g>`;
    }).join('');

    // Wire click on each threat marker
    threatG.querySelectorAll('.map-threat').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            const idx = +el.dataset.tidx;
            if (_threatObjects[idx]) showThreatPopup(_threatObjects[idx]);
        });
    });

    initMapInteraction();
}

function renderAlertsStats(current, attacksResp) {
    const stats = $('alerts-stats');
    const lastAttack = attacksResp?.attacks?.[0] || {};
    const activeNow = (current?.objects || []).filter(o => o.status === 'active').length;
    const items = [
        { num: activeNow, label: lang === 'en' ? 'In air' : 'У повітрі', cls: activeNow > 0 ? 'danger' : '' },
        { num: lastAttack.total_drones || 0,   label: lang === 'en' ? 'Drones' : 'Дронів',  cls: 'danger' },
        { num: lastAttack.total_missiles || 0, label: lang === 'en' ? 'Missiles' : 'Ракет', cls: 'danger' },
        { num: lastAttack.official_shot_total || 0, label: lang === 'en' ? 'Shot down' : 'Збито', cls: 'good' },
    ];
    stats.innerHTML = items.map(i => `
        <div class="stat-card">
            <div class="stat-num ${i.cls}">${i.num}</div>
            <div class="stat-label">${esc(i.label)}</div>
        </div>`).join('');
}

function renderThreatsList(current) {
    const list = $('alerts-threats-list');
    const threats = (current?.objects || []).filter(o => o.status === 'active');
    $('alerts-count-badge').textContent = threats.length;

    if (!threats.length) {
        list.innerHTML = `<div class="alerts-empty">${esc(t('alerts_no_threats_long'))}</div>`;
        return;
    }

    list.innerHTML = threats.slice(0, 30).map(o => {
        const meta = KIND_META[o.kind] || KIND_META.drone_piston;
        const icon = KIND_ICONS[o.kind] || KIND_ICONS.drone_piston;
        const cls  = o.status === 'eliminated' ? 'eliminated' : o.status === 'lost' ? 'lost' : '';
        const kindName = meta[lang] || meta.ua;
        const fromZone = ZONE_LABELS[o.from_zone] || o.from_zone || '?';
        const toCity = citiesCache?.[o.to_city]?.ua || o.to_city || '?';
        const speed = o.speed_kmh || meta.speed;
        return `<div class="threat-card active-threat">
            <div class="threat-icon ${cls}">${icon}</div>
            <div class="threat-info">
                <div class="threat-name">${esc(o.title || kindName)}</div>
                <div class="threat-route">
                    <span>${esc(fromZone)}</span>
                    <span class="threat-route-arrow">→</span>
                    <span>${esc(toCity)}</span>
                </div>
            </div>
            <div class="threat-right">
                <div class="threat-speed">${speed} км/г</div>
                <div class="threat-kind">${esc(kindName.split(' ')[0])}</div>
            </div>
        </div>`;
    }).join('');
}

function renderRecentAttacks(attacksResp) {
    const list = $('alerts-attacks-list');
    const attacks = (attacksResp?.attacks || []).slice(0, 5);
    if (!attacks.length) {
        list.innerHTML = `<div class="alerts-empty">—</div>`;
        return;
    }
    list.innerHTML = attacks.map(a => {
        const d = new Date(a.started_at * 1000);
        const dateStr = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `<div class="attack-card">
            <div class="attack-date">${esc(dateStr)}</div>
            <div class="attack-stats">
                <span class="drones">◈ ${a.total_drones || 0}</span>
                <span class="missiles">⚡ ${a.total_missiles || 0}</span>
                <span class="shot">✓ ${a.official_shot_total || 0}</span>
            </div>
        </div>`;
    }).join('');
}

function updateNavIndicator(current) {
    const active = current?.attack?.status === 'active' && (current?.objects?.length || 0) > 0;
    const ind = $('nav-alert-indicator');
    if (ind) ind.hidden = !active;
}

function startAlertsAutoRefresh() {
    stopAlertsAutoRefresh();
    alertsTimer = setInterval(loadAlerts, 30_000);
}
function stopAlertsAutoRefresh() {
    if (alertsTimer) clearInterval(alertsTimer);
    alertsTimer = null;
}

$('alerts-refresh-btn')?.addEventListener('click', () => {
    $('alerts-refresh-btn').classList.add('spin');
    loadAlerts().finally(() => setTimeout(() => $('alerts-refresh-btn').classList.remove('spin'), 700));
    if (tg) tg.HapticFeedback?.impactOccurred('light');
});

// Background ping every 60s to keep indicator fresh even outside alerts tab
setInterval(async () => {
    if (state.tab === 'alerts') return; // already auto-refreshing
    try {
        const c = await api('/api/alerts/current');
        updateNavIndicator(c);
    } catch { /* silent */ }
}, 60_000);

// ─── Orders ───────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
    created:'створено', awaiting_signature:'очікує підпису',
    invoiced:'очікує оплати', submitted:'надіслано',
    confirming:'підтвердження', paid:'оплачено',
    fulfilled:'виконано', paid_unfulfilled:'оплачено · вручну',
    failed:'скасовано', expired:'прострочено',
};

async function loadOrders() {
    const list = $('orders-list');
    list.innerHTML = Array(3).fill('<div class="gift-skeleton wide"></div>').join('');
    try {
        const qs = state.ordersKind ? `?kind=${state.ordersKind}` : '';
        const orders = await api(`/api/orders${qs}`);
        if (!orders.length) {
            list.innerHTML = stateCell('📭', 'Замовлень поки немає', 'Замовляйте в «Каталозі»');
            return;
        }
        list.innerHTML = orders.map(orderCard).join('');
        list.querySelectorAll('.order-cancel-btn').forEach(b =>
            b.addEventListener('click', () => cancelOrder(+b.dataset.id)));
    } catch (e) { list.innerHTML = stateCell('⚠️', 'Помилка', e.message, false); }
}

function orderCard(o) {
    const dur = o.kind === 'rent' && o.duration_days ? ` · ${o.duration_days} ${pluralDays(o.duration_days)}` : '';
    const cancelBtn = o.can_cancel
        ? `<button class="order-cancel-btn" data-id="${o.order_id}">скасувати</button>` : '';
    const imgContent = o.image_url
        ? `<img src="${esc(o.image_url)}" alt="" loading="lazy">`
        : (o.kind === 'rent' ? '🎁' : '🛒');
    const uahPrice = o.currency !== 'XTR'
        ? `<span style="font-size:11px;color:var(--text-muted);margin-left:3px">≈${tonToUah(o.our_price)}</span>` : '';
    return `
    <div class="order-card">
        <div class="order-img">${imgContent}</div>
        <div class="order-info">
            <div class="order-name">${esc(o.nft_name || 'Gift')}</div>
            <div class="order-meta">${esc(o.kind === 'rent' ? t('rent') : t('sale'))}${dur} · ${esc(truncAddr(o.nft_address))}</div>
            <div class="order-bottom">
                <span class="badge badge-${esc(o.status)}">${STATUS_LABEL[o.status] || o.status}</span>
                <div style="display:flex;align-items:center;gap:4px">
                    <span class="order-price">◈ ${o.our_price}${o.currency === 'XTR' ? ' ⭐' : ''}</span>
                    ${uahPrice}${cancelBtn}
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
    } catch (e) { notify(e.message, 'error'); }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function loadSettings() {
    const user = tg?.initDataUnsafe?.user;
    if (user) {
        $('user-name').textContent = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
        $('user-uid').textContent  = user.username ? `@${user.username}` : `id ${user.id}`;
        $('user-avatar').textContent = (user.first_name || '?').charAt(0).toUpperCase();
    }
    refreshWalletUi();
    try {
        const h = await api('/health');
        $('net-info').textContent    = h.network === 'testnet' ? 'TON Testnet' : 'TON Mainnet';
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
        btn.textContent = t('disconnect_wallet');
        btn.classList.add('disconnect');
    } else {
        status.textContent = 'не підключено';
        status.style.color = '';
        btn.textContent = t('connect_wallet');
        btn.classList.remove('disconnect');
    }
}

async function toggleWallet() {
    if (!tonConnectUI) return notify('TonConnect недоступний', 'error');
    if (tonConnectUI.connected) await tonConnectUI.disconnect();
    else                        await tonConnectUI.openModal();
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

function setTab(tab) {
    state.tab = tab;
    document.body.dataset.tab = tab;
    $$('.view').forEach(v => v.classList.toggle('hidden', v.dataset.view !== tab));
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    if (tab === 'catalog') { headerHidden = false; $('catalog-header')?.classList.remove('hide-scroll'); }
    if (tab === 'orders')   loadOrders();
    if (tab === 'settings') loadSettings();
    if (tab === 'alerts')   { loadAlerts(); startAlertsAutoRefresh(); }
    else                    stopAlertsAutoRefresh();
    if (tg) tg.HapticFeedback?.selectionChanged();
}

function setMode(mode) {
    state.mode = mode;
    state.sort = mode === 'rent' ? 'popular' : 'price_asc';
    $$('.r-mode-tabs [data-mode]').forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
    $$('.rent-only').forEach(e => e.style.display = mode === 'rent' ? '' : 'none');
    $$('.sort-chip').forEach(c => c.classList.toggle('active', c.dataset.sort === state.sort));
    loadItems(true);
}

// ─── Wire-up ──────────────────────────────────────────────────────────────────

$('rental-modal').addEventListener('click', e => { if (e.target === $('rental-modal')) closeModal(); });

$('duration-slider').addEventListener('input', e => {
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
    if (!MERCHANT_WALLET) return;
    navigator.clipboard?.writeText(MERCHANT_WALLET).then(() => {
        notify('Адресу скопійовано', 'success');
        if (tg) tg.HapticFeedback?.notificationOccurred('success');
    }).catch(() => {
        const el = document.createElement('input');
        el.value = MERCHANT_WALLET; document.body.appendChild(el);
        el.select(); document.execCommand('copy'); document.body.removeChild(el);
        notify('Адресу скопійовано', 'success');
    });
});

$$('.r-mode-tabs [data-mode]').forEach(tab =>
    tab.addEventListener('click', () => setMode(tab.dataset.mode)));

$$('.sort-chip').forEach(chip =>
    chip.addEventListener('click', () => {
        $$('.sort-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.sort = chip.dataset.sort;
        loadItems(true);
        if (tg) tg.HapticFeedback?.selectionChanged();
    }));

$$('.method-btn').forEach(b =>
    b.addEventListener('click', () => {
        $$('.method-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.method = b.dataset.method;
        if (tg) tg.HapticFeedback?.selectionChanged();
    }));

$$('.nav-btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

$$('#orders-filter [data-kind]').forEach(tab =>
    tab.addEventListener('click', () => {
        $$('#orders-filter .r-tab').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        state.ordersKind = tab.dataset.kind;
        loadOrders();
    }));

$$('.lang-btn').forEach(btn =>
    btn.addEventListener('click', () => {
        lang = btn.dataset.lang;
        localStorage.setItem('gm_lang', lang);
        applyLang();
        if (tg) tg.HapticFeedback?.selectionChanged();
    }));

let searchTimer;
$('search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = e.target.value; renderGrid(); }, 150);
});

// ─── Init ─────────────────────────────────────────────────────────────────────

applyLang();
loadItems(true);

// Prime alert indicator at startup
api('/api/alerts/current').then(updateNavIndicator).catch(() => {});
