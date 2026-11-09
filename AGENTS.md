# 小島開拓誌 — Agent 工作指南

瀏覽器單機 RPG 經營遊戲（探索、採集、建造、製作、地城戰鬥）。純 HTML + JS，無建置步驟，直接開 `小島開拓誌.html` 即可遊玩。

## 每次修改後必做

```sh
node tools/check.js          # 語法 + 冒煙 + 回歸測試（約 20 秒），全部通過才算完成
node tools/check.js --fast   # 只檢查語法（1 秒內），改到一半想確認時用
```

`git commit` 會自動執行完整檢查（pre-commit），沒通過就不能提交。第一次使用先跑 `bash tools/setup.sh`。

## 檔案地圖

| 檔案 | 內容 |
|---|---|
| `小島開拓誌.html` | 版面、CSS、依序載入下列 script |
| `lib/data.js` | **所有資料常數**：地形 T、物件 O、資源、裝備 EQUIP_DEF、工作站、配方、敵人、任務 |
| `lib/worldgen.js` | 亂數、地圖生成 `genWorld`、地城生成 `genDungeon`、**新遊戲的 W 初始欄位** |
| `src/audio.js` | 音效 |
| `src/core.js` | 工具效果判定、建造清單 BUILDS、全域狀態 `W`、畫布 |
| `src/ui.js` | Toast、庫存列、手帳、建造／製作／背包面板、角色縮圖 |
| `src/animals.js` | 動物、馴服、互動基礎（faceTile） |
| `src/enemies.js` | 敵人 AI 與戰鬥 |
| `src/dungeon.js` | 死亡、墓碑、地城進出與上下樓、樓層快取 |
| `src/actions.js` | 釣魚、**情境動作 `contextAction`**（按 F 做什麼）、世界生長、視野 |
| `src/input.js` | 鍵盤輸入、面板開關、移動 `tryMove` |
| `src/render.js` | 繪製、小地圖、HUD |
| `src/save.js` | 存檔／讀檔 `save`／`load`（含舊存檔相容） |
| `src/main.js` | 主迴圈、開始遊戲（載入時的初始化在這裡） |
| `tools/` | 檢查工具與測試（`tests/` 是回歸測試） |
| `DESIGN.md` | 各 Wave 的設計紀錄與**尚未實作的規劃** |

## 架構規則

- 所有 `src/*.js` 是一般 `<script>`（**不是 ES module**，因為要能用 `file://` 直接開）。頂層的 `let`/`const`/`function` 是跨檔共用的全域名稱，**不要重複宣告同名變數**。
- 載入順序有意義：載入時就會執行的程式碼（不在函式內的）只能用到**前面檔案**已定義的東西。新的初始化程式碼放 `src/main.js`。
- 新增資源、裝備、配方、建築：先改 `lib/data.js`，再改用到它的邏輯。裝備效果要依 `slot` 判定，不要寫死 id（曾因 `==='boots'` 寫死，讓金屬靴沒效果）。
- 新增 `W` 的欄位：同時加到 `lib/worldgen.js` 的 `genWorld` 初始值，以及 `src/save.js` 的 `load()` 預設值，舊存檔才不會壞。
- 進出地城會切換地表狀態（`W._surface`）。新增「只屬於地表」的狀態時，要一起存進 `_surface` 並在離開時還原（曾因動物沒切換，讓地表動物跑進地城）。
- 存檔格式不相容時，才更新 `src/save.js` 的 `SAVE_KEY` 版本號。

## 已知陷阱

- 物件字面量的 key 不能寫負數：`{-2:'x'}` 是語法錯誤，會讓**整個遊戲打不開**。要寫 `{'-2':'x'}`。
- 語法錯誤的症狀是「按鈕全部沒反應」，先跑 `node tools/check.js --fast`，它會直接指出檔案和行號。
- 在一個區塊內用到的變數要在同一區塊宣告（曾因 `tool` 未宣告，讓面對礦石按 F 沒反應）。

## 工作方式

- 一次只處理一個功能或一個 bug。只讀相關的檔案，不要整份專案讀完。
- 小幅修改，不要整檔重寫；不要改動與任務無關的功能。
- 修 bug 時：先重現（寫一個 `tools/tests/` 的測試或在 check 中確認失敗），再修，再確認通過。
- Commit 訊息用繁體中文，格式：`修復：…`、`Wave N：…`、`重構：…`，內文條列改了什麼。
