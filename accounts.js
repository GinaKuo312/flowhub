// FlowHub 👥 帳號管理


async function loadAccounts(){
  // 渲染通路明細
  var summaryEl = document.getElementById('channel-summary-list');
  if(summaryEl){
    var chKeys = Object.keys(CHANNELS).filter(function(k){ return k!=='FlowPay'; });
    if(!chKeys.length){
      summaryEl.innerHTML='<div style="font-size:12px;color:#9CA3AF">尚未建立任何通路</div>';
    } else {
      summaryEl.innerHTML = chKeys.map(function(code){
        var ch = CHANNELS[code];
        var bizId = Object.keys(CHANNEL_ACCOUNTS).find(function(k){ return CHANNEL_ACCOUNTS[k].channel===code; }) || '—';
        var link = SITE_URL+'?ch='+code;
        return '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;padding:8px 10px;background:#fff;border-radius:8px;border:1px solid #E5E7EB">'+
          '<div style="display:flex;align-items:center;gap:8px">'+
            '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#EFF6FF;color:#1E40AF">'+code+'</span>'+
            '<span style="font-size:13px;font-weight:700">'+ch.name+'</span>'+
            '<span style="font-size:11px;color:#9CA3AF">'+ch.category+'</span>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:6px">'+
            '<span style="font-size:11px;color:#6B7280">帳號：'+bizId+'</span>'+
            '<a href="'+link+'" target="_blank" style="font-size:11px;color:#2563EB;text-decoration:none">填單連結</a>'+
            '<button data-link="'+link+'" class="copy-ch-link" style="background:#F3F4F6;border:1px solid #E5E7EB;border-radius:6px;padding:1px 8px;font-size:11px;cursor:pointer;font-family:inherit">複製</button>'+
          '</div>'+
        '</div>';
      }).join('');
      setTimeout(function(){
        summaryEl.querySelectorAll('.copy-ch-link').forEach(function(btn){
          btn.onclick=function(){ copyLink(btn.getAttribute('data-link')); };
        });
      },50);
    }
  }
  var el = document.getElementById('accounts-list');
  el.innerHTML = '<div class="empty">載入中...</div>';
  try {
    var r = await fetch(URL_+'/auth/v1/admin/users?per_page=50',{
      headers:Object.assign({},HDR)
    });
    var data = await r.json();
    if(!r.ok){ el.innerHTML='<div class="empty">載入失敗（需要管理員權限）</div>'; return; }
    accountsList = data.users || [];
    renderAccounts();
  } catch(e){
    // 載入失敗時顯示本地帳號
    accountsList = [];
    el.innerHTML='<div class="empty" style="color:#9CA3AF">無法連線 Supabase，顯示本地帳號</div>';
  }
}

function renderAccounts(){
  var el = document.getElementById('accounts-list');
  if(!accountsList.length){ el.innerHTML='<div class="empty">尚無帳號</div>'; return; }
  el.innerHTML = accountsList.map(function(u){
    var meta = u.user_metadata||{};
    var role = meta.role||'staff';
    var roleColor = role==='admin'?'#1E40AF':role==='channel'?'#065F46':'#374151';
    var roleBg = role==='admin'?'#EFF6FF':role==='channel'?'#ECFDF5':'#F3F4F6';
    var roleLabel = role==='admin'?'管理員':role==='channel'?'通路帳號':'服務員';
    var lastSign = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('zh-TW') : '從未登入';
    var bizId = u.email ? u.email.replace('@flowpay.com','') : '';
    return '<div class="table-wrap" style="padding:16px 20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">'+
        '<div style="display:flex;align-items:center;gap:12px">'+
          '<div style="width:40px;height:40px;border-radius:50%;background:'+roleBg+';display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">'+
            (role==='admin'?'👑':role==='channel'?'🏢':'👤')+
          '</div>'+
          '<div>'+
            '<div style="font-size:14px;font-weight:700;color:#111">'+(meta.name||u.email)+'</div>'+
            '<div style="font-size:12px;color:#6B7280">'+u.email+'</div>'+
            '<div style="margin-top:4px;display:flex;align-items:center;gap:6px">'+
              '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:'+roleBg+';color:'+roleColor+'">'+roleLabel+'</span>'+
              (meta.channel?'<span style="font-size:10px;color:#9CA3AF">通路：'+meta.channel+'</span>':'')+
              '<span style="font-size:10px;color:#9CA3AF">最後登入：'+lastSign+'</span>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<button data-uid="'+u.id+'" data-email="'+u.email+'" data-bizid="'+bizId+'" class="reset-pw-btn" '+
          'style="background:#FEF3C7;border:1.5px solid #FDE68A;color:#92400E;padding:7px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">'+
          '🔑 重設密碼'+
        '</button>'+
      '</div>'+
    '</div>';
  }).join('');
  setTimeout(function(){
    el.querySelectorAll('.reset-pw-btn').forEach(function(btn){
      btn.onclick = function(){ showResetPwModal(btn.getAttribute('data-uid'), btn.getAttribute('data-email'), btn.getAttribute('data-bizid')); };
    });
  }, 50);
}

// ===== 管理員重置帳號密碼回統編 =====
async function resetToDefault(uid, businessId){
  var msg = document.getElementById('reset-pw-msg');
  if(!businessId){ msg.innerHTML='<span style="color:#DC2626">找不到統編資訊</span>'; return; }
  msg.innerHTML='<span style="color:#9CA3AF">重置中...</span>';
  var btn = document.getElementById('confirm-reset-btn');
  if(btn) btn.disabled=true;
  // 本地帳號重置
  if(CHANNEL_ACCOUNTS[businessId]){
    CHANNEL_ACCOUNTS[businessId].pw = businessId;
    saveChannelAccountsLocal();
    msg.innerHTML='<span style="color:#059669">✅ 已重置！密碼已恢復為統編：'+businessId+'</span>';
    setTimeout(function(){ document.getElementById('reset-pw-modal').remove(); },2000);
    return;
  }
  try {
    var r = await fetch(URL_+'/auth/v1/admin/users/'+uid,{
      method:'PUT',
      headers:Object.assign({},HDR,{'Content-Type':'application/json'}),
      body:JSON.stringify({password:businessId})
    });
    if(r.ok){
      msg.innerHTML='<span style="color:#059669">✅ 已重置！密碼已恢復為統編：'+businessId+'</span>';
      setTimeout(function(){ document.getElementById('reset-pw-modal').remove(); },2000);
    } else {
      msg.innerHTML='<span style="color:#DC2626">重置失敗，請再試</span>';
      if(btn) btn.disabled=false;
    }
  } catch(e){
    msg.innerHTML='<span style="color:#DC2626">網路錯誤</span>';
    if(btn) btn.disabled=false;
  }
}

function showResetPwModal(uid, email, bizId){
  var old = document.getElementById('reset-pw-modal');
  if(old) old.remove();
  var overlay = document.createElement('div');
  overlay.id='reset-pw-modal';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:center;justify-content:center';
  overlay.onclick=function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML=
    '<div style="background:#fff;border-radius:16px;padding:28px;width:380px;max-width:90vw">'+
      '<div style="font-size:16px;font-weight:800;margin-bottom:4px">🔑 重設密碼</div>'+
      '<div style="font-size:13px;color:#6B7280;margin-bottom:16px">'+email+'</div>'+
      (bizId?'<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#92400E">'+
        '📌 快速重置：將密碼重設回 <strong>'+bizId+'</strong>（統編）'+
        '<button id="reset-to-default-btn" data-uid="'+uid+'" data-bizid="'+bizId+'" style="margin-left:10px;background:#D97706;color:#fff;border:none;border-radius:8px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">重置回統編</button>'+
      '</div>':'')+
      '<hr style="border:none;border-top:1px solid #E5E7EB;margin-bottom:12px"/>'+
      '<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">或自訂新密碼</div>'+
      '<input id="new-pw-input" type="password" placeholder="輸入新密碼（至少8碼）" '+
        'style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;font-family:inherit;outline:none;margin-bottom:6px;box-sizing:border-box"/>'+
      '<input id="new-pw-confirm" type="password" placeholder="再次輸入新密碼" '+
        'style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;font-family:inherit;outline:none;margin-bottom:12px;box-sizing:border-box"/>'+
      '<div style="display:flex;gap:8px">'+
        '<button id="confirm-reset-btn" data-uid="'+uid+'" '+
          'style="flex:1;background:#2563EB;color:#fff;border:none;border-radius:10px;padding:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">確認重設</button>'+
        '<button id="cancel-reset-btn" '+
          'style="flex:1;background:#F3F4F6;color:#374151;border:none;border-radius:10px;padding:11px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">取消</button>'+
      '</div>'+
      '<div id="reset-pw-msg" style="text-align:center;font-size:13px;margin-top:10px;min-height:18px"></div>'+
    '</div>';
  document.body.appendChild(overlay);
  setTimeout(function(){
    document.getElementById('new-pw-input').focus();
    var confirmBtn = document.getElementById('confirm-reset-btn');
    if(confirmBtn) confirmBtn.onclick = function(){ doResetPw(confirmBtn.getAttribute('data-uid')); };
    var cancelBtn = document.getElementById('cancel-reset-btn');
    if(cancelBtn) cancelBtn.onclick = function(){ document.getElementById('reset-pw-modal').remove(); };
    var resetDefaultBtn = document.getElementById('reset-to-default-btn');
    if(resetDefaultBtn) resetDefaultBtn.onclick = function(){
      resetToDefault(resetDefaultBtn.getAttribute('data-uid'), resetDefaultBtn.getAttribute('data-bizid'));
    };
  },100);
}

async function doResetPw(uid){
  var pw  = document.getElementById('new-pw-input').value;
  var pw2 = document.getElementById('new-pw-confirm').value;
  var msg = document.getElementById('reset-pw-msg');
  if(!pw||pw.length<8){ msg.innerHTML='<span style="color:#DC2626">密碼至少需要 8 碼</span>'; return; }
  if(pw!==pw2){ msg.innerHTML='<span style="color:#DC2626">兩次密碼不一致</span>'; return; }
  msg.innerHTML='<span style="color:#9CA3AF">更新中...</span>';
  try {
    var r = await fetch(URL_+'/auth/v1/admin/users/'+uid,{
      method:'PUT',
      headers:Object.assign({},HDR,{'Content-Type':'application/json'}),
      body:JSON.stringify({password:pw})
    });
    if(r.ok){
      msg.innerHTML='<span style="color:#059669">✅ 密碼已成功重設！</span>';
      setTimeout(function(){ document.getElementById('reset-pw-modal').remove(); },1500);
    } else {
      var err = await r.json();
      msg.innerHTML='<span style="color:#DC2626">重設失敗：'+(err.message||'請確認權限')+'</span>';
    }
  } catch(e){
    msg.innerHTML='<span style="color:#DC2626">網路錯誤，請稍後再試</span>';
  }
}