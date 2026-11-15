/* Speedtest Popup Card for Home Assistant — v1.1.0
   Runs a speed test (ping, jitter, download, upload) in the browser of whoever is looking at the
   dashboard, against Cloudflare's public speed test endpoints, inside a popup styled like the dashboard.
   Optionally stores the result in Home Assistant helpers. With `chart: true` the popup gets a button that
   swaps the gauge for a chart of download and upload speed over time. MIT licence. */
const RST_I18N = {
  en: { title: 'Speed test', sub: 'Measures this device\'s connection: ping, jitter, download and upload', last: 'Last test', close: 'Close', ready: 'Ready', start: 'Start test', again: 'Run again', running: 'Testing…', hint: 'The test runs on this device and takes about {s} seconds.', pinging: 'Measuring ping', download: 'Download', upload: 'Upload', done: 'Done', failed: 'Test failed', failMsg: 'The test could not be completed: ', server: 'Cloudflare server', measuring: 'measuring this device\'s connection', saved: 'Result saved to Home Assistant', savedLocal: 'Result saved in this browser', errDown: 'the server refused the download', errUp: 'the server refused the upload', cancelled: 'cancelled', chart: 'Chart', gauge: 'Gauge', secs: 'seconds' },
  pt: { title: 'Teste de velocidade', sub: 'Mede a ligação deste dispositivo: ping, jitter, download e upload', last: 'Último teste', close: 'Fechar', ready: 'Pronto', start: 'Iniciar teste', again: 'Repetir teste', running: 'A testar…', hint: 'O teste corre neste dispositivo e demora cerca de {s} segundos.', pinging: 'A medir o ping', download: 'Download', upload: 'Upload', done: 'Concluído', failed: 'O teste falhou', failMsg: 'Não foi possível completar o teste: ', server: 'Servidor Cloudflare', measuring: 'a medir a ligação deste dispositivo', saved: 'Resultado guardado no Home Assistant', savedLocal: 'Resultado guardado neste browser', errDown: 'o servidor recusou o download', errUp: 'o servidor recusou o upload', cancelled: 'cancelado', chart: 'Gráfico', gauge: 'Velocímetro', secs: 'segundos' },
};
const RST_STORE = 'speedtest-popup-card:last';
const RST_BASE = 'https://speed.cloudflare.com';
const RST_SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

class SpeedtestPopupCard extends HTMLElement {
  setConfig(c) {
    this._c = Object.assign({ duration: 10, max: 1000, language: 'auto', chart: false, entities: {} }, c || {});
    this._c.entities = this._c.entities || {};
    this._dur = Math.max(4, Math.min(30, Number(this._c.duration) || 10)) * 1000;
    this._max = Math.max(100, Math.min(10000, Number(this._c.max) || 1000));
  }
  getCardSize() { return 1; }
  static getStubConfig() { return { duration: 10 }; }
  _lang() {
    const l = this._c.language && this._c.language !== 'auto' ? this._c.language : (this._hass && this._hass.language) || 'en';
    return String(l).toLowerCase().startsWith('pt') ? 'pt' : 'en';
  }

  set hass(h) {
    this._hass = h;
    if (!this._built) this._build();
    this._showLast();
  }

  _build() {
    this._built = true;
    const T = this._t = RST_I18N[this._lang()];
    const title = this._c.title || T.title;
    const secs = Math.round((this._dur * 2) / 1000 + 5);
    const mid = Number((Math.sqrt(this._max + 1) - 1).toPrecision(1));
    const r = this.attachShadow({ mode: 'open' });
    r.innerHTML = `
<style>
  :host { display:block; }
  .launch { display:flex; align-items:center; gap:16px; padding:14px 18px; border-radius:16px; cursor:pointer;
    background:linear-gradient(90deg, rgba(0,229,255,.18), rgba(0,229,255,.04)); border:1px solid rgba(0,229,255,.5); }
  .launch ha-icon { color:#00e5ff; --mdc-icon-size:36px; filter:drop-shadow(0 0 6px #00e5ff); }
  .launch b { font-size:18px; } .launch small { display:block; font-size:12px; color:rgba(190,210,230,.75); margin-top:2px; }
  .launch .last { margin-left:auto; text-align:right; font:12px ui-monospace,Consolas,monospace; color:rgba(190,210,230,.8); }
  .back { position:fixed; inset:0; z-index:9; background:rgba(0,0,0,.78); display:flex; align-items:center; justify-content:center; }
  .back[hidden] { display:none; }
  .modal { width:min(760px, 94vw); max-height:92vh; overflow:auto; border-radius:20px; padding:22px 24px 20px; color:#e6f1ff;
    background:linear-gradient(160deg, rgba(16,24,40,.98), rgba(6,10,19,.98)); border:1px solid rgba(0,229,255,.35);
    box-shadow:0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05); }
  .top { display:flex; justify-content:space-between; align-items:center; font:600 12px ui-monospace,Consolas,monospace;
    letter-spacing:.2em; color:#7fe9ff; text-transform:uppercase; }
  .acts { display:flex; gap:8px; align-items:center; }
  .sw { cursor:pointer; color:#7fe9ff; border:1px solid rgba(0,229,255,.45); border-radius:10px; padding:6px 12px; letter-spacing:.08em; }
  .sw[hidden], .gauge[hidden], .chart[hidden] { display:none; }
  .chart { width:520px; max-width:100%; margin:14px auto 0; }
  .chart svg { width:100%; display:block; }
  .chart text { font:8px ui-monospace,Consolas,monospace; fill:rgba(160,190,220,.7); }
  .x { cursor:pointer; color:#fff; background:#e53935; border-radius:10px; padding:7px 12px; letter-spacing:.08em; }
  .gauge { position:relative; width:320px; max-width:80vw; margin:14px auto 0; }
  .gauge svg { width:100%; display:block; }
  .num { position:absolute; left:0; right:0; top:46%; text-align:center; }
  .num b { font:700 54px 'Segoe UI',Roboto,sans-serif; line-height:1; }
  .num span { display:block; font:12px ui-monospace,Consolas,monospace; letter-spacing:.2em; color:rgba(160,190,220,.7); margin-top:6px; text-transform:uppercase; }
  .phase { text-align:center; font:600 13px ui-monospace,Consolas,monospace; letter-spacing:.18em; text-transform:uppercase; min-height:18px; margin:2px 0 14px; }
  .tiles { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; }
  .t { background:rgba(255,255,255,.03); border:1px solid rgba(0,229,255,.16); border-radius:14px; padding:12px; text-align:left; }
  .t.on { border-color:#00e5ff; box-shadow:0 0 16px rgba(0,229,255,.3); }
  .t label { font:600 10px ui-monospace,Consolas,monospace; letter-spacing:.16em; color:rgba(190,210,230,.65); text-transform:uppercase; }
  .t div { font:700 24px 'Segoe UI',Roboto,sans-serif; margin-top:6px; } .t i { font:11px ui-monospace,monospace; font-style:normal; color:rgba(160,190,220,.6); }
  .go { display:block; margin:18px auto 6px; padding:12px 34px; font:700 15px 'Segoe UI',Roboto,sans-serif; letter-spacing:.08em; color:#04121a;
    background:#00e5ff; border:none; border-radius:999px; cursor:pointer; box-shadow:0 0 22px rgba(0,229,255,.55); }
  .go[disabled] { opacity:.45; cursor:default; box-shadow:none; }
  .foot { text-align:center; font:11px ui-monospace,Consolas,monospace; color:rgba(160,190,220,.55); letter-spacing:.06em; line-height:1.6; }
  @media (max-width:600px) { .tiles { grid-template-columns:repeat(2, 1fr); } .num b { font-size:42px; } }
</style>
<ha-card class="launch" id="open">
  <ha-icon icon="mdi:speedometer"></ha-icon>
  <div><b>${title}</b><small>${T.sub}</small></div>
  <div class="last" id="last"></div>
</ha-card>
<div class="back" id="back" hidden>
  <div class="modal">
    <div class="top"><span>// ${title}</span><span class="acts"><span class="sw" id="swap" hidden></span><span class="x" id="close">✕ ${T.close}</span></span></div>
    <div class="gauge" id="gauge">
      <svg viewBox="0 0 200 120">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12" stroke-linecap="round"/>
        <path id="arc" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#00e5ff" stroke-width="12" stroke-linecap="round"
              stroke-dasharray="251.3" stroke-dashoffset="251.3" style="transition:stroke-dashoffset .25s linear, stroke .3s; filter:drop-shadow(0 0 6px #00e5ff)"/>
        <text x="20" y="116" fill="rgba(160,190,220,.6)" font-size="7" text-anchor="middle">0</text>
        <text x="100" y="12" fill="rgba(160,190,220,.6)" font-size="7" text-anchor="middle">${mid}</text>
        <text x="180" y="116" fill="rgba(160,190,220,.6)" font-size="7" text-anchor="middle">${this._max}</text>
      </svg>
      <div class="num"><b id="big">—</b><span id="unit">Mbit/s</span></div>
    </div>
    <div class="chart" id="chart" hidden>
      <svg viewBox="0 0 320 150">
        <g id="c-grid"></g>
        <polyline id="c-down" fill="none" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 3px #00e5ff)"/>
        <polyline id="c-up" fill="none" stroke="#ffc400" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 3px #ffc400)"/>
        <text x="34" y="9" style="fill:#00e5ff">↓ Download</text>
        <text x="98" y="9" style="fill:#ffc400">↑ Upload</text>
        <text x="312" y="9" text-anchor="end">Mbit/s</text>
      </svg>
    </div>
    <div class="phase" id="phase">${T.ready}</div>
    <div class="tiles">
      <div class="t" id="t-ping"><label>Ping</label><div id="v-ping">—</div><i>ms</i></div>
      <div class="t" id="t-jit"><label>Jitter</label><div id="v-jit">—</div><i>ms</i></div>
      <div class="t" id="t-down"><label>Download</label><div id="v-down">—</div><i>Mbit/s</i></div>
      <div class="t" id="t-up"><label>Upload</label><div id="v-up">—</div><i>Mbit/s</i></div>
    </div>
    <button class="go" id="go">${T.start}</button>
    <div class="foot" id="foot">${T.hint.replace('{s}', secs)}</div>
  </div>
</div>`;
    this.$ = (id) => r.getElementById(id);
    this.$('open').addEventListener('click', () => { this.$('back').hidden = false; });
    this.$('close').addEventListener('click', () => this._close());
    this.$('back').addEventListener('click', (e) => { if (e.target === this.$('back')) this._close(); });
    this.$('go').addEventListener('click', () => this._run());
    this._sm = { d: [], u: [] };
    if (this._c.chart) {
      this.$('swap').hidden = false;
      this.$('swap').addEventListener('click', () => this._panel(this.$('chart').hidden ? 'chart' : 'gauge'));
      this._panel('gauge');
    }
  }

  _panel(p) {
    const chart = p === 'chart';
    this.$('chart').hidden = !chart; this.$('gauge').hidden = chart;
    this.$('swap').textContent = '⇄ ' + (chart ? this._t.gauge : this._t.chart);
    if (chart) this._draw();
  }

  _sample(k, t, v) {
    this._sm[k].push([t, v]);
    if (this._c.chart && !this.$('chart').hidden) this._draw();
  }

  _draw() {
    const X0 = 34, X1 = 312, Y0 = 18, Y1 = 128, dur = this._dur / 1000, S = this._sm;
    let max = 10; S.d.concat(S.u).forEach((q) => { if (q[1] > max) max = q[1]; });
    const mag = Math.pow(10, Math.floor(Math.log10(max))); const top = [1, 1.5, 2, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((m) => m >= max);
    const x = (t) => X0 + (X1 - X0) * Math.min(1, t / dur), y = (v) => Y1 - (Y1 - Y0) * (v / top);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = top * i / 4, yy = y(v);
      g += '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + yy + '" y2="' + yy + '" stroke="rgba(255,255,255,' + (i ? '.07' : '.2') + ')" stroke-width="1"/>';
      g += '<text x="' + (X0 - 5) + '" y="' + (yy + 3) + '" text-anchor="end">' + (v >= 10 || v === 0 ? Math.round(v) : v.toFixed(1)) + '</text>';
    }
    [0, 0.5, 1].forEach((f) => { g += '<text x="' + (X0 + (X1 - X0) * f) + '" y="' + (Y1 + 12) + '" text-anchor="' + (f === 0 ? 'start' : f === 1 ? 'end' : 'middle') + '">' + (f === 0.5 ? (dur / 2) + ' ' + this._t.secs : Math.round(dur * f) + ' s') + '</text>'; });
    this.$('c-grid').innerHTML = g;
    const pts = (a) => a.map((q) => x(q[0]).toFixed(1) + ',' + y(q[1]).toFixed(1)).join(' ');
    this.$('c-down').setAttribute('points', pts(S.d));
    this.$('c-up').setAttribute('points', pts(S.u));
  }

  _close() {
    this._cancel = true;
    if (this._ctrl) this._ctrl.abort();
    this.$('back').hidden = true;
  }

  _num(id) {
    const s = id && this._hass.states[id];
    const v = s ? parseFloat(s.state) : NaN;
    return isNaN(v) ? null : { v, when: new Date(s.last_changed) };
  }

  _showLast() {
    const E = this._c.entities, T = this._t;
    let d = this._num(E.download), u = this._num(E.upload), p = this._num(E.ping), when = d && d.when;
    if (!E.download) {
      try { const o = JSON.parse(localStorage.getItem(RST_STORE) || 'null'); if (o) { d = { v: o.down }; u = { v: o.up }; p = { v: o.ping }; when = new Date(o.ts); } } catch (e) { /* no stored result */ }
    }
    if (!d || !(d.v > 0) || !when) { this.$('last').textContent = ''; return; }
    const loc = this._lang() === 'pt' ? 'pt-PT' : undefined;
    const dd = when.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' }) + ' ' + when.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    this.$('last').innerHTML = T.last + ' · ' + dd + '<br>↓ ' + Math.round(d.v) + ' · ↑ ' + (u ? Math.round(u.v) : '—') + ' Mbit/s · ' + (p ? Math.round(p.v) : '—') + ' ms';
  }

  _gauge(v, color) {
    const frac = Math.max(0, Math.min(1, Math.log10(1 + v) / Math.log10(this._max + 1)));
    const arc = this.$('arc');
    arc.setAttribute('stroke-dashoffset', String(251.3 * (1 - frac)));
    if (color) { arc.setAttribute('stroke', color); arc.style.filter = 'drop-shadow(0 0 6px ' + color + ')'; }
    this.$('big').textContent = v >= 100 ? Math.round(v) : v.toFixed(1);
    this.$('big').style.color = color || '#fff';
  }

  _phase(txt, tile, color) {
    this.$('phase').textContent = txt;
    this.$('phase').style.color = color || '#7fe9ff';
    ['t-ping', 't-jit', 't-down', 't-up'].forEach((t) => this.$(t).classList.toggle('on', t === tile));
  }

  async _ping() {
    const t = [];
    for (let i = 0; i < 18 && !this._cancel; i++) {
      const s = performance.now();
      const pr = await fetch(RST_BASE + '/__down?bytes=0&r=' + Math.random(), { cache: 'no-store', signal: this._ctrl.signal });
      await pr.arrayBuffer();
      t.push(performance.now() - s);
      await RST_SLEEP(60);
      if (i >= 2) { this.$('v-ping').textContent = Math.round(Math.min(...t.slice(2))); this.$('big').textContent = Math.round(t[i]); }
    }
    const v = t.slice(2);
    const ping = Math.min(...v);
    const df = []; for (let i = 1; i < v.length; i++) df.push(Math.abs(v[i] - v[i - 1]));
    df.sort((x, y) => x - y);
    return { ping, jitter: df.length ? df[Math.floor(df.length / 2)] : 0 };
  }

  async _download(dur) {
    const sizes = [1e6, 5e6, 10e6, 25e6, 50e6]; let bytes = 0, mark = null, idx = 1, cap = sizes.length - 1; const t0 = performance.now();
    const ctrl = new AbortController(); this._dl = ctrl;
    const worker = async () => {
      while (performance.now() - t0 < dur && !this._cancel) {
        const mine = idx, s = performance.now();
        try {
          const r = await fetch(RST_BASE + '/__down?bytes=' + sizes[mine] + '&r=' + Math.random(), { cache: 'no-store', signal: ctrl.signal });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const rd = r.body.getReader();
          for (;;) { const x = await rd.read(); if (x.done) break; bytes += x.value.length; }
          if (performance.now() - s < 350 && mine === idx && idx < cap) idx++;
        } catch (e) { if (ctrl.signal.aborted) return; cap = Math.max(0, mine - 1); if (idx > cap) idx = cap; await RST_SLEEP(300); }
      }
    };
    let lastB = 0, lastT = t0, ema = 0;
    const tick = setInterval(() => {
      const now = performance.now(); const inst = (bytes - lastB) * 8 / 1e6 / ((now - lastT) / 1000);
      lastB = bytes; lastT = now; ema = ema ? ema * 0.6 + inst * 0.4 : inst;
      if (!mark && now - t0 >= 1500) mark = { b: bytes, t: now };
      this._gauge(ema, '#00e5ff'); this.$('v-down').textContent = Math.round(ema); this._sample('d', (now - t0) / 1000, ema);
    }, 250);
    const stop = setTimeout(() => ctrl.abort(), dur);
    await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map(worker));
    clearInterval(tick); clearTimeout(stop);
    const end = performance.now();
    if (!mark) mark = { b: 0, t: t0 };
    if (bytes === 0) throw new Error(this._t.errDown);
    return (bytes - mark.b) * 8 / 1e6 / ((end - mark.t) / 1000);
  }

  async _upload(dur) {
    let done = 0, lastDone = 0, mark = null; const t0 = performance.now();
    const ctrl = new AbortController(); this._ul = ctrl;
    const mk = (n) => { const a = new Uint8Array(n); for (let i = 0; i < n; i += 65536) crypto.getRandomValues(a.subarray(i, Math.min(n, i + 65536))); return new Blob([a]); };
    const blobs = { 1: mk(1e6), 4: mk(4e6), 16: mk(16e6), 32: mk(32e6) };
    const worker = async () => {
      let size = 1;
      while (performance.now() - t0 < dur && !this._cancel) {
        const s = performance.now();
        try {
          await fetch(RST_BASE + '/__up?r=' + Math.random(), { method: 'POST', body: blobs[size], signal: ctrl.signal });
          done += size * 1e6; lastDone = performance.now();
          if (!mark && lastDone - t0 >= 1200) mark = { b: done, t: lastDone };
          const took = performance.now() - s;
          if (took < 700 && size < 32) size = size < 16 ? size * 4 : 32;
        } catch (e) { if (ctrl.signal.aborted) return; await RST_SLEEP(200); }
      }
    };
    const tick = setInterval(() => {
      const el = (performance.now() - t0) / 1000; const v = el > 0 ? done * 8 / 1e6 / el : 0;
      this._gauge(v, '#ffc400'); this.$('v-up').textContent = Math.round(v); this._sample('u', el, v);
    }, 250);
    const stop = setTimeout(() => ctrl.abort(), dur);
    await Promise.all([0, 1, 2, 3, 4, 5].map(worker));
    clearInterval(tick); clearTimeout(stop);
    if (done === 0) throw new Error(this._t.errUp);
    if (mark && lastDone > mark.t) return (done - mark.b) * 8 / 1e6 / ((lastDone - mark.t) / 1000);
    return lastDone > t0 ? done * 8 / 1e6 / ((lastDone - t0) / 1000) : 0;
  }

  async _save(r) {
    const E = this._c.entities; const ids = { download: r.down, upload: r.up, ping: r.ping, jitter: r.jitter };
    const calls = Object.keys(ids).filter((k) => E[k]).map((k) => this._hass.callService(E[k].split('.')[0], 'set_value', { entity_id: E[k], value: Math.round(ids[k] * 10) / 10 }));
    try { localStorage.setItem(RST_STORE, JSON.stringify({ down: r.down, up: r.up, ping: r.ping, jitter: r.jitter, ts: Date.now() })); } catch (e) { /* storage unavailable */ }
    if (calls.length) { await Promise.all(calls); return true; }
    return false;
  }

  async _run() {
    if (this._running) return;
    const T = this._t;
    this._running = true; this._cancel = false; this._ctrl = new AbortController();
    const go = this.$('go'); go.disabled = true; go.textContent = T.running;
    ['v-ping', 'v-jit', 'v-down', 'v-up'].forEach((i) => { this.$(i).textContent = '—'; });
    this._gauge(0, '#00e5ff');
    this._sm = { d: [], u: [] }; if (this._c.chart) this._draw();
    try {
      let colo = '';
      try { const tr = await (await fetch(RST_BASE + '/cdn-cgi/trace', { signal: this._ctrl.signal })).text(); colo = (tr.match(/colo=(\w+)/) || [])[1] || ''; } catch (e) { /* no server info */ }
      const srv = T.server + (colo ? ' (' + colo + ')' : '');
      this.$('foot').textContent = srv + ' · ' + T.measuring;
      this._phase(T.pinging, 't-ping'); this.$('unit').textContent = 'ms';
      const pj = await this._ping();
      this.$('v-ping').textContent = pj.ping.toFixed(0); this.$('v-jit').textContent = pj.jitter.toFixed(1);
      if (this._cancel) throw new Error(T.cancelled);
      this.$('unit').textContent = 'Mbit/s';
      this._phase(T.download, 't-down', '#00e5ff');
      const down = await this._download(this._dur);
      this.$('v-down').textContent = down >= 100 ? Math.round(down) : down.toFixed(1);
      if (this._cancel) throw new Error(T.cancelled);
      this._phase(T.upload, 't-up', '#ffc400');
      const up = await this._upload(this._dur);
      this.$('v-up').textContent = up >= 100 ? Math.round(up) : up.toFixed(1);
      if (this._cancel) throw new Error(T.cancelled);
      this._gauge(down, '#00ff9c');
      this._phase(T.done, null, '#00ff9c');
      const inHa = await this._save({ down, up, ping: pj.ping, jitter: pj.jitter });
      this.$('foot').textContent = (inHa ? T.saved : T.savedLocal) + ' · ' + srv;
      this._showLast();
    } catch (e) {
      if (!this._cancel) { this._phase(T.failed, null, '#e53935'); this.$('foot').textContent = T.failMsg + (e && e.message ? e.message : e); }
    }
    this._running = false; go.disabled = false; go.textContent = T.again;
  }
}
if (!customElements.get('speedtest-popup-card')) customElements.define('speedtest-popup-card', SpeedtestPopupCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'speedtest-popup-card', name: 'Speedtest Popup Card', description: 'Speed test in a popup: ping, jitter, download and upload, measured from this device.', preview: false });
