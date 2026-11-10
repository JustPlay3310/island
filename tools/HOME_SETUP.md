# 家用機本地 coding agent 架設指南（給家裡的 Claude Code 讀）

> 使用者會對你說「照 tools/HOME_SETUP.md 架環境」。請**全程使用繁體中文**回報（指令、檔名、錯誤訊息原文除外）。

## 目標

在這台家用機（Linux + ROCm、RX 9070 XT 16GB VRAM / 30GB RAM）架出一套本地 coding agent，
能撐起「小島開拓誌」這種開發對話，並用 `tools/bench/`（island-bench）量化比較各組合。

最終要有：
1. `llama-server`（ROCm 版，另測 Vulkan 版比較）
2. 本地模型：**Qwen3.8-27B**（主力）、Qwen3.6-35B-A3B 原版（快速備案）
3. **OpenCode** 接本地 llama-server 當實作 agent
4. 一份實測報告（`tools/HOME_RESULTS.md`），讓使用者決定最終組合

分工構想：OpenCode + 本地模型負責實作；Claude Code + Claude 負責設計討論與本地模型卡關時接手。

## 工作原則

- **每個步驟都要有驗收結果**才進下一步；失敗就停下來回報原因，不要硬繞過去。
- **下載大檔（模型數 GB～十幾 GB）、安裝系統套件（sudo）、改系統設定前，先告訴使用者要做什麼並等確認。**
- 不要 `git push`，不要改動 island 的 `master`（這次所有工作在 `agent-ready` 分支或新分支）。
- 模型的確切名稱、檔名、大小、建議取樣參數**一律以 Hugging Face 當下的 model card 為準，不要憑記憶**。
  找不到名稱完全一致的模型時，列出候選讓使用者選。
- 所有實測數字寫進 `tools/HOME_RESULTS.md`，不要只留在對話裡。

## 步驟 0：確認環境

回報下列資訊，給使用者看過再往下：

```sh
uname -a; cat /etc/os-release | head -3
rocminfo | grep -E "Name:.*gfx|Marketing"     # RX 9070 XT 應為 gfx1201
rocm-smi --showproductname --showmeminfo vram
free -h; df -h ~                              # 模型要幾十 GB，確認磁碟空間
node -v; git --version; cmake --version; hipcc --version
```

- RDNA4（gfx1201）需要較新的 ROCm（約 6.4 以上）。版本不足或 `rocminfo` 看不到 GPU，停下來回報，由使用者決定要不要升級。
- 缺的工具（cmake、build-essential、hip 開發套件、node）列出清單，**等使用者同意再用套件管理員裝**。

## 步驟 1：編譯 llama.cpp，比較 ROCm 與 Vulkan

兩種後端各編一份，放在不同資料夾，避免互相覆蓋：

```sh
git clone https://github.com/ggml-org/llama.cpp ~/llama.cpp && cd ~/llama.cpp

# ROCm（HIP）
cmake -S . -B build-rocm -DGGML_HIP=ON -DAMDGPU_TARGETS=gfx1201 -DCMAKE_BUILD_TYPE=Release
cmake --build build-rocm -j"$(nproc)"

# Vulkan（對照組）
cmake -S . -B build-vulkan -DGGML_VULKAN=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-vulkan -j"$(nproc)"
```

- 建置選項若與當下 llama.cpp 的文件（`docs/build.md`）不同，以文件為準。
- 驗收：兩邊的 `llama-server --version` 都能執行，且啟動 log 顯示偵測到 RX 9070 XT。
- 記錄 llama.cpp 的 commit hash 到 `HOME_RESULTS.md`（之後比較速度、除錯都需要）。

## 步驟 2：下載模型

先確認磁碟空間，**下載前讓使用者確認檔名與大小**。優先順序：

1. **Qwen3.8-27B** 的 GGUF：`Q3_K_M`（目標全進 GPU）與 `Q4_K_M`（部分放 CPU）都抓，之後實測決定。
   目標是 Q4_K_M 優先；若放不進 VRAM 導致太慢，退回 Q3_K_M。
2. **Qwen3.6-35B-A3B 原版** 的 `Q4_K_M`（MoE，用 `--n-cpu-moe` 把部分專家放 CPU）。
3. 不要用「去審查（Uncensored）」的版本：先前測過它是用 IQ3_M 量化的，品質已經偏低，淘汰。

放在 `~/models/`。下載可用 `huggingface-cli download`（`pip install huggingface_hub`）。

## 步驟 3：基準測速（llama-bench）

對每個「模型 × 後端」組合測 prompt 處理（pp）與生成（tg）速度：

```sh
~/llama.cpp/build-rocm/bin/llama-bench   -m <模型.gguf> -ngl 99 -fa 1 -p 2048 -n 128
~/llama.cpp/build-vulkan/bin/llama-bench -m <模型.gguf> -ngl 99 -fa 1 -p 2048 -n 128
```

- 放不進 VRAM 的組合要調整 `-ngl`（或 MoE 用 `--n-cpu-moe`）找出「剛好放得下」的設定，每組都記錄實際用的值。
- 長 context 才是這個專案的真實負載（island 對話 context 中位數約 11 萬 token）：另外測 `-p 16384` 或更長，觀察速度掉多少。
- 把結果整理成表格寫進 `HOME_RESULTS.md`，並指出 ROCm 與 Vulkan 哪個勝出。

## 步驟 4：啟動 llama-server，並跑「prompt 快取測試」（關卡）

**這一步決定方案能不能成立。** Qwen3.x 是混合架構（線性注意力 + 完整注意力），
在 llama.cpp 若無法重用前一輪的 prompt 快取，每一輪都會重算整段 prompt，
長對話會慢到不能用。

建議起手式（再依步驟 3 的結果調整）：

```sh
~/llama.cpp/build-rocm/bin/llama-server \
  -m ~/models/<模型.gguf> \
  --host 127.0.0.1 --port 8080 \
  -ngl 99 -c 65536 -n 8192 --parallel 1 \
  --flash-attn on -ctk q8_0 -ctv q8_0 \
  --jinja
```

與先前在公司筆電的失敗設定相比，刻意改了這幾點：
- **拿掉 `--context-shift`**（混合架構下會破壞快取）。
- **加上 `--jinja`**（讓工具呼叫的 chat template 正確）。
- **`-n` 設上限**（原本 `-n -1` 讓模型失控時無限生成）。
- **取樣參數用 model card 的 coding 建議值**（temperature、top_p、top_k 等，從 model card 抄，用 API 請求或命令列帶入）。
- 可視情況試 `--ctx-checkpoints`（增加快取檢查點數，改善混合架構的快取重用）。

### 快取測試做法

寫一個小腳本（放在 `tools/bench/` 以外的暫存位置即可）對 `http://127.0.0.1:8080/v1/chat/completions` 做**多輪、前綴相同**的對話：
第 1 輪送一段約 8,000～15,000 token 的內容（例如貼入 `src/dungeon.js` 加 `src/actions.js`）請模型摘要；
之後每輪只在尾端追加一小段新訊息（約 100 token）。每輪記錄：

- 回應中的 `timings`（若有）：`prompt_n`（本輪實際處理的 token）與 `cache_n`（重用的 token）。
- 或看 server log 的 `prompt eval time` 行，以及**是否出現 `forcing full prompt re-processing`**。

**判定：**
- ✅ 通過：第 2 輪起 `prompt_n` 約等於新追加的 token 數，`cache_n` 接近前一輪全長，log 沒有 `forcing full prompt re-processing`。
- ❌ 不通過：每輪 `prompt_n` 都接近全長，或 log 反覆出現上述訊息。

不通過時，依序嘗試（每次只改一項，記錄結果）：
1. 確認沒有 `--context-shift`；調整 `--ctx-checkpoints` 與 `--cache-reuse`。
2. 換成較新的 llama.cpp commit 再試（混合架構的快取支援持續在改善）。
3. 換 Vulkan 後端或換模型（改試 Qwen3.6-35B-A3B）。
4. 仍不通過：**停下來回報**，說明哪些嘗試過，讓使用者決定是否調整方案（例如縮短 context、改用其他模型）。

另外確認 VRAM / RAM 在 `-c 65536` 下不爆（`rocm-smi`、`free -h`），並記錄實際用量。

## 步驟 5：安裝 OpenCode 並接上本地模型

依 OpenCode 官方文件安裝（以當下官方文件為準）。接本地 llama-server 的設定大致如下
（放在專案的 `opencode.json` 或使用者設定；欄位名稱以官方文件為準）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llamacpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama.cpp (local)",
      "options": { "baseURL": "http://127.0.0.1:8080/v1" },
      "models": { "local": { "name": "local" } }
    }
  }
}
```

驗收：在 island repo 內啟動 OpenCode，請它「讀 AGENTS.md，然後告訴我檔案地圖」，
能正確回答，且 llama-server log 顯示請求有成功處理。

OpenCode 會自動讀取 island 的 `AGENTS.md`（含檔案地圖與架構規則）。

## 步驟 6：準備 island 與 island-bench

```sh
cd <island repo>
git fetch && git checkout agent-ready       # 之後使用者可能已合併進 master，以使用者說的為準
bash tools/setup.sh                         # 安裝 playwright-core，並設定 pre-commit hook
# 若沒有 Chrome/Chromium：cd tools && npx playwright install chromium
node tools/check.js                         # 應全部通過（約 20 秒）
cd tools/bench && node validate.js          # 5 題都應是 VALID
```

- Linux 需要 Node.js 與 Chromium（或 Google Chrome），可用 `CHROME_PATH` 環境變數指定瀏覽器位置。
- `validate.js` 出現 INVALID 就停下來回報，不要往下跑 agent。
- 自我測試：`node run.js --label selftest-noop --agent 'true'`（應 0/5）、
  `node run.js --label selftest-oracle --agent 'git cherry-pick -X theirs {fix_sha}'`（應 5/5）。

## 步驟 7：用 island-bench 比較「模型 × agent」組合

每個組合至少跑 2 次（模型有隨機性），label 加 `-r1`、`-r2`。每次跑前確認 llama-server 載入的是對的模型。

```sh
cd <island repo>/tools/bench
node run.js --label opencode-qwen38-27b-q4-r1 --agent 'opencode run "$(cat {prompt_file})"'
node run.js --label opencode-qwen36-35b-a3b-r1 --agent 'opencode run "$(cat {prompt_file})"'
# 對照組（用 Claude 當上限基準；需要使用者同意，會消耗用量）
node run.js --label claude-sonnet-r1 --agent 'claude -p "$(cat {prompt_file})" --permission-mode acceptEdits'
```

- OpenCode / Claude Code 的非互動參數會隨版本變動，以 `--help` 為準。
- 預設每題逾時 1800 秒；本地模型慢，若大量逾時再用 `--timeout` 調整並記錄。
- 一次只跑一個組合（共用同一個 llama-server 與 GPU）。
- 之後可以分析 `runs/<label>/<題目>/agent.log` 與 `agent.diff`：失敗是找不到原因、改錯地方、還是沒跑檢查。

## 步驟 8：撰寫報告 `tools/HOME_RESULTS.md`

至少包含：
1. 環境（ROCm 版本、llama.cpp commit、模型檔名與量化、啟動參數）
2. llama-bench 表格（ROCm vs Vulkan、各模型、短/長 context）
3. 快取測試結果（通過或不通過、嘗試過的調整）
4. island-bench 結果表：組合 × 題目（PASS/FAIL、耗時），含重複次數
5. **建議**：最終用哪個後端、哪個模型、什麼啟動參數；哪些題型本地模型做不好、建議交給 Claude

寫完後在對話中用繁體中文摘要重點，並提醒使用者：這份報告與設定可以 commit 到 island 的分支，但**不要 push**，由使用者決定。

## 已知限制

- island-bench 的工作目錄是 island 的 clone，歷史中含有修復 commit。agent 理論上可用 `git log --all` 看到答案；
  題目的 prompt 已要求不要這樣做，結果解讀時留意 agent.log 裡有沒有出現相關指令。
- 本地 agent 的最大槓桿是：小檔案（src/ 已拆開）、自動檢查（`node tools/check.js`）、一個任務一個對話。
  不要為了省事讓它一次讀整個專案。
