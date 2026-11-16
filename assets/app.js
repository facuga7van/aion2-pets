const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const D = JSON.parse($('#data').textContent);
const PETS = D.pets, BY = new Map(PETS.map(p => [p.id, p])), N = PETS.length;
const G = D.genus;
const GSLUG = { feral: 'fera', intellect: 'cogni', nature: 'natura', trans: 'varian', special: 'especial' };
const mq = q => matchMedia(q).matches;
const RM = mq('(prefers-reduced-motion: reduce)');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ico = (id, c = '') => `<svg class="${c}" aria-hidden="true"><use href="#${id}"/></svg>`;
const nv = l => l[0] === l[1] ? `${l[0]}` : `${l[0]}-${l[1]}`;
const num = n => n.toLocaleString('es-AR');
const pct = x => num(+x.toPrecision(2));
const fecha = iso => iso.split('-').reverse().join('/');
const norm = s => s.replace(/<[^>]+>/g, '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const ls = {
get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const idle = f => (window.requestIdleCallback || setTimeout)(f, { timeout: 2500 });
const album = $('#album'), dlg = $('#ficha'), fBody = $('#fBody');
const CARD = new Map($$('.card', album).map(c => [c.dataset.id, c]));
const imgUrl = (id, s = 256) => `assets/p/${id}-${s}.webp`;
const isTyping = t => t.closest?.('input,textarea,select,[contenteditable]');
/* ---------- colección (mismo formato de v1 en pets-owned) ---------- */
const owned = new Set((ls.get('pets-owned', []) || []).map(String));
const level = ls.get('pets-level', {}) || {};
function save() {
if (!(ls.set('pets-owned', [...owned]) & ls.set('pets-level', level))) { $('#warn').hidden = false; return; }
ls.set('pets-dirty', Date.now()); dirtyUI(); nudge();
}
const isMax = id => owned.has(id) && level[id] === 3;
const CAT = Object.fromEntries(D.cats.map(c => [c.key, c.label]));
for (const p of PETS) {
p.hay = norm([p.name, p.en, p.genus, CAT[p.cat], $('.ch', CARD.get(p.id)).textContent, ...p.routes.flatMap(r => [r.mob, r.mobEn, r.place, r.placeEn, r.note, r.shop, r.kind === 'fboss' && 'boss de campo']),
...p.chests.flatMap(c => [c.name, c.en])].filter(Boolean).join(' '));
p.words = [...new Set(p.hay.split(/[^a-z0-9]+/).filter(w => w.length > 2))];
p.nm = norm(p.name + ' ' + p.en);
}
const STOP = new Set('nv nivel niv lvl level de del la el en los las y con'.split(' '));
function osa(a, b) {
const d = [];
for (let i = 0; i <= a.length; i++) {
d[i] = [i];
for (let j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1]),
i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? d[i - 2][j - 2] + 1 : 99) : j;
}
return d[a.length][b.length];
}
let TOK = [], fuzzy = false;
const setQ = raw => { F.qRaw = raw; F.q = norm(raw.trim()); TOK = F.q.split(/\s+/).filter(t => t && !STOP.has(t)); fuzzy = false; };
const hit = (p, t) => /^\d+$/.test(t) ? p.routes.some(r => r.lvl && +t >= r.lvl[0] && +t <= r.lvl[1]) : p.hay.includes(t) ||
(fuzzy && t.length > 3 && p.words.some(w => osa(t, w) < 2 || osa(t, w.slice(0, t.length)) < 2));
const rank = p => p.nm.startsWith(F.q) ? 0 : TOK.every(t => p.nm.includes(t)) ? 1 : 2;
const today = (() => { const t = new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); })();
const daysTo = iso => { const [y, m, d] = iso.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - today) / 864e5); };
$$('.fu .shop[data-until],.card[data-until]').forEach(li => li.classList.toggle('exp', daysTo(li.dataset.until) < 0));
const dead = p => !p.routes.some(r => r.kind !== 'shop');
/* ---------- filtros ---------- */
const U = new URLSearchParams(location.search);
const F = { q: '', qRaw: U.get('q') || '', ver: U.get('ver') || '', genus: U.get('genus') || '', cat: U.get('cat') || '', group: U.get('agrupar') || '', vista: U.get('vista') || '' };
if (!['', 'faltan', 'subir', 'completas'].includes(F.ver)) F.ver = '';
const qIn = $('#q'), selG = $('#fGenus'), selC = $('#fCat'), selGr = $('#fGroup');
setQ(F.qRaw);
qIn.value = F.qRaw; selG.value = F.genus; selC.value = F.cat; selGr.value = F.group;
F.genus = selG.value; F.cat = selC.value; F.group = selGr.value;
function match(p) {
if (F.cat && p.cat !== F.cat) return false;
if (F.genus && GSLUG[p.genusKey] !== F.genus) return false;
const o = owned.has(p.id), m = isMax(p.id);
if (F.ver === 'faltan' && o) return false;
if (F.ver === 'subir' && (!o || m)) return false;
if (F.ver === 'completas' && !m) return false;
return TOK.every(t => hit(p, t));
}
const EMPTY = { faltan: 'Las tenés todas. Daeva completo.', subir: 'Todas las que tenés están al máximo.', completas: 'Todavía ninguna al máximo. Subí la primera.' };
function apply() {
let n = 0;
for (const [id, c] of CARD) { const ok = match(BY.get(id)); c.hidden = !ok; n += ok; }
if (!n && TOK.length && !fuzzy) { fuzzy = true; return apply(); }
album.classList.toggle('flat', !!TOK.length);
for (const [id, c] of CARD) c.style.order = TOK.length && !c.hidden ? rank(BY.get(id)) : '';
const sug = $('#sug');
sug.hidden = n || !TOK.length;
if (!sug.hidden) sug.innerHTML = '¿Quisiste decir ' + PETS.map(p => [TOK.reduce((a, t) => a + Math.min(9, ...p.nm.split(' ').map(w => osa(t, w))), 0), p])
.sort((a, b) => a[0] - b[0]).slice(0, 3).map(([, p]) => `<a href="#pet-${p.id}">${esc(p.name)}</a>`).join(', ') + '?';
const free = !TOK.length && !F.genus && !F.cat && !F.ver;
for (const s of $$('.cap', album)) s.hidden = !s.querySelector('.card:not([hidden])') && !(free && s.querySelector('.also'));
album.dataset.ver = F.ver;
album.dataset.view = F.vista === 'lista' ? 'lista' : 'album';
const onlySeg = !TOK.length && !F.genus && !F.cat;
$('#vacio').hidden = n > 0;
$('#vacioT').textContent = onlySeg && EMPTY[F.ver] ? (F.ver === 'subir' && !owned.size ? 'Todavía ninguna. Marcá la primera.' : EMPTY[F.ver]) : 'Nada con esos filtros.';
$('#limpiar').hidden = onlySeg && !!EMPTY[F.ver];
$('#cuenta').innerHTML = (n === N ? `<b>${N}</b> pets` : `Mostrando <b>${n}</b> de ${N}`) + (fuzzy && n ? ' (parecidas)' : '') + ` · tenés <b id="cOwn">${owned.size}</b>`;
for (const b of $$('#ver button')) b.setAttribute('aria-pressed', b.dataset.v === F.ver);
for (const b of $$('#vista button')) b.setAttribute('aria-pressed', b.dataset.vista === F.vista);
selG.classList.toggle('on', !!F.genus); selC.classList.toggle('on', !!F.cat); selGr.classList.toggle('on', !!F.group);
const u = new URLSearchParams();
if (F.qRaw.trim()) u.set('q', F.qRaw.trim());
for (const [k, v] of [['ver', F.ver], ['genus', F.genus], ['cat', F.cat], ['agrupar', F.group], ['vista', F.vista]]) if (v) u.set(k, v);
const s = u.toString();
history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
}
/* ---------- agrupar: mueve los nodos, nunca re-renderiza las cards ---------- */
const SECTIONS = new Map($$('.cap', album).map(s => { s._ids = $$('.card', s).map(c => c.dataset.id); return [s.dataset.key, s]; }));
const ROMAN = 'I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII'.split(' ');
const FIELD_REG = { Altgard: 'Zona Asmodian: entrás por la Grieta. Mobs de campo.', Morheim: 'Zona Asmodian: boss de campo, entrás por la Grieta.', Verteron: 'Mapa Elyos: boss de campo.', Eltnen: 'Mapa Elyos: boss de campo.' };
const SHOP = 'Tienda, pase o evento', CHESTS = 'Solo cofres', UNID = 'Instancia sin identificar';
function places(p) {
const out = p.routes.filter(r => r.kind === 'field' || r.kind === 'fboss').sort((a, b) => b.spawns - a.spawns).map(r => r.place);
for (const r of p.routes) if (r.kind === 'dungeon') out.push(r.unidentified ? UNID : r.place);
if (p.routes.some(r => r.kind === 'shop')) out.push(SHOP);
return [...new Set(out.length ? out : [CHESTS])];
}
function groups(mode) {
if (mode === 'genus') return D.genusOrder.map(g => {
const x = G[g], eq = x.equip.at(-1);
return { key: 'genus:' + g, title: x.plural, icon: 'g-' + g, color: `color-mix(in srgb,${x.plate[0]} 55%,#fff)`,
line: (eq ? 'Bonus de equipar: ' + eq.stats.map(s => s.label).join(', ') + '. ' : 'Sin bonus de equipar en los datos. ') + `<a href="#genus-${GSLUG[g]}">Ver guía</a>`,
ids: PETS.filter(p => p.genusKey === g).map(p => p.id) };
});
if (mode === 'lugar') {
const m = new Map(), also = new Map();
for (const p of PETS) {
const [first, ...rest] = places(p);
(m.get(first) || m.set(first, []).get(first)).push(p.id);
for (const r of rest) (also.get(r) || also.set(r, []).get(r)).push(p.id);
}
const rank = k => FIELD_REG[k] ? Object.keys(FIELD_REG).indexOf(k) : k === UNID ? 900 : k === SHOP ? 901 : k === CHESTS ? 902 : 10;
return [...new Set([...m.keys(), ...also.keys()])].sort((a, b) => rank(a) - rank(b) || (m.get(b)?.length || 0) - (m.get(a)?.length || 0) || a.localeCompare(b)).map(k => {
const dg = D.dungeons[k];
const kind = k === 'Altgard' ? 'altgard' : FIELD_REG[k] ? 'worldboss' : dg ? 'dungeon' : k === CHESTS || k === SHOP ? 'cofre' : '';
let line = FIELD_REG[k] || (dg ? `${dg.type === 'raid' ? 'Raid' : 'Dungeon de grupo'} · ${dg.modes.length} dificultad${dg.modes.length > 1 ? 'es' : ''} en questlog.` :
k === SHOP ? 'Atelier, Daeva Pass, mercaderes y eventos.' : k === CHESTS ? 'Sin ruta fija: solo cofres de mascota.' : 'Questlog no dice en qué dungeon aparecen.');
const a = also.get(k);
if (a) line += `<span class="also"><br>También acá: ${a.map(id => `<a href="#pet-${id}">${esc(BY.get(id).name)}</a>`).join('')}</span>`;
return { key: 'lugar:' + k, title: k, icon: k === SHOP ? 'i-shop' : k === UNID ? 'i-help' : 'c-' + kind, color: kind ? `var(--c-${kind})` : 'var(--niebla)', line, ids: m.get(k) || [] };
});
}
return D.cats.map(c => ({ key: 'cat:' + c.key, ids: PETS.filter(p => p.cat === c.key).map(p => p.id) }));
}
function regroup() {
const frag = document.createDocumentFragment();
groups(F.group).forEach((g, i) => {
let s = SECTIONS.get(g.key);
if (!s) {
s = document.createElement('section');
s.className = 'cap'; s.dataset.key = g.key; s.style.setProperty('--c', g.color);
s.innerHTML = `<header class="cap-h"><span class="cap-n">${ROMAN[i] || ''}</span>${ico(g.icon, 'cap-i')}<div class="cap-t"><h2>${esc(g.title)}</h2><p>${g.line}</p></div>` +
`<div class="cap-p"><span class="cap-x"><b>0</b>/${g.ids.length}</span><span class="bar"><i></i></span></div></header><div class="grid"></div>`;
s._ids = g.ids;
SECTIONS.set(g.key, s);
}
$('.cap-n', s).textContent = ROMAN[i] || '';
const grid = $('.grid', s);
for (const id of g.ids) grid.append(CARD.get(id));
frag.append(s);
});
$$('.cap', album).forEach(s => s.remove());
album.insertBefore(frag, $('#vacio'));
counts();
}
/* ---------- estado visual de la colección ---------- */
const plumas = new Map($$('#plumaje a').map(a => [a.dataset.id, a]));
function paint(id) {
const c = CARD.get(id), o = owned.has(id), lv = level[id] || 0;
c.classList.toggle('own', o); c.classList.toggle('max', o && lv === 3);
lv && o ? c.dataset.lv = lv : delete c.dataset.lv;
$('.sello input', c).checked = o;
const a = plumas.get(id);
a.classList.toggle('o', o && lv !== 3); a.classList.toggle('m', o && lv === 3);
}
function counts() {
const own = PETS.filter(p => owned.has(p.id)).length, mx = PETS.filter(p => isMax(p.id)).length;
$('#hOwn').textContent = own; $('#hMax').textContent = mx;
for (const s of SECTIONS.values()) {
const o = s._ids.filter(id => owned.has(id)).length;
$('.cap-x b', s).textContent = o;
$('.bar i', s).style.setProperty('--w', (s._ids.length ? o / s._ids.length * 100 : 0) + '%');
$('.cap-p', s).hidden = !s._ids.length;
}
const opt = (sel, key, label, ids) => { const o = sel.querySelector(`option[value="${key}"]`); if (o) o.textContent = `${label} ${ids.filter(id => owned.has(id)).length}/${ids.length}`; };
for (const g of D.genusOrder) opt(selG, GSLUG[g], G[g].label, PETS.filter(p => p.genusKey === g).map(p => p.id));
const chip = Object.fromEntries([...selC.options].map(o => [o.value, o.textContent.replace(/ \d+\/\d+$/, '')]));
for (const c of D.cats) opt(selC, c.key, chip[c.key], PETS.filter(p => p.cat === c.key).map(p => p.id));
$('#exBars').innerHTML = D.cats.map(c => {
const ids = PETS.filter(p => p.cat === c.key), o = ids.filter(p => owned.has(p.id)).length;
return `<div style="color:${c.color}">${ico('c-' + c.key)}<span class="bar"><i style="--w:${o / ids.length * 100}%"></i></span><span><b>${o}</b>/${ids.length}</span></div>`;
}).join('');
colM?.syncExport();
const co = $('#cOwn'); if (co) co.textContent = owned.size;
$('#hLoad').hidden = !!own || !WIN; $('#hQuick').hidden = !!own; $('#hBak').hidden = !own;
dirtyUI();
plan?.refresh();
}
function refresh(id) { paint(id); counts(); if (id === presaId) presaLabel(); }
function refreshAll() { for (const id of CARD.keys()) paint(id); counts(); presaLabel(); if (dlg.open && cur) renderFicha(BY.get(cur), true); }
function setOwned(id, on, lv) {
if (on) { owned.add(id); if (lv) level[id] = lv; } else owned.delete(id);
save(); refresh(id);
}
/* ---------- sello en la grilla: no re-renderiza (no se pierde el foco) ---------- */
album.addEventListener('change', e => {
const cb = e.target.closest('.sello input'); if (!cb) return;
const id = cb.dataset.id, c = CARD.get(id);
setOwned(id, cb.checked);
if (cb.checked && !RM) { c.classList.remove('stamp'); void c.offsetWidth; c.classList.add('stamp'); }
if (!match(BY.get(id))) setTimeout(() => {
if (match(BY.get(id))) return;
const vis = $$('.card:not([hidden])', album), i = vis.indexOf(c);
const next = vis[i + 1] || vis[i - 1];
const had = document.activeElement === cb;
apply();
if (had && next) $('.sello input', next).focus();
}, 650);
else apply();
});
/* ---------- barra ---------- */
let qT;
const first = () => $$('.card:not([hidden])', album).sort((a, b) => (a.style.order || 0) - (b.style.order || 0))[0];
function reveal() {
const r = first()?.getBoundingClientRect(), bh = $('#barra').offsetHeight;
if (r && (r.top > innerHeight - 80 || r.top < bh)) album.scrollIntoView({ block: 'start' });
}
qIn.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => { setQ(qIn.value); apply(); if (TOK.length) reveal(); }, 120); });
qIn.addEventListener('keydown', e => {
if (e.key === 'Enter') {
clearTimeout(qT); setQ(qIn.value); apply(); qIn.blur(); reveal();
const v = $$('.card:not([hidden])', album);
if (v.length === 1 && TOK.length) openPet(v[0].dataset.id);
} else if (e.key === 'ArrowDown' && first()) { e.preventDefault(); $('h3 a', first()).focus(); }
});
selG.addEventListener('change', () => { F.genus = selG.value; apply(); });
selC.addEventListener('change', () => { F.cat = selC.value; apply(); });
selGr.addEventListener('change', () => { F.group = selGr.value; regroup(); apply(); });
$('#ver').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { F.ver = b.dataset.v; apply(); } });
$('#vista').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { F.vista = b.dataset.vista; apply(); } });
$('#limpiar').addEventListener('click', () => {
Object.assign(F, { ver: '', genus: '', cat: '' }); setQ(''); qIn.value = ''; selG.value = ''; selC.value = ''; apply();
});
document.addEventListener('keydown', e => {
if (e.key === '/' && !isTyping(e.target) && !dlg.open && !$('#dlgImp').open) { e.preventDefault(); qIn.focus(); qIn.select(); }
});
/* ---------- tilt holográfico (solo puntero fino) ---------- */
if (mq('(hover:hover) and (pointer:fine)') && !RM) {
let tc = null, raf = 0, ev;
const off = () => { if (tc) { tc.classList.remove('tilt'); tc = null; } };
const tilt = () => {
raf = 0;
const c = ev.target.closest?.('.card');
if (c !== tc) off();
if (!c || album.dataset.view === 'lista') return;
tc = c;
const r = c.getBoundingClientRect();
const px = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
c.classList.add('tilt');
c.style.setProperty('--ry', ((px - .5) * 12).toFixed(2) + 'deg');
c.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg');
c.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
};
album.addEventListener('pointermove', e => { ev = e; raf ||= requestAnimationFrame(tilt); });
album.addEventListener('pointerleave', off);
}
/* ---------- toast + portapapeles ---------- */
let tT;
const tEl = $('#toast');
function toast(html, ms = 3600, fn, label = 'Deshacer') {
tEl.innerHTML = html;
if (fn) tEl.append(' ', Object.assign(document.createElement('button'), { type: 'button', className: 'linkbtn', textContent: label, onclick: () => { hideToast(); fn(); } }));
tEl.classList.toggle('act', !!fn);
const host = [...document.querySelectorAll('dialog[open]')].pop() || document.body;
if (tEl.parentNode !== host) host.append(tEl);
if (tEl.showPopover) { if (tEl.matches(':popover-open')) tEl.hidePopover(); tEl.showPopover(); }
tEl.classList.add('on');
clearTimeout(tT); tT = setTimeout(hideToast, ms);
}
function hideToast() { clearTimeout(tT); tEl.classList.remove('on'); }
const copy = (text, msg, field) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
.then(() => (msg && toast(msg), true), () => { field?.select?.(); toast(`No pude copiar. Copialo a mano: <code>${esc(text)}</code>`, 12000); return false; });
/* ---------- hero: próxima presa + plumaje ---------- */
const presa = $('#presa'), presaVit = $('#presaVit'), presaImg = $('#presaImg');
let presaId = null;
let bag = [];
const meta = p => !dead(p) && (!owned.has(p.id) || !isMax(p.id));
function pickPresa() {
for (let i = 0; i < 2; i++) {
while (bag.length) { const p = bag.pop(); if (p.id !== presaId && meta(p)) return p; }
bag = PETS.filter(meta);
for (let j = bag.length - 1; j > 0; j--) { const k = Math.random() * (j + 1) | 0; [bag[j], bag[k]] = [bag[k], bag[j]]; }
}
const all = PETS.filter(p => !dead(p) && p.id !== presaId);
return all[Math.random() * all.length | 0] || BY.get(presaId);
}
function presaLabel() {
if (!presaId) return;
$('#presaLbl').textContent = !owned.has(presaId) ? 'Tu próxima presa' : !isMax(presaId) ? 'Para subir a nivel 3' : 'Daeva completo · de tu colección';
}
function showPresa(p, anim) {
presaId = p.id;
presaVit.dataset.g = p.genusKey;
presaVit.classList.toggle('dk', $('.pl', CARD.get(p.id)).classList.contains('dk'));
const url = imgUrl(p.id);
if (anim && almaOn(presaVit)) A.morph(url, owned.has(p.id));
else if (anim) { presaVit.classList.remove('swap'); void presaVit.offsetWidth; presaVit.classList.add('swap'); }
presaImg.src = url; presaImg.alt = p.name;
const a = $('#presaName'); a.textContent = p.name; a.href = '#pet-' + p.id;
$('#presaRt').textContent = $('.rt', CARD.get(p.id)).textContent;
presaLabel();
}
$('#otra').addEventListener('click', () => showPresa(pickPresa(), true));
const tip = $('#plumaTip');
$('#plumaje').addEventListener('pointerover', e => {
const a = e.target.closest('a'); if (!a) return;
tip.textContent = BY.get(a.dataset.id).name; tip.style.left = (a.offsetLeft + 1.5) + 'px'; tip.classList.add('on');
});
$('#plumaje').addEventListener('pointerleave', () => tip.classList.remove('on'));
/* ---------- ficha (dialog) ---------- */
let cur = null, mapa = null;
function sorted(p) { return p.routes.filter(r => r.kind !== 'shop').sort((a, b) => (b.spawns || 0) - (a.spawns || 0)); }
const SUBL = { normal: 'normal', elite: 'élite', boss: 'boss' };
const TIP_INF = 'La dungeon la deduje por el rango de IDs y el nivel, porque questlog no le asigna dungeon al trash.';
const TIP_UNID = 'Questlog tiene el mob pero no dice en qué instancia aparece.';
const duda = t => `<button type="button" class="duda" data-tip="${esc(t)}" aria-label="${esc(t)}">${ico('i-help')}</button>`;
function secRutas(p) {
const o = owned.has(p.id), lv = level[p.id] || 0, s = G[p.genusKey].souls, [l2, l3] = s.levels.map(x => x.souls);
const rs = sorted(p), many = rs.filter(r => r.spawns).length > 1;
let lead;
if (!o) lead = `Necesitás <b>${s.unlock} almas</b> para desbloquearla <span class="q">(según datos de questlog)</span>.`;
else if (lv === 3) lead = 'Está al máximo. Si sale otra alma, no la necesitás.';
else lead = (lv === 2 ? `Para nivel 3 te faltan <b>${l3} almas</b>` : `${lv ? 'Para' : 'Si está en nivel 1, para'} nivel 3 te faltan <b>${l2 + l3} almas</b> (${l2} + ${l3})`) + ' <span class="q">(según datos de questlog)</span>.';
const rows = rs.map((r, i) => {
const k = r.kind === 'field' ? ['c-altgard', 'var(--c-altgard)'] : r.kind === 'fboss' ? ['c-worldboss', 'var(--c-worldboss)'] : [r.sub === 'boss' ? 'c-dboss' : 'c-dungeon', r.sub === 'boss' ? 'var(--c-dboss)' : 'var(--c-dungeon)'];
const sub = r.kind === 'fboss' ? '<span class="tag boss">boss de campo</span>' : r.sub !== 'normal' ? `<span class="tag ${r.sub}">${SUBL[r.sub]}</span>` : '';
const where = r.kind === 'dungeon' ? (r.unidentified ? 'Instancia sin identificar' + duda(TIP_UNID) : esc(r.place) + (r.inferred ? ' (inferido)' + duda(TIP_INF) : ''))
: esc(r.place) + (r.enemy ? ' (zona Asmodian)' : '');
const n = r.spawns ? `<span class="n">${r.spawns}<small>spawn${r.spawns > 1 ? 's' : ''}</small></span>` : '<span></span>';
return `<li style="--rc:${k[1]}">${ico(k[0], 'ri')}<div><b>${esc(r.mob)}</b>${sub}${many && i === 0 ? '<span class="tag top">Más spawns</span>' : ''}<small>nv ${nv(r.lvl)} · ${where}</small></div>${n}</li>`;
}).join('');
return `<section class="f-sec" id="fRutas"><h3>${o && lv !== 3 ? 'Dónde farmear almas' : 'Cómo conseguirla'}</h3><p class="souls">${lead}</p>` +
(rows ? `<ol class="rutas">${rows}</ol>` : `<p class="souls">Ningún mob la suelta: mirá la ficha de ruta${p.chests.length ? ' y los cofres' : ''}.</p>`) + '</section>';
}
function secFicha(p) {
const out = [], seen = new Set();
for (const r of p.routes) {
if (r.kind === 'dungeon') {
const key = r.unidentified ? '?' + r.mob : r.place; if (seen.has(key)) continue; seen.add(key);
if (r.unidentified) { out.push(`<div class="fr"><h4>Instancia sin identificar${duda(TIP_UNID)}</h4><p>Questlog no dice en qué dungeon aparece <b>${esc(r.mob)}</b> (nv ${nv(r.lvl)}).</p></div>`); continue; }
const dg = D.dungeons[r.place], mobs = p.routes.filter(x => x.kind === 'dungeon' && x.place === r.place);
const on = new Set(mobs.flatMap(x => x.modes || dg.modes.map(m => m.id)));
const g = dg.modes[0].group, en = dg.modes.find(m => m.energy)?.energy;
const heur = mobs.some(x => x.modesFrom === 'idPrefix');
out.push(`<div class="fr"><h4>${esc(dg.name)}${r.inferred ? ' (inferido)' + duda(TIP_INF) : ''}</h4>` +
`<p><span lang="en">${esc(dg.en)}</span> · ${dg.type === 'raid' ? 'raid' : 'dungeon de grupo'} · ${g[0] === g[1] ? g[0] : g[0] + '-' + g[1]} jugadores${en ? ` · ${en} de energía Odyle` : ''}</p>` +
`<p>La suelta: ${mobs.map(x => `<b>${esc(x.mob)}</b> (${SUBL[x.sub]}, nv ${nv(x.lvl)})`).join(', ')}</p>` +
`<div class="modos">${dg.modes.map((m, i) => `<span class="${on.has(m.id) ? '' : 'no'}">${m.diff ? D.diffs[m.diff] : 'Modo ' + (i + 1)}<small>${m.energy ? m.energy + ' E' : ''}</small></span>`).join('')}</div>` +
(heur ? '<p class="q" style="margin-top:8px">Dificultades estimadas: pueden sobrar.</p>' : '') + '</div>');
} else if (r.kind === 'shop') {
if (r.unconfirmed) { out.push('<div class="fr two"><h4>Sin fuente confirmada</h4><p>Nadie confirmó de dónde sale en global. Si sabés, avisá.</p></div>'); continue; }
const bits = [r.price, r.limit, r.paid ? 'pago' : '', r.event ? 'evento' : ''].filter(Boolean).map(esc).join(' · ');
let cd = '';
if (r.until) {
const d = daysTo(r.until);
cd = d < 0 ? `<p class="big">Ya no disponible</p><p>Se retiró en el mantenimiento del ${fecha(r.until)}.</p>`
: `<p class="big">${d === 0 ? 'Se va hoy' : d === 1 ? 'Se va mañana' : `Se va en ${d} días`}</p><p>Hasta el mantenimiento del ${fecha(r.until)}.</p>`;
}
out.push(`<div class="fr${r.until ? ' cd' : ''}${r.until && daysTo(r.until) < 0 ? ' gone' : ''}"><h4>${esc(r.shop)}</h4>${bits ? `<p>${bits}</p>` : ''}${cd}</div>`);
}
}
if (!p.routes.length) out.push('<div class="fr"><h4>Solo cofres</h4><p>Ningún mob la suelta y no está en tienda: sale de los cofres de abajo.</p></div>');
if (!out.length) return '';
const dg = p.routes.some(r => r.kind === 'dungeon'), sh = p.routes.some(r => r.kind === 'shop');
return `<section class="f-sec"><h3>${!p.hasMap ? 'Ficha de ruta' : dg && sh ? 'Dungeon y tienda' : dg ? (seen.size > 1 ? 'Dungeons' : 'Dungeon') : 'Tienda'}</h3><div class="fruta">${out.join('')}</div></section>`;
}
function secCofres(p) {
if (!p.chests.length) return '';
return `<section class="f-sec"><h3>Cofres que la pueden dar</h3><ul class="cofres">${p.chests.map(c => c.pct
? `<li><span style="text-align:left;color:var(--hueso)">${esc(c.name)}</span><span><b>${pct(c.pct)}%</b> · 1 de cada ${num(c.oneIn)} cofres</span><i style="--w:${Math.min(100, c.pct / 2.5 * 100)}%"></i></li>`
: `<li><span style="text-align:left;color:var(--hueso)">${esc(c.name)}</span><span>sin chance publicada</span></li>`).join('')}</ul></section>`;
}
function secDale(p) {
const x = G[p.genusKey];
const lines = x.equip.length ? x.equip.map(l => `<p><b>Nv ${l.level}:</b> ${l.stats.map(s => `${esc(s.label)} +${s.value}`).join(' · ')}</p>`).join('') : '<p>Sin bonus de equipar en los datos de questlog.</p>';
const raw = x.equip.some(l => l.stats.some(s => s.id === 'vehiclesprintcost')) ? '<p class="q">Costo de sprint: valor crudo de questlog.</p>' : '';
return `<details class="f-sec"><summary>Qué te da</summary><div class="dale">${lines}${raw}<p><a href="#genus-${GSLUG[p.genusKey]}" data-genus>Ver la guía de ${x.plural}</a></p></div></details>`;
}
function navList() { const v = $$('.card:not([hidden])', album).map(c => c.dataset.id); return v.includes(cur) ? v : $$('.card', album).map(c => c.dataset.id); }
function renderFicha(p, keepScroll) {
const o = owned.has(p.id), lv = level[p.id] || 0, card = CARD.get(p.id);
const list = navList(), i = list.indexOf(p.id), prev = BY.get(list[(i - 1 + list.length) % list.length]), next = BY.get(list[(i + 1) % list.length]);
const top = fBody.scrollTop;
mapa?.destroy(); mapa = null;
dlg.dataset.g = p.genusKey; dlg.dataset.cat = p.cat;
fBody.innerHTML = `<div class="f-top" aria-hidden="true"><span>${esc(p.name)}</span></div><div class="f-vit"><div class="vitrina pl${$('.pl', card).classList.contains('dk') ? ' dk' : ''}" id="fVit" data-g="${p.genusKey}"><img src="${imgUrl(p.id)}" width="256" height="256" alt="${esc(p.name)}"><span class="flash" aria-hidden="true"></span></div>` +
`<h2 id="fN">${esc(p.name)}</h2>${p.en !== p.name ? `<p class="en" lang="en">${esc(p.en)}</p>` : ''}` +
`<p class="tg"><span class="gn">${ico('g-' + p.genusKey)}${p.genus}</span>${$('.ch', card).outerHTML}${p.isNew && !card.classList.contains('exp') ? `<span class="nueva">Nueva · ${fecha(p.createdAt)}</span>` : ''}</p></div>` +
`<div class="f-act"><button type="button" class="btn tengo" id="fTengo" aria-pressed="${o}"><span class="wax"></span><span>${o ? 'La tengo' : 'Marcar: la tengo'}</span></button>` +
`<div class="nivel" role="group" aria-label="Nivel"><span>Nv</span>${[1, 2, 3].map(n => `<button type="button" data-lv="${n}" aria-pressed="${o && lv === n}" aria-label="Nivel ${n}">${n}</button>`).join('')}</div>` +
`<button type="button" class="iconbtn" id="fShare" aria-label="Compartir">${ico('i-share')}</button></div>` +
secRutas(p) +
(p.hasMap ? `<section class="f-sec" aria-labelledby="fMapT"><h3 id="fMapT">Mapa de spawns</h3><div id="fMapa"><div class="mesa-skel"><span>Desplegando el mapa…</span></div></div></section>` : '') +
secFicha(p) + secCofres(p) + secDale(p) +
`<footer class="f-pie"><button type="button" data-nav="-1" aria-label="Anterior: ${esc(prev.name)}">${ico('i-l')}<span>${esc(prev.name)}</span></button>` +
`<a href="https://questlog.gg/aion-2/en/db/pet/${p.id}" target="_blank" rel="noopener">questlog #${p.id}${ico('i-ext')}</a>` +
`<button type="button" data-nav="1" aria-label="Siguiente: ${esc(next.name)}"><span>${esc(next.name)}</span>${ico('i-r')}</button></footer>`;
fBody.scrollTop = keepScroll ? top : 0;
if (p.hasMap) mesa().then(m => { if (cur === p.id && $('#fMapa')) mapa = m.petMap($('#fMapa'), p, { mode, saveData }); }).catch(() => { const el = $('#fMapa'); if (el) el.innerHTML = '<p class="souls">No pude cargar el mapa.</p>'; });
alma().then(a => { if (a && cur === p.id && dlg.open) a.mount($('#fVit'), imgUrl(p.id), o); });
}
function openPet(id, { push = true, vt = true } = {}) {
const p = BY.get(id); if (!p) return;
const was = dlg.open, card = CARD.get(id);
cur = id;
const go = () => { renderFicha(p); if (!dlg.open) dlg.showModal(); };
if (vt && !was && !RM && document.startViewTransition && card && !card.hidden && card.checkVisibility?.()) {
const pl = $('.pl', card); pl.style.viewTransitionName = 'petpl';
dlg.style.transition = 'none';
const t = document.startViewTransition(() => { pl.style.viewTransitionName = ''; go(); $('#fVit').style.viewTransitionName = 'petpl'; });
t.finished.finally(() => { dlg.style.transition = ''; const v = $('#fVit'); if (v) v.style.viewTransitionName = ''; });
} else go();
const h = '#pet-' + id;
if (location.hash !== h) {
if (push && !was) history.pushState({ ficha: 1 }, '', h);
else history.replaceState(history.state, '', h);
}
}
fBody.addEventListener('scroll', () => dlg.classList.toggle('scrolled', fBody.scrollTop > 250), { passive: true });
dlg.addEventListener('close', () => {
cur = null; mapa?.destroy(); mapa = null;
dlg.style.transform = '';
if (A) heroAlma();
if (location.hash.startsWith('#pet-')) {
if (history.state?.ficha) history.back();
else history.replaceState(null, '', location.pathname + location.search);
}
});
dlg.addEventListener('click', e => {
if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
const p = BY.get(cur); if (!p) return;
const lvB = e.target.closest('[data-lv]'), nav = e.target.closest('[data-nav]');
if (e.target.closest('#fTengo')) toggleFicha(p, !owned.has(p.id));
else if (lvB) toggleFicha(p, true, +lvB.dataset.lv);
else if (e.target.closest('#fShare')) share(p);
else if (nav) step(+nav.dataset.nav);
else if (e.target.closest('[data-genus]')) {
e.preventDefault();
const h = e.target.closest('a').hash, t = document.getElementById(h.slice(1));
history.replaceState(null, '', h);
dlg.close();
setTimeout(() => t?.scrollIntoView({ block: 'start' }), 60);
}
});
function toggleFicha(p, on, lv) {
const was = owned.has(p.id);
if (!on) setOwned(p.id, false);
else setOwned(p.id, true, lv || level[p.id]);
const o = owned.has(p.id), l = level[p.id] || 0;
const b = $('#fTengo'); b.setAttribute('aria-pressed', o); b.lastElementChild.textContent = o ? 'La tengo' : 'Marcar: la tengo';
for (const x of $$('[data-lv]', fBody)) x.setAttribute('aria-pressed', o && l === +x.dataset.lv);
$('#fRutas').outerHTML = secRutas(p);
const v = $('#fVit');
if (o && !was) {
if (almaOn(v)) A.capture(); else if (!RM) { v.classList.remove('flashing'); void v.offsetWidth; v.classList.add('flashing'); }
const c = CARD.get(p.id); if (!RM) { c.classList.remove('stamp'); void c.offsetWidth; c.classList.add('stamp'); }
} else if (!o && was && almaOn(v)) A.release();
apply();
}
function step(d) { const l = navList(), i = l.indexOf(cur); openPet(l[(i + d + l.length) % l.length], { push: false, vt: false }); }
dlg.addEventListener('keydown', e => {
if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isTyping(e.target) && !e.target.closest('.mesa,.nivel')) { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); }
});
window.addEventListener('popstate', () => {
const m = location.hash.match(/^#pet-(\d+)$/);
if (m && BY.has(m[1])) openPet(m[1], { push: false, vt: false });
else if (dlg.open) dlg.close();
});
document.addEventListener('click', e => {
const a = e.target.closest('a[href^="#pet-"]');
if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
const id = a.getAttribute('href').slice(5);
if (!BY.has(id)) return;
e.preventDefault(); openPet(id);
});
async function share(p) {
const url = D.meta.baseUrl + 'pet/' + p.id + '/';
if (navigator.share && mq('(pointer:coarse)')) {
try { await navigator.share({ title: `${p.name} · Bestiario Esquivo`, text: `¿Quién viene a farmear ${p.name}?`, url }); } catch {}
return;
}
copy(url, `Link copiado: <b>${esc(p.name)}</b>`);
}
{
let y0 = null, dy = 0;
const grip = $('#fGrip');
grip.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; grip.setPointerCapture(e.pointerId); dlg.style.transition = 'none'; });
grip.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); dlg.style.transform = `translateY(${dy}px)`; });
const end = () => { if (y0 == null) return; y0 = null; dlg.style.transition = ''; if (dy > 110) dlg.close(); else dlg.style.transform = ''; };
grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
}
/* ---------- colección: el módulo pesado (coleccion.js) se carga al primer gesto que lo necesita ---------- */
const QL_DIR = '%APPDATA%\\Questlog\\aion-2';
const MOBILE = /Android|iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IOS = MOBILE && !/Android/.test(navigator.userAgent) && !navigator.standalone;
const WIN = !MOBILE && /win/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
let colM = null, colP = null, qlAuto = false;
const col = () => colP ||= import('./coleccion.js').then(m => {
m.init({ D, PETS, BY, N, owned, level, save, paint, counts, refreshAll, apply, toast, copy, esc, ico, norm, ls, isMax, imgUrl, RM, WIN, QL_DIR, dirtyUI });
return colM = m;
});
function goBackup() { $('#bak').scrollIntoView({ block: 'center' }); $('#exCopy').focus({ preventScroll: true }); }
document.addEventListener('click', e => {
const b = e.target.closest('[data-col]'); if (!b) return;
const k = b.dataset.col;
if (k === 'pick' || k === 'repick') {
qlAuto = k === 'repick' && !!ls.get('pets-questlog-char', null);
if (WIN) { copy(QL_DIR); toast('Pegá con Ctrl+V (en Nombre o en la barra de arriba) y Enter; después doble clic en <b>characters.json</b>.', 20000); }
$('#qlFile').click(); col();
} else if (k === 'backup') goBackup();
else col().then(m => m.act(k));
});
{
const fi = $('#qlFile');
fi.addEventListener('change', () => { const f = fi.files[0]; fi.value = ''; hideToast(); if (f) col().then(m => m.file(f, qlAuto)); });
fi.addEventListener('cancel', hideToast);
}
{
const ov = $('#dropOv'), isF = e => e.dataTransfer?.types?.includes('Files');
let n = 0;
const off = () => { n = 0; ov.hidden = true; };
addEventListener('dragenter', e => { if (!isF(e)) return; e.preventDefault(); if (!n++) { ov.hidden = false; col(); } });
addEventListener('dragover', e => { if (isF(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
addEventListener('dragleave', e => { if (isF(e) && --n <= 0) off(); });
addEventListener('drop', e => { if (!isF(e)) return; e.preventDefault(); off(); const f = e.dataTransfer.files[0]; if (f) col().then(m => m.file(f)); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden) off(); });
}
new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); col(); } }, { rootMargin: '600px 0px' }).observe($('#coleccion'));
if (!WIN) {
$('#qlLead').textContent = MOBILE ? 'La app de Questlog es solo para Windows. Desde el celu, usá la Carga rápida o abrí tu link de respaldo.' : 'La app de Questlog es solo para Windows.';
for (const x of ['#qlSteps', '.ql-path', '#qlDir', '#qlDrop']) $(x).hidden = true;
$('#qlLoad').classList.remove('gold'); $('#qlLoad').lastChild.textContent = MOBILE ? 'Restaurar un respaldo (.json)' : 'Tengo el archivo igual';
}
function dirtyUI() {
const d = owned.size > 0 && ls.get('pets-bak-t', 0) < ls.get('pets-dirty', 1);
$('#hBak').classList.toggle('dirty', d); $('#bakDirty').hidden = !d;
$('#hBak').setAttribute('aria-label', d ? 'Respaldo: hay cambios sin guardar' : 'Respaldo');
}
let pers = 0;
function nudge() {
if (!owned.size) return;
if (!pers++) navigator.storage?.persist?.().catch(() => {});
if (ls.get('pets-nudge', 0)) return;
ls.set('pets-nudge', 1);
toast(IOS ? 'En iPhone, Safari puede borrar tu colección tras 7 días sin entrar: agregá el sitio a inicio o guardá un respaldo.'
: 'Tu colección se guarda solo en este navegador. Guardá un respaldo.', 10000, goBackup, 'Respaldo');
}
$('#warn').addEventListener('click', e => { if (e.target.closest('[data-x]')) $('#warn').hidden = true; });
/* ---------- guía de genus: detalle del slot ---------- */
$('#genus').addEventListener('click', e => {
const b = e.target.closest('.s'); if (!b) return;
const x = G[b.dataset.g], s = x.slots[b.dataset.n - 1], t = x.slotTypes.find(t => t.key === s.type);
$$('#genus .s').forEach(o => o.setAttribute('aria-pressed', o === b));
const top = Math.max(...t.top.map(o => o.pct));
const box = $('#gslot'); box.style.setProperty('--sc', `var(--s-${t.key})`);
box.innerHTML = `<div class="gs-h"><h3><i></i>${x.plural} · slot ${s.n}</h3><span>${esc(t.label)} · nivel de desbloqueo ${s.openLevel} <span class="q">(según datos de questlog)</span></span></div>` +
`<ul class="gs-top">${t.top.map(o => `<li style="--w:${o.pct / top * 100}%"><b>${esc(o.label)}</b><span>hasta +${num(o.max)} · ${pct(o.pct)}%</span><i></i></li>`).join('')}</ul>` +
`<p class="gs-meta">Puede tirar <b>${t.nStats}</b> stats distintos · <b>${pct(t.fillerPct || 0)}%</b> de las tiradas son HP/MP máx. · ` +
(s.lock.crystals ? `Bloquearlo: <b>${num(s.lock.crystals)}</b> cristales + <b>${num(s.lock.gold)}</b> de oro.` : 'Este slot no se bloquea.') + '</p>';
const gg = $('#genus .gg'), one = getComputedStyle(gg).gridTemplateColumns.split(' ').length === 1;
(one ? b.closest('.gcard') : gg).after(box);
const r = box.getBoundingClientRect();
if (r.bottom > innerHeight || r.top < 0) box.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
});
$$('#genus .s').forEach(b => b.setAttribute('aria-pressed', 'false'));
/* ---------- mapas (lazy) ---------- */
const saveData = !!navigator.connection?.saveData;
const mode = { get: () => ls.get('pets-mapa', RM ? 'plano' : 'mesa'), set: v => ls.set('pets-mapa', v) };
let mesaP = null, plan = null;
const mesa = () => mesaP ||= import('./mesa.js');
{
const io = new IntersectionObserver(es => {
if (!es.some(e => e.isIntersecting)) return;
io.disconnect();
mesa().then(m => {
plan = m.plan($('#grMap'), $('#grList'), { BY, owned, isMax, esc, mode, saveData, ver: $('#grVer'), open: id => openPet(id) });
}).catch(() => { $('#grMap').innerHTML = '<p class="gr-empty">No pude cargar el mapa.</p>'; });
}, { rootMargin: '700px 0px' });
io.observe($('#grieta'));
}
/* ---------- alma (WebGL, lazy, con fallbacks) ---------- */
let A = null, almaP = null;
const fxPref = () => ls.get('pets-fx', 1) !== 0;
const fxOK = () => fxPref() && !RM && !saveData && !(navigator.deviceMemory <= 2) && 'WebGL2RenderingContext' in window;
function alma() {
if (!fxOK()) return Promise.resolve(null);
return almaP ||= import('./alma.js').then(m => m.init({ onFail: () => { A = null; } }) ? (A = m) : null).catch(() => null);
}
const almaOn = slot => A?.mountedIn?.() === slot;
let heroSeen = false;
function heroAlma() {
if (!heroSeen || dlg.open || !presaId) { A?.unmount(); return; }
alma().then(a => { if (a && !dlg.open) a.mount(presaVit, imgUrl(presaId), owned.has(presaId)); });
}
new IntersectionObserver(es => { heroSeen = es[0].isIntersecting; if (heroSeen && !A && !almaP) idle(heroAlma); else if (heroSeen && A && !dlg.open && !almaOn(presaVit)) heroAlma(); }, { threshold: .25 }).observe(presaVit);
function fxUI() { $('#fxOn').setAttribute('aria-pressed', fxPref()); $('#fxOff').setAttribute('aria-pressed', !fxPref()); }
$('#fxOn').addEventListener('click', () => { ls.set('pets-fx', 1); fxUI(); heroAlma(); });
$('#fxOff').addEventListener('click', () => { ls.set('pets-fx', 0); fxUI(); A?.destroy(); A = null; almaP = null; });
/* ---------- retratos de las cards: carga propia con margen chico (ver build.py card()) ---------- */
{
const SIZES = '(min-width:640px) 190px, 46vw';
const io = new IntersectionObserver(es => {
for (const e of es) if (e.isIntersecting) {
const im = e.target, id = im.closest('.card').dataset.id;
io.unobserve(im); im.removeAttribute('data-lazy');
im.addEventListener('load', () => im.classList.add('in'), { once: true });
im.sizes = SIZES; im.srcset = `${imgUrl(id, 128)} 128w, ${imgUrl(id)} 256w`; im.src = imgUrl(id, 128);
}
}, { rootMargin: '200px 0px' });
$$('.pl img[data-lazy]', album).forEach(im => { im.classList.add('lz'); io.observe(im); });
}
/* ---------- arranque ---------- */
new ResizeObserver(([e]) => document.documentElement.style.setProperty('--barh', Math.round(e.borderBoxSize?.[0]?.blockSize ?? e.target.offsetHeight) + 'px')).observe($('#barra'));
if (F.group) regroup();
refreshAll();
apply();
{ const ip = BY.get(presaImg.dataset.id); showPresa(ip && !dead(ip) ? ip : pickPresa(), false); }
fxUI();
$('#hSync').hidden = !ls.get('pets-questlog-sync', 0);
if (owned.size) nudge();
new IntersectionObserver(([e]) => document.body.classList.toggle('scr', !e.isIntersecting)).observe($('.hero'));
{
const m = location.hash.match(/^#pet-(\d+)$/);
if (m && BY.has(m[1])) openPet(m[1], { push: false, vt: false });
}
const linkIn = () => /^#c=/.test(location.hash) && col().then(m => m.fromHash());
linkIn();
addEventListener('hashchange', linkIn);
