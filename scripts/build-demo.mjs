import { readFileSync, writeFileSync } from "node:fs";

const equipment = JSON.parse(readFileSync("data/my-equipment.current.json", "utf8"));
const benchmarks = JSON.parse(readFileSync("data/benchmarks.current.json", "utf8"));
const recommendations = JSON.parse(readFileSync("data/slot-recommendations.current.json", "utf8"));

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>燕云装备管理 Demo</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0d1118;
      --panel: rgba(20, 27, 38, 0.92);
      --panel-soft: rgba(255,255,255,0.055);
      --border: rgba(255,255,255,0.10);
      --text: #eef3fa;
      --muted: #93a0af;
      --gold: #e9c46a;
      --green: #82d173;
      --blue: #6bb9ff;
      --red: #ff7a90;
      --purple: #bda3ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at 18% 0%, rgba(116, 79, 255, .24), transparent 33%),
        radial-gradient(circle at 82% 12%, rgba(42, 172, 255, .18), transparent 35%),
        linear-gradient(135deg, #070a0f, #111827 50%, #080b12);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
      background: rgba(7, 10, 15, .78);
      backdrop-filter: blur(14px);
    }
    h1 { margin: 0; font-size: 20px; letter-spacing: .08em; }
    .subtitle { color: var(--muted); font-size: 12px; margin-top: 2px; }
    .top-stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .stat {
      min-width: 92px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--panel-soft);
    }
    .stat b { display: block; font-size: 18px; color: var(--gold); }
    .stat span { color: var(--muted); font-size: 11px; }
    .layout {
      display: grid;
      grid-template-columns: 280px minmax(420px, 1fr) 390px;
      gap: 16px;
      padding: 16px;
      max-width: 1500px;
      margin: 0 auto;
    }
    .panel {
      border: 1px solid var(--border);
      border-radius: 20px;
      background: var(--panel);
      box-shadow: 0 20px 80px rgba(0,0,0,.22);
      overflow: hidden;
    }
    .panel h2 {
      margin: 0;
      padding: 16px 16px 8px;
      font-size: 15px;
    }
    .panel-body { padding: 14px 16px 16px; }
    label { display: block; color: var(--muted); font-size: 12px; margin: 12px 0 6px; }
    select, input {
      width: 100%;
      color: var(--text);
      background: rgba(255,255,255,.075);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 9px 10px;
      outline: none;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .chip, .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 999px;
      padding: 4px 8px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.07);
      color: #d8e2ef;
      font-size: 12px;
    }
    .chip.active { border-color: var(--gold); color: var(--gold); }
    .main {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .slot-section {
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      background: rgba(255,255,255,.035);
    }
    .slot-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: rgba(255,255,255,.05);
    }
    .slot-title b { font-size: 15px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; padding: 12px; }
    .card {
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 12px;
      background: rgba(6, 10, 16, .55);
      transition: .18s ease;
    }
    .card:hover, .card.active {
      transform: translateY(-1px);
      border-color: rgba(233,196,106,.75);
      box-shadow: 0 0 0 1px rgba(233,196,106,.16), 0 10px 30px rgba(0,0,0,.22);
    }
    .card-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
    .card-title { font-weight: 700; }
    .quality { color: var(--gold); }
    .terms { display: flex; flex-wrap: wrap; gap: 6px; }
    .term { padding: 2px 7px; border-radius: 999px; background: rgba(255,255,255,.08); font-size: 12px; color: #ccd8e8; }
    .term.initial { color: var(--gold); background: rgba(233,196,106,.14); }
    .term.pitch { color: var(--blue); background: rgba(107,185,255,.12); }
    .score { margin-top: 10px; height: 7px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
    .score > i { display: block; height: 100%; background: linear-gradient(90deg, var(--green), var(--gold)); }
    .detail-title { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
    .detail-title h2 { padding-bottom: 0; }
    .section-line { border-top: 1px solid var(--border); margin: 14px -16px 0; padding: 14px 16px 0; }
    .match-row {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 10px;
      margin-bottom: 9px;
      background: rgba(255,255,255,.045);
    }
    .match-row strong { display: block; margin-bottom: 5px; }
    .progress {
      height: 8px;
      border-radius: 999px;
      background: rgba(255,255,255,.08);
      overflow: hidden;
      margin: 6px 0 8px;
    }
    .progress i { display: block; height: 100%; background: linear-gradient(90deg, #40c9ff, #e9c46a); }
    .small { color: var(--muted); font-size: 12px; }
    .good { color: var(--green); }
    .warn { color: var(--gold); }
    .bad { color: var(--red); }
    .import-box {
      border: 1px dashed rgba(233,196,106,.4);
      border-radius: 16px;
      padding: 12px;
      background: rgba(233,196,106,.06);
      color: #f4dfac;
      font-size: 12px;
    }
    .empty { padding: 24px; color: var(--muted); text-align: center; }
    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      header { align-items: flex-start; flex-direction: column; }
      .top-stats { justify-content: flex-start; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>燕云装备管理 Demo</h1>
      <div class="subtitle">按部位管理装备，查看每件装备与多流派毕业 benchmark 的匹配度</div>
    </div>
    <div class="top-stats" id="topStats"></div>
  </header>

  <main class="layout">
    <aside class="panel">
      <h2>筛选</h2>
      <div class="panel-body">
        <label>部位</label>
        <select id="slotFilter"></select>
        <label>流派视角</label>
        <select id="buildFilter"></select>
        <label>关键词条</label>
        <input id="termSearch" placeholder="例如 大外 / 小外 / 劲 / 首领" />
        <label>装备状态</label>
        <select id="stateFilter">
          <option value="all">全部装备</option>
          <option value="chengyin">只看承音</option>
          <option value="gold">只看金装</option>
        </select>
        <div class="section-line">
          <div class="import-box">
            <b>TXT 导入已识别</b><br />
            来源：yysls-assistant<br />
            格式：YYSLS_EQUIPMENT_EXPORT_V2<br />
            解码：Base64 + XOR<br />
            当前文件：${equipment.sourceFile}
          </div>
        </div>
        <div class="section-line">
          <b>手动导入入口</b>
          <p class="small">后续这里会做成逐件录入表单：选择部位、初始词条、调律词条、定音和备注。</p>
        </div>
      </div>
    </aside>

    <section class="main" id="equipmentList"></section>

    <aside class="panel" id="detailPanel"></aside>
  </main>

  <script>
    const EQUIPMENT = ${JSON.stringify(equipment)};
    const BENCHMARKS = ${JSON.stringify(benchmarks)};
    const RECS = ${JSON.stringify(recommendations)};

    const slotOrder = ["刀","剑","枪","伞","扇","绳镖","鼓","手甲","陌刀","双刀","佩","环","头","衣服","腕甲","胫甲"];
    const selected = { id: EQUIPMENT.items[0]?.id ?? null };

    const cn = (obj) => Object.entries(obj || {}).sort((a,b) => b[1] - a[1]);
    const allTerms = (item) => [...item.firstTuning, ...item.secondaryTuning].map(s => s.name);
    const tuningTerms = (item) => item.secondaryTuning.map(s => s.name);
    const initialTerms = (item) => item.firstTuning.map(s => s.name);

    function getBenchmarksForSelect() {
      return BENCHMARKS.benchmarks.map(b => ({
        id: b.id,
        label: b.category + " · " + b.flow + " · " + b.set + " · " + b.axis
      }));
    }

    function scoreItemForBenchmark(item, benchmark) {
      const rec = RECS.derivedBenchmarks.find(r => r.benchmarkId === benchmark.id);
      const terms = allTerms(item);
      const tuning = tuningTerms(item);
      const initial = initialTerms(item);
      let checks = [];
      let matched = 0;
      let total = 0;

      if (rec?.requiredBySlot?.[item.slot]) {
        const rule = rec.requiredBySlot[item.slot];
        for (const term of rule.initialRequired || []) {
          total += 1;
          const ok = initial.includes(term);
          matched += ok ? 1 : 0;
          checks.push({ label: "初始 " + term, ok });
        }
        for (const term of rule.tuningRequired || []) {
          total += 1;
          const ok = tuning.includes(term);
          matched += ok ? 1 : 0;
          checks.push({ label: "调律 " + term, ok });
        }
        const optionalHits = (rule.optionalPool || []).filter(term => terms.includes(term));
        total += Math.min(2, (rule.optionalPool || []).length ? 2 : 0);
        matched += Math.min(2, optionalHits.length);
        if ((rule.optionalPool || []).length) {
          checks.push({ label: "可选命中 " + (optionalHits.join(" / ") || "无"), ok: optionalHits.length > 0 });
        }
      } else {
        const wanted = Object.keys(benchmark.counts || {});
        const hits = wanted.filter(term => terms.includes(term) || terms.includes(term.replace(/^大/, "最大")));
        total = Math.min(5, wanted.length);
        matched = Math.min(5, hits.length);
        checks.push({ label: "命中 " + (hits.join(" / ") || "无"), ok: hits.length > 0 });
      }

      const pct = total ? Math.round((matched / total) * 100) : 0;
      return {
        benchmark,
        rec,
        pct,
        matched,
        total,
        checks,
        globalCounts: rec?.globalCountsRequired || {},
        level: pct >= 90 ? "毕业吻合" : pct >= 65 ? "接近毕业" : pct >= 35 ? "可过渡" : "弱相关"
      };
    }

    function getTopMatches(item) {
      const buildFilter = document.getElementById("buildFilter").value;
      return BENCHMARKS.benchmarks
        .filter(b => buildFilter === "all" || b.flow === buildFilter)
        .map(b => scoreItemForBenchmark(item, b))
        .sort((a,b) => b.pct - a.pct)
        .slice(0, 6);
    }

    function filteredItems() {
      const slot = document.getElementById("slotFilter").value;
      const build = document.getElementById("buildFilter").value;
      const term = document.getElementById("termSearch").value.trim();
      const state = document.getElementById("stateFilter").value;
      return EQUIPMENT.items.filter(item => {
        if (slot !== "all" && item.slot !== slot) return false;
        if (build !== "all") {
          const direct = item.buildKeys.some(b => b.name === build || b.key === build);
          const scored = BENCHMARKS.benchmarks.some(b => b.flow === build && scoreItemForBenchmark(item, b).pct >= 35);
          if (!direct && !scored) return false;
        }
        if (term && !allTerms(item).some(t => t.includes(term))) return false;
        if (state === "chengyin" && !item.isChengyin) return false;
        if (state === "gold" && item.quality !== "金") return false;
        return true;
      });
    }

    function renderStats() {
      const stats = [
        ["角色", EQUIPMENT.roleName],
        ["装备", EQUIPMENT.itemCount],
        ["部位", Object.keys(EQUIPMENT.summary.bySlot).length],
        ["方案", BENCHMARKS.benchmarks.length]
      ];
      document.getElementById("topStats").innerHTML = stats.map(([k,v]) =>
        '<div class="stat"><b>' + v + '</b><span>' + k + '</span></div>'
      ).join("");
    }

    function renderFilters() {
      const slots = ["all", ...slotOrder.filter(s => EQUIPMENT.items.some(i => i.slot === s))];
      document.getElementById("slotFilter").innerHTML = slots.map(s =>
        '<option value="' + s + '">' + (s === "all" ? "全部部位" : s) + '</option>'
      ).join("");
      const builds = ["all", ...Array.from(new Set(BENCHMARKS.benchmarks.map(b => b.flow)))];
      document.getElementById("buildFilter").innerHTML = builds.map(b =>
        '<option value="' + b + '">' + (b === "all" ? "全部流派" : b) + '</option>'
      ).join("");
    }

    function renderEquipment() {
      const items = filteredItems();
      const grouped = new Map();
      for (const item of items) {
        if (!grouped.has(item.slot)) grouped.set(item.slot, []);
        grouped.get(item.slot).push(item);
      }
      const html = slotOrder.filter(slot => grouped.has(slot)).map(slot => {
        const cards = grouped.get(slot).map(item => {
          const top = getTopMatches(item)[0];
          const terms = [
            ...item.firstTuning.map(s => '<span class="term initial">初始 ' + s.name + '</span>'),
            ...item.secondaryTuning.map(s => '<span class="term">' + s.name + '</span>'),
            ...item.pitch.map(s => '<span class="term pitch">定音 ' + s.name + '</span>')
          ].join("");
          return '<article class="card ' + (selected.id === item.id ? "active" : "") + '" data-id="' + item.id + '">' +
            '<div class="card-head">' +
              '<div>' +
                '<div class="card-title">' + item.displayName + '</div>' +
                '<div class="small">' + item.slot + ' · <span class="quality">' + item.quality + '</span>' + (item.isChengyin ? " · 承音" : "") + '</div>' +
              '</div>' +
              '<span class="pill">' + (top?.pct ?? 0) + '%</span>' +
            '</div>' +
            '<div class="terms">' + terms + '</div>' +
            '<div class="score"><i style="width:' + (top?.pct ?? 0) + '%"></i></div>' +
          '</article>';
        }).join("");
        return '<section class="slot-section">' +
          '<div class="slot-title"><b>' + slot + '</b><span class="small">' + grouped.get(slot).length + ' 件</span></div>' +
          '<div class="cards">' + cards + '</div>' +
        '</section>';
      }).join("");
      document.getElementById("equipmentList").innerHTML = html || '<div class="panel empty">没有符合筛选条件的装备</div>';
      document.querySelectorAll(".card").forEach(el => {
        el.addEventListener("click", () => {
          selected.id = el.dataset.id;
          renderEquipment();
          renderDetail();
        });
      });
    }

    function renderDetail() {
      const item = EQUIPMENT.items.find(i => i.id === selected.id) || EQUIPMENT.items[0];
      const matches = getTopMatches(item);
      const terms = [
        ...item.firstTuning.map(s => '<span class="term initial">初始 ' + s.name + ' ' + s.value + '</span>'),
        ...item.secondaryTuning.map(s => '<span class="term">' + s.name + ' ' + s.value + '</span>'),
        ...item.pitch.map(s => '<span class="term pitch">定音 ' + s.name + ' ' + s.value + '</span>')
      ].join("");
      const matchHtml = matches.map(m => {
        const checks = m.checks.map(c => '<span class="' + (c.ok ? "good" : "bad") + '">' + (c.ok ? "✓" : "×") + ' ' + c.label + '</span>').join("<br>");
        const counts = Object.entries(m.globalCounts).map(([k,v]) => k + v).join(" · ");
        return '<div class="match-row">' +
          '<strong>' + m.level + ' · ' + m.benchmark.flow + ' / ' + m.benchmark.set + ' / ' + m.benchmark.axis + '</strong>' +
          '<div class="progress"><i style="width:' + m.pct + '%"></i></div>' +
          '<div class="small">' + m.benchmark.formula + '</div>' +
          '<div class="small" style="margin-top:6px">' + checks + '</div>' +
          (counts ? '<div class="small warn" style="margin-top:6px">全身需凑够：' + counts + '</div>' : "") +
        '</div>';
      }).join("");
      document.getElementById("detailPanel").innerHTML =
        '<div class="detail-title">' +
          '<h2>' + item.displayName + '</h2>' +
          '<span class="pill">' + item.slot + '</span>' +
        '</div>' +
        '<div class="panel-body">' +
          '<div class="small">来源：' + item.source + ' · ' + item.quality + (item.isChengyin ? " · 已承音" : "") + '</div>' +
          '<div class="chips">' + terms + '</div>' +
          '<div class="section-line">' +
            '<b>流派匹配 Top</b>' +
            '<p class="small">当前评分是 demo 级规则：优先看部位硬约束、初始/调律必选词条、再看可选词条命中。</p>' +
            matchHtml +
          '</div>' +
          '<div class="section-line">' +
            '<b>原站标记</b>' +
            '<div class="chips">' +
              (item.buildKeys.map(b => '<span class="chip active">' + b.name + '</span>').join("") || '<span class="small">无</span>') +
            '</div>' +
          '</div>' +
        '</div>';
    }

    ["slotFilter","buildFilter","termSearch","stateFilter"].forEach(id => {
      document.addEventListener("input", event => {
        if (event.target.id === id) {
          renderEquipment();
          renderDetail();
        }
      });
      document.addEventListener("change", event => {
        if (event.target.id === id) {
          renderEquipment();
          renderDetail();
        }
      });
    });

    renderStats();
    renderFilters();
    renderEquipment();
    renderDetail();
  </script>
</body>
</html>`;

writeFileSync("demo/index.html", html, "utf8");
console.log("Wrote demo/index.html");
