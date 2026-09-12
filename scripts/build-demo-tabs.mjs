import { existsSync, readFileSync, writeFileSync } from "node:fs";

const baseEquipment = JSON.parse(readFileSync("data/my-equipment.current.json", "utf8"));
const feishuEquipment = existsSync("data/feishu-equipment.current.json")
  ? JSON.parse(readFileSync("data/feishu-equipment.current.json", "utf8"))
  : { items: [] };
const benchmarks = JSON.parse(readFileSync("data/benchmarks.current.json", "utf8"));
const recommendations = JSON.parse(readFileSync("data/slot-recommendations.current.json", "utf8"));
const weaponRules = JSON.parse(readFileSync("data/build-weapon-rules.current.json", "utf8"));

function summarize(items) {
  const bySlot = {};
  const byTerm = {};
  for (const item of items) {
    bySlot[item.slot] = (bySlot[item.slot] || 0) + 1;
    for (const stat of [...item.firstTuning, ...item.secondaryTuning, ...item.pitch]) {
      byTerm[stat.name] = (byTerm[stat.name] || 0) + 1;
    }
  }
  return { bySlot, byTerm, byBuildTag: baseEquipment.summary?.byBuildTag || {} };
}

const equipment = {
  ...baseEquipment,
  source: "yysls-assistant + feishu-sheet",
  sourceFile: baseEquipment.sourceFile + " + 飞书截图导入",
  items: [...baseEquipment.items, ...(feishuEquipment.items || [])]
};
equipment.itemCount = equipment.items.length;
equipment.summary = summarize(equipment.items);

const commonTerms = [
  "大外", "小外", "全武", "首领", "精准", "会心", "会意", "敏", "劲", "势",
  "大破竹", "小破竹", "大裂石", "小裂石", "大牵丝", "小牵丝", "大鸣金", "小鸣金", "大无相", "小无相",
  "单体奇术增伤", "玩家增",
  "手甲", "绳镖", "陌刀", "横刀", "双刀", "枪", "伞", "扇", "鼓", "剑",
  "手甲增伤", "绳镖增伤", "陌刀增伤", "横刀增伤", "双刀增伤", "枪增伤", "伞增伤", "扇增伤", "鼓增伤", "剑增伤"
];
const manualTermOrder = [
  ["大外", "小外", "全武", "首领"],
  ["劲", "敏", "势"],
  ["精准", "会心", "会意"],
  ["大破竹", "小破竹", "大裂石", "小裂石", "大牵丝", "小牵丝", "大鸣金", "小鸣金", "大无相", "小无相"],
  ["单体奇术增伤", "群体奇术增伤", "玩家增"],
  ["手甲", "手甲增伤", "绳镖", "绳镖增伤", "陌刀", "陌刀增伤", "横刀", "横刀增伤", "双刀", "双刀增伤", "枪", "枪增伤", "伞", "伞增伤", "扇", "扇增伤", "鼓", "鼓增伤", "剑", "剑增伤"]
];
const manualTermRank = new Map(manualTermOrder.flatMap((group, groupIndex) =>
  group.map((term, termIndex) => [term, groupIndex * 100 + termIndex])
));
function isManualTerm(term) {
  if (!term) return false;
  if (term.includes("·") || term.includes("/") || term.includes("穿透") || term.includes("定音") || term.includes("相关")) return false;
  return true;
}
function compareManualTerms(a, b) {
  const aRank = manualTermRank.has(a) ? manualTermRank.get(a) : 9999;
  const bRank = manualTermRank.has(b) ? manualTermRank.get(b) : 9999;
  return aRank - bRank || a.localeCompare(b, "zh-Hans-CN");
}
const availableTerms = Array.from(new Set([
  ...commonTerms,
  ...equipment.items.flatMap(item => [...item.firstTuning, ...item.secondaryTuning].map(stat => stat.name)),
  ...benchmarks.benchmarks.flatMap(benchmark => Object.keys(benchmark.counts || {}))
])).filter(isManualTerm).sort(compareManualTerms);

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>燕云装备管理 Demo</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #080b12;
      --panel: rgba(18, 25, 36, .94);
      --soft: rgba(255,255,255,.055);
      --line: rgba(255,255,255,.1);
      --text: #eef4fb;
      --muted: #96a3b4;
      --gold: #e9c46a;
      --green: #7bd88f;
      --blue: #6bb9ff;
      --red: #ff7a90;
      --orange: #f4a261;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at 10% 0%, rgba(83, 122, 255, .25), transparent 34%),
        radial-gradient(circle at 100% 10%, rgba(233, 196, 106, .16), transparent 32%),
        linear-gradient(135deg, #06080d, #101725 55%, #080b12);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 20;
      padding: 18px 24px 12px;
      border-bottom: 1px solid var(--line);
      background: rgba(6, 8, 13, .82);
      backdrop-filter: blur(16px);
    }
    .hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      max-width: 1480px;
      margin: 0 auto 14px;
    }
    h1 { margin: 0; font-size: 22px; letter-spacing: .04em; }
    .subtitle { color: var(--muted); font-size: 12px; margin-top: 4px; }
    .stats { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .stat {
      min-width: 82px;
      padding: 7px 11px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--soft);
    }
    .stat b { display: block; color: var(--gold); font-size: 18px; line-height: 1.1; }
    .stat span { color: var(--muted); font-size: 11px; }
    .tabs {
      display: flex;
      gap: 8px;
      max-width: 1480px;
      margin: 0 auto;
      overflow-x: auto;
      padding-bottom: 3px;
    }
    .view-switch {
      display: flex;
      gap: 8px;
      max-width: 1480px;
      margin: 0 auto 10px;
    }
    .tab {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 13px;
      color: #dce6f2;
      background: rgba(255,255,255,.055);
      white-space: nowrap;
      cursor: pointer;
    }
    .view-tab {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 14px;
      color: #dce6f2;
      background: rgba(255,255,255,.055);
      cursor: pointer;
    }
    .view-tab.active {
      color: #080b12;
      background: linear-gradient(135deg, #48f0ff, #b58cff);
      border-color: transparent;
      font-weight: 800;
    }
    .tab.active {
      color: #1d1403;
      border-color: transparent;
      background: linear-gradient(135deg, #f5d987, #e9c46a);
      font-weight: 700;
    }
    .layout {
      max-width: 1480px;
      margin: 0 auto;
      padding: 16px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 430px;
      gap: 16px;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 20px;
      background: var(--panel);
      box-shadow: 0 24px 80px rgba(0,0,0,.24);
      overflow: hidden;
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1.2fr 1fr 160px;
      gap: 10px;
      padding: 14px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,.035);
    }
    input, select {
      width: 100%;
      color: var(--text);
      border: 1px solid var(--line);
      border-radius: 13px;
      background: rgba(255,255,255,.07);
      padding: 10px 12px;
      outline: none;
    }
    button {
      border: 1px solid var(--line);
      border-radius: 12px;
      color: var(--text);
      background: rgba(255,255,255,.07);
      cursor: pointer;
      font: inherit;
    }
    button:hover { border-color: rgba(233,196,106,.55); }
    .manage-panel {
      border-bottom: 1px solid var(--line);
      padding: 10px 14px;
      background: rgba(255,255,255,.025);
    }
    .manage-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .manage-title { font-weight: 850; }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgba(0,0,0,.62);
      backdrop-filter: blur(8px);
    }
    .modal-backdrop.hidden { display: none; }
    .manual-modal {
      width: min(920px, 100%);
      max-height: min(760px, 88vh);
      overflow: auto;
      border: 1px solid rgba(233,196,106,.28);
      border-radius: 22px;
      background: #101722;
      box-shadow: 0 28px 90px rgba(0,0,0,.55);
    }
    .modal-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      padding: 18px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,.035);
    }
    .modal-head h2 { margin: 0 0 6px; font-size: 20px; }
    .modal-close {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      font-size: 18px;
      line-height: 1;
    }
    .manual-body { padding: 16px 18px 18px; }
    .manual-form {
      display: grid;
      grid-template-columns: 160px 1fr auto auto;
      gap: 10px;
      align-items: center;
    }
    .selected-sequence {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      min-height: 34px;
      align-items: center;
    }
    .sequence-chip {
      display: inline-flex;
      gap: 5px;
      align-items: center;
      border: 1px solid rgba(233,196,106,.32);
      border-radius: 999px;
      padding: 5px 8px;
      color: #f8df98;
      background: rgba(233,196,106,.1);
      font-size: 12px;
    }
    .term-palette {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 10px;
      max-height: 132px;
      overflow: auto;
    }
    .term-option {
      padding: 6px 9px;
      font-size: 12px;
    }
    .term-option:disabled {
      opacity: .35;
      cursor: not-allowed;
    }
    .manage-actions {
      display: flex;
      gap: 8px;
    }
    .primary-action {
      border-color: rgba(123,216,143,.45);
      color: var(--green);
      background: rgba(123,216,143,.1);
      padding: 9px 12px;
      font-weight: 800;
    }
    .secondary-action {
      padding: 9px 12px;
    }
    .danger-action {
      border-color: rgba(255,122,144,.48);
      color: var(--red);
      background: rgba(255,122,144,.1);
      padding: 9px 12px;
      font-weight: 800;
    }
    .icon-action {
      width: 32px;
      height: 32px;
      display: inline-grid;
      place-items: center;
      border-radius: 999px;
      color: var(--red);
      border-color: rgba(255,122,144,.42);
      background: rgba(255,122,144,.08);
      font-size: 15px;
      line-height: 1;
    }
    .slot-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 14px 16px 6px;
    }
    .slot-summary h2 { margin: 0; font-size: 17px; }
    .muted { color: var(--muted); }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
      gap: 12px;
      padding: 14px;
    }
    .card {
      cursor: pointer;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 13px;
      background: rgba(5, 8, 13, .58);
      transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
    }
    .card:hover, .card.active {
      transform: translateY(-1px);
      border-color: rgba(233,196,106,.8);
      box-shadow: 0 0 0 1px rgba(233,196,106,.16), 0 14px 34px rgba(0,0,0,.26);
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .card-title { font-weight: 750; }
    .purpose-label {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 13px;
      font-weight: 800;
      border: 1px solid transparent;
    }
    .purpose-xiaowai { color: #48f0ff; background: rgba(72,240,255,.12); border-color: rgba(72,240,255,.5); }
    .purpose-dawai { color: #b58cff; background: rgba(181,140,255,.14); border-color: rgba(181,140,255,.55); }
    .purpose-huiyi { color: #ff8ccf; background: rgba(255,140,207,.14); border-color: rgba(255,140,207,.55); }
    .purpose-heal { color: #ffb15e; background: rgba(255,177,94,.14); border-color: rgba(255,177,94,.55); }
    .purpose-unknown { color: var(--muted); background: rgba(255,255,255,.05); border-color: var(--line); }
    .import-name {
      color: rgba(156,169,190,.58);
      font-size: 11px;
      margin-top: 3px;
    }
    .badge, .term {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.07);
      padding: 3px 8px;
      font-size: 12px;
      color: #dce6f2;
    }
    .badge.good { border-color: rgba(123,216,143,.45); color: var(--green); }
    .badge.warn { border-color: rgba(233,196,106,.45); color: var(--gold); }
    .badge.bad { border-color: rgba(255,122,144,.45); color: var(--red); }
    .terms { display: flex; flex-wrap: wrap; gap: 6px; }
    .term.initial {
      color: var(--gold);
      background: rgba(233,196,106,.12);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .term.pitch { color: var(--blue); background: rgba(107,185,255,.11); }
    .match-line {
      margin-top: 10px;
      color: var(--muted);
      font-size: 12px;
    }
    .flow-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }
    .flow-tag {
      border: 1px solid rgba(107,185,255,.28);
      border-radius: 999px;
      padding: 2px 7px;
      color: #badfff;
      background: rgba(107,185,255,.08);
      font-size: 11px;
    }
    .flow-tag.best {
      border-color: rgba(233,196,106,.62);
      color: var(--gold);
      background: rgba(233,196,106,.12);
      font-weight: 700;
    }
    .detail-head { padding: 16px 16px 10px; }
    .detail-head-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }
    .detail-actions { display: flex; gap: 8px; }
    .detail-head h2 { margin: 0; font-size: 18px; }
    .detail-head .sub { margin-top: 4px; color: var(--muted); font-size: 12px; }
    .detail-body { padding: 0 16px 16px; }
    .section {
      border-top: 1px solid var(--line);
      margin-top: 14px;
      padding-top: 14px;
    }
    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-weight: 750;
    }
    .need-box {
      border: 1px solid var(--line);
      border-radius: 15px;
      background: rgba(255,255,255,.045);
      padding: 11px;
      margin-bottom: 10px;
    }
    .list {
      display: grid;
      gap: 7px;
      margin-top: 8px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-radius: 12px;
      padding: 8px 10px;
      background: rgba(255,255,255,.045);
    }
    .row.hit { color: var(--green); }
    .row.relative { color: var(--orange); }
    .row.miss { color: var(--red); }
    .row.neutral { color: var(--muted); }
    .score-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 7px;
      font-size: 12px;
    }
    .score-table th {
      color: var(--muted);
      font-weight: 600;
      text-align: left;
      padding: 0 8px 2px;
    }
    .score-table td {
      background: rgba(255,255,255,.045);
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 8px;
      vertical-align: top;
    }
    .score-table td:first-child {
      border-left: 1px solid var(--line);
      border-radius: 12px 0 0 12px;
    }
    .score-table td:last-child {
      border-right: 1px solid var(--line);
      border-radius: 0 12px 12px 0;
    }
    .score-table tr.hit td { color: var(--green); }
    .score-table tr.relative td { color: var(--orange); }
    .score-table tr.miss td { color: var(--red); }
    .score-term.initial {
      color: var(--gold);
      text-decoration: underline;
      text-underline-offset: 3px;
      font-weight: 700;
    }
    .alternatives { display: grid; gap: 8px; }
    .alt {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 9px 10px;
      background: rgba(255,255,255,.035);
    }
    .alt.active {
      border-color: rgba(233,196,106,.75);
      background: rgba(233,196,106,.12);
    }
    button.alt {
      width: 100%;
      color: inherit;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .alt strong { display: block; }
    .empty { padding: 30px; color: var(--muted); text-align: center; }
    .import-note {
      margin-top: 10px;
      color: #f5d987;
      font-size: 12px;
    }
    .hidden { display: none !important; }
    .matrix-layout {
      max-width: 1480px;
      margin: 0 auto;
      padding: 16px;
    }
    .matrix-wrap {
      overflow: auto;
      padding: 14px;
    }
    .matrix-table {
      width: 100%;
      min-width: 1100px;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 12px;
    }
    .matrix-table th,
    .matrix-table td {
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 12px;
      vertical-align: top;
      background: rgba(255,255,255,.035);
    }
    .matrix-table th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: rgba(20, 28, 40, .98);
      color: var(--muted);
      text-align: left;
    }
    .matrix-table th:first-child,
    .matrix-table td:first-child {
      position: sticky;
      left: 0;
      z-index: 3;
      min-width: 150px;
      background: rgba(20, 28, 40, .98);
    }
    .matrix-flow {
      display: grid;
      gap: 6px;
      min-width: 190px;
    }
    .matrix-flow-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
    }
    .matrix-flow-name {
      font-size: 19px;
      font-weight: 900;
      color: #f4f8ff;
      letter-spacing: .02em;
    }
    .matrix-flow-total {
      font-size: 15px;
      font-weight: 900;
      white-space: nowrap;
    }
    .matrix-flow-req {
      color: rgba(156,169,190,.78);
      font-size: 11px;
      line-height: 1.35;
      max-width: 230px;
    }
    .matrix-flow .purpose-label {
      width: max-content;
      padding: 1px 7px;
      font-size: 10px;
    }
    .matrix-options {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }
    .matrix-toggle {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 7px 10px;
      background: rgba(255,255,255,.045);
      color: #dce6f2;
      font-size: 12px;
      font-weight: 750;
      cursor: pointer;
      user-select: none;
    }
    .matrix-toggle input {
      width: auto;
      accent-color: #e9c46a;
    }
    .matrix-note {
      color: rgba(156,169,190,.78);
      font-size: 11px;
    }
    .matrix-cell {
      position: relative;
      display: grid;
      gap: 6px;
      min-width: 150px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 14px;
      padding: 10px;
      background: rgba(5, 8, 13, .36);
      cursor: default;
      transition: border-color .16s ease, transform .16s ease, background .16s ease;
    }
    .matrix-cell:hover,
    .matrix-cell:focus {
      z-index: 5;
      transform: translateY(-1px);
      border-color: rgba(233,196,106,.72);
      background: rgba(17, 24, 35, .96);
      outline: none;
    }
    .matrix-score {
      font-weight: 900;
      font-size: 18px;
      line-height: 1.05;
    }
    .matrix-score.good { color: #70f28f; }
    .matrix-score.warn { color: #ffd166; }
    .matrix-score.mid { color: #ff9f5a; }
    .matrix-score.bad { color: #ff6b86; }
    .matrix-flow-total.good { color: #70f28f; }
    .matrix-flow-total.warn { color: #ffd166; }
    .matrix-flow-total.mid { color: #ff9f5a; }
    .matrix-flow-total.bad { color: #ff6b86; }
    .matrix-name {
      color: #e8eef8;
      font-size: 16px;
      font-weight: 850;
      line-height: 1.25;
    }
    .matrix-meta { color: rgba(156,169,190,.68); font-size: 11px; }
    .matrix-tooltip {
      display: none;
      position: absolute;
      left: 8px;
      top: calc(100% + 8px);
      width: 330px;
      z-index: 10;
      border: 1px solid rgba(233,196,106,.35);
      border-radius: 14px;
      padding: 10px;
      background: rgba(8, 11, 18, .98);
      box-shadow: 0 18px 48px rgba(0,0,0,.42);
      color: var(--text);
    }
    .matrix-cell:hover .matrix-tooltip,
    .matrix-cell:focus .matrix-tooltip { display: grid; gap: 6px; }
    .tooltip-title { font-weight: 850; }
    .tooltip-line { color: var(--muted); font-size: 11px; }
    .tooltip-attrs { display: grid; gap: 4px; margin-top: 2px; }
    .tooltip-attr-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 4px 0;
      border-top: 1px solid rgba(255,255,255,.06);
    }
    .tooltip-attr { color: #e8eef8; font-size: 12px; }
    .tooltip-attr.initial {
      color: var(--gold);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .tooltip-score { color: rgba(156,169,190,.82); font-size: 11px; white-space: nowrap; }
    .tooltip-score.hit { color: #70f28f; }
    .tooltip-score.relative { color: #ffd166; }
    .tooltip-score.miss { color: #ff6b86; }
    .matrix-empty { color: rgba(156,169,190,.45); }
    .benchmark-layout {
      max-width: 1480px;
      margin: 18px auto;
      padding: 0 24px 24px;
    }
    .config-grid {
      overflow-x: auto;
      padding: 14px;
    }
    .config-table {
      min-width: 1180px;
    }
    .config-table th:first-child,
    .config-table td:first-child {
      min-width: 260px;
    }
    .config-table th:nth-child(2),
    .config-table td:nth-child(2) {
      min-width: 680px;
    }
    .config-table th:last-child,
    .config-table td:last-child {
      min-width: 260px;
    }
    .config-flow-cell {
      display: grid;
      gap: 6px;
    }
    .config-title-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
    }
    .config-title {
      font-size: 18px;
      font-weight: 900;
      color: #f5f8ff;
    }
    .config-subtitle {
      color: rgba(156,169,190,.82);
      font-size: 12px;
    }
    .count-editor {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .count-field {
      display: grid;
      gap: 4px;
      min-width: 78px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px;
      padding: 8px;
      background: rgba(255,255,255,.035);
    }
    .count-field span {
      color: var(--muted);
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .count-field input {
      width: 100%;
      padding: 6px 7px;
      border-radius: 9px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.18);
      color: var(--text);
      font-weight: 850;
    }
    .config-add-row {
      display: grid;
      grid-template-columns: 1fr 76px auto;
      gap: 8px;
    }
    .config-add-row select,
    .config-add-row input {
      width: 100%;
      padding: 9px 10px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.04);
      color: var(--text);
    }
    @media (max-width: 1080px) {
      .layout { grid-template-columns: 1fr; }
      .toolbar { grid-template-columns: 1fr; }
      .manual-form { grid-template-columns: 1fr; }
      .hero { flex-direction: column; }
      .stats { justify-content: flex-start; }
    }
  </style>
</head>
<body>
  <header>
    <div class="hero">
      <div>
        <h1>燕云装备管理 Demo</h1>
        <div class="subtitle">一个部位一个 Tab，点击装备后直接看“最贴合哪个流派、命中什么、缺什么”。</div>
        <div class="import-note">当前数据：yysls-assistant TXT 导入 · ${equipment.sourceFile}</div>
      </div>
      <div class="stats" id="stats"></div>
    </div>
    <div class="view-switch">
      <button class="view-tab active" data-view="equipment">装备视图</button>
      <button class="view-tab" data-view="matrix">流派视图</button>
      <button class="view-tab" data-view="benchmarks">流派配置</button>
    </div>
    <nav class="tabs" id="tabs"></nav>
  </header>

  <main class="layout" id="equipmentView">
    <section class="panel">
      <div class="manage-panel">
        <div class="manage-head">
          <div>
            <div class="manage-title">装备管理</div>
            <div class="muted">仓库内置装备仅作示例；可一键清空后导入或录入自己的装备。</div>
          </div>
          <div class="manage-actions">
            <button class="primary-action" id="openManualModal" type="button">新增装备</button>
            <button class="secondary-action" id="importEquipmentTxt" type="button">导入 TXT</button>
            <button class="secondary-action" id="exportEquipmentTxt" type="button">导出 TXT</button>
            <button class="danger-action" id="clearEquipmentArchive" type="button">清空装备存档</button>
            <button class="secondary-action" id="resetLocalData" type="button">恢复示例/默认</button>
            <input class="hidden" id="equipmentTxtFile" type="file" accept=".txt,text/plain" />
          </div>
        </div>
      </div>
      <div class="toolbar">
        <input id="termSearch" placeholder="搜索词条，例如：精准 / 单体 / 奇术 / 大外" />
        <select id="flowFilter"></select>
        <select id="stateFilter">
          <option value="all">全部装备</option>
          <option value="chengyin">只看承音</option>
          <option value="gold">只看金装</option>
        </select>
      </div>
      <div class="slot-summary">
        <h2 id="slotTitle"></h2>
        <span class="muted" id="slotHint"></span>
      </div>
      <div class="cards" id="cards"></div>
    </section>

    <aside class="panel" id="detail"></aside>
  </main>

  <div class="modal-backdrop hidden" id="manualModal" role="dialog" aria-modal="true" aria-labelledby="manualModalTitle">
    <div class="manual-modal">
      <div class="modal-head">
        <div>
          <h2 id="manualModalTitle">手动录入装备</h2>
          <div class="muted">按点击顺序生成词条：第 1 条初始，第 2-5 条调律；定音暂不录入、不统计。</div>
        </div>
        <button class="modal-close" id="closeManualModal" type="button" aria-label="关闭">×</button>
      </div>
      <div class="manual-body">
        <div class="manual-form">
          <select id="manualSlot"></select>
          <div class="selected-sequence" id="manualSequence"></div>
          <button class="secondary-action" id="manualUndo" type="button">撤回</button>
          <button class="primary-action" id="manualAdd" type="button">添加装备</button>
        </div>
        <div class="term-palette" id="termPalette"></div>
      </div>
    </div>
  </div>

  <section class="matrix-layout hidden" id="matrixView">
    <div class="panel">
      <div class="slot-summary">
        <h2>流派视图</h2>
        <div class="matrix-options">
          <label class="matrix-toggle">
            <input id="countWeaponsToggle" type="checkbox" />
            <span>计入武器词条</span>
          </label>
          <span class="matrix-note" id="matrixScoreNote">默认排序不计算主/副武器</span>
        </div>
      </div>
      <div class="matrix-wrap" id="matrixWrap"></div>
    </div>
  </section>

  <section class="benchmark-layout hidden" id="benchmarkView">
    <div class="panel">
      <div class="slot-summary">
        <div>
          <h2>流派配置</h2>
          <span class="muted">管理各个流派方案的词条数量。修改后会保存在本地，并影响装备评分和流派排序。</span>
        </div>
        <button class="secondary-action" id="resetBenchmarkCounts" type="button">恢复默认词条数量</button>
      </div>
      <div class="config-grid" id="benchmarkConfigWrap"></div>
    </div>
  </section>

  <script>
    const EQUIPMENT = ${JSON.stringify(equipment)};
    const BENCHMARKS = ${JSON.stringify(benchmarks)};
    const RECS = ${JSON.stringify(recommendations)};
    const WEAPON_RULES = ${JSON.stringify(weaponRules)};
    const AVAILABLE_TERMS = ${JSON.stringify(availableTerms)};
    const EXPORT_V2_HEADER = "YYSLS_EQUIPMENT_EXPORT_V2";
    const TRANSFER_KEY = "yysls-equipment-transfer";
    const slotToEquipmentKey = {
      "刀": "EQUIPMENT_WEAPON_BLADE",
      "陌刀": "EQUIPMENT_WEAPON_BIGBLADE",
      "双刀": "EQUIPMENT_WEAPON_2BLADE",
      "手甲": "EQUIPMENT_WEAPON_FIST",
      "绳镖": "EQUIPMENT_WEAPON_ROPE",
      "枪": "EQUIPMENT_WEAPON_SPEAR",
      "剑": "EQUIPMENT_WEAPON_SWORD",
      "扇": "EQUIPMENT_WEAPON_FAN",
      "伞": "EQUIPMENT_WEAPON_UMBRELLA",
      "鼓": "EQUIPMENT_WEAPON_DRUM",
      "佩": "EQUIPMENT_PENDANT",
      "环": "EQUIPMENT_RING",
      "头": "EQUIPMENT_HEAD",
      "衣服": "EQUIPMENT_CLOTH",
      "腕甲": "EQUIPMENT_HAND",
      "胫甲": "EQUIPMENT_SHOES"
    };
    const equipmentKeyToSlot = Object.fromEntries(Object.entries(slotToEquipmentKey).map(([slot, key]) => [key, slot]));
    const statNameToKey = {
      "大外": "MAX_EXTERNAL_ATTACK",
      "小外": "MIN_EXTERNAL_ATTACK",
      "会心": "CRITICAL_RATE",
      "精准": "ACCURACY_RATE",
      "会意": "INSIGHT_RATE",
      "敏": "MIN",
      "劲": "JIN",
      "势": "SHI",
      "全武": "WUXUE_DAMAGE",
      "首领": "BOSS_DAMAGE",
      "单体奇术增伤": "SINGLEQS_DAMAGE",
      "群体奇术增伤": "AOEQS_DAMAGE",
      "手甲": "FIST_DAMAGE",
      "陌刀": "BIGBLADE_DAMAGE",
      "刀": "BLADE_DAMAGE",
      "横刀": "BLADE_DAMAGE",
      "双刀": "2BLADE_DAMAGE",
      "绳镖": "ROPE_DAMAGE",
      "枪": "SPEAR_DAMAGE",
      "剑": "SWORD_DAMAGE",
      "扇": "FAN_DAMAGE",
      "伞": "UMBRELLA_DAMAGE",
      "鼓": "DRUM_DAMAGE",
      "大破竹": "MAX_POZHU_ATTACK",
      "小破竹": "MIN_POZHU_ATTACK",
      "大裂石": "MAX_LIESHI_ATTACK",
      "小裂石": "MIN_LIESHI_ATTACK",
      "大牵丝": "MAX_QIANSI_ATTACK",
      "小牵丝": "MIN_QIANSI_ATTACK",
      "大鸣金": "MAX_MINGJIN_ATTACK",
      "小鸣金": "MIN_MINGJIN_ATTACK",
      "大无相": "MAX_WUXIANG_ATTACK",
      "小无相": "MIN_WUXIANG_ATTACK",
      "外功穿透": "EXTERNAL_PENETRATION"
    };
    const statKeyToName = Object.fromEntries(Object.entries(statNameToKey).map(([name, key]) => [key, name]));
    statKeyToName["BLADE_DAMAGE"] = "刀";

    const weaponSlots = ["刀","剑","枪","伞","扇","绳镖","鼓","手甲","陌刀","双刀"];
    const tabOrder = ["武器","佩","环","头","衣服","腕甲","胫甲"];
    const attributeGroups = {
      "破竹": ["大破竹", "小破竹"],
      "裂石": ["大裂石", "小裂石"],
      "牵丝": ["大牵丝", "小牵丝"],
      "鸣金": ["大鸣金", "小鸣金"],
      "无相": ["大无相", "小无相"]
    };
    const state = {
      view: "equipment",
      slot: tabOrder.find(slot => EQUIPMENT.items.some(item => displaySlot(item) === slot)) || "武器",
      selectedId: null,
      selectedBenchmarkId: null,
      countWeaponsInMatrix: false
    };
    const STORAGE_KEY = "yanyun-equipment-manager-local-v1";
    const BASE_ITEMS = EQUIPMENT.items.map(item => structuredClone(item));
    const BASE_BENCHMARKS = BENCHMARKS.benchmarks.map(benchmark => structuredClone(benchmark));
    const manualState = { selectedTerms: [] };
    let localData = loadLocalData();

    function loadLocalData() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return {
          addedItems: Array.isArray(parsed.addedItems) ? parsed.addedItems : [],
          deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
          benchmarkCounts: parsed.benchmarkCounts && typeof parsed.benchmarkCounts === "object" ? parsed.benchmarkCounts : {}
        };
      } catch {
        return { addedItems: [], deletedIds: [], benchmarkCounts: {} };
      }
    }

    function saveLocalData() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    }

    function bytesToBase64(bytes) {
      let binary = "";
      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }
      return btoa(binary);
    }

    function base64ToBytes(text) {
      const binary = atob(text);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }

    function transferBytes(bytes) {
      const key = new TextEncoder().encode(TRANSFER_KEY);
      const result = new Uint8Array(bytes.length);
      for (let index = 0; index < bytes.length; index += 1) {
        result[index] = bytes[index] ^ key[index % key.length] ^ ((index * 17 + 29) % 251);
      }
      return result;
    }

    function encodeYyslsTransfer(payload) {
      const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
      return EXPORT_V2_HEADER + "\n" + bytesToBase64(transferBytes(jsonBytes));
    }

    function decodeYyslsTransfer(rawText) {
      const text = rawText.trim();
      if (!text) throw new Error("导入文件为空");
      if (text.startsWith(EXPORT_V2_HEADER)) {
        const encoded = text.slice(EXPORT_V2_HEADER.length).trim();
        const decoded = transferBytes(base64ToBytes(encoded));
        return JSON.parse(new TextDecoder().decode(decoded));
      }
      if (text.startsWith("YYSLS_EQUIPMENT_EXPORT_V1")) {
        return JSON.parse(text.slice("YYSLS_EQUIPMENT_EXPORT_V1".length).trim());
      }
      return JSON.parse(text);
    }

    function transferStat(stat) {
      return {
        key: stat.key || statNameToKey[stat.name] || stat.name,
        name: stat.name || statKeyToName[stat.key] || stat.key,
        value: stat.value ?? ""
      };
    }

    function itemToTransferItem(item) {
      const equipmentKey = slotToEquipmentKey[item.slot] || (String(item.rawEquipmentKey || "").startsWith("EQUIPMENT_") ? item.rawEquipmentKey : item.slot);
      return {
        equipmentKey,
        equipmentName: item.displayName,
        quality: item.quality === "金" ? 1 : item.quality === "紫" ? 0 : item.quality,
        type: item.type || (weaponSlots.includes(item.slot) ? "weapon" : "equipment"),
        isChengyin: item.isChengyin === true,
        attr: (item.baseAttrs || []).map(transferStat),
        firstTuning: (item.firstTuning || []).map(transferStat),
        secondaryTuning: (item.secondaryTuning || []).map(transferStat),
        pitch: (item.pitch || []).map(transferStat),
        transferMarkedSecondaryIndex: item.transferMarkedSecondaryIndex ?? null,
        tuningTimes: item.tuningTimes ?? null,
        groups: (item.groups || []).map(group => group.key || group.name || group),
        buildKeys: (item.buildKeys || []).map(group => group.key || group.name || group),
        planBindings: item.planBindings || []
      };
    }

    function normalizeImportedStat(stat) {
      const name = stat.name || statKeyToName[stat.key] || stat.key;
      return {
        key: stat.key || statNameToKey[name] || name,
        name,
        value: stat.value ?? ""
      };
    }

    function normalizeImportedGroup(group) {
      if (typeof group === "string") return { key: group, name: group };
      return { key: group.key || group.name || "", name: group.name || group.key || "" };
    }

    function countEffectiveTermsForItem(item) {
      const counts = {};
      for (const stat of [...(item.firstTuning || []), ...(item.secondaryTuning || [])]) {
        counts[stat.name] = (counts[stat.name] || 0) + 1;
      }
      return counts;
    }

    function normalizeImportedItem(item, index, sourceName) {
      const slot = item.slot || equipmentKeyToSlot[item.equipmentKey] || item.equipmentKey || "未知";
      const normalized = {
        id: "txt-" + Date.now() + "-" + index,
        sourceIndex: item.sourceIndex ?? index,
        source: sourceName,
        rawEquipmentKey: item.rawEquipmentKey || item.equipmentKey || slotToEquipmentKey[slot] || slot,
        slot,
        displayName: item.displayName || item.equipmentName || slot + "-" + (index + 1),
        quality: item.quality === 1 ? "金" : item.quality === 0 ? "紫" : String(item.quality || "金"),
        type: item.type || (weaponSlots.includes(slot) ? "weapon" : "equipment"),
        isChengyin: item.isChengyin === true,
        baseAttrs: (item.baseAttrs || item.attr || []).map(normalizeImportedStat),
        firstTuning: (item.firstTuning || []).map(normalizeImportedStat),
        secondaryTuning: (item.secondaryTuning || []).map(normalizeImportedStat),
        pitch: (item.pitch || []).map(normalizeImportedStat),
        transferMarkedSecondaryIndex: item.transferMarkedSecondaryIndex ?? null,
        tuningTimes: item.tuningTimes ?? null,
        groups: (item.groups || []).map(normalizeImportedGroup),
        buildKeys: (item.buildKeys || []).map(normalizeImportedGroup),
        planBindings: item.planBindings || []
      };
      normalized.termCounts = countEffectiveTermsForItem(normalized);
      return normalized;
    }

    function equipmentSignature(item) {
      const statSig = list => (list || []).map(stat => (stat.name || "") + ":" + (stat.value ?? "")).join("|");
      return [
        item.slot,
        item.displayName,
        item.quality,
        item.isChengyin ? "chengyin" : "normal",
        statSig(item.firstTuning),
        statSig(item.secondaryTuning),
        statSig(item.pitch)
      ].join("::");
    }

    function summarizeEquipment(items) {
      const bySlot = {};
      const byTerm = {};
      for (const item of items) {
        bySlot[item.slot] = (bySlot[item.slot] || 0) + 1;
        for (const stat of [...item.firstTuning, ...item.secondaryTuning, ...item.pitch]) {
          byTerm[stat.name] = (byTerm[stat.name] || 0) + 1;
        }
      }
      return { bySlot, byTerm };
    }

    function applyLocalData() {
      BENCHMARKS.benchmarks = BASE_BENCHMARKS.map(benchmark => {
        const override = localData.benchmarkCounts?.[benchmark.id];
        if (!override) return structuredClone(benchmark);
        const counts = {};
        for (const [term, rawCount] of Object.entries(override)) {
          const count = Number(rawCount);
          if (Number.isFinite(count) && count > 0) counts[term] = count;
        }
        return {
          ...structuredClone(benchmark),
          counts,
          formula: formatCounts(counts)
        };
      });
      const deleted = new Set(localData.deletedIds);
      EQUIPMENT.items = [
        ...BASE_ITEMS.filter(item => !deleted.has(item.id)),
        ...localData.addedItems.filter(item => !deleted.has(item.id))
      ];
      EQUIPMENT.itemCount = EQUIPMENT.items.length;
      EQUIPMENT.summary = summarizeEquipment(EQUIPMENT.items);
      if (state.selectedId && !EQUIPMENT.items.some(item => item.id === state.selectedId)) {
        state.selectedId = null;
        state.selectedBenchmarkId = null;
      }
      if (!EQUIPMENT.items.some(item => displaySlot(item) === state.slot)) {
        state.slot = tabOrder.find(slot => EQUIPMENT.items.some(item => displaySlot(item) === slot)) || "武器";
      }
    }

    function displaySlot(item) {
      return item.type === "weapon" || weaponSlots.includes(item.slot) ? "武器" : item.slot;
    }

    function termsOf(item) {
      return {
        initial: item.firstTuning.map(stat => stat.name),
        tuning: item.secondaryTuning.map(stat => stat.name),
        pitch: item.pitch.map(stat => stat.name),
        all: [...item.firstTuning, ...item.secondaryTuning, ...item.pitch].map(stat => stat.name),
        scoring: [
          ...item.firstTuning.map(stat => ({ source: "初始", name: stat.name, value: stat.value })),
          ...item.secondaryTuning.map(stat => ({ source: "调律", name: stat.name, value: stat.value }))
        ]
      };
    }

    function flowElement(benchmark) {
      return (benchmark.flow || "").split("·")[0];
    }

    function termGroup(term) {
      for (const [group, values] of Object.entries(attributeGroups)) {
        if (values.includes(term)) return group;
      }
      return null;
    }

    function canonicalWeapon(name) {
      if (name === "刀" || name === "唐刀") return "横刀";
      return name;
    }

    function termMatches(wanted, actual) {
      if (wanted === actual) return true;
      if (wanted.includes("/")) return wanted.split("/").some(part => termMatches(part, actual));
      if (attributeGroups[wanted]?.includes(actual)) return true;
      if (canonicalWeapon(wanted) === canonicalWeapon(actual)) return true;
      return false;
    }

    function relativeAttributeCredit(actual, benchmark) {
      const group = termGroup(actual);
      if (!group) return 0;
      if (group === flowElement(benchmark)) {
        if (benchmark.category === "小外流") return 1;
        if (benchmark.category === "大外流") return 0.5;
        return 1;
      }
      if (!actual.startsWith("小")) return 0;
      if (benchmark.category === "小外流") return 0.8;
      if (benchmark.category === "大外流") return 0.5;
      return 0;
    }

    function attributeReason(actual, benchmark, credit) {
      const group = termGroup(actual);
      if (group === flowElement(benchmark)) return "本流派属性攻击按 " + credit + " 分";
      return "非本流派小属性按 " + credit + " 分";
    }

    function weaponPositionForBenchmark(item, benchmark) {
      if (displaySlot(item) !== "武器") return item.slot;
      const rule = WEAPON_RULES.benchmarkOverrides?.[benchmark.id] || WEAPON_RULES.buildWeapons?.[benchmark.flow];
      if (rule) {
        if ((rule.allowedWeapons || []).length && !rule.allowedWeapons.some(weapon => canonicalWeapon(weapon) === canonicalWeapon(item.slot))) return null;
        if (canonicalWeapon(item.slot) === canonicalWeapon(rule.mainWeapon)) return "主武器";
        if (canonicalWeapon(item.slot) === canonicalWeapon(rule.secondaryWeapon)) return "副武器";
        return "主武器";
      }
      const allowed = Object.keys(benchmark.counts || {})
        .map(term => WEAPON_RULES.weaponTermToSlot?.[term])
        .filter(Boolean);
      if (allowed.length) {
        return allowed.some(weapon => canonicalWeapon(weapon) === canonicalWeapon(item.slot)) ? "主武器" : null;
      }
      if (benchmark.flow && WEAPON_RULES.buildWeapons?.[benchmark.flow]) {
        return null;
      }
      return null;
    }

    function addUnique(list, term) {
      if (term && !list.includes(term)) list.push(term);
    }

    function hardWeaponTerms(benchmark, item) {
      return Object.keys(benchmark.counts || {}).filter(term => {
        const slot = WEAPON_RULES.weaponTermToSlot?.[term];
        return slot && canonicalWeapon(slot) === canonicalWeapon(item.slot);
      });
    }

    function generatedRuleForBenchmark(item, benchmark, ruleSlot) {
      const counts = benchmark.counts || {};
      const initialRequired = [];
      const tuningRequired = [];
      const optionalPool = [];
      const leftSlots = ["主武器", "副武器", "佩", "环"];
      const currentSlot = ruleSlot || item.slot;

      if (counts["大外"] >= 12) {
        if (leftSlots.includes(currentSlot)) addUnique(initialRequired, "大外");
        addUnique(tuningRequired, "大外");
      }
      if (counts["小外"] >= 12) {
        if (leftSlots.includes(currentSlot)) addUnique(initialRequired, "小外");
        addUnique(tuningRequired, "小外");
      }
      if (counts["敏"] >= 8) addUnique(tuningRequired, "敏");
      if (counts["劲"] >= 8) addUnique(tuningRequired, "劲");
      if (counts["劲"] >= 10 && (currentSlot === "腕甲" || currentSlot === "胫甲")) {
        addUnique(initialRequired, "劲");
      }
      if ((currentSlot === "佩" || currentSlot === "环") && counts["全武"] >= 2) {
        addUnique(tuningRequired, "全武");
      }
      if ((currentSlot === "腕甲" || currentSlot === "胫甲") && counts["首领"] >= 2) {
        addUnique(tuningRequired, "首领");
      }
      if (displaySlot(item) === "武器") {
        for (const term of hardWeaponTerms(benchmark, item)) addUnique(tuningRequired, term);
      }

      for (const term of Object.keys(counts)) {
        if (["大外", "小外", "敏", "劲", "全武", "首领"].includes(term)) continue;
        if (WEAPON_RULES.weaponTermToSlot?.[term]) continue;
        addUnique(optionalPool, term);
      }

      return {
        initialRequired,
        tuningRequired,
        initialOptionalPool: [],
        optionalPool,
        generated: true
      };
    }

    function itemRuleForBenchmark(item, benchmark) {
      const rec = RECS.derivedBenchmarks.find(entry => entry.benchmarkId === benchmark.id);
      const ruleSlot = displaySlot(item) === "武器" ? weaponPositionForBenchmark(item, benchmark) : item.slot;
      if (!ruleSlot) return null;
      const explicitRule = rec?.requiredBySlot?.[ruleSlot];
      const generatedRule = generatedRuleForBenchmark(item, benchmark, ruleSlot);
      const rule = explicitRule ? {
        ...generatedRule,
        ...explicitRule,
        initialRequired: Array.from(new Set([...(generatedRule.initialRequired || []), ...(explicitRule.initialRequired || [])])),
        tuningRequired: Array.from(new Set([...(generatedRule.tuningRequired || []), ...(explicitRule.tuningRequired || [])])),
        optionalPool: Array.from(new Set([...(generatedRule.optionalPool || []), ...(explicitRule.optionalPool || [])])),
        initialOptionalPool: Array.from(new Set([...(generatedRule.initialOptionalPool || []), ...(explicitRule.initialOptionalPool || [])]))
      } : generatedRule;
      return { rec, ruleSlot, rule };
    }

    function exactMatchForTerm(actual, source, rule) {
      if (source === "初始" && (rule.initialRequired || []).some(term => termMatches(term, actual))) {
        return { need: (rule.initialRequired || []).filter(term => termMatches(term, actual)).join(" / "), reason: "必选命中" };
      }
      if (source === "初始" && (rule.initialOptionalPool || []).some(term => termMatches(term, actual))) {
        return { need: (rule.initialOptionalPool || []).join(" / "), reason: "可选命中" };
      }
      if (source === "调律" && (rule.tuningRequired || []).some(term => termMatches(term, actual))) {
        return { need: (rule.tuningRequired || []).filter(term => termMatches(term, actual)).join(" / "), reason: "必选命中" };
      }
      if ((rule.optionalPool || []).some(term => termMatches(term, actual))) {
        return { need: (rule.optionalPool || []).join(" / "), reason: "可选命中" };
      }
      return null;
    }

    function evaluateRule(item, benchmark, rec, ruleSlot, rule) {
      const terms = termsOf(item);
      const requiredInitial = (rule.initialRequired || []).map(term => ({
        term,
        ok: terms.initial.some(actual => termMatches(term, actual))
      }));
      const requiredTuning = (rule.tuningRequired || []).map(term => ({
        term,
        ok: terms.tuning.some(actual => termMatches(term, actual))
      }));
      const optionalInitialHits = (rule.initialOptionalPool || []).filter(term =>
        terms.initial.some(actual => termMatches(term, actual))
      );
      const optionalHits = (rule.optionalPool || []).filter(term =>
        terms.all.some(actual => termMatches(term, actual))
      );

      const termDetails = terms.scoring.map(stat => {
        const relative = relativeAttributeCredit(stat.name, benchmark);
        if (relative && termGroup(stat.name) === flowElement(benchmark)) {
          return {
            ...stat,
            need: "大" + flowElement(benchmark) + " / 小" + flowElement(benchmark),
            matched: "有用",
            credit: relative,
            kind: "relative",
            reason: attributeReason(stat.name, benchmark, relative)
          };
        }
        const exact = exactMatchForTerm(stat.name, stat.source, rule);
        if (exact) {
          return {
            ...stat,
            need: exact.need,
            matched: "命中",
            credit: 1,
            kind: "hit",
            reason: exact.reason
          };
        }
        if (relative) {
          return {
            ...stat,
            need: "非本流派小属性",
            matched: "可用",
            credit: relative,
            kind: "relative",
            reason: attributeReason(stat.name, benchmark, relative)
          };
        }
        return { ...stat, need: "-", matched: "未命中", credit: 0, kind: "miss", reason: "无对应需求" };
      });

      let requiredTotal = requiredInitial.length + requiredTuning.length;
      let requiredHit = requiredInitial.filter(entry => entry.ok).length + requiredTuning.filter(entry => entry.ok).length;
      if ((rule.initialOptionalPool || []).length) {
        requiredTotal += 1;
        if (optionalInitialHits.length > 0) requiredHit += 1;
      }

      const missingRequired = [
        ...requiredInitial.filter(entry => !entry.ok).map(entry => entry.term + "（首词条）"),
        ...requiredTuning.filter(entry => !entry.ok).map(entry => entry.term)
      ];
      if ((rule.initialOptionalPool || []).length && optionalInitialHits.length === 0) {
        missingRequired.push(rule.initialOptionalPool.join(" / ") + "（首词条任选 1 条）");
      }
      const rawScore = termDetails.reduce((sum, entry) => sum + entry.credit, 0);
      const total = terms.scoring.length || 5;
      const hardCap = Math.max(0, total - missingRequired.length);
      const hit = Math.min(total, hardCap, Math.round(rawScore * 10) / 10);

      return {
        benchmark,
        rec,
        ruleSlot,
        rule,
        hit,
        total,
        requiredHit,
        requiredTotal,
        requiredInitial,
        requiredTuning,
        optionalInitialHits,
        optionalHits,
        termDetails,
        missingRequired,
        status: hit + "/" + total + " 条"
      };
    }

    function fallbackEvaluate(item, benchmark, ruleSlot) {
      const terms = termsOf(item).all;
      const scoringTerms = termsOf(item).scoring;
      const wanted = Object.keys(benchmark.counts || {});
      const hits = wanted.filter(term => terms.some(actual => termMatches(term, actual)));
      const termDetails = scoringTerms.map(stat => {
        const relative = relativeAttributeCredit(stat.name, benchmark);
        if (relative && termGroup(stat.name) === flowElement(benchmark)) {
          return {
            ...stat,
            need: "大" + flowElement(benchmark) + " / 小" + flowElement(benchmark),
            matched: "有用",
            credit: relative,
            kind: "relative",
            reason: attributeReason(stat.name, benchmark, relative)
          };
        }
        const matchedWanted = wanted.filter(term => termMatches(term, stat.name));
        if (matchedWanted.length) {
          return {
            ...stat,
            need: matchedWanted.join(" / "),
            matched: "命中",
            credit: 1,
            kind: "hit",
            reason: "命中 benchmark 词条"
          };
        }
        if (relative) {
          return {
            ...stat,
            need: "非本流派小属性",
            matched: "可用",
            credit: relative,
            kind: "relative",
            reason: attributeReason(stat.name, benchmark, relative)
          };
        }
        return {
          ...stat,
          need: "-",
          matched: "未命中",
          credit: 0,
          kind: "miss",
          reason: "未命中"
        };
      });
      const rawScore = termDetails.reduce((sum, entry) => sum + entry.credit, 0);
      const total = scoringTerms.length || 5;
      const hit = Math.min(total, Math.round(rawScore * 10) / 10);
      return {
        benchmark,
        rec: null,
        ruleSlot: ruleSlot || item.slot,
        rule: null,
        hit,
        total,
        requiredHit: hits.length,
        requiredTotal: Math.min(wanted.length, 5),
        requiredInitial: [],
        requiredTuning: [],
        optionalInitialHits: [],
        optionalHits: hits,
        termDetails,
        missingRequired: [],
        status: hit + "/" + total + " 条"
      };
    }

    function evaluateItem(item, benchmark) {
      const exact = itemRuleForBenchmark(item, benchmark);
      if (exact) return evaluateRule(item, benchmark, exact.rec, exact.ruleSlot, exact.rule);
      if (displaySlot(item) === "武器") {
        const ruleSlot = weaponPositionForBenchmark(item, benchmark);
        if (!ruleSlot) return null;
        return fallbackEvaluate(item, benchmark, ruleSlot);
      }
      return fallbackEvaluate(item, benchmark);
    }

    function availableBenchmarks() {
      const flow = document.getElementById("flowFilter")?.value || "all";
      return BENCHMARKS.benchmarks.filter(benchmark => flow === "all" || benchmark.flow === flow);
    }

    function allMatches(item) {
      return BENCHMARKS.benchmarks
        .map(benchmark => evaluateItem(item, benchmark))
        .filter(Boolean)
        .sort((a, b) => b.hit - a.hit || b.requiredHit - a.requiredHit || b.total - a.total);
    }

    function viewMatches(item) {
      return availableBenchmarks()
        .map(benchmark => evaluateItem(item, benchmark))
        .filter(Boolean)
        .sort((a, b) => b.hit - a.hit || b.requiredHit - a.requiredHit || b.total - a.total);
    }

    function selectedFlow() {
      return document.getElementById("flowFilter")?.value || "all";
    }

    function badgeClass(match) {
      if (match.hit >= match.total) return "good";
      if (match.hit >= Math.max(1, match.total - 1.5)) return "warn";
      return "bad";
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));
    }

    function matrixScoreClass(match) {
      const ratio = match.hit / match.total;
      if (ratio >= 1) return "good";
      if (ratio >= 0.8) return "warn";
      if (ratio >= 0.6) return "mid";
      return "bad";
    }

    function formatNumber(value) {
      return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
    }

    function compareConfigTerms(a, b) {
      const aIndex = AVAILABLE_TERMS.indexOf(a);
      const bIndex = AVAILABLE_TERMS.indexOf(b);
      const aRank = aIndex === -1 ? 9999 : aIndex;
      const bRank = bIndex === -1 ? 9999 : bIndex;
      return aRank - bRank || a.localeCompare(b, "zh-Hans-CN");
    }

    function formatCounts(counts) {
      return Object.entries(counts || {})
        .filter(([, count]) => Number(count) > 0)
        .sort(([a], [b]) => compareConfigTerms(a, b))
        .map(([term, count]) => formatNumber(Number(count)) + term)
        .join("+") || "暂无词条要求";
    }

    function scoreText(entry) {
      if (!entry.credit) return "0 未命中";
      const reason = entry.reason === "未命中" ? "" : " · " + entry.reason;
      return "+" + entry.credit + reason;
    }

    function matrixAttributeRows(item, match) {
      const scoring = match.termDetails.map(entry => {
        const attrClass = entry.source === "初始" ? "tooltip-attr initial" : "tooltip-attr";
        const scoreClass = "tooltip-score " + (entry.kind === "hit" ? "hit" : entry.kind === "relative" ? "relative" : "miss");
        const value = entry.value ? " " + entry.value : "";
        return '<div class="tooltip-attr-row">' +
          '<span class="' + attrClass + '">' + escapeHtml(entry.name + value) + '</span>' +
          '<span class="' + scoreClass + '">' + escapeHtml(scoreText(entry)) + '</span>' +
        '</div>';
      });
      const pitch = item.pitch.map(stat =>
        '<div class="tooltip-attr-row">' +
          '<span class="tooltip-attr">' + escapeHtml(stat.name + (stat.value ? " " + stat.value : "")) + '</span>' +
          '<span class="tooltip-score">定音，不计分</span>' +
        '</div>'
      );
      return [...scoring, ...pitch].join("");
    }

    function matrixScoreSummary(match) {
      const rawScore = Math.round(match.termDetails.reduce((sum, entry) => sum + entry.credit, 0) * 10) / 10;
      if (match.missingRequired?.length && rawScore > match.hit) {
        return "逐条可用分：" + formatNumber(rawScore) + "/" + match.total +
          "；硬性缺口：" + match.missingRequired.join(" / ") +
          "；最终封顶：" + formatNumber(match.hit) + "/" + match.total;
      }
      return "总评分：" + match.benchmark.flow + " · " + formatNumber(match.hit) + "/" + match.total;
    }

    function matrixTooltip(best) {
      const item = best.item;
      const match = best.match;
      const itemMeta = item.slot + " · " + item.quality + (item.isChengyin ? " · 承音" : "") + (displaySlot(item) === "武器" ? " · 按" + match.ruleSlot + "评分" : "");
      const formula = match.benchmark.formula ? "方案：" + match.benchmark.formula : "方案：" + match.benchmark.flow;
      const missing = match.missingRequired?.length ? "缺：" + match.missingRequired.join(" / ") : "硬性词条已满足";
      return '<div class="matrix-tooltip">' +
        '<div class="tooltip-title">' + escapeHtml(item.displayName) + '</div>' +
        '<div class="tooltip-line">' + escapeHtml(itemMeta) + '</div>' +
        '<div class="tooltip-line">' + escapeHtml(formula) + '</div>' +
        '<div class="tooltip-line">' + escapeHtml(missing) + '</div>' +
        '<div class="tooltip-attrs">' + matrixAttributeRows(item, match) + '</div>' +
        '<div class="tooltip-line">' + escapeHtml(matrixScoreSummary(match)) + '</div>' +
      '</div>';
    }

    function statText(stat) {
      return stat.name + (stat.value !== null && stat.value !== undefined ? " " + stat.value : "");
    }

    function itemSourceLabel(item) {
      if (item.source === "manual") return "手动录入";
      if (item.source === "feishu-sheet-screenshot") return "飞书截图导入";
      return "yysls-assistant";
    }

    function renderManualManager() {
      const slotOptions = ["佩", "环", "头", "衣服", "腕甲", "胫甲", ...weaponSlots];
      const slotSelect = document.getElementById("manualSlot");
      if (!slotSelect.dataset.ready) {
        slotSelect.innerHTML = slotOptions.map(slot => '<option value="' + escapeHtml(slot) + '">' + escapeHtml(slot) + '</option>').join("");
        slotSelect.dataset.ready = "1";
      }
      const labels = ["初始", "调律2", "调律3", "调律4", "调律5"];
      document.getElementById("manualSequence").innerHTML = manualState.selectedTerms.length
        ? manualState.selectedTerms.map((term, index) =>
          '<span class="sequence-chip">' + labels[index] + ' · ' + escapeHtml(term) + '</span>'
        ).join("")
        : '<span class="muted">请选择 5 个词条</span>';
      document.getElementById("termPalette").innerHTML = AVAILABLE_TERMS.map(term =>
        '<button class="term-option" type="button" data-term="' + escapeHtml(term) + '"' +
          (manualState.selectedTerms.length >= 5 ? " disabled" : "") + '>' + escapeHtml(term) + '</button>'
      ).join("");
      document.querySelectorAll("[data-term]").forEach(button => {
        button.addEventListener("click", () => {
          if (manualState.selectedTerms.length >= 5) return;
          manualState.selectedTerms.push(button.dataset.term);
          renderManualManager();
        });
      });
    }

    function buildManualItem() {
      const slot = document.getElementById("manualSlot").value;
      const terms = manualState.selectedTerms;
      const id = "manual-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
      const makeStat = name => ({ key: name, name, value: null });
      return {
        id,
        sourceIndex: localData.addedItems.length,
        source: "manual",
        rawEquipmentKey: id,
        slot,
        displayName: "手动-" + slot + "-" + terms.slice(0, 2).join("-"),
        quality: "金",
        type: weaponSlots.includes(slot) ? "weapon" : "armor",
        isChengyin: false,
        baseAttrs: [],
        firstTuning: terms[0] ? [makeStat(terms[0])] : [],
        secondaryTuning: terms.slice(1, 5).map(makeStat),
        pitch: [],
        tuningTimes: null,
        groups: [{ key: "manual", name: "手动录入" }]
      };
    }

    function addManualItem() {
      if (manualState.selectedTerms.length < 5) {
        alert("请完整选择 5 个词条：1 条初始 + 4 条调律。定音暂不录入。");
        return;
      }
      const item = buildManualItem();
      localData.addedItems.push(item);
      saveLocalData();
      manualState.selectedTerms = [];
      applyLocalData();
      state.slot = displaySlot(item);
      state.selectedId = item.id;
      state.selectedBenchmarkId = null;
      closeManualModal();
      renderAll();
    }

    function openManualModal() {
      renderManualManager();
      document.getElementById("manualModal").classList.remove("hidden");
    }

    function closeManualModal() {
      document.getElementById("manualModal").classList.add("hidden");
    }

    function deleteSelectedItem() {
      const item = EQUIPMENT.items.find(entry => entry.id === state.selectedId);
      if (!item) return;
      if (!confirm("确认删除这件装备？\\n" + item.displayName)) return;
      localData.addedItems = localData.addedItems.filter(entry => entry.id !== item.id);
      if (BASE_ITEMS.some(entry => entry.id === item.id) && !localData.deletedIds.includes(item.id)) {
        localData.deletedIds.push(item.id);
      }
      saveLocalData();
      applyLocalData();
      renderAll();
    }

    function clearEquipmentArchive() {
      if (!confirm("确认清空当前装备存档？\\n这会隐藏仓库示例装备，并清空本地手动录入/导入的装备；流派配置不会被清空。")) return;
      localData.addedItems = [];
      localData.deletedIds = BASE_ITEMS.map(item => item.id);
      saveLocalData();
      manualState.selectedTerms = [];
      state.selectedId = null;
      state.selectedBenchmarkId = null;
      applyLocalData();
      renderFilters();
      renderAll();
    }

    function exportEquipmentTxt() {
      const payload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        roleName: EQUIPMENT.roleName || "",
        source: "yanyun-equipment-manager",
        items: EQUIPMENT.items.map(itemToTransferItem)
      };
      const text = encodeYyslsTransfer(payload);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = "yanyun-equipment-export-" + date + ".txt";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function importEquipmentTxtFile(file) {
      if (!file) return;
      try {
        const payload = decodeYyslsTransfer(await file.text());
        const rawItems = Array.isArray(payload.items) ? payload.items : [];
        const importedItems = rawItems.map((item, index) => normalizeImportedItem(item, index, "txt-import"));
        const existingSignatures = new Set(EQUIPMENT.items.map(equipmentSignature));
        const addedSignatures = new Set(localData.addedItems.map(equipmentSignature));
        const freshItems = [];
        for (const item of importedItems) {
          const signature = equipmentSignature(item);
          if (existingSignatures.has(signature) || addedSignatures.has(signature)) continue;
          freshItems.push(item);
          existingSignatures.add(signature);
          addedSignatures.add(signature);
        }
        if (!freshItems.length) {
          alert("导入完成：没有发现新的装备。");
          return;
        }
        localData.addedItems.push(...freshItems);
        saveLocalData();
        applyLocalData();
        state.slot = displaySlot(freshItems[0]);
        state.selectedId = freshItems[0].id;
        state.selectedBenchmarkId = null;
        renderFilters();
        renderAll();
        alert("导入完成：新增 " + freshItems.length + " 件装备，跳过重复 " + (importedItems.length - freshItems.length) + " 件。");
      } catch (error) {
        alert("导入失败：" + (error?.message || error));
      }
    }

    function bindManagementEvents() {
      document.getElementById("openManualModal").addEventListener("click", openManualModal);
      document.getElementById("exportEquipmentTxt").addEventListener("click", exportEquipmentTxt);
      document.getElementById("importEquipmentTxt").addEventListener("click", () => {
        document.getElementById("equipmentTxtFile").click();
      });
      document.getElementById("equipmentTxtFile").addEventListener("change", event => {
        importEquipmentTxtFile(event.target.files?.[0]);
        event.target.value = "";
      });
      document.getElementById("closeManualModal").addEventListener("click", closeManualModal);
      document.getElementById("manualModal").addEventListener("click", event => {
        if (event.target.id === "manualModal") closeManualModal();
      });
      document.getElementById("manualUndo").addEventListener("click", () => {
        manualState.selectedTerms.pop();
        renderManualManager();
      });
      document.getElementById("manualAdd").addEventListener("click", addManualItem);
      document.getElementById("clearEquipmentArchive").addEventListener("click", clearEquipmentArchive);
      document.getElementById("resetLocalData").addEventListener("click", () => {
        if (!confirm("确认恢复示例装备和默认流派配置？\\n本地新增、删除和流派配置改动都会清空。")) return;
        localData = { addedItems: [], deletedIds: [], benchmarkCounts: {} };
        saveLocalData();
        manualState.selectedTerms = [];
        applyLocalData();
        renderFilters();
        renderAll();
      });
    }

    function renderStats() {
      const data = [
        ["装备", EQUIPMENT.itemCount],
        ["部位", Object.keys(EQUIPMENT.summary.bySlot).length],
        ["方案", BENCHMARKS.benchmarks.length]
      ];
      document.getElementById("stats").innerHTML = data.map(pair =>
        '<div class="stat"><b>' + pair[1] + '</b><span>' + pair[0] + '</span></div>'
      ).join("");
    }

    function renderTabs() {
      const slots = tabOrder.filter(slot => EQUIPMENT.items.some(item => displaySlot(item) === slot));
      document.getElementById("tabs").innerHTML = slots.map(slot => {
        const count = EQUIPMENT.items.filter(item => displaySlot(item) === slot).length;
        return '<button class="tab ' + (state.slot === slot ? "active" : "") + '" data-slot="' + slot + '">' + slot + ' · ' + count + '</button>';
      }).join("");
      document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
          state.slot = tab.dataset.slot;
          const first = filteredItems()[0];
          state.selectedId = first?.id || null;
          renderAll();
        });
      });
    }

    function renderFilters() {
      const flows = ["all", ...Array.from(new Set(BENCHMARKS.benchmarks.map(benchmark => benchmark.flow)))];
      document.getElementById("flowFilter").innerHTML = flows.map(flow =>
        '<option value="' + flow + '">' + (flow === "all" ? "全部流派评分" : "流派视角：" + flow) + '</option>'
      ).join("");
    }

    function filteredItems() {
      const term = document.getElementById("termSearch").value.trim();
      const stateFilter = document.getElementById("stateFilter").value;
      return EQUIPMENT.items.filter(item => {
        if (displaySlot(item) !== state.slot) return false;
        if (term && !termsOf(item).all.some(name => name.includes(term))) return false;
        if (stateFilter === "chengyin" && !item.isChengyin) return false;
        if (stateFilter === "gold" && item.quality !== "金") return false;
        if (selectedFlow() !== "all" && !viewMatches(item).some(match => match.hit > 0)) return false;
        return true;
      }).sort((a, b) => {
        const aBest = (selectedFlow() === "all" ? allMatches(a) : viewMatches(a))[0];
        const bBest = (selectedFlow() === "all" ? allMatches(b) : viewMatches(b))[0];
        return (bBest?.hit || 0) - (aBest?.hit || 0) || (bBest?.requiredHit || 0) - (aBest?.requiredHit || 0);
      });
    }

    function flowTags(item) {
      const bestByFlow = new Map();
      for (const match of allMatches(item)) {
        const current = bestByFlow.get(match.benchmark.flow);
        if (!current || match.hit > current.hit) bestByFlow.set(match.benchmark.flow, match);
      }
      const tags = Array.from(bestByFlow.values())
        .filter(match => match.hit > 0)
        .sort((a, b) => b.hit - a.hit || b.requiredHit - a.requiredHit)
        .slice(0, 5);
      const bestRatio = tags.length ? tags[0].hit / tags[0].total : 0;
      return tags.map(match => {
        const ratio = match.hit / match.total;
        const isTop = Math.abs(ratio - bestRatio) < 0.0001;
        return '<span class="flow-tag ' + (isTop ? "best" : "") + '">' +
          match.benchmark.flow + ' ' + match.hit + '/' + match.total +
        '</span>';
      }).join("");
    }

    function benchmarkPurpose(benchmark, names = []) {
      if (benchmark?.flow === "鸣金·影" || benchmark?.flow === "鸣金·虹") return { label: "会意", className: "purpose-huiyi" };
      if (benchmark?.counts?.["大外"] >= 12) return { label: "大外", className: "purpose-dawai" };
      if (benchmark?.counts?.["小外"] >= 12) return { label: "小外", className: "purpose-xiaowai" };
      if (benchmark?.category === "会意流") return { label: "会意", className: "purpose-huiyi" };
      if (names.some(name => name.includes("玩家增") || name.includes("治疗") || name.includes("受疗"))) return { label: "治疗", className: "purpose-heal" };
      return { label: "未分类", className: "purpose-unknown" };
    }

    function itemPurpose(item, match) {
      const scoringNames = termsOf(item).scoring.map(term => term.name);
      return benchmarkPurpose(match?.benchmark, scoringNames);
    }

    function renderCards() {
      const items = filteredItems();
      if (!state.selectedId || !items.some(item => item.id === state.selectedId)) {
        state.selectedId = items[0]?.id || null;
      }
      document.getElementById("slotTitle").textContent = state.slot + " 装备";
      document.getElementById("slotHint").textContent = items.length + " 件符合当前筛选";
      document.getElementById("cards").innerHTML = items.map(item => {
        const best = (selectedFlow() === "all" ? allMatches(item) : viewMatches(item))[0];
        const purpose = itemPurpose(item, best);
        const terms = [
          ...item.firstTuning.map(stat => '<span class="term initial">' + escapeHtml(stat.name) + '</span>'),
          ...item.secondaryTuning.map(stat => '<span class="term">' + escapeHtml(stat.name) + '</span>'),
          ...item.pitch.map(stat => '<span class="term pitch">' + escapeHtml(stat.name) + '</span>')
        ].join("");
        const tags = flowTags(item);
        return '<article class="card ' + (state.selectedId === item.id ? "active" : "") + '" data-id="' + item.id + '">' +
          '<div class="card-head">' +
            '<div><div class="card-title"><span class="purpose-label ' + purpose.className + '">' + escapeHtml(purpose.label) + '</span></div><div class="muted">' + escapeHtml(item.slot + ' · ' + item.quality + (item.isChengyin ? " · 承音" : "")) + '</div><div class="import-name">' + escapeHtml(item.displayName) + '</div></div>' +
            '<span class="badge ' + (best ? badgeClass(best) : "bad") + '">' + (best ? best.status : "无") + '</span>' +
          '</div>' +
          '<div class="terms">' + terms + '</div>' +
          '<div class="flow-tags">' + (tags || '<span class="flow-tag">暂无适合流派</span>') + '</div>' +
        '</article>';
      }).join("") || '<div class="empty">这个部位没有符合条件的装备</div>';
      document.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", () => {
          state.selectedId = card.dataset.id;
          state.selectedBenchmarkId = null;
          renderCards();
          renderDetail();
        });
      });
    }

    function matrixRows() {
      const rows = new Map();
      for (const benchmark of BENCHMARKS.benchmarks) {
        const purpose = benchmarkPurpose(benchmark);
        const key = benchmark.flow + "::" + purpose.label;
        if (!rows.has(key)) {
          rows.set(key, { flow: benchmark.flow, purpose, benchmarks: [] });
        }
        rows.get(key).benchmarks.push(benchmark);
      }
      return Array.from(rows.values());
    }

    function purposeOrder(label) {
      return ({ "小外": 1, "大外": 2, "会意": 3, "治疗": 4, "未分类": 5 })[label] || 9;
    }

    function matrixSlots() {
      const normalSlots = tabOrder
        .filter(slot => slot !== "武器" && EQUIPMENT.items.some(item => displaySlot(item) === slot))
        .map(slot => ({ label: slot, kind: "slot", slot }));
      if (!EQUIPMENT.items.some(item => displaySlot(item) === "武器")) return normalSlots;
      return [
        ...normalSlots,
        { label: "主武器", kind: "weapon", ruleSlot: "主武器" },
        { label: "副武器", kind: "weapon", ruleSlot: "副武器" }
      ];
    }

    function bestItemForMatrixSlot(row, slotDef) {
      const candidates = EQUIPMENT.items.filter(item =>
        slotDef.kind === "weapon" ? displaySlot(item) === "武器" : displaySlot(item) === slotDef.slot
      );
      let best = null;
      for (const item of candidates) {
        for (const benchmark of row.benchmarks) {
          const match = evaluateItem(item, benchmark);
          if (!match || match.hit <= 0) continue;
          if (slotDef.kind === "weapon" && match.ruleSlot !== slotDef.ruleSlot) continue;
          const scoreRatio = match.hit / match.total;
          const bestRatio = best ? best.match.hit / best.match.total : -1;
          if (!best || scoreRatio > bestRatio || (Math.abs(scoreRatio - bestRatio) < 0.0001 && match.hit > best.match.hit)) {
            best = { item, match };
          }
        }
      }
      return best;
    }

    function rowMatrixData(row, slots) {
      let hit = 0;
      let total = 0;
      const bestBySlot = new Map();
      for (const slot of slots) {
        const best = bestItemForMatrixSlot(row, slot);
        bestBySlot.set(slot.label, best);
        if (slot.kind === "weapon" && !state.countWeaponsInMatrix) continue;
        total += 5;
        if (best) hit += best.match.hit;
      }
      return { hit, total, bestBySlot };
    }

    function rowRequirementText(row) {
      const formulas = Array.from(new Set(row.benchmarks.map(benchmark => benchmark.formula).filter(Boolean)));
      if (!formulas.length) return "暂无词条要求";
      return formulas[0] + (formulas.length > 1 ? " 等 " + formulas.length + " 套方案" : "");
    }

    function renderMatrixView() {
      const slots = matrixSlots();
      const toggle = document.getElementById("countWeaponsToggle");
      if (toggle) toggle.checked = state.countWeaponsInMatrix;
      const note = document.getElementById("matrixScoreNote");
      if (note) {
        note.textContent = state.countWeaponsInMatrix
          ? "当前总分和排序已计入主/副武器"
          : "当前总分和排序只计算通用装备，不计算主/副武器";
      }
      const rows = matrixRows()
        .map(row => ({ ...row, matrix: rowMatrixData(row, slots) }))
        .sort((a, b) =>
          purposeOrder(a.purpose.label) - purposeOrder(b.purpose.label) ||
          b.matrix.hit - a.matrix.hit ||
          a.flow.localeCompare(b.flow, "zh-Hans-CN")
        );
      const header = '<thead><tr><th>流派</th>' + slots.map(slot => '<th>' + escapeHtml(slot.label) + '</th>').join("") + '</tr></thead>';
      const body = rows.map(row => {
        const cells = slots.map(slot => {
          const best = row.matrix.bestBySlot.get(slot.label);
          if (!best) return '<td><span class="matrix-empty">-</span></td>';
          return '<td><div class="matrix-cell" tabindex="0">' +
            '<span class="matrix-score ' + matrixScoreClass(best.match) + '">' + best.match.hit + '/' + best.match.total + '</span>' +
            '<span class="matrix-name">' + escapeHtml(best.item.displayName) + '</span>' +
            '<span class="matrix-meta">' + escapeHtml(best.item.slot + (best.item.isChengyin ? " · 承音" : "")) + '</span>' +
            matrixTooltip(best) +
          '</div></td>';
        }).join("");
        return '<tr><td><div class="matrix-flow">' +
          '<div class="matrix-flow-head">' +
            '<span class="matrix-flow-name">' + escapeHtml(row.flow) + '</span>' +
            '<span class="matrix-flow-total ' + matrixScoreClass(row.matrix) + '">' + escapeHtml(formatNumber(row.matrix.hit) + "/" + row.matrix.total) + '</span>' +
          '</div>' +
          '<span class="purpose-label ' + row.purpose.className + '">' + escapeHtml(row.purpose.label) + '</span>' +
          '<span class="matrix-flow-req">' + escapeHtml(rowRequirementText(row)) + '</span>' +
        '</div></td>' + cells + '</tr>';
      }).join("");
      document.getElementById("matrixWrap").innerHTML = '<table class="matrix-table">' + header + '<tbody>' + body + '</tbody></table>';
    }

    function configTermOptions(benchmark) {
      return Array.from(new Set([
        ...Object.keys(benchmark.counts || {}),
        ...AVAILABLE_TERMS
      ])).sort(compareConfigTerms);
    }

    function baseBenchmarkById(id) {
      return BASE_BENCHMARKS.find(benchmark => benchmark.id === id);
    }

    function saveBenchmarkCounts(id, counts) {
      localData.benchmarkCounts = localData.benchmarkCounts || {};
      const cleanCounts = {};
      for (const [term, rawCount] of Object.entries(counts || {})) {
        const count = Number(rawCount);
        if (Number.isFinite(count) && count > 0) cleanCounts[term] = count;
      }
      const base = baseBenchmarkById(id);
      const baseText = JSON.stringify(base?.counts || {});
      const cleanText = JSON.stringify(cleanCounts);
      if (base && cleanText === baseText) {
        delete localData.benchmarkCounts[id];
      } else {
        localData.benchmarkCounts[id] = cleanCounts;
      }
      saveLocalData();
      applyLocalData();
    }

    function renderBenchmarkConfigView() {
      const rows = BENCHMARKS.benchmarks
        .slice()
        .sort((a, b) =>
          purposeOrder(benchmarkPurpose(a).label) - purposeOrder(benchmarkPurpose(b).label) ||
          a.flow.localeCompare(b.flow, "zh-Hans-CN") ||
          a.id.localeCompare(b.id)
        )
        .map(benchmark => {
          const purpose = benchmarkPurpose(benchmark);
          const counts = benchmark.counts || {};
          const fields = Object.entries(counts)
            .sort(([a], [b]) => compareConfigTerms(a, b))
            .map(([term, count]) =>
              '<label class="count-field">' +
                '<span>' + escapeHtml(term) + '</span>' +
                '<input class="benchmark-count" data-benchmark-id="' + escapeHtml(benchmark.id) + '" data-term="' + escapeHtml(term) + '" type="number" min="0" step="1" value="' + escapeHtml(count) + '" />' +
              '</label>'
            ).join("");
          const options = configTermOptions(benchmark)
            .filter(term => !(term in counts))
            .map(term => '<option value="' + escapeHtml(term) + '">' + escapeHtml(term) + '</option>')
            .join("");
          return '<tr data-config-id="' + escapeHtml(benchmark.id) + '">' +
            '<td>' +
              '<div class="config-flow-cell">' +
              '<div class="config-title-row">' +
                '<div class="config-title">' + escapeHtml(benchmark.flow) + '</div>' +
                '<span class="purpose-label ' + purpose.className + '">' + escapeHtml(purpose.label) + '</span>' +
              '</div>' +
              '<div class="config-subtitle">' + escapeHtml(benchmark.set + ' / ' + benchmark.axis + (benchmark.notes ? ' · ' + benchmark.notes : "")) + '</div>' +
              '<div class="matrix-flow-req">' + escapeHtml(formatCounts(counts)) + '</div>' +
              '</div>' +
            '</td>' +
            '<td><div class="count-editor">' + (fields || '<div class="muted">暂无词条数量</div>') + '</div></td>' +
            '<td>' +
              '<div class="config-add-row">' +
                '<select class="config-add-term">' + options + '</select>' +
                '<input class="config-add-count" type="number" min="1" step="1" value="1" />' +
                '<button class="secondary-action config-add-button" type="button">添加</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join("");
      const header = '<thead><tr><th>流派</th><th>词条数量</th><th>新增词条</th></tr></thead>';
      document.getElementById("benchmarkConfigWrap").innerHTML = rows
        ? '<table class="matrix-table config-table">' + header + '<tbody>' + rows + '</tbody></table>'
        : '<div class="empty">暂无流派配置</div>';
    }

    function bindBenchmarkConfigEvents() {
      document.getElementById("benchmarkView").addEventListener("change", event => {
        if (!event.target.classList.contains("benchmark-count")) return;
        const id = event.target.dataset.benchmarkId;
        const term = event.target.dataset.term;
        const benchmark = BENCHMARKS.benchmarks.find(entry => entry.id === id);
        if (!benchmark) return;
        const counts = { ...(benchmark.counts || {}) };
        const count = Number(event.target.value);
        if (Number.isFinite(count) && count > 0) counts[term] = count;
        else delete counts[term];
        saveBenchmarkCounts(id, counts);
        renderFilters();
        renderBenchmarkConfigView();
      });
      document.getElementById("benchmarkView").addEventListener("click", event => {
        if (!event.target.classList.contains("config-add-button")) return;
        const card = event.target.closest("[data-config-id]");
        const id = card?.dataset.configId;
        const benchmark = BENCHMARKS.benchmarks.find(entry => entry.id === id);
        if (!benchmark) return;
        const term = card.querySelector(".config-add-term")?.value;
        const count = Number(card.querySelector(".config-add-count")?.value || 1);
        if (!term || !Number.isFinite(count) || count <= 0) return;
        saveBenchmarkCounts(id, { ...(benchmark.counts || {}), [term]: count });
        renderFilters();
        renderBenchmarkConfigView();
      });
      document.getElementById("resetBenchmarkCounts").addEventListener("click", () => {
        if (!confirm("确认恢复所有流派的默认词条数量？")) return;
        localData.benchmarkCounts = {};
        saveLocalData();
        applyLocalData();
        renderFilters();
        renderBenchmarkConfigView();
      });
    }

    function renderRequirementRows(match) {
      if (!match.rule) {
        return '<div class="row neutral"><span>该流派暂未细化到部位规则</span><span>按词条泛化命中</span></div>';
      }
      const rows = [];
      for (const entry of match.requiredInitial) {
        rows.push('<div class="row ' + (entry.ok ? "hit" : "miss") + '"><span>必须：初始 ' + entry.term + '</span><span>' + (entry.ok ? "已命中" : "未命中") + '</span></div>');
      }
      if ((match.rule.initialOptionalPool || []).length) {
        rows.push('<div class="row ' + (match.optionalInitialHits.length ? "hit" : "miss") + '"><span>初始可选：' + match.rule.initialOptionalPool.join(" / ") + '</span><span>' + (match.optionalInitialHits.join(" / ") || "未命中") + '</span></div>');
      }
      for (const entry of match.requiredTuning) {
        rows.push('<div class="row ' + (entry.ok ? "hit" : "miss") + '"><span>必须：调律 ' + entry.term + '</span><span>' + (entry.ok ? "已命中" : "未命中") + '</span></div>');
      }
      if ((match.rule.optionalPool || []).length) {
        rows.push('<div class="row neutral"><span>可选池：' + match.rule.optionalPool.join(" / ") + '</span><span>已命中 ' + (match.optionalHits.join(" / ") || "无") + '</span></div>');
      }
      return rows.join("");
    }

    function renderScoreTable(match) {
      const rows = match.termDetails.map(entry => {
        const cls = entry.kind === "hit" ? "hit" : entry.kind === "relative" ? "relative" : "miss";
        const score = entry.credit ? "+" + entry.credit : "0";
        const termClass = entry.source === "初始" ? "score-term initial" : "score-term";
        return '<tr class="' + cls + '">' +
          '<td><span class="' + termClass + '">' + entry.name + '</span></td>' +
          '<td>' + entry.need + '</td>' +
          '<td>' + entry.matched + '</td>' +
          '<td>' + score + '</td>' +
          '<td>' + entry.reason + '</td>' +
        '</tr>';
      }).join("");
      return '<table class="score-table">' +
        '<thead><tr><th>装备词条</th><th>流派需要</th><th>是否命中</th><th>得分</th><th>说明</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
    }

    function detailMatchFor(item, matches) {
      if (!matches.length) return null;
      const selected = matches.find(match => match.benchmark.id === state.selectedBenchmarkId);
      if (selected) return selected;
      const flow = selectedFlow();
      if (flow !== "all") {
        const fromFlow = matches.find(match => match.benchmark.flow === flow);
        if (fromFlow) return fromFlow;
      }
      return matches[0];
    }

    function renderDetail() {
      const item = EQUIPMENT.items.find(entry => entry.id === state.selectedId);
      if (!item) {
        document.getElementById("detail").innerHTML = '<div class="empty">请选择一件装备</div>';
        return;
      }
      const matches = allMatches(item);
      const best = detailMatchFor(item, matches);
      const termBadges = [
        ...item.firstTuning.map(stat => '<span class="term initial">' + escapeHtml(statText(stat)) + '</span>'),
        ...item.secondaryTuning.map(stat => '<span class="term">' + escapeHtml(statText(stat)) + '</span>'),
        ...item.pitch.map(stat => '<span class="term pitch">' + escapeHtml(statText(stat)) + '</span>')
      ].join("");
      if (!best) {
        document.getElementById("detail").innerHTML =
          '<div class="detail-head">' +
            '<div class="detail-head-row"><h2>' + escapeHtml(item.displayName) + '</h2>' +
            '<button class="icon-action" id="deleteSelected" type="button" title="删除这件装备" aria-label="删除这件装备">删</button></div>' +
            '<div class="sub">' + escapeHtml(item.slot + ' · ' + item.quality + (item.isChengyin ? " · 承音" : "") + ' · 来源 ' + itemSourceLabel(item)) + '</div>' +
          '</div>' +
          '<div class="detail-body">' +
            '<div class="terms">' + termBadges + '</div>' +
            '<div class="section">' +
              '<div class="section-title"><span>当前没有可推荐流派</span><span class="badge bad">无</span></div>' +
              '<div class="need-box">如果当前选择了某个流派，说明这件装备的武器类型不适配该流派；例如破竹·鸢只看手甲和绳镖，不推荐陌刀。</div>' +
            '</div>' +
          '</div>';
        document.getElementById("deleteSelected").addEventListener("click", deleteSelectedItem);
        return;
      }
      const benchmarkText = best
        ? best.benchmark.flow + " / " + best.benchmark.set + " / " + best.benchmark.axis
        : "暂无匹配";
      const globalCounts = best?.rec?.globalCountsRequired
        ? Object.entries(best.rec.globalCountsRequired).map(([term, count]) => term + count).join(" · ")
        : "";
      const rankings = matches.map(match =>
        '<button class="alt ' + (match.benchmark.id === best.benchmark.id ? "active" : "") + '" data-benchmark-id="' + match.benchmark.id + '">' +
        '<strong>' + match.benchmark.flow + ' / ' + match.benchmark.set + ' / ' + match.benchmark.axis + '</strong>' +
        '<span class="muted">命中 ' + match.hit + '/' + match.total + ' 条 · ' + match.benchmark.formula + '</span></button>'
      ).join("");

      document.getElementById("detail").innerHTML =
        '<div class="detail-head">' +
          '<div class="detail-head-row"><h2>' + escapeHtml(item.displayName) + '</h2>' +
          '<button class="icon-action" id="deleteSelected" type="button" title="删除这件装备" aria-label="删除这件装备">删</button></div>' +
          '<div class="sub">' + escapeHtml(item.slot + ' · ' + item.quality + (item.isChengyin ? " · 承音" : "") + ' · 来源 ' + itemSourceLabel(item)) + '</div>' +
        '</div>' +
        '<div class="detail-body">' +
          '<div class="terms">' + termBadges + '</div>' +
          '<div class="section">' +
            '<div class="section-title"><span>最贴合流派</span><span class="badge ' + (best ? badgeClass(best) : "bad") + '">' + (best ? best.status : "无") + '</span></div>' +
            '<div class="need-box">' +
              '<b>' + benchmarkText + '</b>' +
              '<div class="muted">' + (best?.benchmark.formula || "") + '</div>' +
              '<div class="muted">这个装备按：' + (best?.ruleSlot || item.slot) + ' 位置参与判断</div>' +
            '</div>' +
          '</div>' +
          '<div class="section">' +
            '<div class="section-title"><span>词条计分明细表</span><span>' + (best?.hit ?? 0) + '/' + (best?.total ?? 0) + ' 分</span></div>' +
            (best ? renderScoreTable(best) : "") +
          '</div>' +
          '<div class="section">' +
            '<div class="section-title"><span>缺失重点</span></div>' +
            '<div class="list">' + (best?.missingRequired.length
              ? best.missingRequired.map(text => '<div class="row miss"><span>' + text + '</span><span>需要补</span></div>').join("")
              : '<div class="row hit"><span>硬性词条没有缺口</span><span>OK</span></div>') + '</div>' +
          '</div>' +
          '<div class="section">' +
            '<div class="section-title"><span>全身还要凑够</span></div>' +
            '<div class="muted">' + (globalCounts || "该方案暂未单独记录全身计数") + '</div>' +
          '</div>' +
          '<div class="section">' +
            '<div class="section-title"><span>所有可用方案评分</span><span>按命中数排序</span></div>' +
            '<div class="alternatives">' + (rankings || '<div class="muted">暂无</div>') + '</div>' +
          '</div>' +
        '</div>';
      document.querySelectorAll("[data-benchmark-id]").forEach(button => {
        button.addEventListener("click", () => {
          state.selectedBenchmarkId = button.dataset.benchmarkId;
          renderDetail();
        });
      });
      document.getElementById("deleteSelected").addEventListener("click", deleteSelectedItem);
    }

    function renderAll() {
      renderStats();
      document.getElementById("equipmentView").classList.toggle("hidden", state.view !== "equipment");
      document.getElementById("matrixView").classList.toggle("hidden", state.view !== "matrix");
      document.getElementById("benchmarkView").classList.toggle("hidden", state.view !== "benchmarks");
      document.getElementById("tabs").classList.toggle("hidden", state.view !== "equipment");
      document.querySelectorAll(".view-tab").forEach(button => {
        button.classList.toggle("active", button.dataset.view === state.view);
      });
      if (state.view === "matrix") {
        renderMatrixView();
        return;
      }
      if (state.view === "benchmarks") {
        renderBenchmarkConfigView();
        return;
      }
      renderManualManager();
      renderTabs();
      renderCards();
      renderDetail();
    }

    document.querySelectorAll(".view-tab").forEach(button => {
      button.addEventListener("click", () => {
        state.view = button.dataset.view;
        renderAll();
      });
    });
    document.getElementById("termSearch").addEventListener("input", renderAll);
    document.getElementById("flowFilter").addEventListener("change", () => {
      state.selectedBenchmarkId = null;
      const first = filteredItems()[0];
      state.selectedId = first?.id || null;
      renderAll();
    });
    document.getElementById("stateFilter").addEventListener("change", () => {
      const first = filteredItems()[0];
      state.selectedId = first?.id || null;
      renderAll();
    });
    document.getElementById("matrixView").addEventListener("change", event => {
      if (event.target.id !== "countWeaponsToggle") return;
      state.countWeaponsInMatrix = event.target.checked;
      renderMatrixView();
    });
    applyLocalData();
    bindManagementEvents();
    bindBenchmarkConfigEvents();
    renderFilters();
    renderAll();
  </script>
</body>
</html>`;

writeFileSync("demo/index.html", html, "utf8");
console.log("Wrote demo/index.html");
