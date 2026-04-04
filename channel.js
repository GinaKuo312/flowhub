// FlowHub 🏢 通路管理


function renderChannel(){
  var el = document.getElementById('channel-list');
  if(!el) return;
  var chKeys = Object.keys(CHANNELS).filter(function(k){ return k!=='FlowPay'; });
  if(!chKeys.length){ el.innerHTML='<div class="empty">尚未建立任何通路</div>'; return; }
  el.innerHTML = chKeys.map(function(code){
    var ch=CHANNELS[code];
    var chCases=cases.filter(function(c){return (c.channel||'FlowPay')===code;});
    var approved=chCases.filter(function(c){return c.status==='已核准';}).length;
    return '<div class="table-wrap" style="padding:16px 20px;cursor:pointer" data-code="'+code+'" class="ch-row">'+
      '<div style="display:flex;align-items:center;justify-content:space-between">'+
        '<div style="display:flex;align-items:center;gap:10px">'+
          '<div style="width:36px;height:36px;border-radius:8px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:16px">🏢</div>'+
          '<div>'+
            '<div style="font-size:14px;font-weight:700">'+ch.name+'</div>'+
            '<div style="font-size:11px;color:#9CA3AF">'+code+' · '+ch.category+'</div>'+
          '</div>'+
        '</div>'+
        '<div style="text-align:right">'+
          '<div style="font-size:20px;font-weight:800;color:#2563EB">'+chCases.length+'</div>'+
          '<div style="font-size:11px;color:#9CA3AF">案件 / '+approved+' 核准</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
  setTimeout(function(){
    el.querySelectorAll('.ch-row').forEach(function(div){
      div.onclick=function(){ showChannelPage(div.getAttribute('data-code')); };
    });
  },50);
}

function renderChannelNav(){
  var sidebar = document.getElementById('sidebar');
  if(!sidebar) return;
  // 移除舊的通路按鈕
  sidebar.querySelectorAll('[id^="nav-ch-"]').forEach(function(b){ b.remove(); });
  // 加入分隔線
  var existing = sidebar.querySelector('.ch-sep');
  if(!existing){
    var sep=document.createElement('div');
    sep.className='ch-sep';
    sep.style.cssText='font-size:10px;font-weight:700;color:#C4C9D4;letter-spacing:.08em;padding:12px 12px 4px;text-transform:uppercase';
    sep.textContent='通路';
    sidebar.appendChild(sep);
  }
  Object.keys(CHANNELS).filter(function(k){return k!=='FlowPay';}).forEach(function(code){
    var ch=CHANNELS[code];
    var btn=document.createElement('button');
    btn.className='nav-btn'; btn.id='nav-ch-'+code;
    btn.onclick=function(){showChannelPage(code);};
    btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'+
      '<span style="flex:1;text-align:left;font-size:13px" id="nav-ch-label-'+code+'">'+ch.name+'</span>'+
      '<span class="badge-num" id="ch-badge-'+code+'"></span>';
    sidebar.appendChild(btn);
  });
}

// ===== 通路側邊選單 =====
function showChannelPage(code){
  showPage('ch-single');
  var ch = CHANNELS[code]||{};
  var el1 = document.getElementById('ch-single-title');
  var el2 = document.getElementById('ch-single-sub');
  if(el1) el1.textContent = ch.name||code;
  if(el2) el2.textContent = ch.category||'';
  var chCases = cases.filter(function(c){ return (c.channel||'FlowPay')===code; });
  var tbody = document.getElementById('ch-single-tbody');
  if(!tbody) return;
  if(!chCases.length){ tbody.innerHTML='<div class="empty">此通路尚無案件</div>'; return; }
  var rows=chCases.map(function(c){
    var sc=calcScore(c); var gi=gradeInfo(sc);
    return '<tr data-id="'+c.id+'" class="open-panel-row" style="cursor:pointer">'+
      '<td><div class="name-bold">'+(c.name||'—')+'</div><div class="date-sub">'+fmtDate(c.created_at)+'</div></td>'+
      '<td>'+(c.phone||'—')+'</td>'+
      '<td>'+(c.need_amount||'—')+'</td>'+
      '<td><span class="dot '+gi.dot+'"></span>'+gi.g+'</td>'+
      '<td><span class="badge '+badgeClass(c.status)+'">'+(c.status||'待處理')+'</span></td>'+
    '</tr>';
  }).join('');
  tbody.innerHTML='<table><thead><tr><th>申請人</th><th>電話</th><th>申請金額</th><th>評等</th><th>狀態</th></tr></thead><tbody>'+rows+'</tbody></table>';
  setTimeout(function(){
    tbody.querySelectorAll('.open-panel-row').forEach(function(tr){
      tr.onclick=function(){ openPanel(tr.getAttribute('data-id')); };
    });
  },50);
  var statsEl = document.getElementById('ch-single-stats');
  if(statsEl) renderStats();
}

function renderChannelSetup(){
  var el = document.getElementById('cs-channel-list');
  if(!el) return;
  var chKeys = Object.keys(CHANNELS).filter(function(k){ return k!=='FlowPay'; });
  if(!chKeys.length){
    el.innerHTML='<div class="empty">尚未建立任何通路</div>'; return;
  }
  el.innerHTML = chKeys.map(function(code){
    var ch = CHANNELS[code];
    var link = SITE_URL+'?ch='+code;
    return '<div class="table-wrap" style="padding:16px 20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">'+
        '<div style="display:flex;align-items:center;gap:12px">'+
          '<div style="width:42px;height:42px;border-radius:10px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏢</div>'+
          '<div>'+
            '<div style="font-size:14px;font-weight:700">'+ch.name+'</div>'+
            '<div style="display:flex;gap:6px;margin-top:3px;align-items:center;flex-wrap:wrap">'+
              '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#EFF6FF;color:#1E40AF">'+code+'</span>'+
              '<span style="font-size:11px;color:#9CA3AF">'+ch.category+'</span>'+
            '</div>'+
            '<div style="margin-top:4px;display:flex;align-items:center;gap:6px">'+
              '<span style="font-size:11px;color:#6B7280">申辦連結：</span>'+
              '<a href="'+link+'" target="_blank" style="font-size:11px;color:#2563EB;text-decoration:none;word-break:break-all">'+link+'</a>'+
              '<button data-link="'+link+'" class="copy-link-btn" style="background:#F3F4F6;border:1px solid #E5E7EB;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap">複製</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div style="text-align:right;font-size:11px;color:#9CA3AF">'+
          '帳號：'+code.replace(/[a-z]/,function(m){ return ''; })+'@flowpay.com<br>預設密碼：統編'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
  // 綁定複製按鈕
  setTimeout(function(){
    el.querySelectorAll('.copy-link-btn').forEach(function(btn){
      btn.onclick = function(){ copyLink(btn.getAttribute('data-link')); };
    });
  }, 50);
}

async function doCreateChannel(){
  var name  = document.getElementById('cs-name').value.trim();
  var bizId = document.getElementById('cs-bizid').value.trim();
  var cat   = document.getElementById('cs-cat').value;
  var num   = document.getElementById('cs-num').value;
  var msg   = document.getElementById('cs-msg');

  if(!name||!bizId||!num){ msg.innerHTML='<span style="color:#DC2626">❌ 請填寫所有欄位</span>'; return; }
  if(bizId.length!==8||isNaN(bizId)){ msg.innerHTML='<span style="color:#DC2626">❌ 統編請輸入 8 碼數字</span>'; return; }
  var chCode = cat+String(parseInt(num)).padStart(2,'0');
  if(CHANNELS[chCode]){ msg.innerHTML='<span style="color:#DC2626">❌ 通路代碼 '+chCode+' 已存在，請換一個編號</span>'; return; }

  msg.innerHTML='<span style="color:#9CA3AF">建立中...</span>';
  var btn = document.querySelector('#page-channel-setup button[onclick="doCreateChannel()"]');
  if(btn){ btn.disabled=true; btn.textContent='建立中...'; }

  try {
    // 建立 Supabase Auth 帳號
    var r = await fetch(URL_+'/auth/v1/admin/users',{
      method:'POST',
      headers:Object.assign({},HDR,{'Content-Type':'application/json'}),
      body:JSON.stringify({
        email: bizId+'@flowpay.com',
        password: bizId,
        email_confirm: true,
        user_metadata: {name:name, role:'channel', channel:chCode}
      })
    });
    var data = await r.json();
    if(r.ok && data.id){
      // 加入本地 CHANNELS
      CHANNELS[chCode] = {name:name, category:cat+'類'};
      var link = SITE_URL+'?ch='+chCode;
      msg.innerHTML=
        '<div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:18px;margin-top:4px">'+
        '<div style="font-size:15px;font-weight:800;color:#065F46;margin-bottom:12px">✅ 通路建立成功！</div>'+
        '<div style="display:grid;gap:8px;font-size:13px;color:#047857;line-height:1.8">'+
          '<div>🏢 商家名稱：<strong>'+name+'</strong></div>'+
          '<div>👤 後台帳號：<strong>'+bizId+'</strong></div>'+
          '<div>🔑 初始密碼：<strong>'+bizId+'</strong>（請商家登入後自行修改）</div>'+
          '<div>🔗 客戶填單連結：<br><a href="'+link+'" target="_blank" style="color:#2563EB;word-break:break-all;font-size:12px">'+link+'</a>'+
            ' <button id="cs-copy-btn" data-link="'+link+'" style="background:#fff;border:1px solid #059669;border-radius:6px;padding:2px 10px;font-size:12px;cursor:pointer;font-family:inherit;margin-top:4px">📋 複製連結</button>'+
          '</div>'+
        '</div>'+
        '<div style="margin-top:12px;padding-top:12px;border-top:1px solid #A7F3D0;font-size:12px;color:#6B7280">'+
          '💡 商家用此帳號登入後台，可看自己的案件、統計和核准撥款'+
        '</div>'+
        '</div>';
      // 綁定複製按鈕
      setTimeout(function(){
        if(cBtn) cBtn.onclick = function(){ copyLink(cBtn.getAttribute('data-link')); };
      }, 100);
      // 動態加通路選單
      var sidebar = document.getElementById('sidebar');
      if(isAdmin && sidebar){
        var existBtn = document.getElementById('nav-ch-'+chCode);
        if(!existBtn){
          var newBtn = document.createElement('button');
          newBtn.className='nav-btn'; newBtn.id='nav-ch-'+chCode;
          var code2 = chCode;
          newBtn.onclick=function(){showChannelPage(code2);};
          newBtn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'+
            '<span style="flex:1;text-align:left;font-size:13px">'+name+'</span>';
          sidebar.appendChild(newBtn);
        }
      }
    } else {
      var errMsg = (data.message||'建立失敗');
      if(errMsg.includes('already')) errMsg='此統編帳號已存在！';
      msg.innerHTML='<span style="color:#DC2626">❌ '+errMsg+'</span>';
    }
  } catch(e){
    msg.innerHTML='<span style="color:#DC2626">❌ 網路錯誤，請稍後再試</span>';
  }
  if(btn){ btn.disabled=false; btn.textContent='🚀 建立通路 + 帳號'; }
}

function updateCsCode(){
  var cat = document.getElementById('cs-cat');
  var num = document.getElementById('cs-num');
  var preview = document.getElementById('cs-code-preview');
  var linkPreview = document.getElementById('cs-link-preview');
  if(!cat||!num||!preview) return;
  var code = num.value ? cat.value+String(parseInt(num.value)).padStart(2,'0') : '--';
  preview.textContent = code;
  if(linkPreview && code!=='--'){
    linkPreview.textContent = SITE_URL+'?ch='+code;
    linkPreview.style.wordBreak='break-all';
  }
}