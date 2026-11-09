// 遊戲要能正常載入並開新局
module.exports = async (g, A) => {
  A(await g.hooked(), '遊戲腳本沒有執行');
  await g.newGame('bench-t01');
  A(await g.ev('W!==null&&running'), '開新局後遊戲沒有在跑');
};
