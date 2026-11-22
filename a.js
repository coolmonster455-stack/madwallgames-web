(function () {
  var dl = window.dataLayer = window.dataLayer || [];
  window.mwEv = ev;
  function ev(name, params) { dl.push(Object.assign({ event: name }, params || {})); if (window.gtag) window.gtag("event", name, params || {}); }

  // Consentimiento de cookies
  var consent = null; try { consent = localStorage.getItem("mw_consent"); } catch (e) {}
  var banner = document.querySelector(".consent");
  if (banner && !consent) banner.hidden = false;
  document.querySelectorAll("[data-consent]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.dataset.consent; consent = v;
      try { localStorage.setItem("mw_consent", v); } catch (e) {}
      var g = v === "si" ? "granted" : "denied";
      if (window.gtag) window.gtag("consent", "update", { ad_storage: g, analytics_storage: g, ad_user_data: g, ad_personalization: g });
      banner.hidden = true; if (v === "si") guardaOrigen();
    });
  });

  // Origen de la visita (solo con consentimiento)
  function guardaOrigen() { try {
    var q = new URLSearchParams(location.search);
    if (q.get("gclid")) sessionStorage.setItem("mw_gclid", q.get("gclid"));
    if (!sessionStorage.getItem("mw_origen")) {
      var o = ["utm_source", "utm_medium", "utm_campaign", "utm_term"].map(function (k) { return q.get(k) ? k.replace("utm_", "") + "=" + q.get(k) : ""; }).filter(Boolean).join(" ");
      sessionStorage.setItem("mw_origen", o || (document.referrer ? "ref=" + new URL(document.referrer).hostname : "directo"));
    }
  } catch (e) {} }
  if (consent === "si") guardaOrigen();

  // Clics en WhatsApp, teléfono y correo
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    var h = a.getAttribute("href");
    if (/wa\.me|whatsapp/.test(h)) ev("click_whatsapp", { ubicacion: a.dataset.donde || "" });
    else if (h.indexOf("tel:") === 0) ev("click_telefono", { ubicacion: a.dataset.donde || "" });
    else if (h.indexOf("mailto:") === 0) ev("click_email", {});
  });

  // Vídeos: solo se reproducen cuando se ven
  var vids = document.querySelectorAll("video[data-auto]");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        var v = x.target;
        if (x.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { rootMargin: "120px" });
    vids.forEach(function (v) { io.observe(v); });
  }

  // Marcador del panel del vídeo principal
  var hud = document.querySelector("[data-hud]");
  if (hud && !reduce) {
    var t = hud.querySelector("[data-t]"), s = hud.querySelector("[data-s]"), secs = 30, pts = 0;
    setInterval(function () {
      secs = secs <= 0 ? 30 : secs - 1; if (secs === 30) pts = 0;
      pts += Math.random() < .8 ? 1 : 0;
      t.textContent = "00:" + String(secs).padStart(2, "0"); s.textContent = String(pts).padStart(3, "0");
    }, 1000);
  }

  // Demo jugable: 10 segundos
  var game = document.querySelector("[data-game]");
  if (game) {
    var cells = Array.prototype.slice.call(game.querySelectorAll(".t"));
    var tEl = game.querySelector("[data-t]"), sEl = game.querySelector("[data-s]"), bar = game.querySelector(".bar i");
    var over = game.querySelector(".over"), res = over.querySelector("strong"), msg = over.querySelector("[data-msg]"), btn = over.querySelector("button");
    var on = -1, score = 0, end = 0, timer = null, playing = false;
    function light() {
      if (on >= 0) cells[on].classList.remove("on");
      var n; do { n = Math.floor(Math.random() * cells.length); } while (n === on);
      on = n; cells[on].classList.add("on");
    }
    function tick() {
      var left = Math.max(0, end - Date.now());
      tEl.textContent = "00:" + String(Math.ceil(left / 1000)).padStart(2, "0");
      bar.style.height = (left / 100) + "%";
      if (left <= 0) stop();
    }
    function start() {
      score = 0; sEl.textContent = "000"; end = Date.now() + 10000; playing = true; over.hidden = true;
      light(); tick(); timer = setInterval(tick, 100); ev("demo_jugar", {});
    }
    function stop() {
      clearInterval(timer); playing = false; if (on >= 0) cells[on].classList.remove("on"); on = -1;
      res.textContent = score;
      msg.textContent = score >= 22 ? "Eso es nivel de ranking. En un evento, esa cifra aguanta arriba un buen rato." : score >= 14 ? "Buena marca. Delante de tus compañeros, cuesta más." : "Calentando. La segunda siempre sale mejor.";
      btn.textContent = "Otra partida"; over.hidden = false;
    }
    cells.forEach(function (c, i) {
      c.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        if (!playing || i !== on) return;
        score++; sEl.textContent = String(score).padStart(3, "0");
        c.classList.remove("on"); c.classList.add("hit"); setTimeout(function () { c.classList.remove("hit"); }, 140);
        light();
      });
    });
    btn.addEventListener("click", start);
  }

  // Formulario de presupuesto
  document.querySelectorAll("form[data-solicitud]").forEach(function (f) {
    var t0 = Date.now();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      f.querySelectorAll(".err").forEach(function (x) { x.remove(); });
      var d = {}; new FormData(f).forEach(function (v, k) { d[k] = v; });
      d.pagina = location.pathname; try { d.origen = sessionStorage.getItem("mw_origen") || ""; d.gclid = sessionStorage.getItem("mw_gclid") || ""; } catch (x) {}
      if (Date.now() - t0 < 1500) d.rapido = 1;
      var b = f.querySelector("button[type=submit]"), txt = b.textContent;
      function fallo(campo, m) {
        var el = campo && f.querySelector("[name=" + campo + "]");
        var s = document.createElement("span"); s.className = "err"; s.textContent = m;
        (el ? el.closest(".campo") : b.parentNode).appendChild(s); if (el) el.focus();
      }
      if (!d.nombre || !d.nombre.trim()) return fallo("nombre", "Escribe tu nombre.");
      if ((d.telefono || "").replace(/\D/g, "").length < 9) return fallo("telefono", "Escribe un teléfono de al menos 9 cifras.");
      b.disabled = true; b.textContent = "Enviando…";
      fetch("https://madwall-web.royal-tooth-ac58.workers.dev/api/solicitud", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok || !x.j.ok) { b.disabled = false; b.textContent = txt; return fallo(x.j.campo, x.j.error || "No se ha podido enviar. Prueba otra vez o escríbenos por WhatsApp."); }
          ev("form_submit_presupuesto", { tipo_evento: d.tipo || "", ciudad: d.ciudad || "" });
          ev("generate_lead", { tipo_evento: d.tipo || "" });
          f.innerHTML = '<div class="ok" role="status"><h3>Recibido, ' + (d.nombre || "").split(" ")[0].replace(/[<>&"]/g, "") + '.</h3><p>Te llamamos lo antes posible al ' + (d.telefono || "").replace(/[<>&"]/g, "") + ' (en horario laboral, normalmente en menos de una hora). Si lo prefieres, adelántanos el plano o la idea por WhatsApp.</p><a class="btn btn-blue" data-donde="gracias" href="https://wa.me/34682128698?text=Hola%2C%20acabo%20de%20pedir%20presupuesto%20en%20la%20web">Abrir WhatsApp</a></div>';
          f.scrollIntoView({ block: "center", behavior: "smooth" });
        })
        .catch(function () { b.disabled = false; b.textContent = txt; fallo(null, "Sin conexión. Prueba otra vez o escríbenos por WhatsApp al 682 128 698."); });
    });
  });
})();

/* ---------- v2: efectos ---------- */
(function () {
  var ev = function (n, p) { if (window.mwEv) window.mwEv(n, p); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Cabecera: transparente sobre el vídeo, sólida al bajar
  var top = document.querySelector(".top");
  if (top) {
    var onS = function () { top.classList.toggle("solid", window.scrollY > 40); };
    onS(); window.addEventListener("scroll", onS, { passive: true });
  }

  // Hero: tres columnas de vídeos reales que se van cambiando
  var hero = document.querySelector(".h3") || document.querySelector(".hero2");
  if (hero) {
    requestAnimationFrame(function () { setTimeout(function () { hero.classList.add("ready"); }, 120); });
    hero.querySelectorAll(".col").forEach(function (col, ci) {
      var vids = Array.prototype.slice.call(col.querySelectorAll("video")), tag = col.querySelector(".tag b"), i = 0;
      function load(v) { if (!v.src) v.src = v.dataset.src; }
      function play(v) { load(v); v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      if (window.innerWidth <= 760 && ci > 0) return;
      play(vids[0]);
      if (reduce || vids.length < 2) return;
      load(vids[1]);
      setInterval(function () {
        var cur = vids[i]; i = (i + 1) % vids.length; var nx = vids[i];
        play(nx); nx.classList.add("on"); cur.classList.remove("on");
        setTimeout(function () { cur.pause(); }, 1200);
        load(vids[(i + 1) % vids.length]);
        if (tag) tag.textContent = nx.dataset.tag || "";
      }, 5200 + ci * 900);
    });
  }

  // Aparición de imágenes de casos
  if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.querySelectorAll(".reveal").forEach(function (r, i) { setTimeout(function () { r.classList.add("in"); }, i * 160); }); ro.unobserve(x.target); } }); }, { threshold: .15 });
    document.querySelectorAll(".caso2").forEach(function (el) { ro.observe(el); });
    var no = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); no.unobserve(x.target); } }); }, { threshold: .25 });
    document.querySelectorAll(".nivel").forEach(function (el) { no.observe(el); });
  } else document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });

  // Colas: galería horizontal que avanza con el scroll
  function pinColas() {
    var sec = document.querySelector(".colas"); if (!sec) return;
    if (reduce || window.innerWidth < 900 || !window.gsap || !window.ScrollTrigger) { document.documentElement.classList.add("no-pin"); return; }
    gsap.registerPlugin(ScrollTrigger);
    var rail = sec.querySelector(".rail");
    var dist = function () { return Math.max(0, rail.scrollWidth - window.innerWidth + 40); };
    gsap.to(rail, { x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: sec.querySelector(".pin"), start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: .6, invalidateOnRefresh: true } });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === "complete") pinColas(); else window.addEventListener("load", pinColas);

  // Lista de tipos de evento con foto que sigue al ratón
  var tl = document.querySelector(".tipos2");
  if (tl && matchMedia("(hover:hover)").matches) {
    var pv = tl.querySelector(".pv"); if (!pv) return; var pimg = pv.querySelector("img");
    tl.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("mouseenter", function () { pimg.src = a.dataset.pv; pv.classList.add("on"); });
      a.addEventListener("mouseleave", function () { pv.classList.remove("on"); });
      a.addEventListener("mousemove", function (ev) { pv.style.left = (ev.clientX + 24) + "px"; pv.style.top = (ev.clientY - 180) + "px"; });
    });
  }

  // MADWALL renderizado: tu marca en los objetivos y partida de 10 segundos
  var wall = document.getElementById("cf-wall");
  if (wall) {
    var tgs = Array.prototype.slice.call(wall.querySelectorAll(".tg"));
    var inp = document.getElementById("cf-nombre"), file = document.getElementById("cf-logo"), res = document.getElementById("mw-res"), btn = document.getElementById("mw-play");
    var tEl = wall.querySelector("[data-t]"), sEl = wall.querySelector("[data-s]"), s2El = wall.querySelector("[data-s2]"), bar = wall.querySelector("[data-bar]");
    var logo = null, marca = "TU MARCA", playing = false, score = 0, end = 0, cur = -1, timers = [];
    var NS = "http://www.w3.org/2000/svg", BAR_Y = 206, BAR_H = 944;
    function etiqueta() { return marca.length > 9 ? marca.slice(0, 3) : marca; }
    function pinta() {
      tgs.forEach(function (g) {
        var lg = g.querySelector(".lg"); while (lg.firstChild) lg.removeChild(lg.firstChild);
        if (logo) { var im = document.createElementNS(NS, "image"); im.setAttribute("href", logo); im.setAttribute("x", -27); im.setAttribute("y", -27); im.setAttribute("width", 54); im.setAttribute("height", 54); im.setAttribute("preserveAspectRatio", "xMidYMid meet"); lg.appendChild(im); }
        else { var tx = document.createElementNS(NS, "text"); tx.setAttribute("y", 5); tx.setAttribute("text-anchor", "middle"); tx.textContent = etiqueta(); lg.appendChild(tx); }
      });
    }
    function setBar(f) { f = Math.max(0, Math.min(1, f)); bar.setAttribute("height", BAR_H * f); bar.setAttribute("y", BAR_Y + BAR_H * (1 - f)); }
    function apaga() { tgs.forEach(function (g) { g.classList.remove("on"); }); }
    function enciende(n) { apaga(); var used = {}; for (var k = 0; k < n; k++) { var i; do { i = Math.floor(Math.random() * tgs.length); } while (used[i]); used[i] = 1; tgs[i].classList.add("on"); cur = i; } }
    inp.addEventListener("input", function () { marca = (inp.value.trim() || "TU MARCA").toUpperCase(); if (!logo) pinta(); });
    document.querySelectorAll("#cf-sw button").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll("#cf-sw button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); wall.style.setProperty("--marca", b.dataset.c);
      });
    });
    file.addEventListener("change", function () { var f = file.files && file.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { logo = r.result; pinta(); }; r.readAsDataURL(f); });
    document.getElementById("cf-cta").addEventListener("click", function () { var c = document.querySelector("form[data-solicitud] [name=tipo][value='Marca o festival']"); if (c) c.checked = true; });
    // Modo escaparate: la pared se enciende sola mientras nadie juega
    var demoSecs = 30, demoPts = 0;
    timers.push(setInterval(function () { if (playing || reduce) return; enciende(1 + (Math.random() < .3 ? 1 : 0)); demoPts += Math.random() < .8 ? 1 : 0; sEl.textContent = String(demoPts).padStart(3, "0"); s2El.textContent = String(Math.floor(demoPts * .8)).padStart(3, "0"); }, 700));
    timers.push(setInterval(function () { if (playing) return; demoSecs = demoSecs <= 0 ? 30 : demoSecs - 1; if (demoSecs === 30) demoPts = 0; tEl.textContent = "00:" + String(demoSecs).padStart(2, "0"); setBar(demoSecs / 30); }, 1000));
    // Partida real
    var tick = null;
    function fin() {
      clearInterval(tick); playing = false; apaga();
      res.textContent = score >= 20 ? score + " aciertos. Eso es podio en cualquier evento." : score >= 12 ? score + " aciertos. Bien, pero en la cola siempre hay alguien más rápido." : score + " aciertos. La segunda siempre sale mejor.";
      btn.textContent = "Otra partida"; btn.disabled = false; ev("demo_jugar", { puntos: score });
    }
    btn.addEventListener("click", function () {
      playing = true; score = 0; end = Date.now() + 10000; sEl.textContent = "000"; s2El.textContent = "000"; res.textContent = ""; btn.textContent = "¡Toca las luces!"; btn.disabled = true;
      enciende(1);
      tick = setInterval(function () { var left = Math.max(0, end - Date.now()); tEl.textContent = "00:" + String(Math.ceil(left / 1000)).padStart(2, "0"); setBar(left / 10000); if (left <= 0) fin(); }, 100);
    });
    tgs.forEach(function (g, i) {
      g.addEventListener("pointerdown", function (e) {
        if (!playing || !g.classList.contains("on")) return;
        e.preventDefault(); score++; sEl.textContent = String(score).padStart(3, "0");
        g.classList.add("hit"); setTimeout(function () { g.classList.remove("hit"); }, 150); enciende(1);
      });
    });
    pinta();
  }
})();

/* ---------- v4 ---------- */
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ev = function (n, p) { if (window.mwEv) window.mwEv(n, p); };

  // Animaciones con scroll (escritorio)
  function scrollFx() {
    var big = window.innerWidth >= 900;
    var d0 = document.querySelector(".desde0");
    var lis = d0 ? Array.prototype.slice.call(d0.querySelectorAll(".pasos4 li")) : [];
    var ims = d0 ? Array.prototype.slice.call(d0.querySelectorAll(".pimg")) : [];
    var bar = d0 ? d0.querySelector(".d0-img") : null;
    function paso(n) { lis.forEach(function (l, i) { l.classList.toggle("on", i === n); }); ims.forEach(function (m, i) { m.classList.toggle("on", i <= n); }); if (bar) bar.style.setProperty("--p", n + 1); }
    if (lis.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) paso(+x.target.dataset.paso); }); }, { rootMargin: "-45% 0px -45% 0px" });
      lis.forEach(function (l) { io.observe(l); });
    } else ims.forEach(function (m) { m.classList.add("on"); });
    if (!window.gsap || !window.ScrollTrigger || reduce || !big) return;
    gsap.registerPlugin(ScrollTrigger);
    var hero = document.querySelector(".hero2");
    if (hero) {
      gsap.to(hero.querySelector(".copy"), { y: -140, opacity: .15, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .4 } });
      gsap.to(hero.querySelector(".tri"), { scale: 1.12, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .4 } });
    }
    document.querySelectorAll(".caso2 .media").forEach(function (m) {
      gsap.fromTo(m.children[1], { y: 80 }, { y: -40, ease: "none", scrollTrigger: { trigger: m, start: "top bottom", end: "bottom top", scrub: .4 } });
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === "complete") scrollFx(); else window.addEventListener("load", scrollFx);

  // MADWALL real: foto de la pared y objetivos encima, en perspectiva
  var box = document.getElementById("mw-real");
  if (!box) return;
  var cfg = JSON.parse(box.dataset.pared), foto = document.getElementById("mw-foto"), cara = document.getElementById("mw-cara");
  var U = 100, gap = cfg.gap, cols = [0, 1, 2, 2 + gap, 3 + gap, 4 + gap], rows = [];
  for (var r = 0; r <= cfg.filas; r++) rows.push(r);
  var W = (4 + gap) * U, Hh = cfg.filas * U, os = [];
  rows.forEach(function (rr) { cols.forEach(function (cc, ci) {
    var o = document.createElement("div"); o.className = "o"; o.style.left = cc * U + "px"; o.style.top = rr * U + "px";
    o.innerHTML = '<span class="d"></span><span class="t"></span>'; cara.appendChild(o); os.push(o);
  }); });

  function homog(src, dst) {
    var A = [], b = [], i;
    for (i = 0; i < 4; i++) { var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
    for (i = 0; i < 8; i++) { var m = i; for (var k = i + 1; k < 8; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
      var t = A[i]; A[i] = A[m]; A[m] = t; t = b[i]; b[i] = b[m]; b[m] = t;
      for (k = 0; k < 8; k++) { if (k === i) continue; var f = A[k][i] / A[i][i]; for (var c = i; c < 8; c++) A[k][c] -= f * A[i][c]; b[k] -= f * b[i]; } }
    return b.map(function (v, j) { return v / A[j][j]; });
  }
  function encaja() {
    var s = foto.clientWidth / cfg.w; if (!s) return;
    var d = cfg.esq.map(function (p) { return [p[0] * s, p[1] * s]; });
    var h = homog([[0, 0], [W, 0], [0, Hh], [W, Hh]], d);
    cara.style.transform = "matrix3d(" + [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1].join(",") + ")";
  }
  // Pinta la foto y tapa los dos objetivos que salían encendidos copiando un objetivo apagado de al lado
  var hn = homog([[0, 0], [W, 0], [0, Hh], [W, Hh]], cfg.esq);
  function pt(c, r) { var x = cols[c] * U, y = r * U, w = hn[6] * x + hn[7] * y + 1; return [(hn[0] * x + hn[1] * y + hn[2]) / w, (hn[3] * x + hn[4] * y + hn[5]) / w]; }
  var foto0 = new Image(); foto0.onload = function () {
    var ctx = foto.getContext("2d"); ctx.drawImage(foto0, 0, 0, cfg.w, cfg.h);
    cfg.tapar.forEach(function (p) {
      var c = p[0], r = p[1], src = [c, r > 0 ? r - 1 : r + 1], d = pt(c, r), s = pt(src[0], src[1]);
      var pitchD = Math.hypot(pt(c + (c < 5 ? 1 : -1), r)[0] - d[0], pt(c + (c < 5 ? 1 : -1), r)[1] - d[1]);
      var pitchS = Math.hypot(pt(c + (c < 5 ? 1 : -1), src[1])[0] - s[0], pt(c + (c < 5 ? 1 : -1), src[1])[1] - s[1]);
      var RS = pitchS * .74, RD = pitchD * .74;
      var off = document.createElement("canvas"); off.width = off.height = Math.ceil(RS * 2); var o = off.getContext("2d");
      o.drawImage(foto0, s[0] - RS, s[1] - RS, RS * 2, RS * 2, 0, 0, RS * 2, RS * 2);
      o.globalCompositeOperation = "destination-in";
      var g = o.createRadialGradient(RS, RS, RS * .84, RS, RS, RS); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = g; o.fillRect(0, 0, RS * 2, RS * 2);
      ctx.drawImage(off, d[0] - RD, d[1] - RD, RD * 2, RD * 2);
    });
    encaja();
  };
  foto0.src = cfg.img;
  window.addEventListener("resize", encaja);

  var inp = document.getElementById("cf-nombre"), file = document.getElementById("cf-logo"), res = document.getElementById("mw-res"), btn = document.getElementById("mw-play");
  var tEl = document.querySelector(".real-ui [data-t]"), sEl = document.querySelector(".real-ui [data-s]");
  var marca = "TU MARCA", logo = null, playing = false, score = 0, end = 0, tick = null;
  function pinta() { os.forEach(function (o) {
    var t = o.querySelector(".t"), im = o.querySelector("img");
    if (logo) { if (!im) { im = document.createElement("img"); im.alt = ""; o.appendChild(im); } im.src = logo; t.textContent = ""; }
    else { if (im) im.remove(); t.textContent = marca.length > 10 ? marca.slice(0, 3) : marca; }
  }); }
  function apaga() { os.forEach(function (o) { o.classList.remove("on"); }); }
  function enciende() { apaga(); var i = Math.floor(Math.random() * os.length); os[i].classList.add("on"); }
  inp.addEventListener("input", function () { marca = (inp.value.trim() || "TU MARCA").toUpperCase(); pinta(); });
  document.querySelectorAll("#cf-sw button").forEach(function (b) { b.addEventListener("click", function () {
    document.querySelectorAll("#cf-sw button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
    b.setAttribute("aria-pressed", "true"); box.style.setProperty("--marca", b.dataset.c);
  }); });
  file.addEventListener("change", function () { var f = file.files && file.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { logo = rd.result; pinta(); }; rd.readAsDataURL(f); });
  setInterval(function () { if (!playing && !reduce) enciende(); }, 900);
  function fin() {
    clearInterval(tick); playing = false; apaga();
    res.textContent = score >= 18 ? score + " aciertos. Con eso estarías arriba del ranking en casi cualquier evento." : score >= 10 ? score + " aciertos. Nada mal para ser la primera." : score + " aciertos. La segunda partida siempre sale mejor.";
    btn.textContent = "Jugar otra vez"; btn.disabled = false; ev("demo_jugar", { puntos: score });
  }
  btn.addEventListener("click", function () {
    playing = true; score = 0; sEl.textContent = "0"; res.textContent = ""; btn.disabled = true; btn.textContent = "Toca las luces"; end = Date.now() + 10000; enciende();
    tick = setInterval(function () { var left = Math.max(0, end - Date.now()); tEl.textContent = "00:" + String(Math.ceil(left / 1000)).padStart(2, "0"); if (left <= 0) fin(); }, 100);
  });
  os.forEach(function (o) { o.addEventListener("pointerdown", function (e) {
    if (!playing || !o.classList.contains("on")) return; e.preventDefault(); score++; sEl.textContent = String(score);
    o.classList.add("hit"); setTimeout(function () { o.classList.remove("hit"); }, 120); enciende();
  }); });
  pinta();
})();
