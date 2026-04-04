// FlowHub 📄 頁面切換


// ===== 頁面切換 =====
function showPage(page){
  // 所有頁面清單
  var pages = ['cases','approved','stats','channel','accounts','channel-setup','ch-single'];
  pages.forEach(function(p){
    var el = document.getElementById('page-'+p);
    if(el) el.style.display = (page===p) ? 'block' : 'none';
  });
  // 導覽按鈕 active 狀態
  ['cases','approved','stats','channel','accounts','channel-setup'].forEach(function(p){
    var btn = document.getElementById('nav-'+p);
    if(btn) btn.classList.toggle('active', page===p);
  });
  // 通路子頁面按鈕 active
  document.querySelectorAll('[id^="nav-ch-"]').forEach(function(btn){
    btn.classList.remove('active');
  });
  // 觸發各頁面的資料載入
  if(page==='stats'){ renderStats2(); loadTargets().then(renderTargetBar); }
  if(page==='channel') renderChannel();
  if(page==='accounts') loadAccounts();
  if(page==='channel-setup') renderChannelSetup();
  if(page==='approved') renderApproved();
}