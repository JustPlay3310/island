# island-bench

用「小島開拓誌」真實的 bug 修復歷史，比較不同「模型 × agent」組合的實戰能力。
每題：切到修復前的版本 → 給 agent 玩家視角的問題描述 → 用隱藏測試判定有沒有修好。

## 題目

| 題目 | 難度 | 來源 commit | 症狀 |
|---|---|---|---|
| T01-ore-syntax | 難 | 62f0d64 | Wave 6 後遊戲整個打不開（實際卡了一下午，Claude 花 40 分鐘） |
| T02-ore-crash | 中 | e3d89ab | 面對稀有礦按 F 沒反應 |
| T03-metal-boots-gloves | 易 | 0f09e54 | 金屬靴／手套沒有效果 |
| T05-animals-in-dungeon | 中 | 642baa3 | 地表動物跑進地城 |
| T06-panel-same-key-close | 易 | 08eec61 | 面板無法用同一個鍵關閉 |

每題都經過驗證：修復前的版本必須 FAIL、修復後的版本必須 PASS（`node validate.js`）。

## 安裝（家裡 Linux）

和 island 的檢查工具共用同一套相依套件與 harness（`tools/harness.js`），不用另外 `npm install`：

```sh
cd island && bash tools/setup.sh       # 安裝 tools/ 的相依套件（含 playwright-core）
cd tools/bench
# 沒有 Chrome/Chromium 的話：npx playwright install chromium
node validate.js                       # 確認 5 題都是 VALID（預設以所在的 island repo 為題庫來源）
```

要用別的 island repo 當題庫來源時，設環境變數 `ISLAND_REPO=/path/to/island`。

## 跑 agent

```sh
# 指令樣板：{prompt_file} 會換成問題描述檔，指令在題目的工作目錄（island 的獨立 clone）中執行
node run.js --label opencode-qwen38-27b-q4 --agent 'opencode run "$(cat {prompt_file})"'
node run.js --label claude-sonnet          --agent 'claude -p "$(cat {prompt_file})" --permission-mode acceptEdits'

# 只跑部分題目、調整逾時（秒，預設 1800）
node run.js --label test --tasks T03-metal-boots-gloves --timeout 900 --agent '...'

# 自我測試（不需模型）
node run.js --label selftest-noop   --agent 'true'                                 # 應 0/5
node run.js --label selftest-oracle --agent 'git cherry-pick -X theirs {fix_sha}'  # 應 5/5
```

各 agent 的非互動模式參數會隨版本變動，以該工具的 `--help` 為準。

## 結果

`runs/<label>/` 底下：

- `results.jsonl`：每題是否通過、耗時、改動量、commit 數
- `<題目>/agent.log`：agent 的完整輸出
- `<題目>/agent.diff`：agent 的改動
- `<題目>/repo/`：agent 工作後的 repo，可以直接開遊戲看

同一組合建議至少跑 2～3 次（模型有隨機性），`--label` 加上 `-r1`、`-r2` 區分。

## 防洩漏

- 工作目錄會移除 `.claude/`：island 歷史中同步了對話紀錄，裡面有部分 bug 的原始回報與除錯過程。
- 隱藏測試在 `tests/`，不會複製進工作目錄。

## 新增題目

1. 從 island 的 git 歷史挑一個修復 commit，在 `tasks/tasks.json` 加一筆（`base` 用 `<commit>^`）。
2. `issue` 只寫玩家看得到的症狀，不要提示原因或修法。
3. 在 `tests/<id>.js` 寫測試：`module.exports = async (g, A) => { ... }`
   - `g.newGame(seed)`、`g.ev('遊戲內運算式')`、`g.key('e')`、`g.wait(ms)`；`A(條件, 失敗訊息)`
4. `node validate.js <id>`，確認 base FAIL、fix PASS。
