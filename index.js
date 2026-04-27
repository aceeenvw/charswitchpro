/* CharSwitch Pro
 * author: aceenvw
 * v2.1.0 — full mobile / touch device support
 * Fork of SillyTavern-CharSwitch by LenAnderson (v1.0.1)
 * Plain JS, no build step. ES module.
 */

import {
    characters,
    event_types,
    eventSource,
    saveSettingsDebounced,
    selectCharacterById,
    setActiveCharacter,
    setActiveGroup,
    this_chid,
    getThumbnailUrl,
    getPastCharacterChats,
    getRequestHeaders,
} from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';
import { groups, openGroupById, selected_group } from '../../../group-chats.js';
import { tag_map, tags as allTags } from '../../../tags.js';
import { POPUP_TYPE, callGenericPopup } from '../../../popup.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommandArgument, ARGUMENT_TYPE } from '../../../slash-commands/SlashCommandArgument.js';

/* ================= Integrity marker =================
 * Runtime-verifiable attribution. Decodes to author nick.
 */
const __cswp_integrity = (() => {
    const a = [97, 99, 101, 101, 110, 118, 119];
    return a.map(c => String.fromCharCode(c)).join('');
})();
Object.defineProperty(globalThis, '__cswp_author', {
    value: __cswp_integrity,
    writable: false,
    enumerable: false,
    configurable: false,
});

/* ================= Constants ================= */
const EXT_KEY = 'charswitchPro';
const LEGACY_KEY = 'charSwitch';
const ROOT_ID = 'cswp_root';
const SETTINGS_ID = 'cswp_settings';
const PALETTE_ID = 'cswp_palette';
const PREVIEW_ID = 'cswp_preview';
const TRIGGER_SELECTOR = '#rightNavHolder > .drawer-toggle';

const DEFAULTS = Object.freeze({
    showAvatar: true,
    showFavorites: false,
    onlyFavorites: false,
    highlightFavorites: true,
    numCards: 12,
    enablePalette: true,
    paletteHotkey: 'Ctrl+Shift+K',
    enableChatSearch: true,
    chatPreview: true,
    cacheAvatars: true,
    /* v2.1.0 — mobile */
    showMobileFab: 'auto',      // 'auto' | 'always' | 'never'
    longPressMs: 450,
    mobilePreviewTap: true,      // tap = switch, long-press = preview
});

/* ================= Device capability detection ================= */
const Device = {
    get hasCoarsePointer() {
        return window.matchMedia?.('(pointer: coarse)').matches ?? false;
    },
    get hasNoHover() {
        return window.matchMedia?.('(hover: none)').matches ?? false;
    },
    get hasTouch() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    },
    get isNarrow() {
        return window.innerWidth <= 768;
    },
    get isTouchDevice() {
        return this.hasCoarsePointer || this.hasNoHover || this.hasTouch;
    },
    get supportsHover() {
        return window.matchMedia?.('(hover: hover)').matches ?? !this.isTouchDevice;
    },
};

/* ================= Settings (migration + persist fix) ================= */
function loadSettings() {
    const legacy = extension_settings[LEGACY_KEY] ?? extension_settings.charSwitchx;
    const current = extension_settings[EXT_KEY];
    const merged = Object.assign({}, DEFAULTS, legacy ?? {}, current ?? {});
    extension_settings[EXT_KEY] = merged;
    return merged;
}
let settings = loadSettings();

function saveSettings() {
    extension_settings[EXT_KEY] = settings;
    saveSettingsDebounced();
}

/* ================= i18n =================
 * Path is derived from this module's own URL, so the extension works
 * regardless of the install folder name (CharSwitchPro, charswitchpro,
 * my-fork, etc.) or whether it lives under third-party/ or user/.
 */
const EXT_BASE_URL = (() => {
    try {
        // import.meta.url → .../CharSwitchPro/index.js  →  .../CharSwitchPro/
        return new URL('./', import.meta.url).href;
    } catch (_) {
        // fallback for environments without import.meta (shouldn't happen in ST)
        return '/scripts/extensions/third-party/CharSwitchPro/';
    }
})();

let i18nDict = {};
async function loadI18n() {
    const ctx = (typeof getContext === 'function') ? getContext() : null;
    const locale = (ctx?.locale) || document.documentElement.lang || 'en-us';
    const file = locale.toLowerCase().startsWith('ru') ? 'ru-ru' : 'en-us';
    try {
        const url = `${EXT_BASE_URL}i18n/${file}.json`;
        const res = await fetch(url, { headers: getRequestHeaders?.() ?? {} });
        if (res.ok) i18nDict = await res.json();
        else if (file !== 'en-us') {
            // language file missing — fall back to English
            const fallback = await fetch(`${EXT_BASE_URL}i18n/en-us.json`, { headers: getRequestHeaders?.() ?? {} });
            if (fallback.ok) i18nDict = await fallback.json();
        }
    } catch (_) { /* final fallback: keys rendered as strings */ }
}
function t(key, params) {
    let s = i18nDict[key] ?? key;
    if (params) for (const k in params) s = s.replace(`{${k}}`, params[k]);
    return s;
}

/* ================= Utilities ================= */
const timers = new Set();
function setCleanTimeout(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
}
function setCleanInterval(fn, ms) {
    const id = setInterval(fn, ms);
    timers.add(id);
    return id;
}
function clearAllTimers() {
    timers.forEach(id => { clearTimeout(id); clearInterval(id); });
    timers.clear();
}

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Fuzzy match: subsequence-based, returns {score, indices} or null
function fuzzy(needle, haystack) {
    if (!needle) return { score: 0, indices: [] };
    const n = needle.toLowerCase();
    const h = haystack.toLowerCase();
    if (h.includes(n)) {
        const i = h.indexOf(n);
        return { score: 1000 - i, indices: Array.from({ length: n.length }, (_, k) => i + k) };
    }
    let ni = 0, score = 0, last = -2;
    const indices = [];
    for (let i = 0; i < h.length && ni < n.length; i++) {
        if (h[i] === n[ni]) {
            indices.push(i);
            score += (i - last === 1) ? 5 : 1;
            last = i;
            ni++;
        }
    }
    if (ni !== n.length) return null;
    score -= (h.length - indices[indices.length - 1]) * 0.1;
    return { score, indices };
}
function highlight(text, indices) {
    if (!indices || !indices.length) return esc(text);
    let out = '', idx = 0;
    for (let i = 0; i < text.length; i++) {
        if (idx < indices.length && indices[idx] === i) {
            out += `<span class="cswp--paletteItemMatch">${esc(text[i])}</span>`;
            idx++;
        } else {
            out += esc(text[i]);
        }
    }
    return out;
}

/* ================= Avatar helpers (cached) ================= */
const avatarCache = new Map();

function safeThumb(file) {
    if (typeof getThumbnailUrl === 'function') {
        try { return getThumbnailUrl('avatar', file, true); } catch (_) {}
    }
    return `/thumbnail?type=avatar&file=${encodeURIComponent(file)}`;
}

async function getAvatar(character) {
    if (!character) return '/img/five.png';
    if (character.avatar) return safeThumb(character.avatar);
    if (!character.members) return '/img/five.png';

    const members = [
        ...(character.members ?? []),
        ...(character.disabled_members ?? []),
    ].filter((it, idx, list) => idx === list.indexOf(it));

    if (members.length === 0) return '/img/five.png';
    if (members.length === 1) return safeThumb(members[0]);

    const cacheKey = `${character.id}::${members.slice(0, 4).join('|')}`;
    if (settings.cacheAvatars && avatarCache.has(cacheKey)) {
        return avatarCache.get(cacheKey);
    }

    const slots = Math.min(members.length, 4);
    const imgs = await Promise.all(
        Array.from({ length: slots }, (_, i) => new Promise(resolve => {
            const img = new Image();
            img.src = safeThumb(members[i]);
            if (img.complete) return resolve(img);
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
        })),
    );

    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 96;
    const con = canvas.getContext('2d');
    if (!con) return '/img/five.png';

    if (slots === 2) {
        con.drawImage(imgs[0], 24, 0, 47, 96, 0, 0, 47, 96);
        con.drawImage(imgs[1], 24, 0, 47, 96, 49, 0, 47, 96);
    } else if (slots === 3) {
        con.drawImage(imgs[0], 0, 0, 96, 96, 0, 0, 47, 47);
        con.drawImage(imgs[1], 0, 0, 96, 96, 49, 0, 47, 47);
        con.drawImage(imgs[2], 0, 0, 96, 47, 0, 49, 96, 47);
    } else {
        con.drawImage(imgs[0], 0, 0, 96, 96, 0, 0, 47, 47);
        con.drawImage(imgs[1], 0, 0, 96, 96, 49, 0, 47, 47);
        con.drawImage(imgs[2], 0, 0, 96, 96, 0, 49, 47, 47);
        con.drawImage(imgs[3], 0, 0, 96, 96, 49, 49, 47, 47);
    }

    const dataUrl = canvas.toDataURL();
    if (settings.cacheAvatars) avatarCache.set(cacheKey, dataUrl);
    return dataUrl;
}

/* ================= Trigger avatar overlay ================= */
let trigger = null;
let currentEntity = null;

async function refreshTriggerAvatar() {
    if (!trigger) return;
    currentEntity = characters[this_chid] ?? groups.find(g => g.id === selected_group);
    trigger.classList.toggle('cswp--char', !!(currentEntity && settings.showAvatar));
    if (currentEntity && settings.showAvatar) {
        const url = await getAvatar(currentEntity);
        trigger.style.setProperty('--cswp--avatar', `url("${url}")`);
    } else {
        trigger.style.removeProperty('--cswp--avatar');
    }
}

/* ================= Entity helpers ================= */
function entityKey(e) { return e?.avatar ?? e?.id; }

function getEntityTags(entity) {
    const key = entity?.avatar ?? entity?.id;
    const tagIds = tag_map?.[key] ?? [];
    return tagIds.map(tid => allTags?.find(t => t.id === tid)).filter(Boolean);
}

function compareEntities(a, b) {
    if (settings.showFavorites) {
        if (a.fav && !b.fav) return -1;
        if (!a.fav && b.fav) return 1;
    }
    return (b.date_last_chat ?? 0) - (a.date_last_chat ?? 0);
}

function getEntityPool() {
    return [...characters, ...groups]
        .filter(e => !settings.onlyFavorites || e.fav)
        .filter(e => entityKey(e) !== entityKey(currentEntity));
}

async function switchToEntity(entity) {
    if (entity.members) {
        setActiveCharacter(null);
        setActiveGroup(entity.id);
        await openGroupById(entity.id);
    } else {
        const idx = characters.indexOf(entity);
        setActiveCharacter(idx);
        setActiveGroup(null);
        await selectCharacterById(idx);
    }
    saveSettingsDebounced();
}

/* ================= Quick menu (right-click on drawer icon) ================= */
let quickMenuOpen = false;
let activeTagFilter = null;

async function openQuickMenu(evt) {
    if (quickMenuOpen) return;
    if (evt) evt.preventDefault();
    quickMenuOpen = true;
    activeTagFilter = null;

    const blocker = document.createElement('div');
    blocker.className = 'cswp--ctxBlocker';
    blocker.addEventListener('click', () => closeQuickMenu());
    blocker.addEventListener('contextmenu', e => { e.preventDefault(); closeQuickMenu(); });

    const menu = document.createElement('div');
    menu.className = 'cswp--ctxMenu list-group';
    const rect = trigger.getBoundingClientRect();
    menu.style.setProperty('--cswp--y', `${rect.bottom}px`);
    const isDiscord = document.body.classList.contains('cswp');
    menu.style.left = isDiscord ? 'var(--nav-bar-width)' : `${rect.left}px`;
    menu.addEventListener('click', e => e.stopPropagation());

    const list = document.createElement('ul');
    list.className = 'cswp--ctxList';

    const search = document.createElement('div');
    search.className = 'cswp--ctxSearch';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = t('cswp.search.placeholder');
    input.setAttribute('aria-label', 'Search characters');
    search.append(input);

    const tagBar = buildTagBar(() => renderList(list, input.value));
    menu.append(search, tagBar, list);

    blocker.append(menu);
    document.body.append(blocker);

    input.addEventListener('input', () => renderList(list, input.value));
    input.addEventListener('keydown', e => handleMenuKeydown(e, list, input));
    setCleanTimeout(() => input.focus(), 50);

    await renderList(list, '');
}

function closeQuickMenu() {
    document.querySelectorAll('.cswp--ctxBlocker').forEach(n => n.remove());
    quickMenuOpen = false;
    activeTagFilter = null;
}

function buildTagBar(onChange) {
    const bar = document.createElement('div');
    bar.className = 'cswp--ctxTags';
    const usable = (allTags ?? []).filter(tag => {
        for (const key in tag_map) if (tag_map[key]?.includes(tag.id)) return true;
        return false;
    }).slice(0, 40);
    if (usable.length === 0) { bar.style.display = 'none'; return bar; }

    for (const tag of usable) {
        const chip = document.createElement('span');
        chip.className = 'cswp--ctxTag';
        chip.textContent = tag.name;
        if (tag.color) chip.style.borderLeft = `3px solid ${tag.color}`;
        chip.addEventListener('click', () => {
            activeTagFilter = (activeTagFilter === tag.id) ? null : tag.id;
            bar.querySelectorAll('.cswp--ctxTag').forEach(c => c.classList.remove('cswp--tagActive'));
            if (activeTagFilter) chip.classList.add('cswp--tagActive');
            onChange();
        });
        bar.append(chip);
    }
    return bar;
}

async function renderList(list, query) {
    list.innerHTML = '';
    let pool = getEntityPool();
    if (activeTagFilter) {
        pool = pool.filter(e => (tag_map[entityKey(e)] ?? []).includes(activeTagFilter));
    }

    let ranked;
    if (query && query.trim()) {
        ranked = pool.map(e => {
            const m = fuzzy(query, e.name ?? '');
            return m ? { entity: e, score: m.score, indices: m.indices } : null;
        }).filter(Boolean).sort((a, b) => b.score - a.score);
    } else {
        ranked = pool.sort(compareEntities).slice(0, settings.numCards).map(e => ({
            entity: e, score: 0, indices: [],
        }));
    }

    if (ranked.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'cswp--ctxEmpty';
        empty.textContent = t('cswp.palette.no_results');
        list.append(empty);
        return;
    }

    for (const { entity, indices } of ranked.slice(0, settings.numCards * 2)) {
        const item = document.createElement('li');
        item.className = 'cswp--ctxItem list-group-item';
        if (settings.highlightFavorites && entity.fav) item.classList.add('cswp--fav');
        item.title = `Switch to "${entity.name}"`;

        const ava = document.createElement('div');
        ava.className = 'cswp--ctxAvatar';
        getAvatar(entity).then(u => { ava.style.backgroundImage = `url("${u}")`; });

        const name = document.createElement('div');
        name.className = 'cswp--ctxName';
        name.innerHTML = highlight(entity.name ?? '', indices);

        item.append(ava, name);
        item.addEventListener('click', async () => {
            closeQuickMenu();
            await switchToEntity(entity);
        });

        if (settings.chatPreview) {
            if (Device.supportsHover) {
                item.addEventListener('mouseenter', () => schedulePreview(item, entity));
                item.addEventListener('mouseleave', hidePreview);
            } else if (settings.mobilePreviewTap) {
                attachTouchPreview(item, entity);
            }
        }
        list.append(item);
    }
}

function handleMenuKeydown(e, list, input) {
    const items = Array.from(list.querySelectorAll('.cswp--ctxItem'));
    if (items.length === 0) return;
    const focused = list.querySelector('.cswp--focused');
    let idx = focused ? items.indexOf(focused) : -1;

    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(items.length - 1, idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); (focused ?? items[0])?.click(); return; }
    else if (e.key === 'Escape') { e.preventDefault(); closeQuickMenu(); return; }
    else return;

    items.forEach(i => i.classList.remove('cswp--focused'));
    items[idx]?.classList.add('cswp--focused');
    items[idx]?.scrollIntoView({ block: 'nearest' });
}

/* ================= Chat preview tooltip ================= */
let previewEl = null;
let previewTimer = null;
const previewCache = new Map();

function schedulePreview(anchor, entity) {
    clearTimeout(previewTimer);
    previewTimer = setCleanTimeout(async () => { await showPreview(anchor, entity); }, 350);
}

async function showPreview(anchor, entity) {
    if (entity.members) return; // skip groups
    const key = entity.avatar;
    let snippet = previewCache.get(key);
    if (!snippet) {
        try {
            const chats = await getPastCharacterChats(characters.indexOf(entity));
            const last = Array.isArray(chats) && chats[0];
            snippet = last ? (last.mes ?? last.last_mes ?? '(empty)') : '(no chats)';
            snippet = String(snippet).replace(/<[^>]+>/g, '').slice(0, 280);
            previewCache.set(key, snippet);
        } catch (_) { snippet = ''; }
    }
    if (!snippet) return;

    if (!previewEl) {
        previewEl = document.createElement('div');
        previewEl.id = PREVIEW_ID;
        previewEl.className = 'cswp--preview';
        document.body.append(previewEl);
    }
    previewEl.innerHTML = `<div class="cswp--previewTitle">${esc(entity.name)}</div><div class="cswp--previewSnippet">${esc(snippet)}</div>`;
    const rect = anchor.getBoundingClientRect();
    const top = Math.min(rect.top, window.innerHeight - 120);
    const left = Math.min(rect.right + 8, window.innerWidth - 340);
    previewEl.style.top = `${top}px`;
    previewEl.style.left = `${left}px`;
    previewEl.classList.add('cswp--previewVisible');
}
function hidePreview() {
    clearTimeout(previewTimer);
    if (previewEl) previewEl.classList.remove('cswp--previewVisible');
}

/* Touch: long-press reveals preview, tap switches */
function attachTouchPreview(anchor, entity) {
    let timer = null;
    let previewActive = false;
    let startX = 0, startY = 0;

    anchor.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        previewActive = false;
        clearTimeout(timer);
        timer = setTimeout(async () => {
            previewActive = true;
            if (navigator.vibrate) try { navigator.vibrate(10); } catch (_) {}
            await showPreview(anchor, entity);
        }, 450);
    }, { passive: true });

    anchor.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
            clearTimeout(timer);
        }
    }, { passive: true });

    anchor.addEventListener('touchend', (e) => {
        clearTimeout(timer);
        if (previewActive) {
            e.preventDefault();
            e.stopPropagation();
            hidePreview();
            previewActive = false;
        }
    });

    anchor.addEventListener('touchcancel', () => {
        clearTimeout(timer);
        previewActive = false;
        hidePreview();
    });
}

/* ================= Command Palette (Phase 2) ================= */
let paletteOpen = false;
let paletteFocusIdx = 0;
let paletteItems = [];
let paletteAbort = null;

function openPalette(initialQuery = '') {
    if (paletteOpen) return;
    paletteOpen = true;

    const overlay = document.createElement('div');
    overlay.id = PALETTE_ID;
    overlay.className = 'cswp--paletteOverlay';
    if (Device.isNarrow || Device.isTouchDevice) overlay.classList.add('cswp--paletteMobile');
    overlay.addEventListener('click', e => { if (e.target === overlay) closePalette(); });

    const palette = document.createElement('div');
    palette.className = 'cswp--palette';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'cswp--paletteInputWrap';
    const icon = document.createElement('div');
    icon.className = 'cswp--paletteInputIcon fa-solid fa-magnifying-glass';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cswp--paletteInput';
    input.placeholder = t('cswp.palette.placeholder');
    input.value = initialQuery;
    inputWrap.append(icon, input);

    const results = document.createElement('div');
    results.className = 'cswp--paletteResults';

    const footer = document.createElement('div');
    footer.className = 'cswp--paletteFooter';
    footer.innerHTML =
        `<span><span class="cswp--paletteKbd">↑↓</span>Navigate</span>` +
        `<span><span class="cswp--paletteKbd">↵</span>Select</span>` +
        `<span><span class="cswp--paletteKbd">Esc</span>Close</span>` +
        `<span><span class="cswp--paletteKbd">/</span>Commands</span>` +
        `<span><span class="cswp--paletteKbd">&gt;</span>Actions</span>` +
        `<span><span class="cswp--paletteKbd">@</span>Tags</span>`;

    palette.append(inputWrap, results, footer);
    overlay.append(palette);
    document.body.append(overlay);

    input.addEventListener('input', () => renderPalette(results, input.value));
    input.addEventListener('keydown', e => handlePaletteKeydown(e, results, input));
    setCleanTimeout(() => { input.focus(); input.select(); }, 20);

    renderPalette(results, initialQuery);
}

function closePalette() {
    paletteAbort?.abort();
    paletteAbort = null;
    document.getElementById(PALETTE_ID)?.remove();
    paletteOpen = false;
    paletteItems = [];
    paletteFocusIdx = 0;
}

async function renderPalette(container, query) {
    paletteAbort?.abort();
    paletteAbort = new AbortController();
    const signal = paletteAbort.signal;
    container.innerHTML = '';
    paletteItems = [];
    paletteFocusIdx = 0;

    const q = query.trim();
    const mode = q.startsWith('/') ? 'command'
        : q.startsWith('>') ? 'action'
        : q.startsWith('@') ? 'tag'
        : 'default';
    const needle = (mode === 'default') ? q : q.slice(1).trim();

    const sections = [];

    if (mode === 'default' || mode === 'tag') {
        const entityQ = mode === 'tag' ? needle : q;
        const tagFilter = mode === 'tag' ? needle.toLowerCase() : null;
        const pool = getEntityPool();
        const chars = [];
        const grps = [];
        for (const e of pool) {
            if (tagFilter) {
                const ents = getEntityTags(e).map(t => t.name.toLowerCase());
                if (!ents.some(n => n.includes(tagFilter))) continue;
            }
            const nameMatch = entityQ ? fuzzy(entityQ, e.name ?? '') : { score: 0, indices: [] };
            if (!nameMatch) continue;
            (e.members ? grps : chars).push({ entity: e, match: nameMatch });
        }
        chars.sort((a, b) => b.match.score - a.match.score);
        grps.sort((a, b) => b.match.score - a.match.score);
        if (chars.length) sections.push({ title: t('cswp.palette.section_characters'), items: chars.slice(0, 15).map(toEntityItem) });
        if (grps.length) sections.push({ title: t('cswp.palette.section_groups'), items: grps.slice(0, 10).map(toEntityItem) });
    }

    if (mode === 'default' || mode === 'action') {
        const acts = buildActions().filter(a =>
            !needle || fuzzy(needle, a.title));
        if (acts.length) sections.push({ title: t('cswp.palette.section_actions'), items: acts });
    }

    if (mode === 'command') {
        const cmds = getAvailableSlashCommands(needle).slice(0, 20);
        if (cmds.length) sections.push({ title: t('cswp.palette.section_commands'), items: cmds });
    }

    if (settings.enableChatSearch && mode === 'default' && q.length >= 2) {
        const loading = document.createElement('div');
        loading.className = 'cswp--paletteSectionHeader';
        loading.textContent = t('cswp.palette.loading_chats');
        container.append(loading);
        searchChats(q, signal).then(chatItems => {
            if (signal.aborted) return;
            loading.remove();
            if (chatItems.length) {
                appendSection(container, t('cswp.palette.section_chats'), chatItems);
                rebuildPaletteItems(container);
            }
        }).catch(() => { if (!signal.aborted) loading.remove(); });
    }

    if (sections.length === 0 && mode !== 'default') {
        const empty = document.createElement('div');
        empty.className = 'cswp--ctxEmpty';
        empty.textContent = t('cswp.palette.no_results');
        container.append(empty);
        return;
    }

    sections.forEach(s => appendSection(container, s.title, s.items));
    rebuildPaletteItems(container);
}

function rebuildPaletteItems(container) {
    paletteItems = Array.from(container.querySelectorAll('.cswp--paletteItem'));
    paletteFocusIdx = 0;
    paletteItems.forEach((el, i) => el.classList.toggle('cswp--focused', i === 0));
}

function appendSection(container, title, items) {
    const wrap = document.createElement('div');
    wrap.className = 'cswp--paletteSection';
    const h = document.createElement('div');
    h.className = 'cswp--paletteSectionHeader';
    h.textContent = title;
    wrap.append(h);
    items.forEach(it => wrap.append(renderPaletteItem(it)));
    container.append(wrap);
}

function renderPaletteItem(item) {
    const el = document.createElement('div');
    el.className = 'cswp--paletteItem';
    const iconEl = document.createElement('div');
    iconEl.className = 'cswp--paletteItemIcon';
    if (item.avatar) iconEl.style.backgroundImage = `url("${item.avatar}")`;
    else if (item.icon) iconEl.innerHTML = `<i class="fa-solid ${item.icon}"></i>`;
    else iconEl.innerHTML = `<i class="fa-solid fa-circle"></i>`;

    const body = document.createElement('div');
    body.className = 'cswp--paletteItemBody';
    const title = document.createElement('div');
    title.className = 'cswp--paletteItemTitle';
    title.innerHTML = item.titleHtml ?? esc(item.title);
    body.append(title);
    if (item.subtitle) {
        const sub = document.createElement('div');
        sub.className = 'cswp--paletteItemSubtitle';
        sub.textContent = item.subtitle;
        body.append(sub);
    }

    el.append(iconEl, body);
    el.addEventListener('click', async () => {
        closePalette();
        try { await item.run(); } catch (e) { console.error('[cswp]', e); }
    });
    return el;
}

function toEntityItem({ entity, match }) {
    const item = {
        title: entity.name,
        titleHtml: highlight(entity.name ?? '', match.indices),
        subtitle: entity.members
            ? `${(entity.members ?? []).length} members`
            : (getEntityTags(entity).map(t => t.name).join(', ') || ''),
        avatar: null,
        run: () => switchToEntity(entity),
    };
    getAvatar(entity).then(u => { item.avatar = u; });
    return item;
}

/* ================= Quick actions =================
 * Helper: open a drawer by triggering its .drawer-toggle child.
 * Returns true if the action succeeded. */
function openDrawer(drawerId) {
    const toggle = document.querySelector(`#${drawerId} > .drawer-toggle`);
    if (!toggle) return false;
    toggle.click();
    return true;
}

/* Helper: ensure a drawer is open (not just toggled) */
function ensureDrawerOpen(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return false;
    const content = drawer.querySelector('.drawer-content');
    const isClosed = content?.classList.contains('closedDrawer');
    if (isClosed) openDrawer(drawerId);
    return true;
}

function buildActions() {
    const actions = [
        {
            title: t('cswp.actions.new_chat'),
            icon: 'fa-plus',
            run: () => document.getElementById('option_start_new_chat')?.click(),
        },
        {
            title: t('cswp.actions.close_chat'),
            icon: 'fa-door-open',
            run: () => document.getElementById('option_close_chat')?.click(),
        },
        {
            title: t('cswp.actions.regenerate'),
            icon: 'fa-rotate',
            run: () => document.getElementById('option_regenerate')?.click(),
        },
        {
            title: t('cswp.actions.continue'),
            icon: 'fa-forward',
            run: () => document.getElementById('option_continue')?.click(),
        },
        {
            title: t('cswp.actions.impersonate'),
            icon: 'fa-masks-theater',
            run: () => document.getElementById('option_impersonate')?.click(),
        },
        {
            title: t('cswp.actions.new_bookmark'),
            icon: 'fa-bookmark',
            run: () => document.getElementById('option_new_bookmark')?.click(),
        },
        {
            title: t('cswp.actions.toggle_author_note'),
            icon: 'fa-note-sticky',
            run: () => document.getElementById('option_toggle_AN')?.click(),
        },
        {
            title: t('cswp.actions.toggle_right_panel'),
            icon: 'fa-address-card',
            run: () => openDrawer('rightNavHolder'),
        },
        {
            title: t('cswp.actions.open_persona'),
            icon: 'fa-face-smile',
            run: () => ensureDrawerOpen('persona-management-button'),
        },
        {
            title: t('cswp.actions.open_worldinfo'),
            icon: 'fa-book',
            run: () => ensureDrawerOpen('WorldInfo'),
        },
        {
            title: t('cswp.actions.open_settings'),
            icon: 'fa-gear',
            run: async () => {
                const ok = ensureDrawerOpen('extensions-settings-button');
                if (!ok) {
                    (globalThis.toastr ?? console).warning?.('Extensions drawer not found');
                    return;
                }
                setCleanTimeout(() => {
                    const panel = document.getElementById(SETTINGS_ID);
                    if (panel) {
                        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // auto-expand the inline-drawer inside our settings panel
                        const drawer = panel.querySelector('.inline-drawer');
                        const icon = drawer?.querySelector('.inline-drawer-icon');
                        const content = drawer?.querySelector('.inline-drawer-content');
                        if (icon && icon.classList.contains('down') && content && content.style.display === 'none') {
                            drawer.querySelector('.inline-drawer-toggle')?.click();
                        }
                    }
                }, 300);
            },
        },
    ];
    return actions.map(a => ({ ...a, titleHtml: esc(a.title) }));
}

function getAvailableSlashCommands(needle) {
    const commands = SlashCommandParser?.commands ?? {};
    const keys = Object.keys(commands);
    return keys
        .filter(k => !needle || k.toLowerCase().includes(needle.toLowerCase()))
        .slice(0, 40)
        .map(k => {
            const cmd = commands[k];
            return {
                title: `/${k}`,
                subtitle: cmd?.helpString?.replace(/<[^>]+>/g, '').slice(0, 100) ?? '',
                icon: 'fa-terminal',
                run: async () => {
                    const ctx = getContext();
                    if (ctx?.executeSlashCommandsWithOptions) {
                        await ctx.executeSlashCommandsWithOptions(`/${k}`);
                    }
                },
            };
        });
}

async function searchChats(query, signal) {
    const out = [];
    const q = query.toLowerCase();
    const charsToScan = characters.slice(0, 40);
    for (const c of charsToScan) {
        if (signal.aborted) return out;
        try {
            const chats = await getPastCharacterChats(characters.indexOf(c));
            if (!Array.isArray(chats)) continue;
            for (const chat of chats.slice(0, 5)) {
                const hay = ((chat.mes ?? chat.last_mes ?? '') + ' ' + (chat.file_name ?? '')).toLowerCase();
                if (hay.includes(q)) {
                    out.push({
                        title: `${c.name} — ${chat.file_name ?? 'chat'}`,
                        titleHtml: esc(`${c.name} — ${chat.file_name ?? 'chat'}`),
                        subtitle: String(chat.mes ?? chat.last_mes ?? '').replace(/<[^>]+>/g, '').slice(0, 140),
                        icon: 'fa-message',
                        run: async () => {
                            await switchToEntity(c);
                        },
                    });
                    if (out.length >= 10) return out;
                }
            }
        } catch (_) { /* ignore chars with errors */ }
    }
    return out;
}

function handlePaletteKeydown(e, container, input) {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
    if (!paletteItems.length) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        paletteFocusIdx = Math.min(paletteItems.length - 1, paletteFocusIdx + 1);
        updatePaletteFocus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        paletteFocusIdx = Math.max(0, paletteFocusIdx - 1);
        updatePaletteFocus();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        paletteItems[paletteFocusIdx]?.click();
    }
}
function updatePaletteFocus() {
    paletteItems.forEach((el, i) => el.classList.toggle('cswp--focused', i === paletteFocusIdx));
    paletteItems[paletteFocusIdx]?.scrollIntoView({ block: 'nearest' });
}

/* ================= Global hotkey ================= */
function parseHotkey(str) {
    if (!str) return null;
    const parts = str.split('+').map(s => s.trim().toLowerCase());
    const mods = { ctrl: false, shift: false, alt: false, meta: false };
    let key = null;
    for (const p of parts) {
        if (p === 'ctrl' || p === 'control') mods.ctrl = true;
        else if (p === 'shift') mods.shift = true;
        else if (p === 'alt' || p === 'option') mods.alt = true;
        else if (p === 'meta' || p === 'cmd' || p === 'command') mods.meta = true;
        else key = p;
    }
    if (!key) return null;
    return { ...mods, key };
}
function matchesHotkey(e, hk) {
    if (!hk) return false;
    if (!!e.ctrlKey !== hk.ctrl) return false;
    if (!!e.shiftKey !== hk.shift) return false;
    if (!!e.altKey !== hk.alt) return false;
    if (!!e.metaKey !== hk.meta) return false;
    return (e.key ?? '').toLowerCase() === hk.key.toLowerCase();
}

function onGlobalKeydown(e) {
    if (!settings.enablePalette) return;
    const hk = parseHotkey(settings.paletteHotkey);
    if (matchesHotkey(e, hk)) {
        e.preventDefault();
        if (paletteOpen) closePalette(); else openPalette();
    }
}

/* ================= Settings UI ================= */
function buildSettingsUI() {
    if (document.getElementById(SETTINGS_ID)) return;
    const container = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings');
    if (!container) return;

    const html = `
    <div id="${SETTINGS_ID}" class="cswp--settingsRoot">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>⊹ CHARSWITCH PRO ⊹</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="cswp--settingsSection">
                    <div class="cswp--settingsSectionTitle" data-i18n="cswp.settings.section_quick_menu">${esc(t('cswp.settings.section_quick_menu'))}</div>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="showAvatar"><span>${esc(t('cswp.settings.enable_avatar_overlay'))}</span></label>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="showFavorites"><span>${esc(t('cswp.settings.show_favorites'))}</span></label>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="onlyFavorites"><span>${esc(t('cswp.settings.only_favorites'))}</span></label>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="highlightFavorites"><span>${esc(t('cswp.settings.highlight_favorites'))}</span></label>
                    <div class="cswp--settingsRow">
                        <label>${esc(t('cswp.settings.num_cards'))}</label>
                        <input type="number" min="3" max="100" data-cswp="numCards">
                    </div>
                </div>
                <div class="cswp--settingsSection">
                    <div class="cswp--settingsSectionTitle">${esc(t('cswp.settings.section_palette'))}</div>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="enablePalette"><span>${esc(t('cswp.settings.enable_palette'))}</span></label>
                    ${Device.isTouchDevice ? '' : `
                    <div class="cswp--settingsRow">
                        <label>${esc(t('cswp.settings.palette_hotkey'))}</label>
                        <input type="text" class="cswp--hotkeyInput" data-cswp="paletteHotkey" readonly>
                    </div>
                    <div class="cswp--hint">${esc(t('cswp.settings.palette_hotkey_hint'))}</div>
                    `}
                    <label class="checkbox_label"><input type="checkbox" data-cswp="enableChatSearch"><span>${esc(t('cswp.settings.enable_chat_search'))}</span></label>
                </div>
                <div class="cswp--settingsSection">
                    <div class="cswp--settingsSectionTitle">${esc(t('cswp.settings.section_mobile'))}</div>
                    <div class="cswp--settingsRow">
                        <label>${esc(t('cswp.settings.mobile_fab'))}</label>
                        <select data-cswp="showMobileFab" data-cswp-type="select">
                            <option value="auto">${esc(t('cswp.settings.mobile_fab_auto'))}</option>
                            <option value="always">${esc(t('cswp.settings.mobile_fab_always'))}</option>
                            <option value="never">${esc(t('cswp.settings.mobile_fab_never'))}</option>
                        </select>
                    </div>
                    <div class="cswp--hint">${esc(t('cswp.settings.mobile_fab_hint'))}</div>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="mobilePreviewTap"><span>${esc(t('cswp.settings.mobile_preview_tap'))}</span></label>
                    <div class="cswp--settingsRow">
                        <label>${esc(t('cswp.settings.long_press_ms'))}</label>
                        <input type="number" min="200" max="2000" step="50" data-cswp="longPressMs">
                    </div>
                </div>
                <div class="cswp--settingsSection">
                    <div class="cswp--settingsSectionTitle">${esc(t('cswp.settings.section_advanced'))}</div>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="chatPreview"><span>${esc(t('cswp.settings.chat_preview'))}</span></label>
                    <label class="checkbox_label"><input type="checkbox" data-cswp="cacheAvatars"><span>${esc(t('cswp.settings.cache_avatars'))}</span></label>
                </div>
            </div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);

    const root = document.getElementById(SETTINGS_ID);
    root.querySelectorAll('[data-cswp]').forEach(el => {
        const key = el.getAttribute('data-cswp');
        if (el.type === 'checkbox') {
            el.checked = !!settings[key];
            el.addEventListener('change', () => {
                settings[key] = el.checked;
                saveSettings();
                refreshTriggerAvatar();
                if (key === 'enablePalette') refreshFab();
            });
        } else if (el.getAttribute('data-cswp-type') === 'select' || el.tagName === 'SELECT') {
            el.value = settings[key] ?? 'auto';
            el.addEventListener('change', () => {
                settings[key] = el.value;
                saveSettings();
                if (key === 'showMobileFab') refreshFab();
            });
        } else if (el.type === 'number') {
            el.value = settings[key];
            const isLongPress = key === 'longPressMs';
            const [min, max] = isLongPress ? [200, 2000] : [3, 100];
            el.addEventListener('change', () => {
                const v = parseInt(el.value, 10);
                if (Number.isFinite(v)) { settings[key] = Math.max(min, Math.min(max, v)); el.value = settings[key]; saveSettings(); }
            });
        } else if (el.classList.contains('cswp--hotkeyInput')) {
            el.value = settings[key];
            attachHotkeyRecorder(el, key);
        }
    });
}

function attachHotkeyRecorder(el, key) {
    let recording = false;
    el.addEventListener('click', () => {
        recording = true;
        el.classList.add('cswp--recording');
        el.value = '...';
    });
    el.addEventListener('blur', () => {
        recording = false;
        el.classList.remove('cswp--recording');
        el.value = settings[key];
    });
    el.addEventListener('keydown', e => {
        if (!recording) return;
        e.preventDefault();
        if (e.key === 'Escape') { el.blur(); return; }
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');
        if (e.metaKey) parts.push('Meta');
        if (parts.length === 0) {
            (globalThis.toastr ?? console).warning?.(t('cswp.toast.hotkey_invalid'));
            return;
        }
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
        const hotkey = parts.join('+');
        settings[key] = hotkey;
        el.value = hotkey;
        saveSettings();
        (globalThis.toastr ?? console).success?.(t('cswp.toast.hotkey_captured', { hotkey }));
        el.blur();
    });
}

/* ================= Discord layout detection (polled, cleanly cancelable) ================= */
let isDiscord = null;
function checkDiscord() {
    const nav = window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width');
    const newIsDiscord = nav !== '' && nav !== '0px';
    if (isDiscord !== newIsDiscord) {
        isDiscord = newIsDiscord;
        document.body.classList.toggle('cswp', isDiscord);
        document.body.classList.toggle('cswp--nonDiscord', !isDiscord);
        if (trigger) {
            trigger.style.setProperty('--cswp--iconSize',
                isDiscord ? 'calc(var(--nav-bar-width) - 16px)' : 'calc(var(--topBarBlockSize))');
        }
    }
}

/* ================= Slash command ================= */
function registerSlashCommand() {
    try {
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'charswitch',
            aliases: ['cswp'],
            callback: async (_args, value) => {
                openPalette(typeof value === 'string' ? value : '');
                return '';
            },
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({
                    description: 'optional initial query',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: false,
                }),
            ],
            helpString: t('cswp.slash.help'),
        }));
    } catch (e) { console.warn('[cswp] slash command registration failed:', e); }
}

/* ================= Init / Cleanup ================= */
let initRetries = 0;
function initTrigger() {
    trigger = document.querySelector(TRIGGER_SELECTOR);
    if (!trigger) {
        if (initRetries++ < 40) return setCleanTimeout(initTrigger, 250);
        console.warn('[cswp] trigger not found after retries');
        return;
    }
    trigger.addEventListener('contextmenu', openQuickMenu);
    attachLongPress(trigger, openQuickMenu);
    checkDiscord();
    setCleanInterval(checkDiscord, 2000);
    refreshTriggerAvatar();
}

/* ================= Long-press helper (touch devices) ================= */
function attachLongPress(el, handler) {
    let timer = null;
    let startX = 0, startY = 0;
    let fired = false;

    const cancel = () => {
        if (timer) { clearTimeout(timer); timer = null; }
    };

    el.addEventListener('touchstart', (e) => {
        if (!Device.isTouchDevice) return;
        fired = false;
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        cancel();
        timer = setTimeout(() => {
            fired = true;
            if (navigator.vibrate) try { navigator.vibrate(12); } catch (_) {}
            handler({ preventDefault: () => {}, target: el });
        }, settings.longPressMs ?? 450);
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        if (!timer) return;
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) cancel();
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        cancel();
        if (fired) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    el.addEventListener('touchcancel', cancel);
}

/* ================= Mobile FAB (floating action button) ================= */
let fabEl = null;

function shouldShowFab() {
    const mode = settings.showMobileFab ?? 'auto';
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    return Device.isTouchDevice && settings.enablePalette;
}

function createFab() {
    if (fabEl || !shouldShowFab()) return;
    fabEl = document.createElement('button');
    fabEl.id = 'cswp_fab';
    fabEl.className = 'cswp--fab';
    fabEl.setAttribute('aria-label', 'Open CharSwitch Pro palette');
    fabEl.setAttribute('type', 'button');
    fabEl.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
    fabEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (paletteOpen) closePalette(); else openPalette();
    });
    document.body.append(fabEl);
    makeDraggable(fabEl);
}

function removeFab() {
    fabEl?.remove();
    fabEl = null;
}

function refreshFab() {
    if (shouldShowFab()) createFab();
    else removeFab();
}

/* Drag the FAB around to reposition — position persisted in settings */
function makeDraggable(el) {
    let startX = 0, startY = 0, origRight = 0, origBottom = 0;
    let dragging = false, moved = false;

    const saved = settings.fabPosition;
    if (saved && typeof saved.right === 'number') el.style.right = `${saved.right}px`;
    if (saved && typeof saved.bottom === 'number') el.style.bottom = `${saved.bottom}px`;

    const onDown = (e) => {
        const touch = e.touches?.[0];
        const cx = touch?.clientX ?? e.clientX;
        const cy = touch?.clientY ?? e.clientY;
        startX = cx; startY = cy;
        const rect = el.getBoundingClientRect();
        origRight = window.innerWidth - rect.right;
        origBottom = window.innerHeight - rect.bottom;
        dragging = true; moved = false;
    };
    const onMove = (e) => {
        if (!dragging) return;
        const touch = e.touches?.[0];
        const cx = touch?.clientX ?? e.clientX;
        const cy = touch?.clientY ?? e.clientY;
        const dx = startX - cx;
        const dy = startY - cy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
        moved = true;
        e.preventDefault();
        const right = Math.max(8, Math.min(window.innerWidth - 64, origRight + dx));
        const bottom = Math.max(8, Math.min(window.innerHeight - 64, origBottom + dy));
        el.style.right = `${right}px`;
        el.style.bottom = `${bottom}px`;
    };
    const onUp = () => {
        if (dragging && moved) {
            const rect = el.getBoundingClientRect();
            settings.fabPosition = {
                right: Math.round(window.innerWidth - rect.right),
                bottom: Math.round(window.innerHeight - rect.bottom),
            };
            saveSettings();
            el.addEventListener('click', stopClickAfterDrag, { once: true, capture: true });
        }
        dragging = false;
    };
    const stopClickAfterDrag = (e) => { e.stopPropagation(); e.preventDefault(); };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
}

function init() {
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.dataset.author = __cswp_integrity;
    document.body.append(root);

    eventSource.on(event_types.CHAT_CHANGED, refreshTriggerAvatar);
    eventSource.on(event_types.CHARACTER_EDITED, refreshTriggerAvatar);
    eventSource.on(event_types.GROUP_UPDATED, refreshTriggerAvatar);

    document.addEventListener('keydown', onGlobalKeydown, true);

    initTrigger();
    buildSettingsUI();
    registerSlashCommand();
    createFab();

    /* Respond to orientation / resize — FAB visibility may need to update */
    window.addEventListener('resize', debouncedRefreshFab, { passive: true });
    window.addEventListener('orientationchange', debouncedRefreshFab, { passive: true });
}

let _fabRefreshTimer = null;
function debouncedRefreshFab() {
    clearTimeout(_fabRefreshTimer);
    _fabRefreshTimer = setCleanTimeout(refreshFab, 250);
}

function cleanup() {
    clearAllTimers();
    document.removeEventListener('keydown', onGlobalKeydown, true);
    window.removeEventListener('resize', debouncedRefreshFab);
    window.removeEventListener('orientationchange', debouncedRefreshFab);
    closeQuickMenu();
    closePalette();
    removeFab();
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(PREVIEW_ID)?.remove();
}

jQuery(async () => {
    await loadI18n();
    init();
});
window.addEventListener('pagehide', cleanup);
