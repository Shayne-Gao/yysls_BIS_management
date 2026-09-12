import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const EXPORT_V2_HEADER = "YYSLS_EQUIPMENT_EXPORT_V2";
const EXPORT_V1_HEADER = "YYSLS_EQUIPMENT_EXPORT_V1";
const TRANSFER_KEY = "yysls-equipment-transfer";

const slotNameMap = {
  EQUIPMENT_WEAPON_BLADE: "刀",
  EQUIPMENT_WEAPON_BIGBLADE: "陌刀",
  EQUIPMENT_WEAPON_2BLADE: "双刀",
  EQUIPMENT_WEAPON_FIST: "手甲",
  EQUIPMENT_WEAPON_ROPE: "绳镖",
  EQUIPMENT_WEAPON_SPEAR: "枪",
  EQUIPMENT_WEAPON_SWORD: "剑",
  EQUIPMENT_WEAPON_FAN: "扇",
  EQUIPMENT_WEAPON_UMBRELLA: "伞",
  EQUIPMENT_WEAPON_DRUM: "鼓",
  EQUIPMENT_PENDANT: "佩",
  EQUIPMENT_RING: "环",
  EQUIPMENT_HEAD: "头",
  EQUIPMENT_CLOTH: "衣服",
  EQUIPMENT_HAND: "腕甲",
  EQUIPMENT_SHOES: "胫甲"
};

const statNameMap = {
  MAX_EXTERNAL_ATTACK: "大外",
  MIN_EXTERNAL_ATTACK: "小外",
  CRITICAL_RATE: "会心",
  ACCURACY_RATE: "精准",
  INSIGHT_RATE: "会意",
  MIN: "敏",
  JIN: "劲",
  SHI: "势",
  WUXUE_DAMAGE: "全武",
  BOSS_DAMAGE: "首领",
  SINGLEQS_DAMAGE: "单体奇术增伤",
  AOEQS_DAMAGE: "群体奇术增伤",
  FIST_DAMAGE: "手甲",
  BIGBLADE_DAMAGE: "陌刀",
  BLADE_DAMAGE: "刀",
  "2BLADE_DAMAGE": "双刀",
  ROPE_DAMAGE: "绳镖",
  SPEAR_DAMAGE: "枪",
  SWORD_DAMAGE: "剑",
  FAN_DAMAGE: "扇",
  UMBRELLA_DAMAGE: "伞",
  DRUM_DAMAGE: "鼓",
  MAX_POZHU_ATTACK: "大破竹",
  MIN_POZHU_ATTACK: "小破竹",
  MAX_LIESHI_ATTACK: "大裂石",
  MIN_LIESHI_ATTACK: "小裂石",
  MAX_QIANSI_ATTACK: "大牵丝",
  MIN_QIANSI_ATTACK: "小牵丝",
  MAX_MINGJIN_ATTACK: "大鸣金",
  MIN_MINGJIN_ATTACK: "小鸣金",
  MAX_WUXIANG_ATTACK: "大无相",
  MIN_WUXIANG_ATTACK: "小无相",
  EXTERNAL_PENETRATION: "外功穿透",
  TZCX_XLJZS: "特殊技增伤",
  SFPZ_XLJZS: "伞派生/治疗相关",
  JFDF_XLJZS: "技法/定音增伤",
  MAX_HP: "气血",
  EXTERNAL_DEFENCE: "外防"
};

const buildNameMap = {
  LIESHI_JUN: "裂石·钧",
  LIESHI_WEI: "裂石·威",
  QIANSI_YI: "牵丝·翳",
  QIANSI_LIN: "牵丝·霖",
  QIANSI_YU: "牵丝·玉",
  QIANSI_LING: "牵丝·翎",
  POZHU_CHEN: "破竹·尘",
  POZHU_FENG: "破竹·风",
  POZHU_YUAN: "破竹·鸢",
  MINGJIN_HONG: "鸣金·虹",
  MINGJIN_YING: "鸣金·影"
};

function decodeYyslsAssistantExport(rawText) {
  const text = rawText.trim();
  if (!text) throw new Error("导入文件为空");

  if (text.startsWith(EXPORT_V2_HEADER)) {
    const payload = text.slice(EXPORT_V2_HEADER.length).trim();
    const encoded = Buffer.from(payload, "base64");
    const key = Buffer.from(TRANSFER_KEY, "utf8");
    const decoded = Buffer.alloc(encoded.length);
    for (let i = 0; i < encoded.length; i += 1) {
      decoded[i] = encoded[i] ^ key[i % key.length] ^ ((i * 17 + 29) % 251);
    }
    return JSON.parse(decoded.toString("utf8"));
  }

  if (text.startsWith(EXPORT_V1_HEADER)) {
    return JSON.parse(text.slice(EXPORT_V1_HEADER.length).trim());
  }

  return JSON.parse(text);
}

function normalizeStat(stat) {
  return {
    key: stat.key,
    name: statNameMap[stat.key] ?? stat.key,
    value: stat.value
  };
}

function countEffectiveTerms(item) {
  const counts = {};
  const add = (name) => {
    counts[name] = (counts[name] ?? 0) + 1;
  };

  for (const stat of item.firstTuning ?? []) add(stat.name);
  for (const stat of item.secondaryTuning ?? []) add(stat.name);
  return counts;
}

function normalizeItem(item, index) {
  const normalized = {
    id: `eq-${String(index + 1).padStart(3, "0")}`,
    sourceIndex: index,
    source: "yysls-assistant",
    rawEquipmentKey: item.equipmentKey,
    slot: slotNameMap[item.equipmentKey] ?? item.equipmentKey,
    displayName: item.equipmentName || `${slotNameMap[item.equipmentKey] ?? item.equipmentKey}-${index + 1}`,
    quality: item.quality === 1 ? "金" : item.quality === 0 ? "紫" : String(item.quality ?? ""),
    type: item.type,
    isChengyin: item.isChengyin === true,
    baseAttrs: (item.attr ?? []).map(normalizeStat),
    firstTuning: (item.firstTuning ?? []).map(normalizeStat),
    secondaryTuning: (item.secondaryTuning ?? []).map(normalizeStat),
    pitch: (item.pitch ?? []).map(normalizeStat),
    transferMarkedSecondaryIndex: item.transferMarkedSecondaryIndex ?? null,
    tuningTimes: item.tuningTimes ?? null,
    groups: (item.groups ?? []).map((key) => ({
      key,
      name: buildNameMap[key] ?? key
    })),
    buildKeys: (item.buildKeys ?? []).map((key) => ({
      key,
      name: buildNameMap[key] ?? key
    })),
    planBindings: item.planBindings ?? []
  };
  normalized.termCounts = countEffectiveTerms(normalized);
  return normalized;
}

function summarize(items) {
  const bySlot = {};
  const byTerm = {};
  const byBuildTag = {};

  for (const item of items) {
    bySlot[item.slot] = (bySlot[item.slot] ?? 0) + 1;
    for (const [term, count] of Object.entries(item.termCounts)) {
      byTerm[term] = (byTerm[term] ?? 0) + count;
    }
    for (const build of item.buildKeys) {
      byBuildTag[build.name] = (byBuildTag[build.name] ?? 0) + 1;
    }
  }

  return { bySlot, byTerm, byBuildTag };
}

const [, , inputPath, outputPath = "data/my-equipment.current.json"] = process.argv;
if (!inputPath) {
  console.error("Usage: node scripts/parse-yysls-assistant.mjs <export.txt> [output.json]");
  process.exit(1);
}

const sourceText = readFileSync(inputPath, "utf8");
const decoded = decodeYyslsAssistantExport(sourceText);
const items = (decoded.items ?? []).map(normalizeItem);
const result = {
  version: 1,
  source: "yysls-assistant",
  sourceFile: basename(inputPath),
  importedAt: new Date().toISOString(),
  exportedAt: decoded.exportedAt,
  roleName: decoded.roleName,
  schemaVersion: decoded.schemaVersion,
  itemCount: items.length,
  summary: summarize(items),
  items
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Parsed ${items.length} items for ${decoded.roleName} -> ${outputPath}`);
