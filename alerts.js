/**
 * Asset Market — alerts.js
 * Standalone air-threat map & alerts page
 */

const BACKEND_URL = (window.BACKEND_URL || '').replace(/\/$/, '');
const tg = window.Telegram?.WebApp ?? null;

if (tg) {
    tg.ready(); tg.expand();
    tg.setHeaderColor?.('#080808');
    tg.setBackgroundColor?.('#080808');
}

let lang = localStorage.getItem('gm_lang') || 'uk';

const TR = {
    uk: {
        alerts_calm: 'Тихо', alerts_no_threats: 'Активних загроз не зафіксовано',
        alerts_no_threats_long: 'Активних загроз немає. Бережіть себе.',
        alerts_active: 'Активні загрози', alerts_recent: 'Останні атаки',
        alerts_tab: 'Тривоги', catalog: 'Каталог', orders: 'Замовлення', profile: 'Профіль',
        legend_threat: 'Загроза', legend_city: 'Місто',
    },
    en: {
        alerts_calm: 'All calm', alerts_no_threats: 'No active threats',
        alerts_no_threats_long: 'No active threats. Stay safe.',
        alerts_active: 'Active threats', alerts_recent: 'Recent attacks',
        alerts_tab: 'Alerts', catalog: 'Catalog', orders: 'Orders', profile: 'Profile',
        legend_threat: 'Threat', legend_city: 'City',
    },
    ru: {
        alerts_calm: 'Спокойно', alerts_no_threats: 'Активных угроз нет',
        alerts_no_threats_long: 'Активных угроз нет. Берегите себя.',
        alerts_active: 'Активные угрозы', alerts_recent: 'Последние атаки',
        alerts_tab: 'Тревоги', catalog: 'Каталог', orders: 'Заказы', profile: 'Профиль',
        legend_threat: 'Угроза', legend_city: 'Город',
    },
};

function t(k) { return TR[lang]?.[k] ?? TR.uk[k] ?? k; }

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function authHeaders() {
    const h = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' };
    if (tg?.initData) h['X-Telegram-Init-Data'] = tg.initData;
    return h;
}

async function apiFetch(path) {
    if (!BACKEND_URL) return {};
    const res = await fetch(`${BACKEND_URL}${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ─── Threat metadata ──────────────────────────────────────────────────────────

const KIND_META = {
    drone_piston:     { ua: 'Shahed / БПЛА',     en: 'Shahed / UAV',      ru: 'Shahed / БПЛА',     speed: 165  },
    drone_jet:        { ua: 'Реактивний БПЛА',   en: 'Jet drone',         ru: 'Реактивный БПЛА',   speed: 450  },
    missile_cruise:   { ua: 'Крилата ракета',    en: 'Cruise missile',    ru: 'Крылатая ракета',   speed: 800  },
    missile_ballistic:{ ua: 'Балістична ракета', en: 'Ballistic missile', ru: 'Балл. ракета',      speed: 7500 },
    bomb:             { ua: 'КАБ / Авіабомба',   en: 'Glide bomb',        ru: 'КАБ / Авиабомба',   speed: 750  },
};

const KIND_ICONS = {
    drone_piston:     `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 10V8M12 14v2M10 12H8M14 12h2"/></svg>`,
    drone_jet:        `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l8 16h-5l-3-6-3 6H4z"/></svg>`,
    missile_cruise:   `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 14l13-9 5 5-9 13-2-5z"/><path d="M3 14l5 2"/></svg>`,
    missile_ballistic:`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v8M9 5l3-3 3 3M12 10c0 4 3 5 3 8a3 3 0 11-6 0c0-3 3-4 3-8z"/></svg>`,
    bomb:             `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="13" r="6"/><path d="M17 7l3-3M14 4l3 3"/></svg>`,
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
    kyiv:         { ua: 'Київ',          en: 'Kyiv',         lat: 50.45, lon: 30.52 },
    kharkiv:      { ua: 'Харків',        en: 'Kharkiv',      lat: 49.99, lon: 36.23 },
    odesa:        { ua: 'Одеса',         en: 'Odesa',        lat: 46.48, lon: 30.73 },
    dnipro:       { ua: 'Дніпро',        en: 'Dnipro',       lat: 48.46, lon: 35.04 },
    lviv:         { ua: 'Львів',         en: 'Lviv',         lat: 49.84, lon: 24.03 },
    zaporizhzhia: { ua: 'Запоріжжя',    en: 'Zaporizhzhia', lat: 47.84, lon: 35.14 },
    mykolaiv:     { ua: 'Миколаїв',     en: 'Mykolaiv',     lat: 46.97, lon: 32.00 },
    kherson:      { ua: 'Херсон',       en: 'Kherson',      lat: 46.65, lon: 32.62 },
    poltava:      { ua: 'Полтава',      en: 'Poltava',      lat: 49.59, lon: 34.55 },
    sumy:         { ua: 'Суми',         en: 'Sumy',         lat: 50.92, lon: 34.80 },
    chernihiv:    { ua: 'Чернігів',     en: 'Chernihiv',    lat: 51.50, lon: 31.30 },
    vinnytsia:    { ua: 'Вінниця',      en: 'Vinnytsia',    lat: 49.23, lon: 28.47 },
    cherkasy:     { ua: 'Черкаси',      en: 'Cherkasy',     lat: 49.45, lon: 32.06 },
    zhytomyr:     { ua: 'Житомир',      en: 'Zhytomyr',     lat: 50.25, lon: 28.67 },
    rivne:        { ua: 'Рівне',        en: 'Rivne',        lat: 50.62, lon: 26.25 },
    ivano_frank:  { ua: 'Івано-Фр.',    en: 'Ivano-Fr.',    lat: 48.92, lon: 24.71 },
    ternopil:     { ua: 'Тернопіль',    en: 'Ternopil',     lat: 49.55, lon: 25.60 },
    lutsk:        { ua: 'Луцьк',        en: 'Lutsk',        lat: 50.74, lon: 25.32 },
    uzhhorod:     { ua: 'Ужгород',      en: 'Uzhhorod',     lat: 48.62, lon: 22.30 },
    kryvyi_rih:   { ua: 'Кривий Ріг',   en: 'Kryvyi Rih',   lat: 47.91, lon: 33.38 },
    khmelnitskyi: { ua: 'Хмельницький', en: 'Khmelnytskyi', lat: 49.42, lon: 27.00 },
};

// ─── Projection ───────────────────────────────────────────────────────────────

function lonLatToXY(lon, lat) {
    const { lonMin, lonMax, latMin, latMax } = UA_BOUNDS;
    return {
        x: ((lon - lonMin) / (lonMax - lonMin)) * 1000,
        y: (1 - (lat - latMin) / (latMax - latMin)) * 660,
    };
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

    svg.addEventListener('wheel', e => {
        e.preventDefault();
        const p = clientToSvgCoords(svg, e.clientX, e.clientY);
        mapZoom(e.deltaY > 0 ? 1.18 : 0.85, p.x, p.y);
    }, { passive: false });

    const ptrs = new Map();
    let panStart   = null;
    let pinchDist0 = null;

    function getPointerPair() {
        const [a, b] = [...ptrs.values()];
        return {
            cx:   (a.x + b.x) / 2,
            cy:   (a.y + b.y) / 2,
            dist: Math.hypot(a.x - b.x, a.y - b.y),
        };
    }

    svg.addEventListener('pointerdown', e => {
        svg.setPointerCapture(e.pointerId);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 1) {
            panStart   = { cx: e.clientX, cy: e.clientY, vbX: mapVB.x, vbY: mapVB.y };
            pinchDist0 = null;
        } else if (ptrs.size === 2) {
            pinchDist0 = getPointerPair().dist;
            panStart   = null;
        }
        svg.classList.add('dragging');
    });

    svg.addEventListener('pointermove', e => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (ptrs.size === 2 && pinchDist0 !== null) {
            const pair  = getPointerPair();
            const scale = pinchDist0 / pair.dist;
            pinchDist0  = pair.dist;
            const p = clientToSvgCoords(svg, pair.cx, pair.cy);
            mapZoom(scale, p.x, p.y);
        } else if (ptrs.size === 1 && panStart) {
            const rect = svg.getBoundingClientRect();
            const dx = (e.clientX - panStart.cx) * (mapVB.w / rect.width);
            const dy = (e.clientY - panStart.cy) * (mapVB.h / rect.height);
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

// ─── Alerts loading ───────────────────────────────────────────────────────────

let citiesCache   = null;
let _threatObjects = [];

async function loadCities() {
    if (citiesCache) return citiesCache;
    try {
        const data = await apiFetch('/api/alerts/cities');
        citiesCache = data.cities || {};
    } catch { citiesCache = {}; }
    return citiesCache;
}

async function loadAlerts() {
    let current = null, attacks = null, fetchOk = false;
    try {
        [current, attacks] = await Promise.all([
            apiFetch('/api/alerts/current'),
            apiFetch('/api/alerts/attacks?limit=5'),
        ]);
        await loadCities();
        fetchOk = true;
    } catch (e) {
        console.warn('alerts load failed:', e);
    }

    // Always render map/stats (with empty data if offline)
    renderAlertsStatus(current);
    renderAlertsMap(current);
    renderAlertsStats(current, attacks);
    renderThreatsList(current);
    renderRecentAttacks(attacks);

    if (!fetchOk) {
        const box   = $('alerts-status');
        const title = $('alerts-status-title');
        const sub   = $('alerts-status-sub');
        if (box)   { box.classList.remove('danger'); box.classList.add('offline'); }
        if (title) title.textContent = lang === 'en' ? 'Offline' : 'Офлайн';
        if (sub)   sub.textContent   = lang === 'en' ? 'No connection to server' : 'Немає зв\'язку з сервером';
    }
}

function renderAlertsStatus(current) {
    const box    = $('alerts-status');
    const active = current?.attack?.status === 'active' && (current?.objects?.length || 0) > 0;
    if (box) { box.classList.toggle('danger', active); box.classList.remove('offline'); }
    if (active) {
        const cnt = current.objects.length;
        $('alerts-status-title').textContent =
            lang === 'en' ? '⚠ Active attack' :
            lang === 'ru' ? '⚠ Активная атака' : '⚠ Активна атака';
        $('alerts-status-sub').textContent =
            lang === 'en' ? `${cnt} object${cnt > 1 ? 's' : ''} in the air` :
            lang === 'ru' ? `Объектов в воздухе: ${cnt}` :
                             `Об'єктів у повітрі: ${cnt}`;
    } else {
        $('alerts-status-title').textContent = t('alerts_calm');
        $('alerts-status-sub').textContent   = t('alerts_no_threats');
    }
}

function renderAlertsMap(current) {
    const cityG  = $('map-cities');
    const threatG = $('map-threats');
    if (!cityG || !threatG) return;

    if (!cityG.dataset.populated) {
        cityG.innerHTML = Object.entries(FALLBACK_CITIES).map(([, c]) => {
            const { x, y } = lonLatToXY(c.lon, c.lat);
            const name = c[lang === 'en' ? 'en' : 'ua'];
            return `<circle class="map-city" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>` +
                   `<text class="map-city-label" x="${(x + 7).toFixed(1)}" y="${(y + 4).toFixed(1)}">${esc(name)}</text>`;
        }).join('');
        cityG.dataset.populated = '1';
    }

    const threats = (current?.objects || []).filter(o =>
        o.status === 'active' && Number.isFinite(o.lat) && Number.isFinite(o.lon));
    _threatObjects = threats;

    threatG.innerHTML = threats.map((o, idx) => {
        const { x, y } = lonLatToXY(o.lon, o.lat);
        const trail = Array.isArray(o.trail) && o.trail.length > 1
            ? `<polyline class="map-threat-trail" points="${
                o.trail.map(p => { const xy = lonLatToXY(p[0], p[1]); return `${xy.x.toFixed(1)},${xy.y.toFixed(1)}`; }).join(' ')
              }"/>`
            : '';
        return `<g class="map-threat" data-tidx="${idx}">
            ${trail}
            <circle class="map-threat-glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="url(#tGlow)"/>
            <circle class="map-threat-core" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>
        </g>`;
    }).join('');

    threatG.querySelectorAll('.map-threat').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            const o = _threatObjects[+el.dataset.tidx];
            if (o) showThreatPopup(o);
        });
    });

    initMapInteraction();
    highlightOblasts(current);
}

// Oblast name → data-oblast value mapping
const CITY_TO_OBLAST = {
    kyiv:'kyiv', kharkiv:'kharkiv', odesa:'odesa', dnipro:'dnipro', lviv:'lviv',
    zaporizhzhia:'zaporizhzhia', mykolaiv:'mykolaiv', kherson:'kherson',
    poltava:'poltava', sumy:'sumy', chernihiv:'chernihiv', vinnytsia:'vinnytsia',
    cherkasy:'cherkasy', zhytomyr:'zhytomyr', rivne:'rivne', ivano_frank:'ivano-frankivsk',
    ternopil:'ternopil', lutsk:'volyn', uzhhorod:'zakarpattia', kryvyi_rih:'dnipro',
    khmelnitskyi:'khmelnytskyi',
    luhansk:'luhansk', donetsk:'donetsk', crimea:'crimea', sevastopol:'crimea',
};

function highlightOblasts(current) {
    document.querySelectorAll('.map-oblast').forEach(el => {
        el.classList.remove('alert-active', 'alert-partial');
    });
    const threats = (current?.objects || []).filter(o => o.status === 'active');
    const activeSet = new Set();
    const partialSet = new Set();
    threats.forEach(o => {
        const oblastKey = CITY_TO_OBLAST[o.to_city] || CITY_TO_OBLAST[o.to_region];
        if (oblastKey) activeSet.add(oblastKey);
        const fromKey = CITY_TO_OBLAST[o.from_zone];
        if (fromKey) partialSet.add(fromKey);
    });
    activeSet.forEach(k => {
        const el = document.querySelector(`.map-oblast[data-oblast="${k}"]`);
        if (el) el.classList.add('alert-active');
    });
    partialSet.forEach(k => {
        const el = document.querySelector(`.map-oblast[data-oblast="${k}"]`);
        if (el && !activeSet.has(k)) el.classList.add('alert-partial');
    });
}

function renderAlertsStats(current, attacksResp) {
    const stats = $('alerts-stats');
    if (!stats) return;
    const last      = attacksResp?.attacks?.[0] || {};
    const activeNow = (current?.objects || []).filter(o => o.status === 'active').length;
    const items = [
        { num: activeNow,                         label: lang === 'en' ? 'In air'    : 'У повітрі', cls: activeNow > 0 ? 'danger' : '' },
        { num: last.total_drones         || 0,    label: lang === 'en' ? 'Drones'    : 'Дронів',    cls: 'danger' },
        { num: last.total_missiles       || 0,    label: lang === 'en' ? 'Missiles'  : 'Ракет',     cls: 'danger' },
        { num: last.official_shot_total  || 0,    label: lang === 'en' ? 'Shot down' : 'Збито',     cls: 'good'   },
    ];
    stats.innerHTML = items.map(i =>
        `<div class="stat-card"><div class="stat-num ${i.cls}">${i.num}</div><div class="stat-label">${esc(i.label)}</div></div>`
    ).join('');
}

function renderThreatsList(current) {
    const list    = $('alerts-threats-list');
    const badge   = $('alerts-count-badge');
    const threats = (current?.objects || []).filter(o => o.status === 'active');
    if (badge) badge.textContent = threats.length;
    if (!list) return;

    if (!threats.length) {
        list.innerHTML = `<div class="alerts-empty">${esc(t('alerts_no_threats_long'))}</div>`;
        return;
    }

    list.innerHTML = threats.slice(0, 30).map(o => {
        const meta     = KIND_META[o.kind]  || KIND_META.drone_piston;
        const icon     = KIND_ICONS[o.kind] || KIND_ICONS.drone_piston;
        const kindName = meta[lang] || meta.ua;
        const fromZone = ZONE_LABELS[o.from_zone] || o.from_zone || '?';
        const toCity   = citiesCache?.[o.to_city]?.ua || o.to_city || '?';
        const speed    = o.speed_kmh || meta.speed;
        const cls      = o.status === 'eliminated' ? 'eliminated' : o.status === 'lost' ? 'lost' : '';
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
    const list    = $('alerts-attacks-list');
    const attacks = (attacksResp?.attacks || []).slice(0, 5);
    if (!list) return;

    if (!attacks.length) { list.innerHTML = `<div class="alerts-empty">—</div>`; return; }

    list.innerHTML = attacks.map(a => {
        const d = new Date(a.started_at * 1000);
        const dateStr = d.toLocaleDateString(
            lang === 'en' ? 'en-GB' : 'uk-UA',
            { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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

function showThreatPopup(o) {
    const meta     = KIND_META[o.kind]  || KIND_META.drone_piston;
    const icon     = KIND_ICONS[o.kind] || KIND_ICONS.drone_piston;
    const kindName = meta[lang] || meta.ua;
    const fromZone = ZONE_LABELS[o.from_zone] || o.from_zone || '?';
    const toCity   = citiesCache?.[o.to_city]?.ua || o.to_city || '?';
    const speed    = o.speed_kmh || meta.speed;
    const heading  = o.heading_deg != null ? `${o.heading_deg}°` : null;
    const statusLabel = o.status === 'eliminated' ? '💥 Збито' :
                        o.status === 'lost'        ? '? Втрачено' : '🔴 Активний';

    $('threat-popup-icon').innerHTML   = icon;
    $('threat-popup-name').textContent = o.title || kindName;
    $('threat-popup-route').innerHTML  =
        `<span>${esc(fromZone)}</span><span style="opacity:0.5">→</span><span>${esc(toCity)}</span>`;
    $('threat-popup-tags').innerHTML   = [
        `<span class="popup-tag popup-tag-speed">${speed} км/г</span>`,
        `<span class="popup-tag popup-tag-status">${statusLabel}</span>`,
        heading ? `<span class="popup-tag popup-tag-heading">↗ ${esc(heading)}</span>` : '',
    ].join('');

    $('threat-popup').hidden = false;
    if (tg) tg.HapticFeedback?.impactOccurred('light');
}

// ─── Wire-up ──────────────────────────────────────────────────────────────────

$('threat-popup-close')?.addEventListener('click', () => { $('threat-popup').hidden = true; });

$('alerts-refresh-btn')?.addEventListener('click', () => {
    const btn = $('alerts-refresh-btn');
    btn.classList.add('spin');
    loadAlerts().finally(() => setTimeout(() => btn.classList.remove('spin'), 700));
    if (tg) tg.HapticFeedback?.impactOccurred('light');
});

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

// ─── Init ─────────────────────────────────────────────────────────────────────

loadAlerts();
setInterval(loadAlerts, 30_000);
