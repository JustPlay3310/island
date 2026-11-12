#!/usr/bin/env python3
"""即時觀看 OpenCode 正在做的事與思考內容（讀 OpenCode 的 SQLite，唯讀）。

用法：python3 tools/bench/watch.py            # 自動跟著最新的 session（換題時自動切換）
      python3 tools/bench/watch.py --no-think # 不顯示思考內容
"""
import glob, json, os, sqlite3, sys, time

# 從 VS Code（snap 版）終端機啟動的 OpenCode 會寫到 ~/snap/code/<版本>/ 底下
DB_CANDIDATES = [
    os.path.join(os.environ.get("XDG_DATA_HOME", ""), "opencode/opencode.db"),
    os.path.expanduser("~/.local/share/opencode/opencode.db"),
] + glob.glob(os.path.expanduser("~/snap/code/*/.local/share/opencode/opencode.db"))
show_think = "--no-think" not in sys.argv
C = {"think": "\033[90m", "tool": "\033[36m", "text": "\033[0m", "hdr": "\033[1;33m", "err": "\033[31m", "off": "\033[0m"}


def find_db():
    found = [p for p in DB_CANDIDATES if p and os.path.exists(p)]
    if not found:
        sys.exit("找不到 opencode.db，試過：\n  " + "\n  ".join(p for p in DB_CANDIDATES if p))
    return max(found, key=os.path.getmtime)  # 用最近被寫入的那個


def short(s, n=600):
    s = (s or "").strip()
    return s if len(s) <= n else s[:n] + f" …（共 {len(s)} 字）"


def show(p):
    t = p.get("type")
    if t == "reasoning":
        if show_think and p.get("text", "").strip():
            print(f"{C['think']}💭 {short(p['text'], 2000)}{C['off']}\n")
    elif t == "text":
        print(f"{C['text']}💬 {short(p.get('text'), 3000)}{C['off']}\n")
    elif t == "tool":
        st = p.get("state", {})
        inp = st.get("input", {})
        arg = inp.get("command") or inp.get("filePath") or inp.get("pattern") or json.dumps(inp, ensure_ascii=False)
        col = C["err"] if st.get("status") == "error" else C["tool"]
        print(f"{col}🔧 {p.get('tool')}: {short(str(arg), 300)}{C['off']}")
        out = st.get("output") or st.get("error") or ""
        if out:
            print(f"{C['think']}   ↳ {short(out, 400)}{C['off']}")
        print()
    elif t == "step-finish":
        tk = p.get("tokens", {})
        print(f"{C['think']}   ── 本步 input {tk.get('input')} / 快取 {tk.get('cache', {}).get('read')} / 輸出 {tk.get('output')} token{C['off']}")


def done(p):
    t = p.get("type")
    if t == "tool":
        return p.get("state", {}).get("status") in ("completed", "error")
    if t in ("reasoning", "text"):
        return bool(p.get("time", {}).get("end"))
    return t == "step-finish"


def main():
    db = find_db()
    print(f"讀取 {db}（Ctrl+C 結束）\n")
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=5)
    cur_sid, printed = None, set()
    while True:
        try:
            row = con.execute("select id, directory, title from session where parent_id is null "
                              "order by time_created desc limit 1").fetchone()
            if row and row[0] != cur_sid:
                cur_sid, printed = row[0], set()
                d = row[1]
                tag = "/".join(d.split("/")[-3:-1]) if "/runs/" in d else d
                print(f"\n{C['hdr']}══════ 新 session：{tag} ══════{C['off']}\n")
            if cur_sid:
                for pid, data in con.execute("select id, data from part where session_id=? order by id", (cur_sid,)):
                    if pid in printed:
                        continue
                    p = json.loads(data)
                    if done(p):
                        printed.add(pid)
                        show(p)
            sys.stdout.flush()
            time.sleep(1)
        except sqlite3.OperationalError:
            time.sleep(1)  # 資料庫正在寫入，稍後重試
        except KeyboardInterrupt:
            break


if __name__ == "__main__":
    main()
