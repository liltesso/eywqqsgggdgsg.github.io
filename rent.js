/**
 * Asset Market Mini App — rent.js
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
        balance:'Баланс', refresh:'Оновити', not_connected:'не підключено',
        account_label:'Акаунт', actions_label:'Швидкі дії', links_label:'Корисні посилання',
        support:'Підтримка', news:'Новини та оновлення', share_app:'Поділитися застосунком',
        rate_app:'Оцінити сервіс', terms:'Публічна оферта', privacy:'Політика конфіденційності',
        faq:'Часті запитання', how_it_works:'Як це працює',
        provider:'Постачальник', data_source:'Джерело даних',
        about_desc:'Asset Market — маркетплейс для оренди та купівлі колекційних Telegram-подарунків (NFT) у мережі TON. Оплата здійснюється напряму з вашого гаманця, а подарунок зараховується на акаунт одразу після підтвердження транзакції в блокчейні.',
        version_label:'Версія', copied:'Скопійовано', refreshed:'Оновлено',
        price_range:'Ціна, TON', discount_only:'Лише зі знижкою', sort_label:'Сортування',
        from_label:'від', to_label:'до', any:'Будь-яка', wallet_balance:'Баланс гаманця',
        ton_note:'NFT зараховується на ваш акаунт одразу після підтвердження транзакції в мережі TON.',
        active_filters:'Активні фільтри', topup_wallet:'Поповнити гаманець', secure_ton:'Захищено мережею TON',
        soon:'Незабаром', balance_err:'Не вдалося отримати баланс',
        how_text:'1. Підключіть TON-гаманець у профілі.\n2. Оберіть подарунок в «Оренда» або «Продаж».\n3. Для оренди задайте термін повзунком.\n4. Підтвердьте транзакцію у гаманці.\n5. NFT зарахується на акаунт автоматично після підтвердження в мережі.',
        faq_text:'• Оренда — тимчасове користування NFT-подарунком на обраний термін.\n• Оплата здійснюється у TON напряму з вашого гаманця.\n• Комісія сервісу вже врахована у фінальній ціні.\n• Статус замовлення видно у вкладці «Замовлення».\n• Питання — напишіть у підтримку.',
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
        balance:'Balance', refresh:'Refresh', not_connected:'not connected',
        account_label:'Account', actions_label:'Quick actions', links_label:'Useful links',
        support:'Support', news:'News & updates', share_app:'Share the app',
        rate_app:'Rate the service', terms:'Terms of Service', privacy:'Privacy Policy',
        faq:'FAQ', how_it_works:'How it works',
        provider:'Provider', data_source:'Data source',
        about_desc:'Asset Market is a marketplace for renting and buying collectible Telegram gifts (NFTs) on the TON blockchain. Payments go directly from your wallet, and the gift is credited to your account as soon as the transaction is confirmed on-chain.',
        version_label:'Version', copied:'Copied', refreshed:'Refreshed',
        price_range:'Price, TON', discount_only:'Discounted only', sort_label:'Sort by',
        from_label:'from', to_label:'to', any:'Any', wallet_balance:'Wallet balance',
        ton_note:'The NFT is credited to your account as soon as the transaction is confirmed on the TON network.',
        active_filters:'Active filters', topup_wallet:'Top up wallet', secure_ton:'Secured by TON',
        soon:'Coming soon', balance_err:'Could not fetch balance',
        how_text:'1. Connect a TON wallet in your profile.\n2. Pick a gift under Rent or Sale.\n3. For rentals, set the period with the slider.\n4. Confirm the transaction in your wallet.\n5. The NFT is credited to your account automatically once confirmed on-chain.',
        faq_text:'• Renting = temporary use of an NFT gift for the chosen period.\n• Payments are made in TON directly from your wallet.\n• The service fee is already included in the final price.\n• Order status is shown in the Orders tab.\n• Any questions — contact support.',
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
        balance:'Баланс', refresh:'Обновить', not_connected:'не подключено',
        account_label:'Аккаунт', actions_label:'Быстрые действия', links_label:'Полезные ссылки',
        support:'Поддержка', news:'Новости и обновления', share_app:'Поделиться приложением',
        rate_app:'Оценить сервис', terms:'Публичная оферта', privacy:'Политика конфиденциальности',
        faq:'Частые вопросы', how_it_works:'Как это работает',
        provider:'Поставщик', data_source:'Источник данных',
        about_desc:'Asset Market — маркетплейс для аренды и покупки коллекционных Telegram-подарков (NFT) в сети TON. Оплата проходит напрямую с вашего кошелька, а подарок зачисляется на аккаунт сразу после подтверждения транзакции в блокчейне.',
        version_label:'Версия', copied:'Скопировано', refreshed:'Обновлено',
        price_range:'Цена, TON', discount_only:'Только со скидкой', sort_label:'Сортировка',
        from_label:'от', to_label:'до', any:'Любая', wallet_balance:'Баланс кошелька',
        ton_note:'NFT зачисляется на ваш аккаунт сразу после подтверждения транзакции в сети TON.',
        active_filters:'Активные фильтры', topup_wallet:'Пополнить кошелёк', secure_ton:'Защищено сетью TON',
        soon:'Скоро', balance_err:'Не удалось получить баланс',
        how_text:'1. Подключите TON-кошелёк в профиле.\n2. Выберите подарок в «Аренда» или «Продажа».\n3. Для аренды задайте срок ползунком.\n4. Подтвердите транзакцию в кошельке.\n5. NFT зачислится на аккаунт автоматически после подтверждения в сети.',
        faq_text:'• Аренда — временное пользование NFT-подарком на выбранный срок.\n• Оплата проходит в TON напрямую с вашего кошелька.\n• Комиссия сервиса уже включена в финальную цену.\n• Статус заказа виден во вкладке «Заказы».\n• Вопросы — напишите в поддержку.',
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
    $('modal-disclaimer').textContent = t('ton_note');
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
    filters: { collection: null, model: null, backdrop: null, symbol: null, priceMin: null, priceMax: null, discountOnly: false },
    filterOptions: { collections: [], models: [], backdrops: [], symbols: [] },
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
    if (state.filters.collection) params.set('collection', state.filters.collection);
    if (state.filters.model)      params.set('model',      state.filters.model);
    if (state.filters.backdrop)   params.set('backdrop',   state.filters.backdrop);
    if (state.filters.symbol)     params.set('symbol',     state.filters.symbol);

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
    const collections = new Set();
    const models      = new Set();
    const backdrops   = new Set();
    const symbols     = new Set();
    state.items.forEach(g => {
        if (g.collection_name) collections.add(g.collection_name);
        if (g.model)           models.add(g.model);
        if (g.backdrop)        backdrops.add(g.backdrop);
        if (g.symbol)          symbols.add(g.symbol);
    });
    state.filterOptions.collections = [...collections].sort();
    state.filterOptions.models      = [...models].sort();
    state.filterOptions.backdrops   = [...backdrops].sort();
    state.filterOptions.symbols     = [...symbols].sort();
}

function renderSkeletons() {
    $('gifts-grid').innerHTML = Array(6).fill('<div class="gift-skeleton"></div>').join('');
    const bar = $('catalog-stats-bar');
    if (bar) bar.hidden = true;
}

function itemPrice(g) {
    return state.mode === 'rent'
        ? parseFloat(g.price_per_day_ton ?? 0)
        : parseFloat(g.price_with_markup ?? 0);
}

function visibleItems() {
    const q = state.query.trim().toLowerCase();
    const { priceMin, priceMax, discountOnly } = state.filters;
    return state.items.filter(g => {
        if (q && !((g.name || '').toLowerCase().includes(q) ||
                   (g.nft_address || '').toLowerCase().includes(q))) return false;
        const p = itemPrice(g);
        if (priceMin != null && p < priceMin) return false;
        if (priceMax != null && p > priceMax) return false;
        if (discountOnly && state.mode === 'rent' && !(g.discount_per_day > 0)) return false;
        return true;
    });
}

function renderCatalogStats() {
    const bar = $('catalog-stats-bar');
    if (!bar) return;
    const n = visibleItems().length;
    if (!n) { bar.hidden = true; return; }

    const wordForm = n === 1 ? 'подарунок' : (n >= 2 && n <= 4 ? 'подарунки' : 'подарунків');
    let html = `<span class="catalog-stats-count">${n} ${wordForm}</span>`;

    // Attribute tags
    const tags = [];
    ['collection', 'model', 'backdrop', 'symbol'].forEach(k => {
        if (state.filters[k]) tags.push(
            `<span class="catalog-stats-filter-tag">${esc(t(k))}: ${esc(state.filters[k])}
             <button onclick="clearFilter('${esc(k)}')" aria-label="clear">×</button></span>`);
    });
    // Price tag
    const { priceMin, priceMax, discountOnly } = state.filters;
    if (priceMin != null || priceMax != null) {
        const lbl = `${priceMin != null ? priceMin : '0'}–${priceMax != null ? priceMax : '∞'} TON`;
        tags.push(`<span class="catalog-stats-filter-tag">${esc(lbl)}
             <button onclick="clearFilter('price')" aria-label="clear">×</button></span>`);
    }
    if (discountOnly) tags.push(
        `<span class="catalog-stats-filter-tag">🎉 ${esc(t('discount_only'))}
         <button onclick="clearFilter('discountOnly')" aria-label="clear">×</button></span>`);

    if (tags.length) html += `<span class="catalog-stats-sep">•</span>` + tags.join('');
    bar.innerHTML = html;
    bar.hidden = false;
}

window.clearFilter = function(key) {
    if (key === 'price') { state.filters.priceMin = null; state.filters.priceMax = null; }
    else if (key === 'discountOnly') { state.filters.discountOnly = false; }
    else { state.filters[key] = null; }
    $('filter-active-dot').hidden = !hasActiveFilters();
    loadItems(true);
};

window.clearAllFilters = function() {
    state.filters = { collection: null, model: null, backdrop: null, symbol: null, priceMin: null, priceMax: null, discountOnly: false };
    $('filter-active-dot').hidden = true;
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

const TG_ICON = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.18-2.04 9.6c-.15.66-.54.84-1.08.51l-3-2.22-1.44 1.38c-.15.18-.36.27-.72.27l.27-3.06 6.9-6.24c.3-.27-.06-.42-.45-.15L6.45 13.8l-2.94-.93c-.63-.18-.63-.63.15-.93l10.8-4.17c.54-.18 1.02.15.84.9z"/></svg>`;

function tgBtn(name) {
    const link = tgNftLink(name);
    if (!link) return '';
    return `<a class="gift-card-tg-btn" href="${esc(link)}" target="_blank" rel="noopener"
               onclick="event.stopPropagation()" title="Відкрити в Telegram">${TG_ICON}</a>`;
}

function rentCard(g, i) {
    const uah      = tonToUah(g.price_per_day_ton);
    const discount = g.discount_per_day ? Math.round(g.discount_per_day * 100) : 0;
    const discBadge = discount > 0
        ? `<div class="card-discount">-${discount}%</div>` : '';
    const autoRelist = g.auto_relist
        ? `<div class="card-auto-relist">↺ Авто-рилістинг</div>` : '';
    return `
    <div class="gift-card" data-idx="${i}" role="button" tabindex="0" style="--i:${i}">
        <div class="gift-card-img-wrap">
            ${imgMarkup(g)}
            <div class="gift-card-placeholder" style="${g.image_url ? 'display:none' : ''}">${PLACEHOLDER_SVG}</div>
            <div class="gift-card-img-glow"></div>
            ${discBadge}
            ${tgBtn(g.name)}
        </div>
        <div class="gift-card-body">
            <div class="gift-card-name">${esc(g.name)}</div>
            ${g.collection_name ? `<div class="gift-card-collection">${esc(g.collection_name)}</div>` : ''}
            <div class="gift-card-price-row">
                <span class="gift-card-ton">◈ ${g.price_per_day_ton}<span class="cur-label">/день</span></span>
                <span class="gift-card-uah">≈ ${uah} ₴</span>
            </div>
            <div class="card-meta-row">
                <span class="card-meta-item">
                    <span class="card-meta-key">Термін</span>
                    <span class="card-meta-val">${g.min_duration_days}–${g.max_duration_days}д</span>
                </span>
                ${discount > 0 ? `<span class="card-meta-item">
                    <span class="card-meta-key">Знижка</span>
                    <span class="card-meta-val card-meta-accent">${discount}%</span>
                </span>` : ''}
            </div>
            ${autoRelist}
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
            <div class="gift-card-img-glow"></div>
            ${tgBtn(g.name)}
        </div>
        <div class="gift-card-body">
            <div class="gift-card-name">${esc(g.name)}</div>
            ${g.collection_name ? `<div class="gift-card-collection">${esc(g.collection_name)}</div>` : ''}
            <div class="gift-card-price-row">
                <span class="gift-card-ton">◈ ${g.price_with_markup}<span class="cur-label"> ${esc(cur)}</span></span>
                <span class="gift-card-uah">≈ ${uah} ₴</span>
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
    const f = state.filters;
    return !!(f.collection || f.model || f.backdrop || f.symbol ||
              f.priceMin != null || f.priceMax != null || f.discountOnly);
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
        { key: 'collection', label: t('collection'), opts: state.filterOptions.collections },
        { key: 'model',      label: t('model'),      opts: state.filterOptions.models      },
        { key: 'backdrop',   label: t('backdrop'),   opts: state.filterOptions.backdrops   },
        { key: 'symbol',     label: t('symbol'),     opts: state.filterOptions.symbols     },
    ];
    const attrHtml = sections.map(sec => {
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

    // Price range from currently loaded items
    const prices = state.items.map(itemPrice).filter(p => p > 0);
    const lo = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const hi = prices.length ? Math.ceil(Math.max(...prices))  : 100;
    const curMin = state.filters.priceMin ?? lo;
    const curMax = state.filters.priceMax ?? hi;
    const priceHtml = `
        <div>
            <div class="fs-section-title">${esc(t('price_range'))}</div>
            <div class="fs-price-row">
                <div class="fs-price-field">
                    <span class="fs-price-cap">${esc(t('from_label'))}</span>
                    <input type="number" inputmode="decimal" id="fs-price-min"
                           min="${lo}" max="${hi}" step="0.1" placeholder="${lo}" value="${state.filters.priceMin ?? ''}">
                </div>
                <span class="fs-price-dash">—</span>
                <div class="fs-price-field">
                    <span class="fs-price-cap">${esc(t('to_label'))}</span>
                    <input type="number" inputmode="decimal" id="fs-price-max"
                           min="${lo}" max="${hi}" step="0.1" placeholder="${hi}" value="${state.filters.priceMax ?? ''}">
                </div>
                <span class="fs-price-unit">TON</span>
            </div>
        </div>`;

    // Discount-only toggle (rent mode only)
    const discountHtml = state.mode === 'rent' ? `
        <div>
            <button class="fs-toggle${state.filters.discountOnly ? ' active' : ''}" id="fs-discount-toggle">
                <span class="fs-toggle-label">🎉 ${esc(t('discount_only'))}</span>
                <span class="fs-toggle-track"><span class="fs-toggle-knob"></span></span>
            </button>
        </div>` : '';

    body.innerHTML = priceHtml + discountHtml + attrHtml;

    // Wire price inputs
    const minIn = $('fs-price-min'), maxIn = $('fs-price-max');
    minIn?.addEventListener('input', () => {
        const v = parseFloat(minIn.value);
        state.filters.priceMin = Number.isFinite(v) ? v : null;
    });
    maxIn?.addEventListener('input', () => {
        const v = parseFloat(maxIn.value);
        state.filters.priceMax = Number.isFinite(v) ? v : null;
    });

    // Wire discount toggle
    $('fs-discount-toggle')?.addEventListener('click', () => {
        state.filters.discountOnly = !state.filters.discountOnly;
        $('fs-discount-toggle').classList.toggle('active', state.filters.discountOnly);
        if (tg) tg.HapticFeedback?.selectionChanged();
    });

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
    state.filters = { collection: null, model: null, backdrop: null, symbol: null, priceMin: null, priceMax: null, discountOnly: false };
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

    const tgNft = tgNftLink(item.name);
    const tgNftA = tgNft
        ? `<a class="nft-fragment-link nft-tg-link" href="${esc(tgNft)}" target="_blank" rel="noopener">
               ${TG_ICON} Telegram NFT
           </a>`
        : '';
    const fragLink = item.nft_address
        ? `<a class="nft-fragment-link" href="https://tonscan.org/nft/${esc(item.nft_address)}" target="_blank" rel="noopener">
               <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                   <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9"/><path d="M10 2h4v4"/><path d="M14 2L8 8"/>
               </svg>
               TONScan
           </a>`
        : '';

    container.innerHTML = chips + tgNftA + fragLink;
    container.style.display = (chips || fragLink) ? '' : 'none';
}

function fragmentSlug(name) {
    if (!name || !name.includes('#')) return null;
    const [namePart] = name.split('#');
    return namePart.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

function tgNftLink(name) {
    if (!name || !name.includes('#')) return null;
    const [namePart, numPart] = name.split('#');
    const slug = namePart.trim().toLowerCase().replace(/\s+/g, '');
    const num  = numPart.trim();
    return `https://t.me/nft/${slug}-${num}`;
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
    const btn      = $('wallet-action-btn');
    const topup    = $('wallet-topup-btn');
    const addrChip = $('wallet-addr-chip');
    if (!btn) return;
    const connected = !!tonConnectUI?.connected;

    if (connected) {
        const addr = tonConnectUI.account?.address;
        if (addrChip) { addrChip.hidden = false; $('wallet-addr-text').textContent = truncAddr(addr); }
        btn.textContent = t('disconnect_wallet');
        btn.classList.add('disconnect');
        if (topup) topup.hidden = false;
        refreshBalance();
    } else {
        if (addrChip) addrChip.hidden = true;
        const bal = $('wallet-balance'), uah = $('wallet-balance-uah');
        if (bal) bal.textContent = '—';
        if (uah) uah.textContent = '';
        btn.textContent = t('connect_wallet');
        btn.classList.remove('disconnect');
        if (topup) topup.hidden = true;
    }
}

async function fetchTonBalance(address) {
    const r = await fetch(
        `https://toncenter.com/api/v2/getAddressBalance?address=${encodeURIComponent(address)}`,
        { headers: { 'Accept': 'application/json' } });
    const j = await r.json();
    if (!j || j.ok !== true) throw new Error('balance');
    return Number(j.result) / 1e9;
}

let _balanceBusy = false;
async function refreshBalance() {
    const balEl = $('wallet-balance'), uahEl = $('wallet-balance-uah');
    if (!balEl || !tonConnectUI?.connected) return;
    const addr = tonConnectUI.account?.address;
    if (!addr || _balanceBusy) return;
    _balanceBusy = true;
    balEl.textContent = '…';
    if (uahEl) uahEl.textContent = '';
    try {
        const bal = await fetchTonBalance(addr);
        balEl.textContent = bal.toLocaleString(lang === 'en' ? 'en-US' : 'uk-UA', { maximumFractionDigits: 2 });
        if (uahEl) uahEl.textContent = '≈ ' + tonToUah(bal);
    } catch {
        balEl.textContent = '—';
        if (uahEl) uahEl.textContent = t('balance_err');
    } finally {
        _balanceBusy = false;
    }
}

async function toggleWallet() {
    if (!tonConnectUI) return notify('TonConnect недоступний', 'error');
    if (tonConnectUI.connected) await tonConnectUI.disconnect();
    else                        await tonConnectUI.openModal();
}

// ─── Profile links & quick actions ─────────────────────────────────────────────

const GM_LINKS = {
    support: window.GM_SUPPORT || 'mailto:partnersmerchant@gmail.com',
    news:    window.GM_NEWS    || '',
    terms:   'index.html',
    privacy: 'index.html',
    phone:   'tel:+380687525155',
};

function openUrl(url) {
    if (!url) return;
    try {
        if (/^https:\/\/t\.me\//.test(url) && tg?.openTelegramLink) return tg.openTelegramLink(url);
        if (/^https?:\/\//.test(url) && tg?.openLink)               return tg.openLink(url);
    } catch { /* fall through */ }
    window.location.href = url;
}

function copyText(text) {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
}
function fallbackCopy(text) {
    const el = document.createElement('input');
    el.value = text; document.body.appendChild(el);
    el.select(); try { document.execCommand('copy'); } catch {}
    document.body.removeChild(el);
}

function showInfo(title, message) {
    if (tg?.showPopup) {
        try { tg.showPopup({ title: String(title).slice(0, 40), message: String(message).slice(0, 480) }); return; }
        catch { /* fall through */ }
    }
    if (tg?.showAlert) { tg.showAlert(`${title}\n\n${message}`); return; }
    alert(`${title}\n\n${message}`);
}

function handleProfileLink(kind) {
    if (tg) tg.HapticFeedback?.impactOccurred('light');
    switch (kind) {
        case 'how':     return showInfo(t('how_it_works'), t('how_text'));
        case 'faq':     return showInfo(t('faq'), t('faq_text'));
        case 'terms':   return openUrl(GM_LINKS.terms);
        case 'privacy': return openUrl(GM_LINKS.privacy);
        case 'phone':   return openUrl(GM_LINKS.phone);
    }
}

function shareApp() {
    const link = window.GM_SHARE_URL || '';
    if (link && tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Asset Market — NFT')}`);
    } else if (navigator.share) {
        navigator.share({ title: 'Asset Market', text: 'NFT gifts rental & sale on TON' }).catch(() => {});
    } else {
        notify(t('soon'), 'info');
    }
}

function handleQuickAction(action) {
    if (tg) tg.HapticFeedback?.impactOccurred('medium');
    switch (action) {
        case 'support': return openUrl(GM_LINKS.support);
        case 'news':    return GM_LINKS.news ? openUrl(GM_LINKS.news) : notify(t('soon'), 'info');
        case 'share':   return shareApp();
        case 'rate':    return notify('⭐ ' + t('great'), 'success');
    }
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

function setTab(tab) {
    if (tab === 'alerts') { location.href = 'alerts.html'; return; }
    state.tab = tab;
    document.body.dataset.tab = tab;
    $$('.view').forEach(v => v.classList.toggle('hidden', v.dataset.view !== tab));
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    if (tab === 'catalog') { headerHidden = false; $('catalog-header')?.classList.remove('hide-scroll'); }
    if (tab === 'orders')   loadOrders();
    if (tab === 'settings') loadSettings();
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

$('wallet-refresh-btn')?.addEventListener('click', () => {
    $('wallet-refresh-btn').classList.add('spin');
    refreshBalance().finally(() => setTimeout(() => $('wallet-refresh-btn')?.classList.remove('spin'), 600));
    if (tg) tg.HapticFeedback?.impactOccurred('light');
});
$('wallet-topup-btn')?.addEventListener('click', () => {
    const addr = tonConnectUI?.account?.address;
    if (addr) { copyText(addr); notify(t('copied'), 'success'); if (tg) tg.HapticFeedback?.notificationOccurred('success'); }
});
$$('.quick-action').forEach(b => b.addEventListener('click', () => handleQuickAction(b.dataset.action)));
$$('.link-row').forEach(b => b.addEventListener('click', () => handleProfileLink(b.dataset.link)));

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

// Handle ?tab= URL param for navigation from alerts.html
const _initTab = new URLSearchParams(location.search).get('tab');
if (_initTab && ['orders', 'settings'].includes(_initTab)) setTab(_initTab);
else loadItems(true);

// Background ping: keep nav indicator dot fresh
setInterval(() => {
    if (!BACKEND_URL) return;
    fetch(`${BACKEND_URL}/api/alerts/current`, { headers: authHeaders() })
        .then(r => r.json())
        .then(c => { const ind = $('nav-alert-indicator'); if (ind) ind.hidden = !(c?.attack?.status === 'active' && (c?.objects?.length||0) > 0); })
        .catch(() => {});
}, 60_000);
if (BACKEND_URL) fetch(`${BACKEND_URL}/api/alerts/current`, { headers: authHeaders() })
    .then(r => r.json())
    .then(c => { const ind = $('nav-alert-indicator'); if (ind) ind.hidden = !(c?.attack?.status === 'active' && (c?.objects?.length||0) > 0); })
    .catch(() => {});
