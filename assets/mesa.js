const INKS = ['#9E2A1E', '#1E4F8F', '#2F6B33', '#6E3A8E', '#8C5A12', '#1F6E6A'];
const BAND = ['#A6D9A0', '#EBC57A', '#F0878D'];
const TILT = 40, KY = 1 / Math.cos(TILT * Math.PI / 180);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nv = l => l[0] === l[1] ? `${l[0]}` : `${l[0]}-${l[1]}`;
const compass = (u, v) => {
const ns = v < .36 ? 'norte' : v > .64 ? 'sur' : '', eo = u < .36 ? 'oeste' : u > .64 ? 'este' : '';
return ns && eo ? (ns === 'norte' ? 'nor' : 'sud') + eo : ns || eo || 'centro';
};
class Mesa {
constructor(host, { regionId, label, mode, saveData }) {
Object.assign(this, { mode, saveData, region: regionId, z: 1, tx: 0, ty: 0, big: false, home: [.5, .5, 1] });
const el = this.el = document.createElement('div');
el.className = 'mesa'; el.tabIndex = 0; el.setAttribute('role', 'group');
this.label(label);
el.innerHTML = `<div class="mesa-tilt"><div class="mesa-plane"><img alt="" width="1024" height="1024" decoding="async" src="assets/maps/${regionId}-1024.webp"><svg viewBox="0 0 1000 1000" aria-hidden="true"></svg></div></div>` +
`<div class="mesa-modo" role="group" aria-label="Vista del mapa"><button type="button" data-m="mesa">${ico('i-mesa')}Mesa</button><button type="button" data-m="plano">${ico('i-plano')}Plano</button></div>` +
`<div class="mesa-ctl"><button type="button" data-z="1.5" aria-label="Acercar">${ico('i-plus')}</button><button type="button" data-z="0.6667" aria-label="Alejar">${ico('i-minus')}</button>` +
`<button type="button" data-z="0" aria-label="Volver a la zona más densa">${ico('i-target')}</button></div>`;
host.replaceChildren(el);
this.plane = el.querySelector('.mesa-plane'); this.svg = this.plane.querySelector('svg'); this.img = this.plane.querySelector('img');
this.setMode(mode.get());
this.bind();
this.layout();
this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(el);
}
label(t) { this.el.setAttribute('aria-label', t + '. Con el mapa enfocado: + y − para zoom, flechas para moverte, 0 para volver.'); }
get uv() { return this.P ? [(this.W / 2 - this.tx) / (this.P * this.z), (this.H / 2 - this.ty) / (this.P * this.z)] : null; }
layout() {
const c = this.uv;
this.W = this.el.clientWidth; this.H = this.el.clientHeight; this.P = this.W;
this.look(...(c || this.home.slice(0, 2)), this.z, false);
}
look(u, v, z = this.z, anim = true) {
this.z = clamp(z, 1, 4);
this.tx = this.W / 2 - u * this.P * this.z; this.ty = this.H / 2 - v * this.P * this.z;
this.apply(anim);
}
goHome(anim = true) { this.look(...this.home, anim); }
apply(anim) {
const s = this.P * this.z;
this.tx = clamp(this.tx, this.W / 2 - s, this.W / 2); this.ty = clamp(this.ty, this.H / 2 - s, this.H / 2);
this.plane.classList.toggle('anim', !!anim && !RM);
this.plane.style.width = this.plane.style.height = s.toFixed(1) + 'px';
this.plane.style.transform = `translate3d(${this.tx.toFixed(1)}px,${this.ty.toFixed(1)}px,0)`;
const k = 1000 / s;
if (this.circles && Math.abs(k - (this.k || 0)) / k > .02) {
this.k = k; this.svg.style.setProperty('--sw', k.toFixed(3));
const r = (3.5 * k).toFixed(2);
for (const c of this.circles) c.setAttribute('r', r);
}
if (!this.big && !this.saveData && this.z > 1.6) {
this.big = true;
const im = new Image(); im.onload = () => { this.img.src = im.src; }; im.src = `assets/maps/${this.region}-2048.webp`;
}
}
pan(dx, dy, anim) { this.tx += dx; this.ty += dy * (this.m === 'mesa' ? KY : 1); this.apply(anim); }
zoomAt(f, sx, sy, anim) {
if (sx === undefined || this.m === 'mesa') { sx = this.W / 2; sy = this.H / 2; }
const z = clamp(this.z * f, 1, 4), r = z / this.z;
this.tx = sx - (sx - this.tx) * r; this.ty = sy - (sy - this.ty) * r; this.z = z;
this.apply(anim);
}
setMode(m) {
this.m = m;
this.el.style.setProperty('--tilt', m === 'mesa' ? TILT + 'deg' : '0deg');
for (const b of this.el.querySelectorAll('[data-m]')) b.setAttribute('aria-pressed', b.dataset.m === m);
}
setPoints(groups) {
this.svg.innerHTML = groups.map(g => `<g data-k="${g.key}" style="--ink:${g.ink}">` +
g.pts.map(p => `<circle cx="${(p[0] * 1000).toFixed(1)}" cy="${(p[1] * 1000).toFixed(1)}" r="3"/>`).join('') + '</g>').join('');
this.circles = [...this.svg.querySelectorAll('circle')]; this.k = 0; this.apply(false);
}
setFlags(list) {
for (const f of this.plane.querySelectorAll('.fl')) f.remove();
const frag = document.createDocumentFragment();
for (const f of list) {
const d = document.createElement('div');
d.className = 'fl ' + (f.cls || '');
d.style.cssText = `left:${(f.u * 100).toFixed(2)}%;top:${(f.v * 100).toFixed(2)}%;${f.style || ''}`;
Object.assign(d.dataset, f.data || {});
d.innerHTML = `<div class="fl-s"><span class="fl-b">${f.html}</span></div>`;
frag.append(d);
}
this.plane.append(frag);
}
bind() {
const el = this.el, pts = new Map();
let last = null, moved = 0, downT = null;
el.addEventListener('dragstart', e => e.preventDefault());
el.addEventListener('pointerdown', e => {
if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button)) return;
el.focus({ preventScroll: true });
el.setPointerCapture(e.pointerId);
pts.set(e.pointerId, [e.clientX, e.clientY]);
if (pts.size === 1) { moved = 0; downT = e.target; }
last = null; el.classList.add('drag'); this.plane.classList.remove('anim');
});
el.addEventListener('pointermove', e => {
const p0 = pts.get(e.pointerId); if (!p0) return;
const dx = e.clientX - p0[0], dy = e.clientY - p0[1];
pts.set(e.pointerId, [e.clientX, e.clientY]);
if (pts.size === 1) { moved += Math.abs(dx) + Math.abs(dy); this.pan(dx, dy); return; }
const [a, b] = pts.values(), r = el.getBoundingClientRect();
const d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2 - r.left, my = (a[1] + b[1]) / 2 - r.top;
if (last) { this.zoomAt(d / last.d, mx, my); this.pan(mx - last.mx, my - last.my); }
last = { d, mx, my }; moved = 99;
});
const up = e => {
if (!pts.delete(e.pointerId)) return;
last = null;
if (pts.size) return;
el.classList.remove('drag');
const f = moved < 6 && downT?.closest?.('.fl-b');
if (f) this.onFlag?.(f.closest('.fl'));
downT = null;
};
el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
el.addEventListener('wheel', e => {
if (!e.ctrlKey && document.activeElement !== el) return;
e.preventDefault();
const r = el.getBoundingClientRect();
this.zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
el.addEventListener('keydown', e => {
const k = e.key;
if (k === '+' || k === '=') this.zoomAt(1.4, undefined, undefined, true);
else if (k === '-' || k === '_') this.zoomAt(1 / 1.4, undefined, undefined, true);
else if (k === '0') this.goHome();
else if (k.startsWith('Arrow')) this.pan(k === 'ArrowLeft' ? 70 : k === 'ArrowRight' ? -70 : 0, k === 'ArrowUp' ? 70 : k === 'ArrowDown' ? -70 : 0, true);
else return;
e.preventDefault(); e.stopPropagation();
});
el.addEventListener('click', e => {
const b = e.target.closest('button'); if (!b) return;
if (b.dataset.m) { this.setMode(b.dataset.m); this.mode.set(b.dataset.m); }
else if (b.dataset.z === '0') this.goHome();
else if (b.dataset.z) this.zoomAt(+b.dataset.z, undefined, undefined, true);
});
}
destroy() { this.ro.disconnect(); this.el.remove(); }
}
function merge(flags, d = .02) {
const out = [];
for (const f of [...flags].sort((a, b) => b.count - a.count)) {
const near = out.find(o => Math.hypot(o.u - f.u, o.v - f.v) < d);
near ? near.count += f.count : out.push({ ...f });
}
return out.sort((a, b) => b.count - a.count);
}
/* ---------- mapa de una pet (ficha) ---------- */
export function petMap(host, pet, { mode, saveData }) {
let dead = false, m = null;
fetch(`assets/spawns/${pet.id}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
if (dead) return;
let reg = 0, mob = -1;
host.innerHTML = `<div class="mapa-ui"><div class="mapa-tabs"></div><div class="mapa-chips" role="group" aria-label="Mob"></div><p class="mapa-grieta" hidden>${ico('c-altgard')}Grieta · nv 45+ · abre cada 3 h · 60 min</p><div class="mapa-host"></div><p class="mesa-sum"></p></div>`;
const tabs = host.querySelector('.mapa-tabs'), chips = host.querySelector('.mapa-chips'), mh = host.querySelector('.mapa-host'), sum = host.querySelector('.mesa-sum');
const region = () => {
const R = data.regions[reg];
tabs.className = data.regions.length > 1 ? 'mapa-chips' : '';
tabs.innerHTML = data.regions.length > 1 ? data.regions.map((r, i) => `<button type="button" data-reg="${i}" aria-pressed="${i === reg}">${esc(r.region)}</button>`).join('') : '';
m?.destroy();
host.querySelector('.mapa-grieta').hidden = !(R.enemy && (R.regionId === '1110' || R.regionId === '1111'));
m = new Mesa(mh, { regionId: R.regionId, label: `Mapa de spawns de ${pet.name} en ${R.region}`, mode, saveData });
m.setPoints(R.mobs.map((x, i) => ({ key: i, ink: INKS[i % INKS.length], pts: x.points })));
m.onFlag = fl => m.look(+fl.dataset.u, +fl.dataset.v, Math.max(m.z * 1.5, 2.4));
pick(mob);
};
const pick = i => {
mob = i;
const R = data.regions[reg], ms = i < 0 ? R.mobs : [R.mobs[i]];
const total = R.mobs.reduce((a, x) => a + x.spawns, 0);
chips.innerHTML = (R.mobs.length > 1 ? `<button type="button" data-mob="-1" aria-pressed="${i < 0}">Todos · ${total}</button>` : '') +
R.mobs.map((x, k) => `<button type="button" data-mob="${k}" aria-pressed="${i === k || R.mobs.length === 1}"><i style="--ink:${INKS[k % INKS.length]}"></i>${esc(x.mob)} · nv ${nv(x.lvl)} · ${x.spawns}</button>`).join('');
for (const g of m.svg.querySelectorAll('g')) g.classList.toggle('off', i >= 0 && +g.dataset.k !== i);
const fl = merge(ms.flatMap(x => x.flags));
const top = fl[0];
const lab = [];
for (const f of fl) if (!lab.some(o => Math.hypot(o.u - f.u, o.v - f.v) < .05)) lab.push(f);
const boss = ms.length === 1 && ms[0].sub === 'boss' && ms[0].spawns === 1;
const fx = (f, cls) => ({ u: f.u, v: f.v, cls, html: boss ? ico('c-worldboss') + esc(ms[0].mob.split(',')[0]) : '×' + f.count, data: { u: f.u, v: f.v } });
m.setFlags([...fl.filter(f => !lab.includes(f)).map(f => fx(f, 'mini')), ...lab.reverse().map(f => fx(f, f === fl[0] ? 'top' : ''))]);
const P = ms.flatMap(x => x.points), us = P.map(p => p[0]), vs = P.map(p => p[1]);
const span = Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), .02);
m.home = [top.u, top.v, clamp(.42 / span, 1.3, 1.6)];
m.goHome(!!sum.textContent);
const n = ms.reduce((a, x) => a + x.spawns, 0), where = `${esc(R.region)}${R.enemy ? ' (zona Asmodian)' : ''}`;
const txt = n === 1 ? `<b>1 spawn</b> en ${where}, al <b>${compass(top.u, top.v)}</b> del mapa.` :
`<b>${n} spawns</b> en ${where}. Zona más densa: <b>${compass(top.u, top.v)}</b> (×${top.count}).`;
sum.innerHTML = txt;
m.label(`Mapa de spawns de ${pet.name}: ${sum.textContent}`);
};
host.addEventListener('click', e => {
const b = e.target.closest('[data-mob],[data-reg]'); if (!b) return;
if (b.dataset.reg) { reg = +b.dataset.reg; mob = -1; region(); } else if (data.regions[reg].mobs.length > 1) pick(+b.dataset.mob);
});
region();
}).catch(() => { if (!dead) host.innerHTML = '<p class="mesa-sum">No pude cargar el mapa de spawns.</p>'; });
return { destroy() { dead = true; m?.destroy(); } };
}
/* ---------- Plan de Grieta: banderines de Altgard por banda de nivel ---------- */
export function plan(mapEl, listEl, { BY, owned, isMax, mode, saveData, ver }) {
let data = null, m = null, sel = null, filt = 'faltan';
const want = id => filt === 'todas' || (filt === 'faltan' ? !owned.has(id) : owned.has(id) && !isMax(id));
function render() {
if (!data) return;
const es = data.entries.filter(e => want(e.petId));
if (sel && !es.some(e => e.petId === sel)) sel = null;
if (!es.length) {
listEl.innerHTML = filt === 'faltan' ? '<div class="gr-empty"><b>Ya tenés todas las de Altgard.</b>Daeva completo. Tocá "Subir a 3" para ver dónde farmear almas.</div>'
: '<div class="gr-empty"><b>Nada para subir.</b>Las de Altgard que tenés ya están al máximo.</div>';
} else {
listEl.innerHTML = data.bands.map(b => {
const rows = new Map();
for (const e of es.filter(e => e.band === b.band)) {
const r = rows.get(e.petId) || rows.set(e.petId, { mobs: new Set(), lo: 99, hi: 0, n: 0 }).get(e.petId);
r.mobs.add(e.mob); r.lo = Math.min(r.lo, e.lvl); r.hi = Math.max(r.hi, e.lvl); r.n += e.spawns;
}
if (!rows.size) return '';
return `<div class="gr-band" style="--bc:${BAND[b.band]}"><h3><i></i>Nivel ${b.label}<span>${rows.size} pet${rows.size > 1 ? 's' : ''}</span></h3>` +
[...rows].sort((a, b) => b[1].n - a[1].n).map(([id, r]) => {
const p = BY.get(id);
return `<button type="button" class="gr-row${owned.has(id) ? ' own' : ''}" data-pet="${id}" aria-pressed="${sel === id}">` +
`<span class="pl" data-g="${p.genusKey}"><img src="assets/p/${id}-128.webp" width="40" height="40" alt="" loading="lazy" decoding="async"></span>` +
`<span><b>${esc(p.name)}</b><small>${[...r.mobs].map(esc).join(', ')} · nv ${nv([r.lo, r.hi])}</small></span><em>${r.n}<small>spawns</small></em></button>` +
(sel === id ? `<p class="souls" style="margin:6px 0 0 50px"><a href="#pet-${id}">Abrir la ficha de ${esc(p.name)}</a></p>` : '');
}).join('') + '</div>';
}).join('');
}
m.setFlags(es.flatMap(e => e.flags.slice(0, sel === e.petId ? 8 : 1).map(f => ({
u: f.u, v: f.v, cls: 'pin' + (sel ? (e.petId === sel ? ' hi' : ' off') : ''), style: `--bc:${BAND[e.band]}`, data: { pet: e.petId },
html: `<img src="assets/p/${e.petId}-128.webp" alt="" loading="lazy" decoding="async"><span>${f.count}</span>`,
}))));
}
function toggle(id) {
sel = sel === id ? null : id;
render();
if (sel) {
const f = data.entries.filter(x => x.petId === sel).flatMap(x => x.flags).sort((a, b) => b.count - a.count)[0];
m.look(f.u, f.v, Math.max(m.z, 2.2));
if (matchMedia('(max-width:1080px)').matches && mapEl.getBoundingClientRect().top < 0) mapEl.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' });
} else m.goHome();
}
fetch('assets/spawns/grieta.json').then(r => r.json()).then(d => {
data = d;
m = new Mesa(mapEl, { regionId: d.regionId, label: 'Mapa de Altgard con las pets de la Grieta que te faltan', mode, saveData });
m.home = [.56, .52, 1.25];
m.goHome(false);
m.onFlag = fl => toggle(fl.dataset.pet);
render();
}).catch(() => { mapEl.innerHTML = '<p class="gr-empty">No pude cargar el Plan de Grieta.</p>'; });
listEl.addEventListener('click', e => { const b = e.target.closest('.gr-row'); if (b) toggle(b.dataset.pet); });
ver.addEventListener('click', e => {
const b = e.target.closest('button'); if (!b) return;
filt = b.dataset.v; for (const x of ver.children) x.setAttribute('aria-pressed', x === b);
render();
});
return { refresh: render };
}
