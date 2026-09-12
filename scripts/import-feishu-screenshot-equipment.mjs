import { writeFileSync } from "node:fs";

const sourceUrl = "https://my.feishu.cn/sheets/shtcnwhNN0MGBYCgceNcKKlZ2hb?sheet=jeHt54";

const termMap = {
  "最大外功攻击": "大外",
  "最小外功攻击": "小外",
  "全武学增效": "全武",
  "精准率": "精准",
  "会心率": "会心",
  "会意率": "会意",
  "对首领单位增伤": "首领",
  "对玩家单位增效": "玩家增",
  "单体类奇术增伤": "单体奇术增伤",
  "最大裂石攻击": "大裂石",
  "最小裂石攻击": "小裂石",
  "最大破竹攻击": "大破竹",
  "最大牵丝攻击": "大牵丝",
  "最小牵丝攻击": "小牵丝",
  "最大鸣金攻击": "大鸣金",
  "最小鸣金攻击": "小鸣金",
  "劲": "劲",
  "敏": "敏",
  "势": "势"
};

const rows = [
  ["r3_B", "大外", "环", ["最大外功攻击", "全武学增效", "敏", "最大外功攻击", "[转]劲"], "外功穿透"],
  ["r3_C", "大外", "佩", ["最大外功攻击", "最大外功攻击", "全武学增效", "敏", "[转]最大裂石攻击"], "外功穿透"],
  ["r3_D", "大外", "头", ["精准率", "最大外功攻击", "[转]会心率", "精准率", "最大破竹攻击"], "天志垂象·蓄力技增伤"],
  ["r3_E", "大外", "衣服", ["会心率", "单体类奇术增伤", "最小外功攻击", "[转]最大外功攻击", "劲"], "千香引魂盅·武学技增疗"],
  ["r3_F", "大外", "胫甲", ["劲", "[转]最大外功攻击", "精准率", "会心率", "对首领单位增伤"], "天志垂象·蓄力技增伤"],
  ["r3_G", "大外", "腕甲", ["劲", "最大外功攻击", "会心率", "对首领单位增伤", "最小外功攻击"], "十方破阵·蓄力技增伤"],
  ["r4_B", "大外2/治疗", "环", ["最大外功攻击", "会心率", "最小外功攻击", "全武学增效", "[转]劲"], "外功穿透"],
  ["r4_C", "大外2", "佩", ["最大外功攻击", "[转]最大外功攻击", "会心率", "最大破竹攻击", "全武学增效"], "外功穿透"],
  ["r4_D", "大外2", "头", ["会心率", "单体类奇术增伤", "精准率", "敏", "[转]劲"], "八方风雷枪·特殊技增伤"],
  ["r4_E", "大外2", "衣服", ["会心率", "[转]敏", "最大破竹攻击", "单体类奇术增伤", "会心率"], "天志垂象·蓄力技增伤"],
  ["r4_G", "大外2", "腕甲", ["劲", "最大外功攻击", "[转]会心率", "最大裂石攻击", "对首领单位增伤"], "嗟夫刀法·特殊技增伤"],
  ["r6_B", "小外", "环", ["最小外功攻击", "全武学增效", "[转]敏", "最小外功攻击", "最小牵丝攻击"], "外功穿透"],
  ["r6_C", "小外", "佩", ["最小外功攻击", "[转]最小外功攻击", "全武学增效", "敏", "最小鸣金攻击"], "外功穿透"],
  ["r6_D", "小外", "头", ["精准率", "[转]敏", "最小牵丝攻击", "最小裂石攻击", "最小外功攻击"], "十方破阵·蓄力技增伤"],
  ["r6_E", "小外", "衣服", ["会心率", "最大裂石攻击", "[转]最小外功攻击", "会心率", "敏"], "十方破阵·蓄力技增伤"],
  ["r6_F", "小外", "胫甲", ["会心率", "对首领单位增伤", "敏", "最大牵丝攻击", "[转]最小外功攻击"], "十方破阵·蓄力技增伤"],
  ["r6_G", "小外", "腕甲", ["会心率", "[转]敏", "最小裂石攻击", "对首领单位增伤", "最小外功攻击"], "十方破阵·蓄力技增伤"],
  ["r7_B", "小外2", "环", ["最小外功攻击", "全武学增效", "最大裂石攻击", "[转]最小外功攻击", "会心率"], "外功穿透"],
  ["r7_D", "小外2", "头", ["精准率", "最小外功攻击", "会心率", "[转]敏", "最大破竹攻击"], "天志垂象·蓄力技增伤"],
  ["r7_F", "小外2", "胫甲", ["会心率", "最小外功攻击", "最大破竹攻击", "[转]敏", "对首领单位增伤"], "斩雪刀法·武学技增伤"],
  ["r7_G", "小外2", "腕甲", ["精准率", "最小外功攻击", "对首领单位增伤", "[转]敏", "会心率"], "斩雪刀法·蓄力技增伤"],
  ["r9_B", "会意", "环", ["最大外功攻击", "[转]劲", "全武学增效", "最大破竹攻击", "最大外功攻击"], "外功穿透"],
  ["r9_C", "会意", "佩", ["最大外功攻击", "[转]会意率", "最大外功攻击", "势", "全武学增效"], "外功穿透"],
  ["r9_D", "会意", "头", ["会意率", "单体类奇术增伤", "最大外功攻击", "会意率", "[转]劲"], "积矩九剑·特殊技增伤"],
  ["r9_E", "会意", "衣服", ["会意率", "[转]会意率", "最大鸣金攻击", "势", "最大外功攻击"], "积矩九剑·流血增伤"],
  ["r9_F", "会意", "胫甲", ["劲", "[转]最大外功攻击", "最大鸣金攻击", "会意率", "对首领单位增伤"], "积矩九剑·武学技增伤"],
  ["r9_G", "会意", "腕甲", ["劲", "劲", "对首领单位增伤", "[转]最大外功攻击", "势"], "积矩九剑·流血增伤"],
  ["r10_C", "会意2", "佩", ["最大外功攻击", "最大鸣金攻击", "[转]会心率", "全武学增效", "最大外功攻击"], "无相穿透"],
  ["r11_E", "治疗/火拳奶", "衣服", ["会心率", "单体类奇术增伤", "最小外功攻击", "[转]最大外功攻击", "劲"], "千香引魂盅·武学技增疗"],
  ["r11_F", "治疗", "胫甲", ["会心率", "最大外功攻击", "对玩家单位增效", "[转]会心率", "最大牵丝攻击"], "明川药典·特殊技增疗"],
  ["r11_G", "治疗", "腕甲", ["会心率", "最小外功攻击", "最大外功攻击", "对玩家单位增效", "[转]会心率"], "明川药典·武学技增疗"]
];

function normalize(raw) {
  const transferred = raw.startsWith("[转]");
  const text = raw.replace(/^\[转\]/, "");
  return { name: termMap[text] || text, raw: text, transferred };
}

function stat(term) {
  return { key: term.name, name: term.name, value: null, rawName: term.raw };
}

const items = rows.map((entry, index) => {
  const [cell, direction, slot, rawTerms, pitch] = entry;
  const terms = rawTerms.map(normalize);
  const secondary = terms.slice(1);
  const transferIndex = secondary.findIndex(term => term.transferred);
  return {
    id: "feishu-" + cell.toLowerCase(),
    sourceIndex: index,
    source: "feishu-sheet-screenshot",
    sourceUrl,
    sourceCell: cell.replace("_", ""),
    direction,
    rawEquipmentKey: "FEISHU_" + cell,
    slot,
    displayName: "飞书-" + direction + "-" + slot,
    quality: "金",
    type: "armor",
    isChengyin: false,
    baseAttrs: [],
    firstTuning: [stat(terms[0])],
    secondaryTuning: secondary.map(stat),
    pitch: [{ key: pitch, name: pitch, value: null }],
    transferMarkedSecondaryIndex: transferIndex >= 0 ? transferIndex : null,
    tuningTimes: null,
    groups: [{ key: direction, name: direction }],
    rawTerms
  };
});

const bySlot = {};
const byTerm = {};
for (const item of items) {
  bySlot[item.slot] = (bySlot[item.slot] || 0) + 1;
  for (const stat of [...item.firstTuning, ...item.secondaryTuning, ...item.pitch]) {
    byTerm[stat.name] = (byTerm[stat.name] || 0) + 1;
  }
}

const output = {
  version: 1,
  source: "feishu-sheet-screenshot",
  sourceUrl,
  sheetId: "jeHt54",
  sheetName: "燕云毕业装备记录",
  importedAt: new Date().toISOString(),
  itemCount: items.length,
  summary: { bySlot, byTerm },
  notes: [
    "由飞书表格嵌入截图人工 OCR 结构化导入。",
    "截图只显示词条，不显示装备原始名称，因此 displayName 使用 飞书-方向-部位。",
    "最后一行定音词条写入 pitch，不参与评分。"
  ],
  items
};

writeFileSync("data/feishu-equipment.current.json", JSON.stringify(output, null, 2) + "\n");
console.log("Wrote data/feishu-equipment.current.json", items.length, "items");
