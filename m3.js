// MADWALL 3D: la pared real (pantalla LED vertical, 2 jugadores, 3x7 objetivos por lado) en WebGL
import * as T from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js";

const box = document.getElementById("m3");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ev = (n, p) => { if (window.mwEv) window.mwEv(n, p); };

// ---------- Entorno de estudio (RoomEnvironment de three, simplificado) ----------
function estudio() {
  const s = new T.Scene(), g = new T.BoxGeometry();
  g.deleteAttribute("uv");
  const shadow = new T.MeshStandardMaterial({ side: T.BackSide, color: 0x9a9a9a });
  const room = new T.Mesh(g, shadow); room.position.set(-0.757, 13.219, 0.717); room.scale.set(31.713, 28.305, 28.591); s.add(room);
  const pl = new T.PointLight(0xffffff, 900, 28, 2); pl.position.set(0.418, 16.199, 0.300); s.add(pl);
  const m = (x, y, z, sx, sy, sz, i) => { const o = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xffffff })); o.material.color.multiplyScalar(i); o.position.set(x, y, z); o.scale.set(sx, sy, sz); s.add(o); };
  m(-16.116, 14.37, 8.208, 0.1, 2.428, 2.739, 50); m(-16.109, 18.021, -8.207, 0.1, 2.425, 2.751, 50);
  m(14.904, 12.198, -1.832, 0.15, 4.265, 6.331, 17); m(-0.462, 8.89, 14.52, 4.38, 5.441, 0.088, 43);
  m(3.235, 11.486, -12.541, 2.5, 2.0, 0.1, 20); m(0.0, 20.0, 0.0, 1.0, 0.1, 1.0, 100);
  return s;
}

// ---------- Geometría de la pantalla (proporción real ~1,2 x 2,0 m) ----------
const SW = 1.16, SH = 1.8;              // metros de pantalla
const CW = 1024, CH = Math.round(CW * SH / SW); // canvas de textura
const COLS = [0.135, 0.27, 0.405, 0.595, 0.73, 0.865]; // centros x (fracción) de los 6 objetivos: 3 + barra + 3
const ROW0 = 0.19, ROWD = 0.094, FILAS = 7;
const R = CW * 0.063;
const targets = [];
for (let r = 0; r < FILAS; r++) for (let c = 0; c < 6; c++) {
  // ligera curvatura como en la pared real: las columnas exteriores un pelo más abiertas abajo
  const x = COLS[c] * CW + (c < 3 ? -1 : 1) * r * 1.6, y = (ROW0 + r * ROWD) * CH;
  targets.push({ x, y, on: false, hit: 0 });
}

// ---------- Estado ----------
const st = { marca: "TU MARCA", fill: "#e4202b", fillAuto: null, logo: null, playing: false, score: 0, best: 0, end: 0, t: "00:10" };

// ---------- Textura LED ----------
const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
const cx = cv.getContext("2d");
const base = document.createElement("canvas"); base.width = CW; base.height = CH;
(function pintaBase() {
  const b = base.getContext("2d");
  b.fillStyle = "#2c2d31"; b.fillRect(0, 0, CW, CH);
  // rejilla de píxeles LED (muy sutil para que no haga moaré)
  b.fillStyle = "rgba(255,255,255,0.035)";
  for (let y = 0; y < CH; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < CW; x += 4) b.fillRect(x, y, 2, 2);
  // juntas entre módulos LED
  b.strokeStyle = "rgba(0,0,0,0.28)"; b.lineWidth = 1.5;
  for (let x = CW / 4; x < CW; x += CW / 4) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, CH); b.stroke(); }
  for (let y = CH / 6; y < CH; y += CH / 6) { b.beginPath(); b.moveTo(0, y); b.lineTo(CW, y); b.stroke(); }
  // objetivos apagados: cúpula gris con aro claro
  targets.forEach(o => {
    const g = b.createRadialGradient(o.x, o.y - R * 0.3, R * 0.2, o.x, o.y, R);
    g.addColorStop(0, "#3d3e42"); g.addColorStop(0.8, "#323337"); g.addColorStop(1, "#3a3b3f");
    b.fillStyle = g; b.beginPath(); b.arc(o.x, o.y, R, 0, 7); b.fill();
    b.strokeStyle = "rgba(210,212,218,0.42)"; b.lineWidth = 2.2; b.beginPath(); b.arc(o.x, o.y, R - 1, 0, 7); b.stroke();
    b.strokeStyle = "rgba(255,255,255,0.06)"; b.lineWidth = 4; b.beginPath(); b.arc(o.x, o.y, R - 6, Math.PI * 1.05, Math.PI * 1.75); b.stroke();
  });
})();

// Logo preparado: { img(canvas recortado), fill }
function dibujaObjetivo(o) {
  const col = st.logo ? st.logo.fill : st.fill;
  cx.save();
  cx.shadowColor = col; cx.shadowBlur = 38;
  cx.fillStyle = o.hit > 0 ? "#ffffff" : col;
  cx.beginPath(); cx.arc(o.x, o.y, R * 0.98, 0, 7); cx.fill();
  cx.restore();
  if (o.hit > 0) return;
  cx.save(); cx.beginPath(); cx.arc(o.x, o.y, R * 0.98, 0, 7); cx.clip();
  if (st.logo) {
    const L = st.logo.img, w = L.width, h = L.height;
    // encaja el logo dentro del círculo (la diagonal del recorte toca el aro interior)
    const s = Math.min((R * 1.78) / Math.hypot(w, h), (R * 1.5) / Math.max(w, h));
    cx.drawImage(L, o.x - w * s / 2, o.y - h * s / 2, w * s, h * s);
  } else {
    const t = st.marca;
    cx.fillStyle = contraste(col); cx.textAlign = "center"; cx.textBaseline = "middle";
    let fs = R * 0.62; cx.font = `800 ${fs}px Archivo, Arial, sans-serif`;
    while (cx.measureText(t).width > R * 1.6 && fs > 10) { fs -= 2; cx.font = `800 ${fs}px Archivo, Arial, sans-serif`; }
    cx.fillText(t, o.x, o.y + fs * 0.04);
  }
  cx.restore();
}
function digitos(n, x, y, sz) {
  const s = String(n).padStart(3, "0");
  cx.fillStyle = "#f4f5f7"; cx.font = `700 ${sz}px "Chakra Petch", monospace`; cx.textAlign = "center"; cx.textBaseline = "alphabetic";
  for (let i = 0; i < 3; i++) {
    const dx = x + (i - 1) * sz * 0.68;
    cx.fillStyle = "rgba(244,245,247,0.96)"; cx.fillRect(dx - sz * 0.29, y - sz * 0.86, sz * 0.58, sz * 0.92);
    cx.fillStyle = "#1d1e21"; cx.fillText(s[i], dx, y - sz * 0.1);
  }
}
function pinta() {
  cx.drawImage(base, 0, 0);
  // tiempo
  cx.fillStyle = "#e9ebee"; cx.textAlign = "center"; cx.textBaseline = "alphabetic";
  cx.font = `300 ${CW * 0.16}px "Helvetica Neue", Arial, sans-serif`;
  cx.shadowColor = "rgba(255,255,255,.35)"; cx.shadowBlur = 12; cx.fillText(st.t, CW / 2, CH * 0.088); cx.shadowBlur = 0;
  // barra central
  const bx = CW * 0.5, by0 = CH * 0.13, by1 = CH * 0.86;
  cx.save(); cx.shadowColor = "#bfe0ff"; cx.shadowBlur = 30; cx.fillStyle = "#d9ecfb";
  cx.beginPath(); cx.roundRect(bx - CW * 0.012, by0, CW * 0.024, by1 - by0, CW * 0.012); cx.fill(); cx.restore();
  targets.forEach(o => { if (o.on || o.hit > 0) dibujaObjetivo(o); });
  // marcadores
  digitos(st.score, CW * 0.27, CH * 0.965, CW * 0.075);
  digitos(st.best, CW * 0.73, CH * 0.965, CW * 0.075);
  tex.needsUpdate = true; sucio = true;
}
const contraste = hex => { const c = parseInt(hex.slice(1), 16), r = c >> 16, g = (c >> 8) & 255, b = c & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? "#111214" : "#ffffff"; };

// ---------- Logo inteligente: detecta el fondo, recorta y rellena el círculo ----------
function preparaLogo(img) {
  const M = 640, k = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, px = (x, y) => (y * w + x) * 4;
  // borde de 3 px alrededor
  const borde = [];
  for (let x = 0; x < w; x += 2) for (const y of [0, 1, 2, h - 1, h - 2, h - 3]) if (y >= 0 && y < h) borde.push(px(x, y));
  for (let y = 0; y < h; y += 2) for (const x of [0, 1, 2, w - 1, w - 2, w - 3]) if (x >= 0 && x < w) borde.push(px(x, y));
  const alfaBorde = borde.reduce((a, i) => a + d[i + 3], 0) / borde.length;
  let fill, esLogo;
  if (alfaBorde > 200) {
    // fondo opaco: color más frecuente del borde (cuantizado)
    const hist = new Map();
    borde.forEach(i => { const q = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); const e = hist.get(q) || [0, 0, 0, 0]; e[0]++; e[1] += d[i]; e[2] += d[i + 1]; e[3] += d[i + 2]; hist.set(q, e); });
    let mejor = null; hist.forEach(e => { if (!mejor || e[0] > mejor[0]) mejor = e; });
    const br = mejor[1] / mejor[0], bg = mejor[2] / mejor[0], bb = mejor[3] / mejor[0];
    fill = "#" + [br, bg, bb].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
    esLogo = i => d[i + 3] > 40 && Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) > 60;
  } else {
    // PNG transparente: el relleno depende de cómo es el logo
    esLogo = i => d[i + 3] > 40;
    let n = 0, lum = 0, sat = 0, r0 = 0, g0 = 0, b0 = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 128) { n++; const r = d[i], gg = d[i + 1], b = d[i + 2]; lum += 0.299 * r + 0.587 * gg + 0.114 * b; sat += Math.max(r, gg, b) - Math.min(r, gg, b); r0 += r; g0 += gg; b0 += b; }
    lum /= n || 1; sat /= n || 1;
    if (lum > 205 && sat < 40) fill = st.fill === "#ffffff" ? "#111214" : st.fill; // logo blanco: color de marca elegido
    else fill = "#ffffff";                                                          // logo oscuro o de color: fondo blanco
  }
  // recorte al contenido real del logo
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (esLogo(px(x, y))) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = document.createElement("canvas"); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return { img: out, fill };
}

// ---------- Escena ----------
let renderer;
try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
catch (e) { box.classList.add("sin3d"); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
box.appendChild(renderer.domElement);

const scene = new T.Scene();
const pm = new T.PMREMGenerator(renderer);
scene.environment = pm.fromScene(estudio(), 0.04).texture;

const cam = new T.PerspectiveCamera(26, 1, 0.1, 50);
const target = new T.Vector3(0, 1.02, 0);

const tex = new T.CanvasTexture(cv);
tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter;

const negro = new T.MeshPhysicalMaterial({ color: 0x0e0f11, roughness: 0.42, metalness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 });
const negroMate = new T.MeshStandardMaterial({ color: 0x151618, roughness: 0.8, metalness: 0.2 });
const wall = new T.Group(); wall.rotation.y = -0.32; scene.add(wall);
const BOT = 0.16; // altura de la pantalla sobre el suelo
// carcasa
const cab = new T.Mesh(new T.BoxGeometry(SW + 0.04, SH + 0.04, 0.11), negro); cab.position.set(0, BOT + SH / 2, -0.055); cab.castShadow = true; wall.add(cab);
// pantalla
const pant = new T.Mesh(new T.PlaneGeometry(SW, SH), new T.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, color: 0x111111 }));
pant.position.set(0, BOT + SH / 2, 0.0012); wall.add(pant);
// patas y base
const pata = (x) => { const p = new T.Mesh(new T.BoxGeometry(0.07, 0.04, 0.62), negroMate); p.position.set(x, 0.02, 0.02); p.castShadow = p.receiveShadow = true; wall.add(p);
  const col = new T.Mesh(new T.BoxGeometry(0.06, BOT + 0.25, 0.06), negroMate); col.position.set(x, (BOT + 0.25) / 2, -0.09); col.castShadow = true; wall.add(col);
  [-0.26, 0.28].forEach(z => { const r = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 0.03, 20), negroMate); r.rotation.z = Math.PI / 2; r.position.set(x, 0.028, z); wall.add(r); }); };
pata(-SW * 0.36); pata(SW * 0.36);
const trav = new T.Mesh(new T.BoxGeometry(SW * 0.8, 0.05, 0.05), negroMate); trav.position.set(0, BOT * 0.6, -0.09); wall.add(trav);
// suelo con sombra
const suelo = new T.Mesh(new T.PlaneGeometry(8, 8), new T.ShadowMaterial({ opacity: 0.16 })); suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; scene.add(suelo);
// luz que proyecta sombra + reflejo suave de la pantalla en el suelo
const sol = new T.DirectionalLight(0xffffff, 1.6); sol.position.set(-1.2, 5, 3.2); sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024); Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 14 }); sol.shadow.radius = 8; sol.shadow.bias = -0.0005; scene.add(sol);

// ---------- Tamaño y cámara ----------
let W = 1, H = 1;
function tam() {
  W = box.clientWidth; H = box.clientHeight; renderer.setSize(W, H, false);
  cam.aspect = W / H; cam.updateProjectionMatrix();
  const d = (SH + 0.45) / (2 * Math.tan(T.MathUtils.degToRad(cam.fov / 2))) / Math.min(1, cam.aspect / 0.72);
  base0.set(0.35, 0.98, d * 1.02); sucio = true;
}
const base0 = new T.Vector3(), mira = { x: 0, y: 0, tx: 0, ty: 0 };
new ResizeObserver(tam).observe(box);

// ---------- Interacción ----------
const ray = new T.Raycaster(), ndc = new T.Vector2();
function toca(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const hit = ray.intersectObject(pant)[0]; if (!hit) return;
  const u = hit.uv.x * CW, v = (1 - hit.uv.y) * CH;
  const o = targets.find(o => Math.hypot(o.x - u, o.y - v) < R * 1.08);
  if (!o) return;
  if (!st.playing) { if (o.on) { o.hit = 6; o.on = false; pinta(); } return; }
  if (!o.on) return;
  e.preventDefault();
  st.score++; o.on = false; o.hit = 5; enciende(o); pinta(); ui.s.textContent = st.score;
  if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {}
}
renderer.domElement.addEventListener("pointerdown", toca);
box.addEventListener("pointermove", e => { const r = box.getBoundingClientRect(); mira.tx = ((e.clientX - r.left) / r.width - 0.5); mira.ty = ((e.clientY - r.top) / r.height - 0.5); });
box.addEventListener("pointerleave", () => { mira.tx = 0; mira.ty = 0; });

function enciende(evita) {
  const libres = targets.filter(o => !o.on && o !== evita);
  const lado = Math.random() < 0.5 ? 0 : 1;
  const pref = libres.filter((o, i) => (targets.indexOf(o) % 6 < 3 ? 0 : 1) === lado);
  const o = (pref.length ? pref : libres)[Math.floor(Math.random() * (pref.length || libres.length))];
  if (o) o.on = true;
}
function apaga() { targets.forEach(o => o.on = false); }

// ---------- Juego ----------
const ui = { t: document.querySelector(".real-ui [data-t]"), s: document.querySelector(".real-ui [data-s]"), btn: document.getElementById("mw-play"), res: document.getElementById("mw-res") };
let tick = null;
function fin() {
  clearInterval(tick); st.playing = false; apaga(); st.best = Math.max(st.best, st.score); st.t = "00:00"; pinta();
  ui.res.textContent = st.score >= 18 ? st.score + " aciertos. Con eso estarías arriba del ranking en casi cualquier evento." : st.score >= 10 ? st.score + " aciertos. Nada mal para ser la primera." : st.score + " aciertos. La segunda partida siempre sale mejor.";
  ui.btn.textContent = "Jugar otra vez"; ui.btn.disabled = false; ev("demo_jugar", { puntos: st.score });
}
ui.btn.addEventListener("click", () => {
  st.playing = true; st.score = 0; ui.s.textContent = "0"; ui.res.textContent = ""; ui.btn.disabled = true; ui.btn.textContent = "Toca las luces";
  st.end = Date.now() + 10000; apaga(); enciende(); enciende(); pinta();
  box.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  tick = setInterval(() => { const left = Math.max(0, st.end - Date.now()); st.t = "00:" + String(Math.ceil(left / 1000)).padStart(2, "0"); ui.t.textContent = st.t; pinta(); if (left <= 0) fin(); }, 200);
});
setInterval(() => { if (!st.playing && visible) { const on = targets.filter(o => o.on); if (on.length >= 3) on[Math.floor(Math.random() * on.length)].on = false; while (targets.filter(o => o.on).length < 3) enciende(); pinta(); } }, 1300);

// ---------- Controles de marca ----------
const inp = document.getElementById("cf-nombre"), file = document.getElementById("cf-logo"), auto = document.getElementById("cf-auto");
inp.addEventListener("input", () => { st.marca = (inp.value.trim() || "TU MARCA").toUpperCase(); if (st.logo && inp.value.trim()) { st.logo = null; auto.hidden = true; } muestra(); });
document.querySelectorAll("#cf-sw button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#cf-sw button").forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true");
  st.fill = b.dataset.c; if (st.logo) st.logo.fill = b.dataset.c; muestra();
}));
file.addEventListener("change", () => {
  const f = file.files && file.files[0]; if (!f) return;
  const url = URL.createObjectURL(f), im = new Image();
  im.onload = () => {
    st.logo = preparaLogo(im); URL.revokeObjectURL(url);
    document.querySelectorAll("#cf-sw button").forEach(x => x.setAttribute("aria-pressed", "false"));
    auto.hidden = false; auto.querySelector("i").style.background = st.logo.fill;
    ev("demo_logo", {}); muestra();
    if (innerWidth < 900) box.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };
  im.src = url;
});
function muestra() { // enseña varios objetivos encendidos con la marca
  if (st.playing) { pinta(); return; }
  apaga(); [7, 16, 26].forEach(i => targets[i].on = true); pinta();
}

// ---------- Bucle (solo cuando se ve) ----------
let visible = false, sucio = true, t0 = performance.now();
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: "100px" }).observe(box);
function loop(now) {
  requestAnimationFrame(loop);
  if (!visible) return;
  let anim = false;
  targets.forEach(o => { if (o.hit > 0) { o.hit--; anim = true; } });
  if (anim) pinta();
  mira.x += (mira.tx - mira.x) * 0.06; mira.y += (mira.ty - mira.y) * 0.06;
  const sway = reduce ? 0 : Math.sin((now - t0) / 4200) * 0.18;
  cam.position.set(base0.x + mira.x * 0.9 + sway, base0.y - mira.y * 0.35, base0.z);
  cam.lookAt(target);
  renderer.render(scene, cam);
}
tam();
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { muestra(); box.classList.add("listo"); requestAnimationFrame(loop); });
