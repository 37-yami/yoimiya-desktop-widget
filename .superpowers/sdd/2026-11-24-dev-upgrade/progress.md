# SDD ledger — plan: docs/superpowers/plans/2026-11-24-dev-upgrade.md

## Setup

- 分支：dev（自 master 7f93fd4 切出）
- 环境事实：ffmpeg 未装（用 Pillow/ffmpeg-static 替代）；Python 3.13 + Pillow 11.1 可用；DeepSeek key 已实测连通（model: deepseek-flash）；node_modules 未安装
- Ruling: 项目无测试框架 → 用 Node 24 内置 `node --test`（tests/*.test.mjs）做 RED→GREEN；Electron GUI 行为用 `node --check` + lint + 针对性脚本验证 — 本仓库无任何既有测试，此为最小可行 TDD 基建 — 若后续接入 jest 可平移
- Ruling: sdd 辅助脚本为 bash，Windows PowerShell 下手工维护本 ledger（位置与格式与技能规定一致）
- Pre-flight 接口扫描：
  - Task1 产 config.js + characters/yoimiya/manifest.json → Task5 更新 manifest.sprite 字段、Task6/7 消费 config 常量 — 字段名以 Task1 定义为准（WIDGET_WIDTH 等 5 常量 + CHARACTER_DIR）
  - Task7 产 llm.js（chat/stream 导出）→ Task9/10 消费 — 以 Task7 Interfaces 为准
  - Task2 产 store 包装（get/set）→ Task6/7 消费 volume/aiChatEnabled 键 — 键名以 Task2 定义为准
  - 无循环冲突

## Tasks

