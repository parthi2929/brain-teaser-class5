/* Visual player. It draws the steps from js/steps.js, one step per Next. */
globalThis.Player = (() => {
  const make = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const money = globalThis.Steps.money;
  const COIN = { 200: "€2", 100: "€1", 50: "50c", 20: "20c", 10: "10c", 5: "5c", 1: "1c" };
  const coin = (u, cls) => make("span", "coin c" + u + (cls ? " " + cls : ""), COIN[u]);
  const value = (pile) => Object.entries(pile).reduce((s, [u, n]) => s + Number(u) * n, 0);
  const who = (w) => make("div", "pwho", `<span class="face">${w.face || ""}</span>${w.name}`);

  /* HTML steps: each returns one element for the step. */
  const HTML = {
    coins(step) {
      const view = make("div", "coinview");
      const purse = make("div", "purse");
      step.units.forEach((u) => {
        for (let k = 0; k < (step.purse[u] || 0); k++) purse.append(coin(u, step.swap === u ? "swap" : ""));
      });
      if (step.swap) purse.append(make("span", "note-in", "↻ change"));
      view.append(purse);
      view.append(make("div", "flow", step.give ? "↓ ↓ ↓" : ""));
      const piles = make("div", "piles");
      step.piles.forEach((p, k) => {
        const pl = make("div", "pile" + (step.hl ? " hl" : ""));
        const cs = make("div", "pcoins");
        step.units.forEach((u) => {
          for (let j = 0; j < (p[u] || 0); j++) cs.append(coin(u, step.give === u ? "new" : ""));
        });
        const v = value(p);
        pl.append(make("div", "pval", v && !step.hideValues ? money(v) : ""), cs, who(step.pile[k]));
        piles.append(pl);
      });
      view.append(piles);
      return view;
    },
    groups(step) {
      const view = make("div", "groupview");
      if (!step.grouped) {
        const all = make("div", "purse");
        for (let k = 0; k < step.coins; k++) all.append(coin(step.unit));
        view.append(all);
        return view;
      }
      for (let g = 0; g < step.count; g++) {
        const box = make("div", "grp");
        box.append(make("div", "gpic", `${step.item.pic}${step.noNumbers ? "" : `<small>${g + 1}</small>`}`));
        const cs = make("div", "pcoins");
        for (let k = 0; k < step.k; k++) cs.append(coin(step.unit));
        box.append(cs);
        box.style.animationDelay = g * 60 + "ms";
        view.append(box);
      }
      return view;
    },
    bar(step) {
      const view = make("div", "barview");
      const d = step.d;
      const top = make("div", "bartop");
      if (step.top) top.append(make("div", "span-all", `⟵ ${step.top} ⟶`));
      else if (step.bracket) {
        const sp = make("div", "span-part", `⟵ ${step.bracket} ⟶`);
        sp.style.marginLeft = (step.shaded / d) * 100 + "%";
        sp.style.width = ((d - step.shaded) / d) * 100 + "%";
        top.append(sp);
      }
      view.append(top);
      const barEl = make("div", "fbar");
      for (let k = 0; k < d; k++) barEl.append(make("div", "fpart" + (k < step.shaded ? " spent" : "")));
      view.append(barEl);
      const labs = make("div", "fbar labs");
      for (let k = 0; k < d; k++) labs.append(make("div", "flab", (step.labels && step.labels[k]) || ""));
      view.append(labs);
      if (step.shaded) {
        const key = make("div", "fkey");
        key.innerHTML = '<span class="sw spent"></span> spent &nbsp; <span class="sw"></span> left';
        view.append(key);
      }
      return view;
    },
    frame(step) {
      const f = make("iframe", "bagframe");
      f.src = step.src;
      f.title = "Packing into bags";
      return f;
    },
  };
  const NEXT_SVG = '<svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true"><path d="M3 14h24M18 4l10 10-10 10" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---- visual player: the same blocks move between steps ---- */
  const players = new Set();
  const STAGE_H = 430;
  /* opts.controlled: no top line and no arrows; the caller moves the picture with show(k). */
  function player(host, steps, onEnd, opts = {}) {
    const H = opts.height || STAGE_H;
    players.forEach((p) => p.host === host && players.delete(p));
    host.className = "vis";
    const uid = Math.random().toString(36).slice(2, 8);
    host.innerHTML = `<p class="eq"></p><p class="hint"></p><div class="stage"><div class="lvl" hidden><span></span></div><svg class="arc"></svg></div>
      <div class="tview" hidden></div>
      <div class="nav"><button class="prev" type="button" aria-label="Back">◀</button><button class="next" type="button" aria-label="Next">${NEXT_SVG}</button></div>`;
    const hint = host.querySelector(".hint"), eq = host.querySelector(".eq"), stage = host.querySelector(".stage"), lvl = host.querySelector(".lvl");
    stage.style.height = H + "px";
    host.querySelector(".tview").style.minHeight = H + "px";
    const arc = host.querySelector(".arc"), tview = host.querySelector(".tview"), prev = host.querySelector(".prev"), next = host.querySelector(".next");
    let i = 0, st = null, cur = null, held = -1;

    const build = (sc) => {
      stage.querySelectorAll(".blk,.rider").forEach((b) => b.remove());
      const mine = steps.filter((s) => s.sc === sc);
      let maxStack = 1, maxTowers = 1;
      mine.forEach((s) => {
        if (s.mode === "towers") {
          maxTowers = Math.max(maxTowers, s.towers.length);
          maxStack = Math.max(maxStack, ...s.towers.map((t) => t.length));
        }
      });
      if (mine.some((s) => s.interactive)) maxStack += 2;
      const rowRows = Math.ceil(sc.N / 10);
      const W = stage.clientWidth || 320;
      let s, base = H - 40, x0 = 0, laneH = 0, top = 0;
      if (sc.horiz) {
        /* Lanes: one row per frog. Names on the left, the jump goes to the right. */
        top = 36;
        laneH = Math.min(84, (H - top - 20) / maxTowers);
        x0 = 92;
        s = Math.min(26, laneH * 0.36, (W - x0 - 40) / (maxStack * 1.12), (W - 10) / 11.5, (H - 90) / (rowRows * 1.15));
      } else {
        if (sc.who) base = H - 92;
        const room = base - 40 - (sc.rider ? 34 : 0);
        s = Math.min(36, (W / maxTowers) * 0.6, (W - 10) / 11.5, room / (Math.max(maxStack, rowRows) * 1.15));
      }
      s = Math.max(5, Math.floor(s));
      const g = Math.max(1, Math.round(s * 0.14)), u = s + g;
      const blocks = Array.from({ length: sc.N }, () => {
        const b = make("div", "blk" + (sc.skin ? " skin-" + sc.skin : ""), sc.skin === "ball" ? "⚽" : "");
        b.style.width = b.style.height = s + "px";
        b.style.fontSize = s * 0.86 + "px";
        stage.append(b);
        return b;
      });
      const rs = Math.max(22, Math.min(40, s * 1.6));
      const riders = sc.rider
        ? Array.from({ length: maxTowers }, () => {
            const r = make("div", "rider", `<span>${sc.rider}</span>`);
            r.style.fontSize = rs + "px";
            stage.append(r);
            return r;
          })
        : [];
      st = { sc, blocks, riders, rs, W, s, g, u, base, maxStack, x0, laneH, top, horiz: !!sc.horiz };
    };

    const label = (cls, x, y, html, color) => {
      const e = make("div", cls, html);
      e.style.left = x + "px";
      e.style.top = y + "px";
      if (color) e.style.color = color;
      stage.append(e);
      return e;
    };

    const placeRider = (r, x, y) => {
      const moved = r.dataset.x !== String(Math.round(x));
      r.dataset.x = String(Math.round(x));
      r.style.opacity = "1";
      r.style.transform = `translate(${x}px, ${y}px)`;
      if (moved) {
        r.classList.remove("hop");
        void r.offsetWidth;
        r.classList.add("hop");
      }
    };

    const draw = (step, towers) => {
      const { blocks, riders, rs, W, s, u, base } = st;
      stage.querySelectorAll(".lab,.note,.who").forEach((e) => e.remove());
      const colors = step.colors || st.sc.colors;
      const unit = st.sc.unit || "";
      const pos = [];
      let line = step.line;
      riders.forEach((r) => (r.style.opacity = "0"));
      arc.innerHTML = "";
      if (step.mode === "towers") {
        const n = towers.length;
        const who = st.sc.who && st.sc.who.length === n ? st.sc.who : null;
        const tip = [];
        const lc = (ti) => (step.lcol ? `var(--c${step.lcol[ti] % 5})` : "");
        const count = (t, ti) => (step.labels ? String(step.labels[ti]) : t.length + unit);
        if (st.horiz) {
          towers.forEach((t, ti) => {
            const yc = st.top + st.laneH * ti + st.laneH / 2;
            const by = yc + 6;
            t.forEach((id, k) => (pos[id] = [st.x0 + k * u, by - (id === st.lifted ? s * 0.8 : 0)]));
            label("lab side", 4, yc - 22, who ? who[ti].name : "", lc(ti));
            label("lab side", 4, yc + 2, step.hideLabels ? "?" : count(t, ti), lc(ti));
            const endX = st.x0 + (step.hideBlocks ? 0 : t.length * u);
            tip[ti] = [endX + 4, by + s / 2];
            if (riders[ti]) placeRider(riders[ti], endX - rs * 0.55, by - rs * 0.95);
          });
        } else {
          const colW = W / n;
          towers.forEach((t, ti) => {
            const cx = colW * ti + colW / 2;
            t.forEach((id, k) => (pos[id] = [cx - s / 2, base - (k + 1) * u - (id === st.lifted ? s * 0.6 : 0)]));
            if (t.length || step.labels) label("lab", cx, base + 4, step.hideLabels ? "?" : count(t, ti), lc(ti));
            if (who) label("who", cx, base + 34, `<span class="face">${who[ti].face || ""}</span>${who[ti].name}`, lc(ti));
            const topY = base - t.length * u;
            tip[ti] = [cx, topY - 6 - (riders[ti] ? rs : 0)];
            if (riders[ti]) placeRider(riders[ti], cx - rs * 0.5, topY - rs * 1.05);
          });
        }
        (step.notes || []).forEach((nt) => {
          const [x, y] = tip[nt.t];
          label("note" + (nt.red ? " red" : ""), x, y - 28, nt.text);
        });
        if (step.interactive) {
          /* Equation: the live counts. Arrow: from the longest end to the shortest end. */
          const lens = towers.map((t) => t.length);
          const level = lens.every((v) => v === lens[0]);
          const counts = lens.map((v, k) => `<b style="color:var(--c${k % 5})">${v}</b>`).join(" &nbsp; ");
          stage.classList.toggle("done", level);
          if (level) {
            line = lens[0];
            eq.innerHTML = `${counts} &nbsp;✓ average = <b>${lens[0]}${unit}</b>`;
            hint.textContent = step.doneHint || "All the same now. This is the average.";
          } else {
            eq.innerHTML = `${counts} &nbsp;→ ${st.horiz ? "same jump" : "same height"}?`;
            hint.textContent = step.moveHint || "Average = fair share. Move blocks until all are the same.";
            const hi = lens.indexOf(Math.max(...lens)), lo = lens.indexOf(Math.min(...lens));
            const [x1, y1] = tip[hi], [x2, y2] = tip[lo];
            const c = st.horiz
              ? `${Math.min(W - 6, Math.max(x1, x2) + 70)} ${(y1 + y2) / 2}`
              : `${(x1 + x2) / 2} ${Math.max(14, Math.min(y1, y2) - 50)}`;
            arc.innerHTML = `<defs><marker id="ah${uid}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
              <path d="M${x1} ${y1} Q${c} ${x2} ${y2}" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 5" marker-end="url(#ah${uid})"/>`;
          }
        }
      } else {
        const per = 10, rows = Math.ceil(step.order.length / per), x0 = (W - per * u) / 2;
        step.order.forEach((id, j) => (pos[id] = [x0 + (j % per) * u, base - (rows - Math.floor(j / per)) * u]));
        label("lab", W / 2, base + 4, step.hideLabels ? "?" : String(step.rowLabel));
        (step.notes || []).forEach((nt) => label("note" + (nt.red ? " red" : ""), W / 2, base - rows * u - 34, nt.text));
      }
      const delayStep = step.stagger ? Math.min(40, 1400 / blocks.length) : 0;
      blocks.forEach((b, id) => {
        const p = pos[id] || [0, 0];
        b.style.transitionDelay = delayStep ? Math.round(id * delayStep) + "ms" : "0ms";
        b.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
        b.style.setProperty("--bc", colors[id]);
        b.style.opacity = step.hideBlocks ? "0" : "1";
        b.classList.toggle("lift", id === st.lifted);
      });
      lvl.hidden = line == null;
      if (line != null) {
        if (st.horiz && step.mode === "towers") {
          lvl.className = "lvl v";
          lvl.style.cssText = `left:${st.x0 + line * u - st.g / 2}px; top:${st.top - 8}px; height:${st.laneH * towers.length}px`;
        } else {
          lvl.className = "lvl";
          lvl.style.cssText = `top:${base - line * u - st.g / 2 - 1}px`;
        }
        lvl.firstChild.textContent = step.hideLabels ? "?" : line + unit;
      }
    };

    const drawTable = (step) => {
      const { tb } = step;
      const all = [...tb.home, ...tb.away];
      const mx = Math.max(...all), mn = Math.min(...all);
      const grid = make("div", "tgrid" + (step.her ? " her" : "") + (step.shoot ? " shoot" : ""));
      grid.append(make("div"));
      for (let c = 1; c <= 4; c++) grid.append(make("div", "ch", "Game " + c));
      [["home", "🏠 home"], ["away", "🚌 away"]].forEach(([key, name], r) => {
        grid.append(make("div", "rh", name));
        tb[key].forEach((v, c) => {
          const cell = make("div", "cell");
          cell.append(make("span", "gno", "game " + (r * 4 + c + 1)), make("div", "v", String(v)));
          /* A goal with one ball in the net per goal scored. */
          const goal = make("div", "goal");
          for (let k = 0; k < v; k++) {
            const ball = make("span", "fb", "⚽");
            ball.style.animationDelay = (r * 4 + c) * 120 + k * 110 + "ms";
            goal.append(ball);
          }
          cell.append(goal);
          const hit = (step.hl === "max" && v === mx) || (step.hl === "min" && v === mn) || step.hl === key;
          if (hit) cell.classList.add("hl");
          else if (step.hl) cell.classList.add("dim");
          if (step.hl === "max" && v === mx) cell.append(make("span", "tag", "most ↑"));
          if (step.hl === "min" && v === mn) cell.append(make("span", "tag", "least ↑"));
          grid.append(cell);
        });
      });
      if (step.her) {
        grid.append(make("div"));
        tb.home.forEach((h, c) => grid.append(make("div", "hersum", `${h + tb.away[c]} ✗`)));
      }
      tview.replaceChildren(grid);
    };

    const show = (n, animate = true) => {
      i = n;
      const step = steps[i];
      eq.innerHTML = step.eq;
      hint.textContent = step.hint || "";
      arc.innerHTML = "";
      prev.style.visibility = i > 0 ? "visible" : "hidden";
      next.disabled = i === steps.length - 1 && !onEnd;
      stage.classList.remove("done");
      held = -1;
      if (st) st.lifted = -1;
  if (step.mode === "table" || HTML[step.mode]) {
        stage.hidden = true;
        tview.hidden = false;
        if (step.mode === "table") drawTable(step);
        else tview.replaceChildren(HTML[step.mode](step));
        return;
      }
      tview.hidden = true;
      stage.hidden = false;
      const fresh = !st || st.sc !== step.sc;
      if (fresh) build(step.sc);
      st.lifted = -1;
      cur = step.mode === "towers" ? step.towers.map((t) => t.slice()) : null;
      if (fresh || !animate) {
        stage.classList.add("still");
        const first = steps.find((s) => s.sc === step.sc);
        if (fresh && animate && first !== step) draw(first, first.towers);
        else draw(step, cur);
        void stage.offsetWidth;
        stage.classList.remove("still");
        if (fresh && animate && first !== step) requestAnimationFrame(() => draw(step, cur));
      } else draw(step, cur);
    };

    stage.addEventListener("click", (e) => {
      const step = steps[i];
      if (!step.interactive || !cur) return;
      const r = stage.getBoundingClientRect();
      const f = st.horiz ? (e.clientY - r.top - st.top) / (st.laneH * cur.length) : (e.clientX - r.left) / r.width;
      const ti = Math.min(cur.length - 1, Math.max(0, Math.floor(f * cur.length)));
      if (held < 0) {
        if (!cur[ti].length) return;
        held = ti;
        st.lifted = cur[ti][cur[ti].length - 1];
      } else if (ti === held) {
        held = -1;
        st.lifted = -1;
      } else {
        if (cur[ti].length < st.maxStack) cur[ti].push(cur[held].pop());
        held = -1;
        st.lifted = -1;
      }
      draw(step, cur);
    });
    /* On the levelling step, Next moves one block from the tallest tower to the shortest. */
    const moveOne = () => {
      const lens = cur.map((t) => t.length);
      if (lens.every((v) => v === lens[0])) return false;
      const hi = lens.indexOf(Math.max(...lens)), lo = lens.indexOf(Math.min(...lens));
      cur[lo].push(cur[hi].pop());
      held = -1;
      st.lifted = -1;
      draw(steps[i], cur);
      return true;
    };
    next.addEventListener("click", () => {
      if (steps[i].interactive && cur && moveOne()) return;
      if (i < steps.length - 1) show(i + 1);
      else if (onEnd) onEnd();
    });
    prev.addEventListener("click", () => i > 0 && show(i - 1));
    if (opts.controlled) {
      host.classList.add("controlled");
      host.querySelector(".nav").hidden = true;
    }
    const p = { host, show: (k) => { if (k !== undefined && k !== i && steps[k]) show(k); }, redraw: () => { if (host.offsetParent && (steps[i].mode === "towers" || steps[i].mode === "row")) { st = null; show(i, false); } } };
    players.add(p);
    show(0);
    return p;
  }
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => players.forEach((p) => p.redraw()), 150); });
  return { play: player };
})();
