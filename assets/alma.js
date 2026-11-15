const MISS = .96;
const GR = 96, NP = GR * GR, SC = 1 / 1.3;
const VS = `#version 300 es
in vec4 a;
uniform sampler2D tA,tB;
uniform float uT,uM,uAs,uJ,uPush,uFl,uSz;
uniform vec2 uP;
out vec4 vC;
void main(){
vec2 uv=a.xy;
vec4 cA=texture(tA,uv),cB=texture(tB,uv);
float m=clamp(uM*1.7-a.z*.7,0.,1.);
float burst=sin(m*3.14159);
vec3 c=mix(cA.rgb,cB.rgb,smoothstep(.42,.58,m));
vec2 q=(uv-vec2(.5,.45))/vec2(.52,.54);
float al=mix(cA.a,cB.a,smoothstep(.42,.58,m))*(1.-smoothstep(.6,1.,length(q)));
float cloud=1.-uAs;
vec2 p=(uv*2.-1.)*vec2(1.,-1.)*${SC.toFixed(4)};
float ang=a.w*6.2832+uT*(.25+a.z*.5);
p+=vec2(cos(ang),sin(ang))*(cloud*(.03+.3*a.z*a.z)+burst*(.12+.6*a.z));
p+=vec2(sin(uT*1.7+a.z*40.),cos(uT*1.3+a.w*40.))*uJ*.004;
vec2 d=p-uP;
p+=normalize(d+1e-4)*uPush*.2*exp(-dot(d,d)*18.);
gl_Position=vec4(p,0.,1.);
gl_PointSize=uSz*(1.+burst*.8);
vC=vec4(mix(c,vec3(1.,.84,.5),uFl*(.35+.65*a.z)),al*(1.-cloud*.25-burst*.3));
if(al<.06)gl_Position=vec4(2.,2.,2.,1.);
}`;
const FS = `#version 300 es
precision mediump float;
in vec4 vC;
uniform highp float uAs;
out vec4 o;
void main(){
vec2 q=gl_PointCoord-.5;
float a=vC.a*(1.-smoothstep(mix(.15,.85,uAs),1.,dot(q,q)*4.));
o=vec4(vC.rgb*a,a);
}`;
let gl = null, cv, U, texA, texB, slot = null, raf = 0, last = 0, vis = true, onFail, io, ro;
let count = NP, owned = false, mo = null, frames = 0, acc = 0, guard = 0, lastIn = 0;
const S = { as: .85, asT: .85, jit: 1, jitT: 1, push: 0, pushT: 0, fl: 0, t: 0, px: 9, py: 9, fast: 0 };
const tmp = document.createElement('canvas'); tmp.width = tmp.height = GR;
const tc = tmp.getContext('2d');
export function init(o = {}) {
onFail = o.onFail;
cv = document.createElement('canvas');
cv.setAttribute('aria-hidden', 'true');
gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
if (!gl) return false;
const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
const pr = gl.createProgram();
gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
gl.bindAttribLocation(pr, 0, 'a'); gl.linkProgram(pr);
if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return false; }
gl.useProgram(pr);
U = {};
for (const n of ['tA', 'tB', 'uT', 'uM', 'uAs', 'uJ', 'uPush', 'uFl', 'uSz', 'uP']) U[n] = gl.getUniformLocation(pr, n);
const d = new Float32Array(NP * 4), ord = new Uint16Array(NP);
for (let i = 0; i < NP; i++) ord[i] = i;
for (let i = NP - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [ord[i], ord[j]] = [ord[j], ord[i]]; }
for (let i = 0; i < NP; i++) {
const c = ord[i];
d.set([(c % GR + .5) / GR, ((c / GR | 0) + .5) / GR, Math.random(), Math.random()], i * 4);
}
const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
texA = mk(); texB = mk();
gl.uniform1i(U.tA, 0); gl.uniform1i(U.tB, 1);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.clearColor(0, 0, 0, 0);
cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fail(); });
cv.addEventListener('pointermove', ptr); cv.addEventListener('pointerdown', ptr);
cv.addEventListener('pointerleave', () => { S.pushT = 0; kick(); });
io = new IntersectionObserver(es => { vis = es.at(-1).isIntersecting; vis ? kick() : stop(); });
ro = new ResizeObserver(size);
document.addEventListener('visibilitychange', onVis);
return true;
}
function mk() {
const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
return t;
}
function put(t, img) {
tc.clearRect(0, 0, GR, GR); tc.drawImage(img, 0, 0, GR, GR);
gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);
}
function bind() { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); }
const load = url => { const im = new Image(); im.src = url; return im.decode().then(() => im); };
function size() {
if (!slot || !gl) return;
const css = Math.min(320, slot.clientWidth / SC), px = Math.round(css * Math.min(1.5, devicePixelRatio || 1));
if (cv.width !== px) { cv.width = cv.height = px; gl.viewport(0, 0, px, px); }
gl.uniform1f(U.uSz, px * SC / GR * (count < NP ? 2.1 : 1.5));
kick();
}
function ptr(e) {
const r = cv.getBoundingClientRect();
S.px = (e.clientX - r.left) / r.width * 2 - 1; S.py = 1 - (e.clientY - r.top) / r.height * 2; S.pushT = 1;
kick();
}
function onVis() { document.hidden ? stop() : kick(); }
function stop() { cancelAnimationFrame(raf); raf = 0; }
function kick() {
lastIn = performance.now();
if (raf || !gl || !slot || !vis || document.hidden) return;
last = 0; slot.classList.add('alma');
raf = requestAnimationFrame(frame);
}
function frame(now) {
raf = 0;
const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
S.t += dt;
const k = 1 - Math.exp(-dt * (S.fast ? 11 : 3)), kp = 1 - Math.exp(-dt * 6);
S.as += (S.asT - S.as) * k; S.jit += (S.jitT - S.jit) * k; S.push += (S.pushT - S.push) * kp; S.fl *= Math.exp(-dt * 3.2);
if (S.fast && Math.abs(S.asT - S.as) < .01) S.fast = 0;
let m = 0;
if (mo) {
const p = Math.min(1, (now - mo.t0) / 1700); m = p;
if (p >= 1) { [texA, texB] = [texB, texA]; bind(); m = 0; owned = mo.owned; S.asT = owned ? 1 : MISS; S.jitT = owned ? 0 : 1; mo = null; }
}
gl.clear(gl.COLOR_BUFFER_BIT);
gl.uniform1f(U.uT, S.t); gl.uniform1f(U.uM, m); gl.uniform1f(U.uAs, S.as); gl.uniform1f(U.uJ, S.jit);
gl.uniform1f(U.uPush, S.push); gl.uniform1f(U.uFl, S.fl); gl.uniform2f(U.uP, S.px, S.py);
gl.drawArrays(gl.POINTS, 0, count);
if (guard < 2 && dt) {
frames++; acc += dt;
if (frames === 60) {
if (acc / 60 > .024) { if (guard === 0) { count = NP >> 1; size(); } else return fail(); }
guard++; frames = 0; acc = 0;
}
}
const calm = !mo && S.push < .01 && S.fl < .02;
if (owned && calm && S.as > .996) { slot.classList.remove('alma'); return; } // reposo: queda el <img>, cero batería
if (!owned && calm && now - lastIn > 8000) { slot.classList.remove('alma'); return; } // 8 s quieto: vuelve el <img> nítido
if (vis && !document.hidden) raf = requestAnimationFrame(frame);
}
function fail() { destroy(); onFail?.(); }
export function mount(el, url, isOwned) {
if (!gl) return;
if (slot !== el) {
unmount();
slot = el; el.append(cv);
io.observe(cv); ro.observe(el);
}
owned = isOwned; mo = null;
load(url).then(img => {
if (slot !== el || !gl) return;
put(texA, img); put(texB, img); bind();
S.as = isOwned ? .45 : .25; S.asT = isOwned ? 1 : MISS; S.jit = S.jitT = isOwned ? 0 : 1; S.fl = 0; S.fast = 0;
size(); kick();
}, () => {});
}
function morphTo(url, isOwned) {
if (!gl || !slot) return;
const el = slot;
load(url).then(img => {
if (slot !== el || !gl) return;
put(texB, img); bind();
mo = { t0: performance.now(), owned: isOwned };
S.jitT = 1; kick();
}, () => {});
}
export { morphTo as morph };
export function capture() {
owned = true; S.asT = 1; S.jitT = 0; S.fl = 1; S.fast = 1;
if (slot) { slot.classList.remove('flashing'); void slot.offsetWidth; slot.classList.add('flashing'); }
kick();
}
export function release() { owned = false; S.as = Math.min(S.as, .55); S.asT = MISS; S.jitT = 1; kick(); }
export function mountedIn() { return slot; }
export function unmount() {
stop();
if (!slot) return;
slot.classList.remove('alma');
io?.unobserve(cv); ro?.unobserve(slot);
cv.remove(); slot = null;
}
export function destroy() {
if (!gl) return;
unmount();
document.removeEventListener('visibilitychange', onVis);
io.disconnect(); ro.disconnect();
const g = gl; gl = null;
g.getExtension('WEBGL_lose_context')?.loseContext();
}
