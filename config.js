// FlowHub ⚙️ 設定、帳號系統、全域變數


// 合併所有帳號查詢
function findAccount(acct){
  return LOCAL_ACCOUNTS[acct] || CHANNEL_ACCOUNTS[acct] || null;
}

// 新增通路帳號（通路設定頁面呼叫）
function addChannelAccount(bizId, name, chCode){
  CHANNEL_ACCOUNTS[bizId] = {
    pw: bizId,  // 預設密碼 = 統編
    name: name,
    role: 'channel',
    channel: chCode
  };
  saveChannelAccountsLocal();
}

// 儲存通路帳號到 localStorage（這次關掉再開還在）
function saveChannelAccountsLocal(){
  try {
    localStorage.setItem('fp_channel_accounts', JSON.stringify(CHANNEL_ACCOUNTS));
  } catch(e){}
}

// 載入通路帳號從 localStorage
function loadChannelAccountsLocal(){
  try {
    var saved = localStorage.getItem('fp_channel_accounts');
    if(saved){
      var parsed = JSON.parse(saved);
      Object.assign(CHANNEL_ACCOUNTS, parsed);
    }
  } catch(e){}
}