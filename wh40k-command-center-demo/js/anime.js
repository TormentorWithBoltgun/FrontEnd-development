/* Cogitator star map */
(function () {
    const { animate, createTimeline, stagger, svg, utils } = anime;

    const NS = "http://www.w3.org/2000/svg";
    const W = 1000, H = 700, CX = 500, CY = 350;
    const COLORS = { CRITICAL: "#d33b3b", WARNING: "#d6a93a", SECURE: "#55a84f" };

    // x / y are the only things that really live here. Threat, forces and
    // status get overwritten with whatever is in Vue's planeetat (see init),
    // so Vue stays the single source of truth. The numbers below are just fallbacks.
    const WORLDS = [
        { id: "Terra",      x: 500, y: 360, type: "Throneworld",  sektori: "Sol",       uhka: 15, joukot: 50000, viholliset: 3200,  status: "SECURE" },
        { id: "Cadia",      x: 250, y: 200, type: "Fortress World", sektori: "Eye of Terror", uhka: 82, joukot: 8421, viholliset: 14283, status: "CRITICAL" },
        { id: "Armageddon", x: 760, y: 250, type: "Hive World",   sektori: "Armageddon", uhka: 67, joukot: 12500, viholliset: 18300, status: "WARNING" },
        { id: "Mars",       x: 410, y: 440, type: "Forge World",  sektori: "Sol",       uhka: 8,  joukot: 9000,  viholliset: 120,   status: "SECURE" },
        { id: "Macragge",   x: 830, y: 520, type: "Capital World", sektori: "Ultima Segmentum", uhka: 34, joukot: 6400, viholliset: 5200, status: "SECURE" },
        { id: "Fenris",     x: 620, y: 120, type: "Death World",  sektori: "Segmentum Solar", uhka: 51, joukot: 2100, viholliset: 3900, status: "WARNING" },
        { id: "Baal",       x: 290, y: 570, type: "Chapter Homeworld", sektori: "Segmentum Solar", uhka: 74, joukot: 1800, viholliset: 9800, status: "CRITICAL" }
    ];

    // Warp routes between worlds, by id. Add a pair and a new curved line shows up
    // on the map (both ids have to exist in WORLDS though!)
    const ROUTES = [
        ["Terra", "Mars"], ["Terra", "Cadia"], ["Terra", "Armageddon"],
        ["Terra", "Fenris"], ["Terra", "Baal"], ["Armageddon", "Macragge"],
        ["Terra", "Macragge"], ["Cadia", "Fenris"]
    ];

    const el = (tag, attrs, parent) => {
        const n = document.createElementNS(NS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    // not a straight line: the control point is pushed sideways from the midpoint,
    // so every route gets a gentle curve
    const routePath = (a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const cx = (a.x + b.x) / 2 - dy * 0.15, cy = (a.y + b.y) / 2 + dx * 0.15;
        return `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
    };

    // Everything that belongs to the currently open map lives in S.
    // null = map is closed. Vue throws the DOM away on every tab switch,
    // so each time we come back we build everything from scratch (init / destroy).
    let S = null;

    function init(root, opts = {}) {
        // always clean up first, otherwise old loops and window listeners pile up every time the tab is re-opened
        destroy();
        if (!root) return;

        const anims = [], cleanups = [];
        const track = a => (anims.push(a), a);

        // static positions + live Vue data merged together
        const worlds = WORLDS.map(w => {
            const v = (opts.planets || []).find(p => p.nimi === w.id);
            return v
                ? { ...w, sektori: v.sektori, uhka: v.uhka, joukot: v.joukot, viholliset: v.viholliset, status: v.status }
                : { ...w };
        });
        const byId = Object.fromEntries(worlds.map(w => [w.id, w]));

        /* ---------- build SVG ---------- */
        root.innerHTML = "";
        const s = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" });
        root.appendChild(s);
        // everything is drawn inside this one group. Pan and zoom only change its
        // transform, so nothing else has to be moved around
        const world = el("g", {}, s);

        for (let i = 0; i < 220; i++) {
            el("circle", { cx: rnd(-500, 1500), cy: rnd(-350, 1050), r: rnd(0.4, 1.4), class: "m-star" }, world);
        }

        const grid = el("g", { class: "m-grid" }, world);
        for (let r = 100; r <= 600; r += 100) el("circle", { cx: CX, cy: CY, r }, grid);
        for (let a = 0; a < 360; a += 30) {
            const rad = a * Math.PI / 180;
            el("line", { x1: CX, y1: CY, x2: CX + Math.cos(rad) * 650, y2: CY + Math.sin(rad) * 650 }, grid);
        }

        // Eye of Terror
        const eye = el("g", { class: "m-eye" }, world);
        [[70, 40], [50, 28], [30, 16]].forEach(([rx, ry]) => el("ellipse", { cx: 170, cy: 140, rx, ry }, eye));
        el("text", { x: 170, y: 205, class: "m-label m-eye-label", "text-anchor": "middle" }, world).textContent = "EYE OF TERROR";

        // Warp routes
        const routeEls = ROUTES.map(([a, b]) =>
            el("path", { d: routePath(byId[a], byId[b]), class: "m-route" }, world));

        // Radar sweep (the rotation pivot is set in CSS, see .m-sweep, not here)
        const sweep = el("g", { class: "m-sweep" }, world);
        el("polygon", { points: `${CX},${CY} ${CX + 700},${CY - 170} ${CX + 700},${CY}`, class: "m-wedge" }, sweep);
        el("line", { x1: CX, y1: CY, x2: CX + 700, y2: CY, class: "m-beam" }, sweep);

        // Fleet markers
        const fleets = [1, 2, 5].map(i => {
            const f = el("polygon", { points: "7,0 -5,4.5 -5,-4.5", class: "m-fleet" }, world);
            return { f, path: routeEls[i] };
        });

        // Worlds
        worlds.forEach(w => {
            const color = COLORS[w.status] || "#c9a94b";
            const big = w.type === "Throneworld";
            const g = el("g", { class: "m-node", "data-id": w.id }, world);
            w.node = g;
            el("circle", { cx: w.x, cy: w.y, r: big ? 11 : 8, class: "m-ring", stroke: color }, g);
            el("circle", { cx: w.x, cy: w.y, r: big ? 6.5 : 4.5, class: "m-core", fill: color }, g);
            el("text", { x: w.x + 14, y: w.y + 4, class: "m-label" }, g).textContent = w.id.toUpperCase();
            el("circle", { cx: w.x, cy: w.y, r: 22, fill: "transparent" }, g);
            g.addEventListener("click", () => {
                // a drag ends with a click event too. Without this check, panning the map
                // would select whatever planet you happened to let go over
                if (S && S.dragMoved) return;
                select(w.id, { fly: true });
                opts.onSelect && opts.onSelect(w.id);
            });
        });

        // Reticle
        const reticle = el("g", { class: "m-reticle" }, world);
        const dash = el("circle", { cx: 0, cy: 0, r: 19, class: "m-reticle-ring" }, reticle);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) =>
            el("path", { d: `M${sx * 28} ${sy * 15} V${sy * 28} H${sx * 15}`, class: "m-bracket" }, reticle));

        /* ---------- ambient loops ---------- */
        // stars twinkle forever. duration / delay are functions, so every star gets
        // its own random timing (looks way less robotic than one shared value)
        track(animate(s.querySelectorAll(".m-star"), {
            opacity: [0.15, 0.9],
            duration: () => rnd(1500, 4000),
            delay: () => rnd(0, 2000),
            alternate: true, loop: true, ease: "inOutSine"
        }));
        track(animate(sweep, { rotate: 360, duration: 9000, ease: "linear", loop: true }));
        track(animate(eye, { rotate: -360, duration: 40000, ease: "linear", loop: true }));
        track(animate(dash, { rotate: 360, duration: 6000, ease: "linear", loop: true }));
        track(animate(s.querySelectorAll(".m-ring"), {
            scale: [0.5, 2.6], opacity: [0.8, 0],
            duration: 2200, delay: stagger(280), loop: true, ease: "outQuad"
        }));
        // little ships gliding along the route paths (motion path helper from anime v4)
        fleets.forEach(({ f, path }, i) => {
            const mp = svg.createMotionPath(path);
            track(animate(f, {
                translateX: mp.translateX, translateY: mp.translateY, rotate: mp.rotate,
                duration: 6000 + i * 1800, delay: i * 900, loop: true, ease: "linear"
            }));
        });

        /* ---------- intro ---------- */
        // intro: grid fades in, routes draw themselves, then the planets pop in.
        // the last number in each .add() is the start time in ms, easy to tweak
        const tl = createTimeline({ defaults: { ease: "outQuad" } });
        tl.add(grid, { opacity: [0, 1], duration: 800 }, 0)
          .add(svg.createDrawable(routeEls), { draw: ["0 0", "0 1"], duration: 1200, delay: stagger(140) }, 300)
          .add(s.querySelectorAll(".m-node"), { opacity: [0, 1], duration: 500, delay: stagger(110) }, 600)
          .add(s.querySelectorAll(".m-core"), { scale: [0, 1], duration: 600, delay: stagger(110) }, 600);
        track(tl);

        /* ---------- pan / zoom ---------- */
        const view = { x: 0, y: 0, k: 1 };
        let viewAnim = null, drag = null;
        const apply = () => world.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.k})`);
        const unit = () => W / s.getBoundingClientRect().width;
        const toSvg = e => {
            const r = s.getBoundingClientRect();
            return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
        };
        // zoom towards the cursor, not the centre: the point under the mouse has to stay put,
        // that's what the k2 / view.k ratio is for
        const zoomAt = (px, py, factor) => {
            const k2 = Math.min(4, Math.max(0.6, view.k * factor));
            view.x = px - (px - view.x) * (k2 / view.k);
            view.y = py - (py - view.y) * (k2 / view.k);
            view.k = k2;
            apply();
        };
        // glide the camera to a planet. We animate the view object itself and re-apply the
        // transform on every frame. If the user grabs the map mid-flight, pointerdown cancels it
        const flyTo = (x, y, k) => {
            if (viewAnim) viewAnim.cancel();
            viewAnim = animate(view, { x: CX - x * k, y: CY - y * k, k, duration: 900, ease: "inOutCubic", onUpdate: apply });
        };

        s.addEventListener("pointerdown", e => {
            if (e.button !== 0) return;
            if (viewAnim) viewAnim.cancel();
            drag = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y, moved: false };
            s.classList.add("grabbing");
        });
        const onMove = e => {
            if (!drag) return;
            const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
            if (Math.hypot(dx, dy) > 4) drag.moved = true;
            view.x = drag.x + dx * unit();
            view.y = drag.y + dy * unit();
            apply();
        };
        const onUp = () => {
            if (!drag) return;
            S.dragMoved = drag.moved;
            drag = null;
            s.classList.remove("grabbing");
            // the click event fires right after pointerup, so the flag is reset one tick later, not now
            setTimeout(() => { if (S) S.dragMoved = false; }, 0);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        cleanups.push(() => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        });
        s.addEventListener("wheel", e => {
            e.preventDefault();
            const p = toSvg(e);
            zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
        }, { passive: false });

        /* ---------- controls + readout ---------- */
        // leftover from before the Vue tactical panel. #map-readout isn't in the HTML anymore,
        // so renderReadout() just returns early. Safe to delete later
        const readout = document.getElementById("map-readout");
        const scope = root.parentElement;
        scope.querySelectorAll("[data-map]").forEach(btn => {
            btn.onclick = () => {
                const a = btn.dataset.map;
                if (a === "in") zoomAt(CX, CY, 1.3);
                if (a === "out") zoomAt(CX, CY, 1 / 1.3);
                if (a === "reset") flyTo(CX, CY, 1);
                if (a === "scan") scan();
            };
        });

        function ping(w) {
            if (!S) return;
            const p = el("circle", { cx: w.x, cy: w.y, r: 6, class: "m-ping" }, world);
            animate(p, { scale: [1, 9], opacity: [0.9, 0], duration: 1000, ease: "outQuad", onComplete: () => p.remove() });
        }
        function scan() {
            worlds.forEach((w, i) => setTimeout(() => ping(w), i * 160));
        }
        function renderReadout(w) {
            if (!readout) return;
            const cls = w.status.toLowerCase();
            readout.innerHTML =
                `<h2>${w.id.toUpperCase()}</h2>` +
                `<span class="label">CLASS</span><strong>${w.type}</strong>` +
                `<span class="label">SECTOR</span><strong>${w.sektori}</strong>` +
                `<span class="label">STATUS</span><strong class="${cls}">${w.status}</strong>` +
                `<span class="label">THREAT LEVEL <b id="r-t">0</b>%</span>` +
                `<div class="progress"><div id="r-bar" class="progress-bar danger" style="width:0"></div></div>` +
                `<span class="label" style="margin-top:16px">IMPERIAL FORCES</span><strong id="r-f">0</strong>` +
                `<span class="label">ENEMY FORCES</span><strong id="r-e">0</strong>`;
            const o = { t: 0, f: 0, e: 0 };
            const fmt = n => Math.round(n).toLocaleString("en-US");
            animate(o, {
                t: w.uhka, f: w.joukot, e: w.viholliset, duration: 900, ease: "outExpo",
                onUpdate: () => {
                    const t = document.getElementById("r-t");
                    if (!t) return;
                    t.textContent = Math.round(o.t);
                    document.getElementById("r-f").textContent = fmt(o.f);
                    document.getElementById("r-e").textContent = fmt(o.e);
                }
            });
            animate("#r-bar", { width: ["0%", w.uhka + "%"], duration: 900, ease: "outExpo" });
        }

        function select(id, { fly = false, force = false } = {}) {
            const w = byId[id];
            if (!w || !S) return;
            // don't re-select the same planet. This also stops the Vue <-> map ping-pong
            // (map click -> Vue watcher -> select -> ...)
            if (S.selected === id && !force) return;
            S.selected = id;
            worlds.forEach(o => o.node.classList.toggle("selected", o.id === id));
            if (S.reticleReady) {
                animate(reticle, { translateX: w.x, translateY: w.y, duration: 700, ease: "outExpo" });
            } else {
                // first time: just drop the reticle in place, otherwise it would fly in from the corner
                utils.set(reticle, { translateX: w.x, translateY: w.y });
                S.reticleReady = true;
            }
            ping(w);
            renderReadout(w);
            if (fly) flyTo(w.x, w.y, 1.8);
        }

        // called from Vue's deep watcher whenever planet stats change,
        // so the dot colours follow CRITICAL / WARNING / SECURE live
        function update(planets) {
            planets.forEach(p => {
                const w = byId[p.nimi];
                if (!w) return;
                Object.assign(w, { uhka: p.uhka, joukot: p.joukot, viholliset: p.viholliset, status: p.status });
                const c = COLORS[w.status] || "#c9a94b";
                w.node.querySelector(".m-core").setAttribute("fill", c);
                w.node.querySelector(".m-ring").setAttribute("stroke", c);
            });
        }

        // orbital strike effect: three red shockwave rings + a quick screen shake
        function strike(id) {
            const w = byId[id];
            if (!w || !S) return;
            for (let i = 0; i < 3; i++) {
                const r = el("circle", { cx: w.x, cy: w.y, r: 6, class: "m-ping m-strike" }, world);
                animate(r, { scale: [1, 14], opacity: [1, 0], duration: 1100, delay: i * 180, ease: "outQuad", onComplete: () => r.remove() });
            }
            animate(s, { translateX: [{ to: -6 }, { to: 6 }, { to: -4 }, { to: 4 }, { to: 0 }], duration: 450, ease: "linear" });
        }

        S = { anims, cleanups, select, update, strike, selected: null, dragMoved: false, reticleReady: false };
        select(opts.selected || "Terra", { force: true });
    }

    function select(id) {
        if (S) S.select(id, { fly: true });
    }

    // stop all loops and remove the window listeners. The SVG itself disappears
    // when Vue's v-if removes the section
    function destroy() {
        if (!S) return;
        S.anims.forEach(a => { try { a.cancel(); } catch (e) {} });
        S.cleanups.forEach(fn => fn());
        S = null;
    }

    // small public API, this is what vue.js talks to
    window.GalacticMap = {
        init, select, destroy,
        update(planets) { if (S) S.update(planets); },
        strike(id) { if (S) S.strike(id); }
    };
})();



/* 
VIGIL BREAK (lofi scene) 
*/

/*      "Vigil Break": lo-fi WH40K scene     */
(function () {
    const { animate, stagger } = anime;
    const rnd = (a, b) => a + Math.random() * (b - a);
    // SVG shapes rotate / scale around the top-left corner by default.
    // fill-box + center makes them spin around their own middle instead
    const FIT = "transform-box:fill-box;transform-origin:center";

    // the whole scene is one SVG string. Anything animated has an lf- class so the JS below can grab it
    const MARKUP = `
<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="lf-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1233"/><stop offset="1" stop-color="#6b3040"/></linearGradient>
  <radialGradient id="lf-glow"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  <radialGradient id="lf-vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></radialGradient>
  <clipPath id="lf-winclip"><path d="M70 290 V130 Q70 40 190 40 Q310 40 310 130 V290 Z"/></clipPath>
  <clipPath id="lf-scrclip"><rect x="72" y="306" width="106" height="62"/></clipPath>
</defs>

<rect width="800" height="500" fill="#16120d"/>

<!-- window -->
<g clip-path="url(#lf-winclip)">
  <rect x="60" y="30" width="260" height="270" fill="url(#lf-sky)"/>
  <g id="lf-stars"></g>
  <circle class="lf-astro" cx="255" cy="95" r="34" fill="url(#lf-glow)" style="${FIT}"/>
  <circle cx="255" cy="95" r="2.5" fill="#fff6d8"/>
  <g id="lf-far"></g><g id="lf-near"></g><g id="lf-rain"></g>
  <rect class="lf-flash" x="60" y="30" width="260" height="270" fill="#cfe0ff" opacity="0"/>
</g>
<path d="M70 290 V130 Q70 40 190 40 Q310 40 310 130 V290 Z" fill="none" stroke="#3a2d20" stroke-width="9"/>
<path d="M190 42 V290 M70 170 H310" stroke="#2b2118" stroke-width="5"/>
<rect x="56" y="288" width="268" height="12" fill="#3a2d20"/>

<!-- banner -->
<g class="lf-banner" style="transform-box:view-box;transform-origin:420px 44px">
  <rect x="378" y="38" width="84" height="6" fill="#6b5326"/>
  <path d="M385 44 H455 V200 L420 224 L385 200 Z" fill="#7a1d1d" stroke="#c9a94b" stroke-width="3"/>
  <circle cx="420" cy="108" r="14" fill="none" stroke="#c9a94b" stroke-width="3"/>
  <path d="M392 100 Q405 90 408 108 M448 100 Q435 90 432 108 M420 122 V170" stroke="#c9a94b" stroke-width="3" fill="none"/>
</g>

<!-- character (coordinates are absolute on purpose: the rotate pivots further down use the same ones) -->
<g class="lf-char">
  <rect x="690" y="240" width="22" height="170" rx="8" fill="#1c1510"/>
  <rect x="655" y="265" width="40" height="95" rx="8" fill="#1d3873"/>
  <circle cx="675" cy="285" r="5" fill="#0d1a38"/><circle cx="675" cy="305" r="5" fill="#0d1a38"/>
  <rect x="598" y="255" width="82" height="140" rx="24" fill="#2c4f9e"/>
  <rect x="612" y="232" width="18" height="26" fill="#c79a7a"/>
  <g class="lf-head" style="transform-box:view-box;transform-origin:621px 240px">
    <circle cx="618" cy="212" r="26" fill="#c79a7a"/>
    <path d="M592 208 Q594 182 620 184 Q646 188 644 216 L638 200 Q620 192 600 204 Z" fill="#19130e"/>
    <path d="M600 205 L608 222" stroke="#8a5a4a" stroke-width="1.5"/>
    <circle class="lf-blink" cx="604" cy="212" r="2.2" fill="#1a1410" style="${FIT}"/>
    <path d="M594 212 Q612 164 646 212" stroke="#1a1a1a" stroke-width="6" fill="none"/>
    <circle cx="622" cy="218" r="13" fill="#141414" stroke="#c9a94b" stroke-width="2"/>
    <circle class="lf-led" cx="622" cy="218" r="3" fill="#ff4a3a"/>
  </g>
  <circle cx="630" cy="272" r="34" fill="#3560bd" stroke="#c9a94b" stroke-width="3"/>
  <path d="M608 262 Q630 244 652 262" stroke="#c9a94b" stroke-width="2" fill="none"/>
  <path d="M626 282 L590 336" stroke="#2c4f9e" stroke-width="20" stroke-linecap="round"/>
  <g class="lf-forearm" style="transform-box:view-box;transform-origin:590px 336px">
    <path d="M590 336 L545 372" stroke="#2c4f9e" stroke-width="18" stroke-linecap="round"/>
    <path d="M562 358 L570 366" stroke="#c9a94b" stroke-width="4"/>
    <circle cx="542" cy="374" r="9" fill="#c79a7a"/>
    <path d="M542 374 L520 340" stroke="#e8dcc0" stroke-width="2"/>
    <path d="M520 340 Q505 330 512 312 Q528 322 520 340 Z" fill="#e8dcc0"/>
  </g>
</g>

<!-- desk -->
<rect y="388" width="800" height="14" fill="#4a3522"/>
<rect y="402" width="800" height="98" fill="#241a10"/>
<rect y="388" width="800" height="2" fill="#6b4e30"/>

<!-- cogitator -->
<rect x="64" y="298" width="122" height="78" rx="6" fill="#2a2a26" stroke="#4a4a40" stroke-width="3"/>
<rect x="72" y="306" width="106" height="62" fill="#04140a"/>
<g clip-path="url(#lf-scrclip)"><g id="lf-lines"></g></g>
<rect class="lf-scrglow" x="72" y="306" width="106" height="62" fill="#3cff7a" opacity=".08"/>
<rect x="110" y="376" width="30" height="12" fill="#2a2a26"/><rect x="94" y="384" width="62" height="6" fill="#2a2a26"/>
<circle cx="178" cy="372" r="2" fill="#c9a94b"/>

<!-- books, candle, mug, scroll -->
<rect x="208" y="368" width="84" height="20" fill="#5a1f1f"/><rect x="214" y="350" width="74" height="18" fill="#1f3a5a"/><rect x="220" y="334" width="62" height="16" fill="#3a3a1f"/>
<path d="M208 378 H292 M214 359 H288 M220 342 H282" stroke="#c9a94b" stroke-width="1.5" opacity=".6"/>
<rect x="322" y="352" width="16" height="36" fill="#d9cdb0"/>
<g transform="translate(330 352)"><path class="lf-flame" d="M0 0 Q-7 -12 0 -28 Q7 -12 0 0 Z" fill="#ffd27a" style="transform-box:fill-box;transform-origin:50% 100%"/></g>
<rect x="438" y="362" width="30" height="26" rx="4" fill="#d8d2c4"/>
<path d="M468 368 Q482 372 468 382" fill="none" stroke="#d8d2c4" stroke-width="4"/>
<circle cx="453" cy="375" r="4" fill="#c9a94b"/>
<path class="lf-steam" d="M446 358 q-5 -8 0 -16 q5 -8 0 -16" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/>
<path class="lf-steam" d="M453 358 q-5 -8 0 -16 q5 -8 0 -16" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/>
<path class="lf-steam" d="M460 358 q-5 -8 0 -16 q5 -8 0 -16" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/>
<rect x="488" y="384" width="92" height="5" rx="2" fill="#d8c9a3"/><circle cx="586" cy="386" r="4" fill="#8c2727"/>

<!-- servo-skull -->
<g transform="translate(730 150)"><g class="lf-skull" style="${FIT}">
  <polygon points="-4,18 -34,125 26,125 4,18" fill="url(#lf-glow)" opacity=".5"/>
  <circle r="16" fill="#d9d2bf"/><rect x="-9" y="10" width="18" height="9" rx="2" fill="#c9c1ac"/>
  <circle cx="-6" cy="-2" r="4" fill="#111"/><circle cx="6" cy="-2" r="4" fill="#111"/>
  <circle class="lf-eye" cx="-6" cy="-2" r="1.8" fill="#ff4a3a"/><circle class="lf-eye" cx="6" cy="-2" r="1.8" fill="#ff4a3a"/>
  <path d="M-16 -4 Q-30 -14 -34 -2 M16 -4 Q30 -14 34 -2" stroke="#8a7a50" stroke-width="3" fill="none"/>
</g></g>

<g id="lf-dust"></g>
<circle class="lf-glow" cx="330" cy="344" r="120" fill="url(#lf-glow)" style="${FIT}"/>
<rect width="800" height="500" fill="url(#lf-vig)" pointer-events="none"/>
</svg>`;

    // builds a random city skyline out of rects. "lit" adds tiny windows that blink
    function skyline(color, minH, maxH, step, lit) {
        let out = "", x = 60;
        while (x < 320) {
            const w = rnd(step * 0.7, step * 1.2), h = rnd(minH, maxH), y = 300 - h;
            out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
            if (Math.random() < 0.5) out += `<polygon points="${x + w * 0.2},${y} ${x + w * 0.5},${y - rnd(20, 45)} ${x + w * 0.8},${y}" fill="${color}"/>`;
            if (lit) for (let k = 0; k < 3; k++) if (Math.random() < 0.6)
                out += `<rect class="lf-win" x="${x + rnd(3, w - 6)}" y="${y + rnd(6, h - 10)}" width="3" height="4" fill="#ffcf6b"/>`;
            x += w + rnd(0, 3);
        }
        return out;
    }

    let S = null;
    let audio = null;

    function init(root) {
        destroy();
        if (!root) return;

        const anims = [], timers = [];
        let alive = true, live = [];
        const track = a => (anims.push(a), a);
        const $ = s => root.querySelector(s);
        const $$ = s => root.querySelectorAll(s);

        root.innerHTML = MARKUP;

        // procedural parts
        let h = "";
        for (let i = 0; i < 30; i++) h += `<circle class="lf-star" cx="${rnd(70, 310)}" cy="${rnd(40, 180)}" r="${rnd(0.5, 1.4)}" fill="#fff"/>`;
        $("#lf-stars").innerHTML = h;
        $("#lf-far").innerHTML = skyline("#2c2040", 70, 170, 26, false);
        $("#lf-near").innerHTML = skyline("#120e18", 40, 120, 22, true);
        h = "";
        for (let i = 0; i < 55; i++) { const x = rnd(60, 330), y = rnd(30, 280); h += `<line class="lf-drop" x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 14}" stroke="#aabfff" stroke-opacity=".5"/>`; }
        $("#lf-rain").innerHTML = h;
        h = "";
        const W = [70, 48, 60, 30, 82, 40, 54, 66];
        for (let i = 0; i < 24; i++) h += `<rect x="78" y="${306 + i * 8}" width="${W[i % 8]}" height="3" fill="#3cff7a" opacity=".75"/>`;
        $("#lf-lines").innerHTML = h;
        h = "";
        for (let i = 0; i < 18; i++) h += `<circle class="lf-mote" cx="${rnd(250, 540)}" cy="${rnd(260, 380)}" r="${rnd(1, 1.8)}" fill="#ffd9a0" opacity="0"/>`;
        $("#lf-dust").innerHTML = h;

        // ambient loops
        track(animate($$(".lf-star"), { opacity: [0.2, 1], duration: () => rnd(1200, 3500), delay: () => rnd(0, 2000), alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($$(".lf-win"), { opacity: [0.15, 1], duration: () => rnd(1500, 4000), delay: () => rnd(0, 3000), alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($$(".lf-drop"), { translateY: [-20, 320], translateX: [0, -18], duration: () => rnd(500, 900), delay: () => rnd(0, 900), loop: true, ease: "linear" }));
        track(animate($(".lf-astro"), { scale: [1, 1.25], opacity: [0.7, 1], duration: 3000, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($(".lf-banner"), { rotate: [-1.8, 1.8], duration: 4200, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($("#lf-lines"), { translateY: [0, -64], duration: 6000, loop: true, ease: "linear" }));
        track(animate($(".lf-scrglow"), { opacity: [0.05, 0.14], duration: 2200, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($$(".lf-steam"), { translateY: [0, -22], translateX: [-2, 3], opacity: [0.6, 0], duration: 2600, delay: stagger(500), loop: true, ease: "outSine" }));
        track(animate($(".lf-head"), { rotate: [-2.5, 3], duration: 1700, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($(".lf-char"), { translateY: [0, 1.6], duration: 3200, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($(".lf-forearm"), { rotate: [-4, 5], duration: 650, alternate: true, loop: true, ease: "inOutQuad" }));
        track(animate($(".lf-blink"), { scaleY: [1, 0.1, 1], duration: 220, loop: true, loopDelay: 3800 }));
        track(animate($(".lf-led"), { opacity: [0.3, 1], duration: 900, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($(".lf-skull"), { translateY: [-8, 8], rotate: [-4, 4], duration: 2600, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($$(".lf-eye"), { opacity: [0.4, 1], duration: 1100, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate($$(".lf-mote"), {
            translateY: () => -rnd(30, 70), translateX: () => rnd(-20, 20), opacity: [0, 0.8],
            duration: () => rnd(4000, 8000), delay: () => rnd(0, 4000), alternate: true, loop: true, ease: "inOutSine"
        }));

        // candle: a looping animation would flicker too evenly, so every flick picks
        // new random values and schedules the next one when it finishes
        const flame = $(".lf-flame"), glow = $(".lf-glow");
        const flick = () => {
            if (!alive) return;
            live = [
                animate(flame, { scaleY: rnd(0.8, 1.25), scaleX: rnd(0.85, 1.15), rotate: rnd(-5, 5), duration: rnd(70, 170), ease: "inOutSine" }),
                animate(glow, { opacity: rnd(0.6, 0.95), scale: rnd(0.96, 1.06), duration: rnd(90, 200), ease: "inOutSine", onComplete: flick })
            ];
        };
        flick();

        // distant lightning every 7-14 s. setTimeout instead of loop so the gaps are random too
        const flashEl = $(".lf-flash");
        const flash = () => {
            if (!alive) return;
            track(animate(flashEl, { opacity: [{ to: 0.7, duration: 60 }, { to: 0, duration: 90 }, { to: 0.5, duration: 50 }, { to: 0, duration: 400 }] }));
            timers.push(setTimeout(flash, rnd(7000, 14000)));
        };
        timers.push(setTimeout(flash, 4000));

        S = {
            stop() {
                alive = false;
                timers.forEach(clearTimeout);
                [...anims, ...live].forEach(a => { try { a.cancel(); } catch (e) {} });
            }
        };
    }

    function destroy() {
        setSound(false);
        if (S) { S.stop(); S = null; }
    }

    /* ---------- ambience: rain + slow chord pad (Am, F, C, G) ---------- */
    // Browsers block audio until the user clicks something, which is why sound starts off
    // and is toggled from the button. All generated with Web Audio, no sound files.
    function setSound(on) {
        if (!on) {
            if (!audio) return;
            const a = audio; audio = null;
            clearInterval(a.timer);
            a.master.gain.setTargetAtTime(0, a.ctx.currentTime, 0.3);
            setTimeout(() => a.ctx.close(), 1200);
            return;
        }
        if (audio) return;
        // Safari still wants the webkit prefix
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = 0;
        master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 2);
        master.connect(ctx.destination);

        // rain = 2 seconds of white noise on repeat, filtered so it sounds like rain and not TV static
        const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buf; noise.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 400;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
        const rg = ctx.createGain(); rg.gain.value = 0.12;
        noise.connect(hp); hp.connect(lp); lp.connect(rg); rg.connect(master);
        noise.start();

        const chords = [[110, 164.8, 220, 261.6], [87.3, 130.8, 174.6, 220], [130.8, 196, 261.6, 329.6], [98, 146.8, 196, 246.9]];
        const padGain = ctx.createGain(); padGain.gain.value = 0.05;
        const padLp = ctx.createBiquadFilter(); padLp.type = "lowpass"; padLp.frequency.value = 700;
        padGain.connect(padLp); padLp.connect(master);
        const oscs = chords[0].map((f, i) => {
            const o = ctx.createOscillator();
            o.type = i % 2 ? "triangle" : "sine";
            o.frequency.value = f;
            o.connect(padGain); o.start();
            return o;
        });
        let step = 0;
        const timer = setInterval(() => {
            step = (step + 1) % 4;
            oscs.forEach((o, i) => o.frequency.setTargetAtTime(chords[step][i], ctx.currentTime, 0.8));
        }, 8000);
        audio = { ctx, master, timer };
    }

    window.LofiScene = { init, destroy, setSound };
})();

/*
   PLANET ART (procedural planet pictures, used by v-planet-art)
*/

(function () {
    const { animate, stagger } = anime;

    const STYLES = {
        Terra:      { base: ["#6a7a8f", "#1b2230"], atmo: "#9ab6ff", blobs: [{ c: "#46604a", n: 6, s: [14, 34] }], lights: { n: 70, c: "#ffd27a" }, clouds: { n: 8 }, moons: 1 },
        Cadia:      { base: ["#8a5540", "#241512"], atmo: "#d06a5a", blobs: [{ c: "#3a1f18", n: 9, s: [10, 28] }], cracks: "#ff5a2a", haze: "#8a3cd0", moons: 0 },
        Armageddon: { base: ["#c27a35", "#2a160a"], atmo: "#f0b060", blobs: [{ c: "#5a3a1a", n: 8, s: [12, 30] }], lights: { n: 80, c: "#ffb347" }, clouds: { n: 10, c: "#6b5a4a", o: 0.35 }, moons: 0 },
        Mars:       { base: ["#c4502c", "#2a0f0a"], atmo: "#e8806a", blobs: [{ c: "#7a2a18", n: 8, s: [10, 30] }], lights: { n: 30, c: "#ffb347" }, moons: 2 },
        Macragge:   { base: ["#4a9ccc", "#0e2a44"], atmo: "#9ad8ff", blobs: [{ c: "#4f8a4a", n: 6, s: [16, 36] }], clouds: { n: 9 }, caps: true, moons: 1 },
        Fenris:     { base: ["#d8ecf8", "#4a6a88"], atmo: "#d0ecff", blobs: [{ c: "#9fbdd2", n: 8, s: [12, 30] }], caps: true, clouds: { n: 6 }, moons: 0 },
        Baal:       { base: ["#d04a2e", "#3a0f0a"], atmo: "#ff8a5a", blobs: [{ c: "#e8944a", n: 10, s: [12, 30] }], moons: 2 }
    };

    // remembers what is running inside each planet picture, so we can cancel it before redrawing
    const active = new WeakMap();
    let uid = 0;

    // seeded random: the same planet name always gives the same look,
    // so Cadia is always Cadia and not a new roll on every click
    const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const mulberry = a => () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    function clear(el) {
        const list = active.get(el);
        if (list) { list.forEach(a => { try { a.cancel(); } catch (e) {} }); active.delete(el); }
        el.innerHTML = "";
    }

    function render(el, name) {
        if (!el) return;
        clear(el);
        const st = STYLES[name] || STYLES.Terra;
        const u = ++uid;
        const rand = mulberry(hash(name || "x"));
        const r = (a, b) => a + rand() * (b - a);
        // the surface is drawn twice side by side. Scrolling by exactly one tile width loops seamlessly
        const tile = s => [0, 200].map(o => `<g transform="translate(${o} 0)">${s}</g>`).join("");

        // surface features (x within 0..200 so the texture can loop)
        let feat = "";
        (st.blobs || []).forEach(b => {
            for (let i = 0; i < b.n; i++) {
                const rx = r(b.s[0], b.s[1]);
                feat += `<ellipse cx="${r(0, 200)}" cy="${r(35, 165)}" rx="${rx}" ry="${rx * r(0.35, 0.7)}" fill="${b.c}" opacity=".85"/>`;
            }
        });
        if (st.cracks) for (let i = 0; i < 7; i++) {
            let x = r(0, 200), y = r(45, 155), d = `M${x} ${y}`;
            for (let k = 0; k < 5; k++) { x += r(-18, 18); y += r(-14, 14); d += ` L${x} ${y}`; }
            feat += `<path d="${d}" stroke="${st.cracks}" stroke-width="1.4" fill="none" opacity=".9"/>`;
        }
        if (st.caps) feat += `<ellipse cx="100" cy="36" rx="130" ry="14" fill="#fff" opacity=".85"/><ellipse cx="100" cy="166" rx="130" ry="13" fill="#fff" opacity=".8"/>`;
        if (st.lights) for (let i = 0; i < st.lights.n; i++)
            feat += `<circle class="pa-light" cx="${r(0, 200)}" cy="${r(45, 155)}" r="1.1" fill="${st.lights.c}"/>`;

        let clouds = "";
        if (st.clouds) for (let i = 0; i < st.clouds.n; i++)
            clouds += `<ellipse cx="${r(0, 200)}" cy="${r(40, 160)}" rx="${r(14, 30)}" ry="${r(2.5, 5)}" fill="${st.clouds.c || "#fff"}" opacity="${st.clouds.o || 0.25}"/>`;

        let stars = "";
        for (let i = 0; i < 16; i++) stars += `<circle class="pa-star" cx="${r(0, 200)}" cy="${r(0, 200)}" r="${r(0.4, 1.1)}" fill="#fff"/>`;

        let moons = "";
        for (let i = 0; i < st.moons; i++) moons += `<circle class="pa-moon" r="${i ? 4 : 6}" fill="#cfcfcf"/>`;

        el.innerHTML = `
<svg viewBox="0 0 200 200">
<defs>
  <radialGradient id="pb${u}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${st.base[0]}"/><stop offset="1" stop-color="${st.base[1]}"/></radialGradient>
  <radialGradient id="pa${u}"><stop offset="0" stop-color="${st.atmo}" stop-opacity="0"/><stop offset=".82" stop-color="${st.atmo}" stop-opacity="0"/><stop offset=".9" stop-color="${st.atmo}" stop-opacity=".55"/><stop offset="1" stop-color="${st.atmo}" stop-opacity="0"/></radialGradient>
  <radialGradient id="ps${u}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".88"/></radialGradient>
  <radialGradient id="ph${u}"><stop offset="0" stop-color="${st.haze || "#000"}" stop-opacity=".55"/><stop offset="1" stop-color="${st.haze || "#000"}" stop-opacity="0"/></radialGradient>
  <clipPath id="pc${u}"><circle cx="100" cy="100" r="60"/></clipPath>
</defs>
${stars}
<circle class="pa-atmo" cx="100" cy="100" r="72" fill="url(#pa${u})"/>
<g clip-path="url(#pc${u})">
  <circle cx="100" cy="100" r="60" fill="url(#pb${u})"/>
  <g class="pa-tex">${tile(feat)}</g>
  ${clouds ? `<g class="pa-cl">${tile(clouds)}</g>` : ""}
  ${st.haze ? `<circle class="pa-haze" cx="135" cy="70" r="60" fill="url(#ph${u})"/>` : ""}
  <circle cx="100" cy="100" r="60" fill="url(#ps${u})"/>
</g>
${moons}
</svg>`;

        const list = [];
        const track = a => (list.push(a), a);
        const q = s => el.querySelector(s), qa = s => el.querySelectorAll(s);

        track(animate(q(".pa-tex"), { translateX: [0, -200], duration: 45000, loop: true, ease: "linear" }));
        if (q(".pa-cl")) track(animate(q(".pa-cl"), { translateX: [0, -200], duration: 28000, loop: true, ease: "linear" }));
        track(animate(q(".pa-atmo"), { opacity: [0.7, 1], duration: 3000, alternate: true, loop: true, ease: "inOutSine" }));
        if (q(".pa-haze")) track(animate(q(".pa-haze"), { opacity: [0.5, 1], duration: 2400, alternate: true, loop: true, ease: "inOutSine" }));
        track(animate(qa(".pa-star"), { opacity: [0.2, 1], duration: () => 1200 + rand() * 2500, delay: () => rand() * 2000, alternate: true, loop: true, ease: "inOutSine" }));
        if (qa(".pa-light").length) track(animate(qa(".pa-light"), { opacity: [0.2, 1], duration: () => 800 + rand() * 2200, delay: () => rand() * 2000, alternate: true, loop: true, ease: "inOutSine" }));

        qa(".pa-moon").forEach((m, i) => {
            const o = { a: rand() * Math.PI * 2 };
            const start = o.a;
            const place = () => {
                const x = 100 + Math.cos(o.a) * 92, y = 100 + Math.sin(o.a) * 16 - 6;
                m.setAttribute("cx", x);
                m.setAttribute("cy", y);
                // hide while passing behind the planet
                m.setAttribute("opacity", Math.sin(o.a) < 0 && Math.abs(x - 100) < 60 ? 0 : 1);
            };
            place();
            track(animate(o, { a: start + Math.PI * 2, duration: 14000 + i * 7000, loop: true, ease: "linear", onUpdate: place }));
        });

        active.set(el, list);
    }

    window.PlanetArt = { render, clear };
})();