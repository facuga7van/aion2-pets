let C, cssP;
const css = () => cssP ||= new Promise(r => document.head.append(Object.assign(document.createElement('link'),
{ rel: 'stylesheet', href: new URL('./coleccion.css', import.meta.url).href, onload: r, onerror: r })));
const $ = s => document.querySelector(s);
export function init(ctx) {
C = ctx;
css();
syncExport(); qlUI();
$('#exLink').addEventListener('focus', e => e.target.select());
}
/* ---------- respaldo: link #c=v2.<base64url> (2 bits por id desde 1000) y .json ---------- */
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function exportLink() {
const b = new Uint8Array(128); let last = -1;
for (const id of C.owned) {
const i = +id - 1000; if (!(i >= 0 && i < 512)) continue;
b[i >> 2] |= (C.level[id] || 1) << ((i & 3) * 2); last = Math.max(last, i >> 2);
}
return C.D.meta.baseUrl + '#c=v2.' + b64u(b.subarray(0, last + 1));
}
export function syncExport() { $('#exLink').value = exportLink(); }
function parseLink(s) {
const m = /^v2\.([A-Za-z0-9_-]*)$/.exec(s); if (!m) return null;
let bin; try { bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/')); } catch { return null; }
const out = new Map();
for (let i = 0; i < bin.length; i++) for (let k = 0; k < 4; k++) {
const v = (bin.charCodeAt(i) >> (k * 2)) & 3; if (v) out.set(String(1000 + i * 4 + k), v);
}
return out;
}
const backed = () => { C.ls.set('pets-bak-t', Date.now()); C.dirtyUI(); };
function guard() {
const s = { owned: [...C.owned], level: { ...C.level }, t: Date.now() };
C.ls.set('pets-backup', s);
return after => () => {
C.owned.clear(); s.owned.forEach(i => C.owned.add(i));
for (const k in C.level) delete C.level[k];
Object.assign(C.level, s.level);
C.save(); C.refreshAll(); C.apply(); after?.();
C.toast('Listo, volvió como estaba.');
};
}
const have = () => `tenés <b>${C.PETS.filter(p => C.owned.has(p.id)).length}</b> de ${C.N} · <b>${C.PETS.filter(p => C.isMax(p.id)).length}</b> al máximo`;
function applyImport(map, mode) {
const undo = mode === 'replace' ? guard() : null;
if (undo) { C.owned.clear(); for (const k in C.level) delete C.level[k]; }
for (const [id, lv] of map) if (C.BY.has(id)) { C.owned.add(id); C.level[id] = undo ? lv : Math.max(C.level[id] || 0, lv); }
C.save(); C.refreshAll(); C.apply();
C.toast('Listo: ' + have(), 8000, undo?.());
}
const lvSummary = m => { const c = [0, 0, 0, 0]; for (const v of m.values()) c[v]++; return `${c[1]} en nivel 1, ${c[2]} en nivel 2, ${c[3]} al máximo`; };
const ours = m => new Map([...m].filter(([id]) => C.BY.has(id)));
async function modal(title, body, actions) {
await css();
const d = $('#dlgImp');
$('#impT').textContent = title; $('#impBody').innerHTML = body;
$('#impAct').innerHTML = actions.map(([v, l, c], i) => `<button type="submit" class="btn ${c || ''}" value="${v}"${i === 0 ? ' autofocus' : ''}>${l}</button>`).join('');
d.returnValue = ''; d.showModal();
return new Promise(res => d.addEventListener('close', () => res(d.returnValue), { once: true }));
}
const MODES = [['replace', 'Reemplazar', 'gold'], ['add', 'Sumar a la mía'], ['', 'Cancelar', 'ghost']];
const NOTE = '<p class="q">Reemplazar pisa lo que tenés en este navegador (podés deshacerlo); Sumar se queda con el nivel más alto.</p>';
export async function fromHash() {
const m = /^#c=(.+)$/.exec(location.hash); if (!m) return;
history.replaceState(null, '', location.pathname + location.search);
const map = parseLink(m[1]);
if (!map) return C.toast('Ese link de colección no es válido.');
const mine = ours(map);
if (!mine.size) return C.toast('Ese link no trae ninguna pet de esta lista.');
const r = await modal(`Importar ${mine.size} pets`, `<p>Este link trae <b>${mine.size}</b> pets de esta lista: ${lvSummary(mine)}.</p><p>En este navegador tenés <b>${C.owned.size}</b>.</p>${NOTE}`,
[['add', 'Sumar a la mía', 'gold'], ['replace', 'Reemplazar'], ['', 'Cancelar', 'ghost']]);
if (r) applyImport(mine, r);
}
function download() {
const a = document.createElement('a'), t = new Date();
a.href = URL.createObjectURL(new Blob([JSON.stringify({ format: 'bestiario-esquivo', v: 1, owned: [...C.owned], level: C.level, t: t.getTime() })], { type: 'application/json' }));
a.download = `bestiario-esquivo-${t.toISOString().slice(0, 10)}.json`;
document.body.append(a); a.click(); a.remove();
setTimeout(() => URL.revokeObjectURL(a.href), 4000);
backed();
C.toast('Respaldo descargado. Para recuperarlo, soltalo en la página o elegilo con <b>Elegir archivo</b>.', 6000);
}
/* ---------- archivo: characters.json de Questlog o respaldo .json propio ---------- */
function parseQL(j) {
if (!j || typeof j.characters !== 'object' || Array.isArray(j.characters) || !j.characters) return { err: 'wrong' };
const gs = new Map();
for (const [key, ch] of Object.entries(j.characters)) {
const list = new Map();
for (const x of Array.isArray(ch?.pets) ? ch.pets : []) {
const id = String(x?.pet ?? '');
if (/^\d+$/.test(id)) list.set(id, Math.min(3, Math.max(1, Math.round(+x.level) || 1)));
}
if (!list.size) continue;
const sig = [...list].sort((a, b) => a[0] - b[0]).join(';');
let g = gs.get(sig); if (!g) gs.set(sig, g = { keys: [], names: [], list });
g.keys.push(key); g.names.push(String(j.roster?.[key]?.name || ch.name || key.replace(/^\d+:/, '')));
}
return gs.size ? { groups: [...gs.values()].sort((a, b) => b.list.size - a.list.size) } : { err: 'empty' };
}
const ERR = {
wrong: () => `Ese no parece ser el characters.json de Questlog ni un respaldo de este sitio. La carpeta es <code>${C.QL_DIR}</code>`,
empty: () => 'Ese archivo no tiene pets todavía. Abrí la app de Questlog mientras jugás (ahí se guarda tu colección) y volvé a probar.',
read: () => 'No pude leer el archivo. Probá de nuevo.',
};
const qlErr = k => modal('No es ese archivo', `<p class="imp-err">${ERR[k]()}</p>`, [['', 'Entendido', 'gold']]);
export async function file(f, silent) {
let j; try { j = JSON.parse(await f.text()); } catch (e) { return qlErr(e instanceof SyntaxError ? 'wrong' : 'read'); }
if (j?.format === 'bestiario-esquivo' && Array.isArray(j.owned)) {
const m = new Map(j.owned.map(String).filter(id => C.BY.has(id)).map(id => [id, Math.min(3, Math.max(1, +j.level?.[id] || 1))]));
const r = await modal(`Restaurar ${m.size} pets`, `<p>Respaldo del ${new Date(j.t || 0).toLocaleDateString('es-AR')}: <b>${m.size}</b> pets, ${lvSummary(m)}.</p>${NOTE}`, MODES);
if (r) applyImport(m, r);
return;
}
const r = parseQL(j);
if (r.err) return qlErr(r.err);
const pref = C.ls.get('pets-questlog-char', null);
const auto = silent && pref && r.groups.find(g => g.keys.includes(pref));
if (auto) { applyImport(ours(auto.list), 'add'); synced(); return; }
let sel = Math.max(0, r.groups.findIndex(g => g.keys.includes(pref)));
const sum = g => { const m = ours(g.list); return `Importar <b>${g.list.size} pets</b> (<b>${m.size}</b> de esta lista): ${lvSummary(m)}.`; };
const body = (r.groups.length > 1 ? `<p>Hay ${r.groups.length} colecciones en el archivo (una por server o cuenta). Elegí la tuya:</p><div class="imp-groups">${r.groups.map((g, i) =>
`<label><input type="radio" name="grp" value="${i}"${i === sel ? ' checked' : ''}><span><b>${C.esc(g.names.join(', '))}</b><small>${g.list.size} pets · ${ours(g.list).size} de esta lista</small></span></label>`).join('')}</div>` : `<p>Colección de: <b>${C.esc(r.groups[0].names.join(', '))}</b></p>`) +
`<p id="impSum">${sum(r.groups[sel])}</p>${NOTE}`;
const done = modal('Importar desde Questlog', body, MODES);
await css();
$('#impBody').addEventListener('change', e => { if (e.target.name === 'grp') { sel = +e.target.value; $('#impSum').innerHTML = sum(r.groups[sel]); } });
const mode = await done;
if (!mode) return;
C.ls.set('pets-questlog-char', r.groups[sel].keys[0]);
applyImport(ours(r.groups[sel].list), mode);
synced();
}
function synced() { C.ls.set('pets-questlog-sync', Date.now()); qlUI(); }
function qlUI() {
const t = C.ls.get('pets-questlog-sync', 0);
$('#qlSync').hidden = $('#hSync').hidden = $('#qlMeta').hidden = !t;
if (!t) return;
const f = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto', style: 'short' }), s = (t - Date.now()) / 1000, a = Math.abs(s);
const rel = a < 60 ? 'recién' : a < 3600 ? f.format(Math.round(s / 60), 'minute') : a < 86400 ? f.format(Math.round(s / 3600), 'hour') : f.format(Math.round(s / 86400), 'day');
$('#qlWhen').textContent = 'última importación: ' + rel;
$('#hSync span').textContent = 'Actualizar · ' + rel;
}
/* ---------- botones de la sección ---------- */
export function act(k) {
if (k === 'dir') {
C.copy(C.QL_DIR, 'Carpeta copiada.', $('#qlPath'));
$('#qlTip').hidden = false;
} else if (k === 'exCopy') C.copy($('#exLink').value, 'Link de tu colección copiado. Abrilo en el otro dispositivo.', $('#exLink')).then(ok => ok && backed());
else if (k === 'download') download();
else if (k === 'reset') {
if (!C.owned.size) return;
const undo = guard();
C.owned.clear(); for (const k in C.level) delete C.level[k];
C.save(); C.refreshAll(); C.apply();
C.toast('Borraste tu colección de este navegador.', 9000, undo());
} else if (k === 'quick') quick();
}
/* ---------- Carga rápida: las 89 en una grilla, tocar = subir de nivel ---------- */
let rq;
const lv = id => C.owned.has(id) ? (C.level[id] || 1) : 0;
async function quick() {
await css();
if (!rq) build();
paint();
rq.showModal();
}
function build() {
const { D, PETS, esc, ico, imgUrl } = C;
rq = document.createElement('dialog');
rq.className = 'rq'; rq.setAttribute('aria-labelledby', 'rqT');
rq.innerHTML = `<header class="rq-h"><div class="rq-t"><h2 id="rqT">Carga rápida</h2><p class="rq-c" id="rqC" aria-live="polite"></p></div>` +
`<label class="buscar rq-q">${ico('i-search')}<input type="search" id="rqQ" placeholder="Buscar pet" aria-label="Buscar pet en la carga rápida" autocomplete="off" spellcheck="false" enterkeyhint="search"></label>` +
`<button type="button" class="btn gold rq-x" autofocus>Listo</button>` +
`<p class="rq-hint">Tocá cada pet hasta su nivel: sin <b>→ 1 → 2 → 3</b> → sin.</p></header><div class="rq-b">` +
D.cats.map(c => `<section class="rq-s" data-cat="${c.key}" style="--c:${c.color}"><div class="rq-sh">${ico('c-' + c.key)}<h3>${esc(c.label)} <span></span></h3>` +
`<button type="button" class="rq-all" data-all="1">Marcar todas (nv 1)</button><button type="button" class="rq-all" data-all="0">Desmarcar todas</button></div><div class="rq-g">` +
PETS.filter(p => p.cat === c.key).map(p => `<button type="button" class="rq-p" data-id="${p.id}"><span class="rq-i pl" data-g="${p.genusKey}">` +
`<img src="${imgUrl(p.id, 128)}" alt="" width="64" height="64" loading="lazy" decoding="async"></span><span class="rq-n">${esc(p.name)}</span>` +
'<span class="rq-v" aria-hidden="true"><i></i><i></i><i></i></span></button>').join('') + '</div></section>').join('') +
'<p class="rq-none" hidden>Nada con esa búsqueda.</p></div>';
document.body.append(rq);
rq.addEventListener('click', e => {
if (e.target === rq || e.target.closest('.rq-x')) return rq.close();
const t = e.target.closest('.rq-p'), all = e.target.closest('.rq-all');
if (t) {
const id = t.dataset.id, n = (lv(id) + 1) % 4;
if (n) { C.owned.add(id); C.level[id] = n; } else { C.owned.delete(id); delete C.level[id]; }
C.save(); C.paint(id); paint();
if (n === 1 && !C.RM) { t.classList.remove('stamp'); void t.offsetWidth; t.classList.add('stamp'); }
} else if (all) {
const s = all.closest('.rq-s'), on = all.dataset.all === '1', ids = [...s.querySelectorAll('.rq-p:not([hidden])')].map(b => b.dataset.id);
const ch = ids.filter(id => on ? !C.owned.has(id) : C.owned.has(id));
if (!ch.length) return;
const undo = guard();
for (const id of ch) { if (on) { C.owned.add(id); C.level[id] = 1; } else { C.owned.delete(id); delete C.level[id]; } C.paint(id); }
C.save(); paint();
C.toast(`${on ? 'Marcaste' : 'Desmarcaste'} <b>${ch.length}</b> en ${esc(s.querySelector('h3').firstChild.textContent.trim())}.`, 9000, undo(paint));
}
});
const q = rq.querySelector('#rqQ');
q.addEventListener('input', () => {
const tk = C.norm(q.value).split(/\s+/).filter(Boolean);
let any = 0;
for (const s of rq.querySelectorAll('.rq-s')) {
let n = 0;
for (const b of s.querySelectorAll('.rq-p')) { const ok = tk.every(t => C.BY.get(b.dataset.id).hay.includes(t)); b.hidden = !ok; n += ok; }
s.hidden = !n; any += n;
}
rq.querySelector('.rq-none').hidden = !!any;
});
q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); q.blur(); rq.querySelector('.rq-p:not([hidden])')?.focus(); } });
rq.addEventListener('close', () => { C.refreshAll(); C.apply(); });
}
function paint() {
for (const b of rq.querySelectorAll('.rq-p')) {
const id = b.dataset.id, l = lv(id);
b.dataset.lv = l; b.setAttribute('aria-pressed', l > 0);
b.setAttribute('aria-label', `${C.BY.get(id).name}, ${l ? 'nivel ' + l : 'no la tenés'}`);
}
for (const s of rq.querySelectorAll('.rq-s')) {
const ids = [...s.querySelectorAll('.rq-p')].map(b => b.dataset.id);
s.querySelector('h3 span').textContent = `${ids.filter(id => C.owned.has(id)).length}/${ids.length}`;
}
rq.querySelector('#rqC').innerHTML = have().replace('tenés ', '');
}
