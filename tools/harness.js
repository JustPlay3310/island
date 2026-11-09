// 小島開拓誌 測試框架（與 qwen_weighting_test/island-bench/harness.js 同源）
// - 用本機 HTTP 伺服器提供遊戲檔，送出主 HTML 時在 IIFE 結尾注入 window.__ev（直接 eval，可讀寫閉包內的 W 等狀態）
// - 不需修改遊戲原始碼，任何歷史版本都能測
// - 瀏覽器：CHROME_PATH 環境變數 > 常見安裝位置 > Playwright 自帶 chromium
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');

const MAIN = '小島開拓誌.html';
const HOOK = ';window.__ev=function(__s){return eval(__s)};';

function findChrome() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return c.find(p => p && fs.existsSync(p)); // undefined -> Playwright 自帶 chromium
}

// 注入測試鉤子 window.__ev：
// - 舊版（主程式包在 IIFE 內）：在最後一個 "})();" 前插入直接 eval，可讀寫閉包狀態
// - 拆檔後（頂層 let/const 是跨 script 共享的全域綁定）：</body> 前補一個間接 eval
function injectHook(html) {
  const end = html.lastIndexOf('</script>');
  const i = html.lastIndexOf('})();', end);
  if (i >= 0 && html.slice(i, end).trim() === '})();') html = html.slice(0, i) + HOOK + html.slice(i);
  const b = html.lastIndexOf('</body>');
  const fallback = '<script>window.__ev=window.__ev||function(__s){return (0,eval)(__s)};</script>\n';
  return b >= 0 ? html.slice(0, b) + fallback + html.slice(b) : html + fallback;
}

function serve(root) {
  root = path.resolve(root);
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/' + MAIN;
      if (p === '/favicon.ico') { rsp.writeHead(204); return rsp.end(); }  // 瀏覽器自動請求，非遊戲資源
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f)) { srv.missing.push(p); rsp.writeHead(404); return rsp.end(); }
      let body = fs.readFileSync(f);
      const type = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
      if (path.basename(f) === MAIN) body = injectHook(body.toString('utf8'));
      rsp.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }); rsp.end(body);
    }).listen(0, '127.0.0.1', () => res(srv));
    srv.missing = [];
  });
}

// 開一個乾淨的遊戲頁面（全新 localStorage）
async function openGame(root, { headless = true } = {}) {
  const srv = await serve(root);
  const browser = await chromium.launch({ headless, executablePath: findChrome() });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text() + (m.location()?.url ? ' @ ' + m.location().url : '')); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/`);
  await page.waitForTimeout(300);
  const g = {
    page, errors,
    hooked: () => page.evaluate(() => typeof window.__ev === 'function'),
    ev: (src) => page.evaluate(s => window.__ev(s), src),           // 在遊戲閉包內執行
    key: async (k, ms = 60) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); },
    wait: (ms) => page.waitForTimeout(ms),
    // 以固定種子開新遊戲
    newGame: async (seed = 'bench-1') => {
      await page.evaluate(s => window.__ev(`startGame(genWorld(${JSON.stringify(s)}))`), seed);
      await page.waitForTimeout(500);
    },
    close: async () => { await browser.close(); srv.close(); },
  };
  return g;
}

module.exports = { openGame, injectHook };
