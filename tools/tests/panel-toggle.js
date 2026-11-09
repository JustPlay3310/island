// E/R/T/Q 同鍵開關面板
module.exports = async (g, A) => {
  await g.newGame('bench-t06');
  const isOpen = id => g.page.evaluate(i => document.getElementById(i).classList.contains('open'), id);
  for (const [k, id] of [['e', 'bagPanel'], ['r', 'craftPanel'], ['t', 'buildPanel'], ['q', 'journalPanel']]) {
    await g.key(k); await g.wait(250);
    A(await isOpen(id), `按 ${k} 應打開 ${id}（測試前置失敗）`);
    await g.key(k); await g.wait(250);
    A(!(await isOpen(id)), `再按 ${k} 應關閉 ${id}`);
    A(!(await g.ev('paused')), `關閉 ${id} 後遊戲應解除暫停`);
  }
};
