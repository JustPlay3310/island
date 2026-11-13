# 家用機本地 coding agent 實測報告

> 依 `tools/HOME_SETUP.md` 架設。日期：2026-11-11 起。

## 1. 環境

| 項目 | 值 |
|---|---|
| OS | Ubuntu 26.04 LTS，kernel 7.0.0-27-generic |
| CPU / RAM | Ryzen 7 7700（16 執行緒）/ 29 GiB + 8 GiB swap |
| GPU | AMD Radeon RX 9070 XT（gfx1201，16 GB VRAM；桌面閒置佔 0.4～1.6 GB，視當下開的程式而定）＋ 內顯 gfx1036（Raphael，需排除） |
| ROCm / HIP | 7.2.3 / HIP 7.2.53211 |
| Node / git / cmake | v22.22.1 / 2.53.0 / 4.2.3 |
| llama.cpp | `~/llama.cpp-latest`，commit `956591f4570aa6636895d90439892fef7c075b17`（2026-11-11） |
| OpenCode | 1.19.5（npm `opencode-ai`，裝在 `~/.npm-global`） |
| 模型位置 | `/data/models/`（`~/models` 捷徑；2026-11-13 從 `/data/llama.cpp/models` 搬出，舊 llama.cpp 已刪除，只保留 `~/llama.cpp-latest`） |

### 與指南不同之處

- **llama.cpp 位置**：`~/llama.cpp` 已存在（指向 `/data/llama.cpp`，舊 commit 5/29、有未提交變更、Vulkan 建置），未動它，另 clone 到 `~/llama.cpp-latest`。
- **ROCm 編譯參數**：依當下 `docs/build.md` 改用 `-DGPU_TARGETS=gfx1201`（指南寫的是 `AMDGPU_TARGETS`），並加 `HIPCXX="$(hipconfig -l)/clang" HIP_PATH="$(hipconfig -R)"`。
- **ROCm 7.2.3 與 Ubuntu 26.04 不相容一處**：ROCm 附的 `lld` 連結 `libxml2.so.2`，26.04 只有 `libxml2.so.16`（套件庫無舊版）。
  處理方式：不改系統，在使用者目錄建一個符號連結 `libxml2.so.2 → /usr/lib/x86_64-linux-gnu/libxml2.so.16`，編譯時以 `LD_LIBRARY_PATH` 指向它（只有 `no version information available` 警告）。
- **模型量化**：Qwen3.8-27B 在 HF 上沒有純 `Q3_K_M`，經使用者選擇改用 unsloth `UD-Q3_K_XL`。

### 模型檔（皆來自 Hugging Face，經使用者確認）

| 模型 | repo | 檔名 | 大小 | 架構 |
|---|---|---|---|---|
| Qwen3.8-27B | unsloth/Qwen3.8-27B-GGUF | Qwen3.8-27B-UD-Q3_K_XL.gguf | 13.15 GB | qwen35（dense） |
| Qwen3.8-27B | unsloth/Qwen3.8-27B-GGUF | Qwen3.8-27B-UD-Q4_K_M.gguf | 16.56 GB | qwen35（dense） |
| Qwen3.6-35B-A3B | unsloth/Qwen3.6-35B-A3B-GGUF | Qwen3.6-35B-A3B-UD-Q4_K_M.gguf | 22.13 GB | qwen35moe |

### 取樣參數（抄自 model card）

- Qwen3.8-27B（card 無 coding 專用值，用 thinking mode）：`temperature=1.0, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=0.0`
- Qwen3.6-35B-A3B（card 的「Thinking mode for precise coding tasks」）：`temperature=0.6, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=0.0`

取樣參數在 llama-server 命令列設定；OpenCode 端設定 `"temperature": false`，不由 client 覆寫。

## 2. llama-bench

指令：`llama-bench -m <模型> -ngl <N> [-ncmoe <N>] -fa 1 -p 2048[,16384] -n 128`，ROCm 加 `HIP_VISIBLE_DEVICES=0`、Vulkan 加 `GGML_VK_VISIBLE_DEVICES=0`（排除內顯）。單位 t/s。

| 模型 | 後端 | 卸載設定 | pp2048 | pp16384 | tg128 |
|---|---|---|---:|---:|---:|
| 27B UD-Q3_K_XL（12.23 GiB） | ROCm | `-ngl 99`（全進 GPU） | **1421** | **1280** | 34.6 |
| 27B UD-Q3_K_XL | Vulkan | `-ngl 99` | 1193 | 1097 | **37.5** |
| 27B UD-Q4_K_M（15.42 GiB） | ROCm | `-ngl 65`（只適用短 context） | 1283 | OOM | 25.7 |
| 27B UD-Q4_K_M | ROCm | `-ngl 62`（16K 可跑） | — | 1087 | 16.3 |
| 27B UD-Q4_K_M | ROCm | `-ngl 60` | — | 1141 | 14.3 |
| 27B UD-Q4_K_M | Vulkan | `-ngl 99` | 1191 | >10 分鐘未完成（溢出到系統記憶體，中止） | 32.2 |
| 27B UD-Q4_K_M | Vulkan | `-ngl 65` | 1167 | 329（溢出） | 27.2 |
| 35B-A3B UD-Q4_K_M（20.60 GiB） | ROCm | `-ncmoe 12` | 1642 | OOM | — |
| 35B-A3B UD-Q4_K_M | ROCm | `-ncmoe 14` | **1521** | **1449** | 48.4 |
| 35B-A3B UD-Q4_K_M | ROCm | `-ncmoe 16` | 1401 | 1341 | 46.4 |
| 35B-A3B UD-Q4_K_M | Vulkan | `-ncmoe 10` | 393（溢出） | 387 | 32.5 |
| 35B-A3B UD-Q4_K_M | Vulkan | `-ncmoe 12` | 868 | 797 | **59.7** |
| 控制組：35B-A3B 去審查 IQ3_M（HauhauCS，14.37 GiB） | ROCm | `-ncmoe 0`（全進 GPU） | **4137** | **3688** | **99.2** |
| 控制組 | ROCm | `-ncmoe 4` | 2884 | 2670 | 83.9 |
| 控制組 | ROCm | `-ncmoe 8` | 2256 | 2128 | 75.9 |

觀察：
- **prompt 處理（pp）ROCm 明顯勝出**（27B 快 15～20%，35B-A3B 快約 80%）；**生成（tg）Vulkan 較快**（27B +8%、35B-A3B +23%）。
  island 對話 context 長、每輪新增的 token 少，若快取能重用則 tg 比重提高；若快取失效則 pp 決定一切。
- 長 context（16K）下降幅：27B Q3_K_XL 約 -10%，35B-A3B 約 -5%，都很小（混合架構的線性注意力層不隨長度變慢）。
- **27B Q4_K_M 實用上放不進 16 GB**：短 context 勉強可全卸載，長 context 必須退到 `-ngl 62` 以下，tg 掉到約 16 t/s。依指南規則退回 Q3_K_XL 當 27B 主力。
- `-ngl 99` 與 `-ngl 65` 的差別：模型共 65 層（64 + 1 MTP 層），`99` 會連輸出層一起上 GPU。ROCm 下 Q4_K_M `-ngl 99` 會溢出導致 pp512 只剩 79 t/s。
- 以上都是 16K 以下的數字；llama-server 在 `-c 65536` 時 KV 快取與 compute buffer 還要更多 VRAM，實際值見第 3 節。

## 3. Prompt 快取測試（關卡）

### 啟動參數（27B Q3_K_XL、ROCm）

```sh
HIP_VISIBLE_DEVICES=0 ~/llama.cpp-latest/build-rocm/bin/llama-server \
  -m /data/models/Qwen3.8-27B-UD-Q3_K_XL.gguf --alias local \
  --host 127.0.0.1 --port 8080 \
  -ngl 99 -c 65536 -n 8192 --parallel 1 \
  --flash-attn on -ctk q8_0 -ctv q8_0 --jinja --no-context-shift \
  --temp 1.0 --top-p 0.95 --top-k 20 --min-p 0.0 --presence-penalty 0.0
```

記憶體：VRAM 15.93 / 17.10 GB（含桌面），RAM 正常。`--ctx-checkpoints`、`--cache-reuse` 維持預設（不需調整）。

### 腳本測試（`cache_test.py`：第 1 輪貼入 `src/dungeon.js` + `src/actions.js` 約 13.7K token，之後每輪追加一則短訊息）

**`full` 模式**（歷史 assistant 訊息帶回 `reasoning_content`，即 OpenCode `interleaved` 設定的行為）：

| 輪 | prompt_n | cache_n | pp ms | 生成 token | tg t/s |
|---:|---:|---:|---:|---:|---:|
| 1 | 13661 | 0 | 10937 | 1024 | 30.5 |
| 2 | 1073 | 13657 | 1220 | 505 | 30.3 |
| 3 | 42 | 15234 | 289 | 633 | 30.1 |
| 4 | 40 | 15908 | 305 | 686 | 29.9 |
| 5 | 31 | 16633 | 293 | 1024 | 29.8 |

（第 2 輪的 1073：第 1 輪思考在 `max_tokens=1024` 被截斷，重新套範本後尾端與原生成不同，退回前一輪 prompt 尾端的檢查點。）

**`drop` 模式**（只帶回 content，丟掉 reasoning）：每輪 prompt_n = 66～312（= 上一輪回覆 + 新訊息），cache_n ≈ 前一輪 prompt 全長。

兩種模式 log 都**沒有** `forcing full prompt re-processing`。

### OpenCode 實際對話

`opencode run "讀 AGENTS.md，然後告訴我檔案地圖"`：35 秒完成、答案正確。server log：

| 請求 | prompt_n | 說明 |
|---|---:|---|
| 標題產生 | 21（725 總長） | OpenCode 的 title agent，會把唯一的 slot 換掉 |
| 主對話第 1 輪 | 11377 | 系統提示 + 工具定義約 11.4K token，因 slot 被標題請求覆蓋而全算（約 9 秒） |
| 主對話第 2 輪（讀完檔後） | 1350 | 只算新增的工具結果 → **快取重用正常** |

### Qwen3.6-35B-A3B UD-Q4_K_M（ROCm，`-ngl 99 --n-cpu-moe 16`，取樣 temp 0.6）

`-c 65536` 下 50K token 暖機通過（pp 1146 t/s），VRAM 16.29 GB。`ncmoe 12/14` 在 llama-bench 長 context 就已 OOM 或貼邊，故直接從 16 起試。

| 模式 | 輪 1 prompt_n | 輪 2 prompt_n / cache_n | 輪 3 prompt_n / cache_n | tg t/s |
|---|---:|---:|---:|---:|
| full | 13623 | 45 / 15642 | 42 / 16767 | 42～52 |
| drop | 4（沿用前一測試的快取） | 266 / 13619 | 181 / 13881 | 52.5 |

log 無 `forcing full prompt re-processing` → ✅ 通過。

### 控制組：Qwen3.6-35B-A3B 去審查 IQ3_M（ROCm，`-ngl 99 --n-cpu-moe 0`，取樣 temp 0.6）

`-c 65536` 下 50K 暖機通過（pp 2848 t/s），VRAM 16.87 GB。快取：full 第 2/3 輪 prompt_n = 46/42；drop 第 2/3 輪 = 51/228；無 re-processing → ✅ 通過。tg 約 83 t/s。

### 判定：✅ 通過（27B 與 35B-A3B 皆通過）

注意事項：
- `opencode run` 在非 TTY 下會等 stdin，**必須加 `< /dev/null`**，否則永遠卡住。
- 標題請求會覆蓋 slot；bench 指令加 `--title bench` 避免（每個 session 省約 9 秒）。
- OpenCode 會把 `~/.claude/skills/` 的 skill 一起載入系統提示（log 有 `duplicate skill name` 警告），系統提示因此偏大（約 11K token）。

## 4. island-bench

### 前置驗證（步驟 6）

| 項目 | 結果 |
|---|---|
| `bash tools/setup.sh` | ✓ |
| `node tools/check.js` | ✓ 全部通過（20 秒） |
| `node validate.js` | ✓ 5/5 VALID |
| `selftest-noop` | 0/5 ✓（符合預期） |
| `selftest-oracle` | 5/5 ✓（符合預期） |

### 結果

agent 指令：`opencode run --title bench "$(cat {prompt_file})" < /dev/null`（OpenCode 預設權限，未加 `--auto`）；
Claude 對照組：`claude -p "$(cat {prompt_file})" --model sonnet --permission-mode acceptEdits < /dev/null`。逾時 1800 秒。

**Claude 對照組的實際條件**（從它的 session 紀錄確認）：模型 `claude-sonnet-5`，沿用本機 Claude Code 設定（使用者的 skills、可開 subagent）。
`acceptEdits` 下**唯讀的 Bash 可以跑**（`git log/diff/show`、`grep`、`ls`，每題 19～65 次），但 `node`、`git add/commit` 需要核准，在 `-p` 模式一律被擋（10 題合計 100 次以上）——
所以它**不能執行遊戲或測試、也不能 commit**；OpenCode 兩者都可以。因此這個基準應理解為「本機設定下的 Claude Code」，不是單純的 Sonnet。

| 組合 | T01 難 | T02 中 | T03 易 | T05 中 | T06 易 | 通過 |
|---|---|---|---|---|---|---|
| opencode + 27B Q3_K_XL r1 | ✅ 1356s | ✅ 538s | ✅ 154s | ❌ 895s* | ✅ 109s | 4/5（行為版 5/5） |
| opencode + 27B Q3_K_XL r2 | ✅ 393s | ✅ 1077s | ✅ 236s | ❌ 739s* | ✅ 128s | 4/5（行為版 5/5） |
| opencode + 27B Q4_K_M r1（`-ngl 58`） | ✅ 1800s⏱ | ✅ 1800s⏱⚠ | ✅ 464s⚠ | ❌ 1800s⏱* | ✅ 474s | 4/5（行為版 5/5） |
| opencode + 35B-A3B Q4_K_M r1 | ❌ 154s ① | ✅ 239s | ❌ 177s ② | ❌ 17s ① | ❌ 96s ③ | 1/5 |
| opencode + 35B-A3B Q4_K_M r2 | ❌ 1245s ④ | ✅ 308s | ✅ 127s | ❌ 218s ⑤ | ❌ 168s ③ | 2/5 |
| 控制組：35B-A3B 去審查 IQ3_M r1 | ❌ 1800s⏱ ⑥ | ❌ 30s ① | ❌ 9s ① | ✅ 186s | ❌ 8s ① | 1/5 |
| 控制組：35B-A3B 去審查 IQ3_M r2 | ❌ 49s ⑦ | ✅ 211s | ❌ 43s ⑧ | ✅ 185s | 🚫 62s ⑨ | 2/4（1 題無效） |
| **中性路徑** blind-a（35B-A3B 原版 Q4_K_M）r1 | ❌ 1315s | ✅ 187s | ❌ 222s ⑧ | ✅ 256s | ✅ 226s | 3/5 |
| **中性路徑** blind-a r2 | ❌ 1348s | ❌ 194s | ✅ 260s | ✅ 312s | ❌ 108s | 2/5 |
| **中性路徑** blind-b（去審查 IQ3_M，`ncmoe 4`）r1 | ❌ 65s ⑦ | ✅ 132s | ❌ 59s ⑧ | ✅ 357s | ❌ 12s ⑩ | 2/5 |
| **中性路徑** blind-b r2 | ❌ 251s | ✅ 136s | ❌ 103s | ❌ 166s ⑪ | ❌ 59s | 1/5 |
| claude -p + Sonnet r1 | ✅ 401s | ✅ 184s | ✅ 116s | ✅ 232s | ✅ 168s | 5/5 |
| claude -p + Sonnet r2 | ✅ 400s | ✅ 317s | ✅ 221s | ✅ 334s | ✅ 103s | 5/5 |

Claude Sonnet 註記：每題都只改檔、沒有 commit（回覆中請使用者核准 commit），驗證只靠讀 diff 與唯讀指令。
T05 的寫法與正解幾乎一致，但檢查過原始版本已有 `W._surface={…enemies…}` 的既有模式，延伸到 `animals` 是自然設計，非洩漏。

27B Q4_K_M 註記：

- ⏱ = 撞到 1800 秒逾時；評分看逾時當下的工作目錄，T01/T02 在時限內已修好（只是沒來得及收尾）。T05 原測試 FAIL、行為版 PASS。
- ⚠ **結果受干擾**：`run.js` 的 `spawnSync` 逾時只殺外層 shell，`opencode` 子行程繼續跑。T01 逾時後它的 opencode 一直活著，與 T02 搶同一個 slot／GPU；T02 的殘留又干擾了 T03 開頭。發現後手動結束這兩個行程，並加了看門狗（opencode 存活超過 1810 秒即結束）。**T02/T03 的時間不可信**，Q4 的通過數仍可參考。
- 27B Q3 與 35B 各輪沒有任何逾時，不受此問題影響。

35B-A3B 失敗原因（逐一看過 agent.log / agent.diff）：

- ① **路徑抄錯 → 中止**：r1 T01 一開始就整檔讀入 `小島開拓誌.html`，請求衝到 72K token 超過 64K context，OpenCode 壓縮對話後模型把工作目錄路徑抄錯（`opencode-qwen36-35b-a3b-r1` → `opencode-qwen36-3b-r1`）；r1 T05 第 3 步就把路徑抄成 `opencode-qwen35b-a3b-r1`。兩次都觸發 OpenCode 的 `external_directory` 權限，非互動模式自動拒絕後 session 結束。
- ② 速度倍率有 3 處，只改了 `tryMove` 那處，漏了 `loop()`；改完沒驗證就 commit。
- ③ 改了 `togglePanel` 本身，但問題在按鍵處理；改完沒驗證。
- ④ 31 次工具呼叫，沒找到原因，零改動。
- ⑤ 有改動，但行為版測試也 FAIL（地城中仍畫出地表動物 730 次），屬真正失敗。

控制組（去審查 IQ3_M，`--n-cpu-moe 0`）失敗原因：

- ① 路徑抄錯（`unc-iq3m` → `unc-i9m`、`35b-a3b` → `3b`、`35b-a3b-unc` → `35b-unc`）→ `external_directory` 自動拒絕 → 中止。r1 有 3 題在 8～30 秒內就這樣結束。
- ⑥ 鬼打牆：同一段 `lib/worldgen.js [offset=30, limit=100]` 重複讀 16 次，30 分鐘零改動。
- ⑦ 一開始就整檔讀入，請求 71877 token 超過 64K context → 結束，零改動。
- ⑧ 改成 `W.equipped.feet.endsWith('boots')`，沒處理 null → 頁面錯誤；改完沒驗證。
- ⑨ **無效**：server 中途當掉（見下方）。
- T05 兩輪都用正解的 `W._surface` 寫法通過原測試——在這題反而比原版 3.6 好。

**中性路徑補跑**（label 改為 `blind-a`／`blind-b`，工作目錄路徑不含模型名；agent 樣板加 `timeout -k 10 1790`）：

- 原版 3.6 從 3/10 → 5/10，路徑含模型名確實拖累了它，但 T01 四次全敗（兩次都花 22 分鐘仍找不到），T06 只過 1/2。
- ⑩ **路徑不含模型名也會捏造**：blind-b r1 T06 第一步就讀 `/home/user/桌面/island/tools/bench/close/repo`（不存在）→ 中止。捏造路徑是 3.6 本身的傾向。
- ⑪ 行為版測試也 FAIL（地城中畫出地表動物 730 次），屬真正失敗。
- ⑧ `null.endsWith()` 在三個 3.6 變體上共出現 3 次（控制組 r2、blind-a r1、blind-b r1）——同一個模型家族的同一個壞習慣。

**控制組 server 當機**：`--n-cpu-moe 0` 時 VRAM 16.87 / 17.10 GB，跑了約 40 分鐘後核心開始出現
`amdgpu: Not enough memory for command submission!`，最後 `llama-server segfault in libamdhip64.so`。
**VRAM 剩不到約 0.5 GB 的設定長時間跑不穩**；之後補跑改用 `--n-cpu-moe 4`。

**27B dense 與 35B-A3B MoE 的行為差異**（同一套 llama.cpp／OpenCode／快取設定）：

| | 27B dense | 35B-A3B MoE |
|---|---|---|
| 讀大檔 | 一律用 offset/limit 分段 | 常整檔讀入，撐爆 context |
| 絕對路徑 | 16 題中 0 次出錯（3 輪＋1 次試跑） | 39 題中 6 題因抄錯／捏造路徑被 `external_directory` 拒絕而中止（含中性路徑下自己編出 `tools/bench/close/repo`） |
| 改完自我驗證 | 會（`node --check`、自寫小測試、`git diff`） | 幾乎不做（3 次寫出 `null.endsWith()` 頁面錯誤） |
| 多處相同 bug | 全部找到 | 常漏改 |

\* **T05 的 FAIL 判定為測試過嚴造成的偽陰性**（依據是我另寫的行為版測試；這是事後補的判準，原測試的正式成績仍是 FAIL）：

- 原測試檢查 `W.animals.length === 0`，只接受正解（642baa3）「進地城時把動物搬到 `W._surface`」這一種實作。
- 27B 兩次都選了另一種設計：r1 新增 `surfaceAnimals()`（地城中回傳 `[]`）並替換 9 處；r2 在 `updateAnimals`／互動／繪製加 `if(W.inDungeon)` 守衛。動物資料原封不動，回地表仍在原位。
- 我另寫了**只看行為**的測試：先把一隻設成寵物（問題回報提到「已經馴服、會跟著我的」）→ 進地城 →
  (a) 地表動物移到玩家面前，不得被畫出；(b) 移到玩家腳邊、清掉地城敵人、四個方向各按 F 與攻擊鍵，不得出現馴化／打招呼／收集；
  (c) 出地城後同一批動物、數量與位置不變、重新被畫出。
  - 兩項都能單獨抓到 bug：base 上 (a) 畫出 720～730 次；(b) 出現「馴化兔子」「和兔子打招呼」（另以診斷腳本確認）。
  - 第一版的互動檢查沒有寵物、也沒清敵人，在 base 上不會失敗（形同虛設），已修正後重跑全部結果。

  | 版本 | 原測試 | 行為版測試 |
  |---|---|---|
  | base（642baa3^） | FAIL | FAIL |
  | fix（642baa3） | PASS | PASS |
  | 27B Q3 r1／r2、27B Q4 r1 的修法 | FAIL | **PASS** |
  | 其餘 10 次 T05 結果（Sonnet×2、3.6 各變體×8） | — | **與原測試判定完全一致** |

  行為版測試沒有放過任何原測試判 FAIL 的真正失敗，只在「不同但正確的設計」上與原測試不同。

- 行為版測試放在 `tools/bench/tests-proposed/T05-animals-in-dungeon.js`（**未替換**原測試，由使用者決定）。採用的話覆蓋 `tests/` 同名檔後跑 `node validate.js T05-animals-in-dungeon`。

### 洩漏稽核（指南「已知限制」要求）

- **OpenCode（59 個 session，全部）**：從 `opencode.db` 撈出所有工具呼叫，搜尋 `--all`、`reflog`、`origin/`、`master`、`agent-ready`、5 個修復 SHA、`tools/bench/tests`、`.git/objects` 與工作目錄外的 island 路徑 → **0 筆**（唯一命中是 blind-b 捏造的 `tools/bench/close/repo`，不存在）。
  27B 常用 `git log -N`、`git show 0b7e305`——0b7e305 是**引入** bug 的 Wave 6 commit，在自己的歷史中，屬正常除錯。
- **Claude（10 個 session）**：無上述指令；但有 **25 次**嘗試 `cd`／`ls`／`grep` 主 repo `/home/user/桌面/island`（已修好的程式碼在那裡），**全部被 Claude Code 的工作目錄限制擋下**，沒有讀到。
- **為什麼 Claude 會去找主 repo**：bench 工作目錄位在 island repo 底下，Claude Code 會往上載入 `/home/user/桌面/island/CLAUDE.md`（內容只有 `@AGENTS.md`）。
  **現在的 `AGENTS.md` 第 39～48 行幾乎寫出了 T01／T02／T03／T05 的答案**（負數 key、`tool` 未宣告、依 slot 判定、`W._surface`）。
  實測（在 clone 裡問 `claude -p`）：上層 CLAUDE.md 有載入，但 `@AGENTS.md` 是工作目錄外的 import，在 `-p` 模式**沒有被展開**——所以這次沒洩漏，但只差一個設定。
  OpenCode 只往上找到 clone 自己的 git 根目錄：clone 內首請求比 island 根目錄少約 1000 token（= AGENTS.md 大小），`instructions` 為空。
- **建議**：把 bench 的 clone 放到 island 目錄樹之外（例如 `/tmp/bench-<亂數>/`），一次解決這個風險與路徑含 label 的問題。

## 5. 建議

### 總表（通過數；括號內為 T05 改用行為版測試）

| 組合 | 跑次 | 原測試 | 行為版 T05 計 | 平均單題時間 | 備註 |
|---|---:|---:|---:|---:|---|
| Claude Code（Sonnet 5，本機設定） | 2 | **10/10** | 10/10 | 248s | 上限基準；只能唯讀 Bash，不能跑 node／commit |
| OpenCode + **Qwen3.8-27B UD-Q3_K_XL** | 2 | **8/10** | **10/10** | 563s | 全進 GPU；兩次 FAIL 依行為版測試判定為測試過嚴 |
| OpenCode + Qwen3.8-27B UD-Q4_K_M（`-ngl 58`） | **1（指南要求 ≥2）** | 4/5 | 5/5 | 1268s | 3 題撞 1800s 逾時，部分時間受殘留行程干擾 |
| OpenCode + Qwen3.6-35B-A3B UD-Q4_K_M | 2 | 3/10 | 3/10 | 275s | 路徑含模型名；快是因為常提早放棄或中止 |
| OpenCode + Qwen3.6-35B-A3B UD-Q4_K_M（中性路徑） | 2 | 5/10 | 5/10 | 443s | |
| OpenCode + 3.6 去審查 IQ3_M（控制組） | 2 | 3/9 | 3/9 | — | 1 題 server 當機無效 |
| OpenCode + 3.6 去審查 IQ3_M（中性路徑） | 2 | 3/10 | 3/10 | 134s | 快是因為常幾十秒就中止 |

合計：Qwen3.8-27B Q3_K_XL **8/10**（原測試；行為版 10/10）、原版 3.6-A3B **8/20**、去審查 3.6-A3B **6/19**、Claude Code **10/10**。
各題通過率（3.6 兩變體合計 39 次有效）：T02 最穩（6/8），T01 **0/8**，T03／T06 常因漏改、改錯地方或 null 錯誤失敗。

### 結論

1. **後端：ROCm。** prompt 處理比 Vulkan 快 15～80%，agent 工作負載（每步都要吃進工具輸出）以 pp 為主；Vulkan 的 tg 優勢（+8～23%）抵不過。
   代價是 ROCm 7.2.3 在 Ubuntu 26.04 編譯時需要 libxml2 相容連結（執行時不需要）。
2. **模型：Qwen3.8-27B UD-Q3_K_XL。** 全進 GPU、64K context 穩定、快取重用正常，island-bench 原測試 4/5 ×2（T05 兩次都是行為正確但設計不同，行為版測試下 5/5 ×2）。
   在最難的 T01（Claude 當初 40 分鐘）兩次都修好（22.6 分／6.5 分）。
   Q4_K_M 放不進 16 GB，`-c 65536` 下最多 `-ngl 58`（VRAM 16.99 GB，已貼邊），部分層上 CPU 後 tg 只剩約 14 t/s（`-ngl 60` 實測），3 題逾時；
   品質沒有看出比 Q3_K_XL 好，**不值得**。（Q4 只跑了 1 次且部分受干擾，品質比較的證據較弱；但光速度就已經排除它。）
3. **Qwen3.6-35B-A3B（不論原版或去審查）不建議用於實作。** 跨 8 輪觀察到一致的毛病：整檔讀入撐爆 context、捏造／抄錯絕對路徑
   （就算路徑不含模型名也會自己編出 `tools/bench/close/repo`）、改完不驗證（三次寫出 `null.endsWith()`）、多處同樣的 bug 漏改。
   去審查版與原版的失敗模式相同，分數略低（6/19 vs 8/20，差距在隨機波動範圍內）。
   **在「64K context + 非互動 OpenCode」這個條件下，主因是 3.6-A3B 本身，去審查／IQ3_M 頂多讓它再差一點**；去審查版的優勢只有速度（IQ3_M 可全進 GPU，tg 99 t/s）。
   - 適用範圍：3.6 的 model card 建議 context 至少 128K，本次是 64K。39 題中有 **8 題是「提早中止」**（6 題路徑被拒、2 題整檔讀入超過 64K），
     這類失敗在互動模式（路徑錯了會問人）或更大 context 下可能不會發生；但其餘失敗（T01 0/8、改錯地方、`null.endsWith()`、不驗證）與這兩個條件無關。
   - 27B 在完全相同的條件下沒有任何一題提早中止，所以這個條件對兩者是公平的。
4. **先前公司筆電失敗的設定問題確實存在**（`--context-shift` 破壞快取、缺 `--jinja`、`-n -1`），本次全部修正後快取正常，但這不足以救回 3.6-A3B。

### 建議的最終啟動參數

```sh
HIP_VISIBLE_DEVICES=0 ~/llama.cpp-latest/build-rocm/bin/llama-server \
  -m /data/models/Qwen3.8-27B-UD-Q3_K_XL.gguf --alias local \
  --host 127.0.0.1 --port 8080 \
  -ngl 99 -c 65536 -n 8192 --parallel 1 \
  --flash-attn on -ctk q8_0 -ctv q8_0 --jinja --no-context-shift \
  --temp 1.0 --top-p 0.95 --top-k 20 --min-p 0.0 --presence-penalty 0.0
```

**context 上限的實測**：27B Q3 跑 bench 時（264 個請求）最大用到 **59,035 token**、中位數 31,048，38 個請求超過 48K，**沒有一次超過 64K**（OpenCode 會在接近上限時自動壓縮對話）。
island 實際對話中位數約 11 萬 token，**用本地模型時必須「一個任務一個對話」**，不能像 Claude 一樣長對話累積；VRAM 已用到 15.9 GB，加大 context 沒有空間。

OpenCode：全域設定 `~/.config/opencode/opencode.json`（provider `llamacpp`、`interleaved.field = reasoning_content`、`temperature: false`、`limit.context 65536`）。
非互動執行一定要 `< /dev/null`，建議加 `--title` 省掉標題請求。

### 分工建議

- **交給本地 27B**：單點 bug（T02/T03/T06 類，2～10 分鐘）、語法／執行期錯誤定位（T01 類，可能要 7～25 分鐘）。
  它會自己寫小測試、`node --check`、看 `git show` 引入 bug 的 commit——適合「有明確症狀、可自動檢查」的任務。
- **交給 Claude**：設計取捨（T05 這種「資料該放哪」的架構選擇，27B 的做法行為正確但與專案既有模式 `W._surface` 不一致）、跨多檔的重構、需要理解 DESIGN.md 規劃的新功能、本地模型 25 分鐘內沒進展時接手。
- 本地模型單題比 Claude 慢約 2 倍（563s vs 248s），但不耗用量；長時間背景任務可以接受。

### 對 island-bench 本身的改進建議（未修改，由使用者決定）

1. **T05 測試過嚴**：只接受「把動物搬到 `W._surface`」的實作。行為版測試已備好：`tools/bench/tests-proposed/T05-animals-in-dungeon.js`（base FAIL／fix PASS 驗證過）。
2. **`run.js` 逾時殺不到子行程**：`spawnSync` 的 timeout 只結束外層 shell，`opencode` 會繼續跑並佔用 llama-server。建議 agent 樣板加 `timeout -k 10 1790`，或 `run.js` 改用 `detached` + 殺整個 process group。
3. **工作目錄在 island 目錄樹內**（`tools/bench/runs/<label>/…`）：(a) label 若含模型名稱，弱模型會「自動更正」路徑而觸發 `external_directory` 中止；
   (b) Claude Code 會往上載入主 repo 的 `CLAUDE.md`，而它 import 的 `AGENTS.md` 含有 4 題的答案提示（這次因 import 未展開而沒洩漏，見洩漏稽核）。
   **建議把 clone 放到 `/tmp/bench-<亂數>/`**，兩個問題一起解決。
4. **OpenCode 會載入 `~/.claude/skills/`** 進系統提示（約 11K token）。若要讓 bench 更貼近乾淨環境，可考慮在 bench 時暫時停用。

### 這次留下的檔案

- `tools/HOME_RESULTS.md`（本報告）
- `tools/bench/watch.py`：即時觀看 OpenCode 的思考與動作（讀 `opencode.db`，唯讀）
- `tools/bench/tests-proposed/T05-animals-in-dungeon.js`：T05 行為版測試提案
- `tools/bench/runs/`：所有 bench 結果（含 agent.log、agent.diff、repo）
- `~/.config/opencode/opencode.json`：OpenCode 全域設定（不在 repo 內）
- `~/llama.cpp-latest/`：llama.cpp 原始碼與 `build-rocm`／`build-vulkan`（不在 repo 內）
