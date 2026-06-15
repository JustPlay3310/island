這裡是複製（不是搬移），原始 memory 仍在 C:\Users\derek.yc.chen\.claude\projects\d-----island\memory\，Claude Code 的自動記憶系統繼續從那裡讀寫
換機流程：git clone 後把 .claude/memory/ 手動複製到 ~/.claude/projects/d-----island/memory/ 即可還原 AI 記憶
未來新的 session 對話紀錄會產生新的 jsonl 檔，已設定 gitignore 預設不追蹤，需要時手動 !whitelist 或另存一份