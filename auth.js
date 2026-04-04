// FlowHub 🔐 登入、登出、改密碼


async function logout(){
  // 呼叫 Supabase Auth 登出，讓 token 失效
  try{
    await fetch(URL_+'/auth/v1/logout',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':KEY_,'Authorization':HDR['Authorization']||('Bearer '+KEY_)}
    });
  }catch(e){}
  // 還原 header 為 anon key
  HDR['Authorization'] = 'Bearer '+KEY_;
  if(_tokenTimer){ clearInterval(_tokenTimer); _tokenTimer=null; }
  _refreshToken = null;
  me=null; isAdmin=false; cases=[]; ACCS={};
  document.getElementById('app').style.display='none';
  document.getElementById('login').style.display='flex';
  document.getElementById('u').value='';
  document.getElementById('p').value='';
  document.getElementById('err').textContent='';
}

// Token 自動 Refresh（每 50 分鐘更新一次，避免1小時失效）
async function startTokenRefresh(refreshToken){
  _refreshToken = refreshToken;
  if(_tokenTimer) clearInterval(_tokenTimer);
  _tokenTimer = setInterval(async function(){
    if(!_refreshToken) return;
    try {
      var r = await fetch(URL_+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':KEY_},
        body:JSON.stringify({refresh_token:_refreshToken})
      });
      var data = await r.json();
      if(r.ok && data.access_token){
        HDR['Authorization'] = 'Bearer '+data.access_token;
        _refreshToken = data.refresh_token || _refreshToken;
      }
    } catch(e){ console.warn('Token refresh 失敗',e); }
  }, 50*60*1000); // 每50分鐘
}

// ===== 修改密碼（所有帳號可用）=====
function showChangePw(){
  var modal = document.getElementById('change-pw-modal');
  modal.style.display='flex';
  document.getElementById('cp-old').value='';
  document.getElementById('cp-new1').value='';
  document.getElementById('cp-new2').value='';
  document.getElementById('change-pw-msg').textContent='';
  setTimeout(function(){ document.getElementById('cp-old').focus(); },100);
}

function closeChangePw(){
  document.getElementById('change-pw-modal').style.display='none';
}

async function doChangePw(){
  var oldPw = document.getElementById('cp-old').value;
  var pw1   = document.getElementById('cp-new1').value;
  var pw2   = document.getElementById('cp-new2').value;
  var msg   = document.getElementById('change-pw-msg');
  if(!oldPw){ msg.innerHTML='<span style="color:#DC2626">請輸入目前密碼</span>'; return; }
  if(!pw1||pw1.length<8){ msg.innerHTML='<span style="color:#DC2626">新密碼至少需要 8 碼</span>'; return; }
  if(pw1!==pw2){ msg.innerHTML='<span style="color:#DC2626">兩次密碼不一致</span>'; return; }
  if(pw1===oldPw){ msg.innerHTML='<span style="color:#DC2626">新密碼不能與目前密碼相同</span>'; return; }
  msg.innerHTML='<span style="color:#9CA3AF">更新中...</span>';
  var btn = document.getElementById('confirm-change-pw');
  btn.disabled=true;

  // 本地帳號：用 localStorage 更新密碼
  var curAcct = me ? me.replace('local_','') : '';
  var curAcc  = findAccount(curAcct);
  if(curAcc){
    if(curAcc.pw !== oldPw){
      msg.innerHTML='<span style="color:#DC2626">目前密碼錯誤</span>';
      btn.disabled=false; return;
    }
    curAcc.pw = pw1;
    if(CHANNEL_ACCOUNTS[curAcct]) CHANNEL_ACCOUNTS[curAcct].pw = pw1;
    else if(LOCAL_ACCOUNTS[curAcct]) LOCAL_ACCOUNTS[curAcct].pw = pw1;
    saveChannelAccountsLocal();
    try {
      var staffPws = JSON.parse(localStorage.getItem('fp_staff_pws')||'{}');
      staffPws[curAcct] = pw1;
      localStorage.setItem('fp_staff_pws', JSON.stringify(staffPws));
    } catch(e){}
    msg.innerHTML='<span style="color:#059669">✅ 密碼修改成功！下次登入請用新密碼</span>';
    document.getElementById('cp-old').value='';
    document.getElementById('cp-new1').value='';
    document.getElementById('cp-new2').value='';
    btn.disabled=false;
    setTimeout(closeChangePw, 1500);
    return;
  }

  // Supabase 帳號
  try {
    var r = await fetch(URL_+'/auth/v1/user',{
      method:'PUT',
      headers:Object.assign({},HDR,{'Content-Type':'application/json'}),
      body:JSON.stringify({password:pw1})
    });
    if(r.ok){
      msg.innerHTML='<span style="color:#059669">✅ 密碼修改成功！</span>';
      document.getElementById('cp-old').value='';
      document.getElementById('cp-new1').value='';
      document.getElementById('cp-new2').value='';
      setTimeout(closeChangePw, 1500);
    } else {
      var err = await r.json();
      msg.innerHTML='<span style="color:#DC2626">修改失敗：'+(err.message||'請稍後再試')+'</span>';
      btn.disabled=false;
    }
  } catch(e){
    msg.innerHTML='<span style="color:#DC2626">網路錯誤，請稍後再試</span>';
    btn.disabled=false;
  }
}

function showForgotPw(){
  var modal = document.getElementById('forgot-modal');
  modal.style.display='flex';
  // 重置到步驟1
  document.getElementById('forgot-step1').style.display='block';
  document.getElementById('forgot-step2').style.display='none';
  document.getElementById('forgot-step3').style.display='none';
  document.getElementById('forgot-msg').textContent='';
  document.getElementById('forgot-phone').value='';
  _forgotPhone=''; _forgotSession=null;
  setTimeout(function(){ document.getElementById('forgot-phone').focus(); }, 100);
}

function closeForgotPw(){
  document.getElementById('forgot-modal').style.display='none';
}

// 步驟1：發送 OTP
async function sendForgotOtp(){
  var rawPhone = document.getElementById('forgot-phone').value.trim().replace(/[^0-9]/g,'');
  var msg = document.getElementById('forgot-msg');
  if(!rawPhone||rawPhone.length!==10||!rawPhone.startsWith('09')){
    msg.innerHTML='<span style="color:#DC2626">請輸入正確的手機號碼（09開頭，10碼）</span>'; return;
  }
  _forgotPhone = '+886'+rawPhone.substring(1);
  msg.innerHTML='<span style="color:#9CA3AF">發送中...</span>';
  var btn = document.getElementById('send-otp-btn');
  btn.disabled=true; btn.textContent='發送中...';
  try {
    var r = await fetch(URL_+'/auth/v1/otp',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':KEY_},
      body:JSON.stringify({phone:_forgotPhone, create_user:false})
    });
    if(r.ok||r.status===200){
      msg.innerHTML='';
      document.getElementById('otp-phone-display').textContent=rawPhone;
      document.getElementById('forgot-step1').style.display='none';
      document.getElementById('forgot-step2').style.display='block';
      document.getElementById('forgot-otp').focus();
    } else {
      var err = await r.json();
      msg.innerHTML='<span style="color:#DC2626">'+(err.message||'發送失敗，請確認手機號碼是否正確')+'</span>';
      btn.disabled=false; btn.textContent='發送驗證碼';
    }
  } catch(e){
    msg.innerHTML='<span style="color:#DC2626">網路錯誤，請稍後再試</span>';
    btn.disabled=false; btn.textContent='發送驗證碼';
  }
}

// 步驟2：驗證 OTP
async function verifyForgotOtp(){
  var otp = document.getElementById('forgot-otp').value.trim();
  var msg = document.getElementById('forgot-msg');
  if(!otp||otp.length!==6){ msg.innerHTML='<span style="color:#DC2626">請輸入 6 位驗證碼</span>'; return; }
  msg.innerHTML='<span style="color:#9CA3AF">驗證中...</span>';
  var btn = document.getElementById('verify-otp-btn');
  btn.disabled=true;
  try {
    var r = await fetch(URL_+'/auth/v1/token?grant_type=phone_otp_verify',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':KEY_},
      body:JSON.stringify({phone:_forgotPhone, token:otp, type:'sms'})
    });
    // Supabase OTP 驗證
    if(!r.ok){
      // 嘗試另一個端點
      r = await fetch(URL_+'/auth/v1/verify',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':KEY_},
        body:JSON.stringify({phone:_forgotPhone, token:otp, type:'sms'})
      });
    }
    var data = await r.json();
    if(r.ok && data.access_token){
      _forgotSession = data.access_token;
      msg.innerHTML='';
      document.getElementById('forgot-step2').style.display='none';
      document.getElementById('forgot-step3').style.display='block';
      document.getElementById('new-pw1').focus();
    } else {
      msg.innerHTML='<span style="color:#DC2626">驗證碼錯誤或已過期，請重試</span>';
      btn.disabled=false;
    }
  } catch(e){
    msg.innerHTML='<span style="color:#DC2626">網路錯誤，請稍後再試</span>';
    btn.disabled=false;
  }
}

// 步驟3：設定新密碼
async function setNewPw(){
  var pw1 = document.getElementById('new-pw1').value;
  var pw2 = document.getElementById('new-pw2').value;
  var msg = document.getElementById('forgot-msg');
  if(!pw1||pw1.length<8){ msg.innerHTML='<span style="color:#DC2626">密碼至少需要 8 碼</span>'; return; }
  if(pw1!==pw2){ msg.innerHTML='<span style="color:#DC2626">兩次密碼不一致</span>'; return; }
  if(!_forgotSession){ msg.innerHTML='<span style="color:#DC2626">驗證已過期，請重新開始</span>'; return; }
  msg.innerHTML='<span style="color:#9CA3AF">設定中...</span>';
  var btn = document.getElementById('set-pw-btn');
  btn.disabled=true;
  try {
    var r = await fetch(URL_+'/auth/v1/user',{
      method:'PUT',
      headers:{'Content-Type':'application/json','apikey':KEY_,'Authorization':'Bearer '+_forgotSession},
      body:JSON.stringify({password:pw1})
    });
    if(r.ok){
      msg.innerHTML='<span style="color:#059669">✅ 密碼設定成功！請重新登入</span>';
      setTimeout(function(){ closeForgotPw(); _forgotSession=null; }, 2000);
    } else {
      msg.innerHTML='<span style="color:#DC2626">設定失敗，請重新驗證</span>';
      btn.disabled=false;
    }
  } catch(e){
    msg.innerHTML='<span style="color:#DC2626">網路錯誤，請稍後再試</span>';
    btn.disabled=false;
  }
}

// PWA 安裝
function installApp(){
  if(_installPrompt){
    _installPrompt.prompt();
    _installPrompt.userChoice.then(function(result){
      if(result.outcome==='accepted'){
        document.getElementById('install-bar').style.display='none';
      }
      _installPrompt=null;
    });
  } else {
    // iOS 手動引導
    alert('請點瀏覽器下方的「分享」→「加入主畫面」來安裝 FlowHub App！');
  }
}