#!/bin/sh
# 一次性設定：安裝檢查工具相依套件，並啟用 pre-commit 檢查
set -e
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || PATH="/d/Install/node:$PATH"
npm install
git config core.hooksPath tools/hooks
echo "完成：之後每次 git commit 都會自動執行 node tools/check.js"
echo "Linux 若沒有 Chrome：npx playwright install chromium，或設定 CHROME_PATH"
