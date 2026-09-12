# 导入格式

本文记录装备导入格式，供后续网页工具和解析脚本复用。

## yysls-assistant TXT

来源站点：`https://yysls-assistant.cn/home`

工具站标识：`yysls-assistant`

### 文件结构

```text
YYSLS_EQUIPMENT_EXPORT_V2
<base64 payload>
```

### V2 解码

V2 payload 是 Base64 编码后的 XOR 混淆数据。

解码步骤：

1. 去掉文件头 `YYSLS_EQUIPMENT_EXPORT_V2`。
2. 对剩余内容做 Base64 decode，得到字节数组。
3. 使用 key `yysls-equipment-transfer` 逐字节 XOR 还原。
4. UTF-8 解码为 JSON 字符串。
5. `JSON.parse` 得到导出对象。

XOR 公式：

```text
plainByte[i] = encodedByte[i] ^ key[i % key.length] ^ ((i * 17 + 29) % 251)
```

### 顶层结构

```json
{
  "kind": "yysls-equipment-export",
  "schemaVersion": 2,
  "exportedAt": "2026-09-12T05:48:50.749Z",
  "roleName": "灵镜",
  "items": []
}
```

### 装备结构

```json
{
  "equipmentKey": "EQUIPMENT_WEAPON_BLADE",
  "equipmentName": "110",
  "quality": 1,
  "attr": [],
  "firstTuning": [],
  "secondaryTuning": [],
  "isChengyin": false,
  "transferMarkedSecondaryIndex": 3,
  "pitch": [],
  "type": "weapon",
  "tuningTimes": null,
  "groups": [],
  "buildKeys": [],
  "planBindings": []
}
```

### 本项目标准化策略

- `equipmentKey` 映射为中文部位和武器类型。
- `firstTuning` 作为装备胚子/初始词条来源。
- `secondaryTuning` 作为调律副词条来源。
- `pitch` 作为定音词条来源。
- `attr` 作为基础属性保留，不参与毕业词条数量匹配。
- `groups`、`buildKeys`、`planBindings` 保留为用户在 yysls-assistant 中已有的标记信息。

### V1 兼容

前端源码中存在旧格式头：

```text
YYSLS_EQUIPMENT_EXPORT_V1
```

V1 内容去掉头后是明文 JSON。当前项目优先支持 V2，后续如遇到 V1 文件可直接解析。

