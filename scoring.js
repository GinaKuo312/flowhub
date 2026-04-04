// FlowHub 🎯 評分系統、評等、工具函數


function fmtDate(d){
  if(!d)return'—';
  var dt=new Date(d);
  return (dt.getMonth()+1)+'/'+dt.getDate()+' '+dt.getHours().toString().padStart(2,'0')+':'+dt.getMinutes().toString().padStart(2,'0');
}

function chName(code){ return CHANNELS[code] ? CHANNELS[code].name : code; }

function chCategory(code){ return CHANNELS[code] ? CHANNELS[code].category : '—'; }

function badgeClass(s){
  var m={待處理:'b-wait',已聯繫:'b-contact',審核中:'b-review',已核准:'b-approve',婉拒:'b-reject'};
  return m[s||'待處理']||'b-wait';
}

function gradeInfo(s){
  if(s>=82)return{g:'A',label:'穩定可承作',hint:'條件穩定，確認資料完整後可送件',bg:'#ECFDF5',border:'#059669',text:'#065F46',dot:'dot-g'};
  if(s>=68)return{g:'B',label:'可承作，確認收入',hint:'確認薪轉與月付比例後可評估',bg:'#EFF6FF',border:'#2563EB',text:'#1E40AF',dot:'dot-g'};
  if(s>=55)return{g:'C',label:'建議降額或補件',hint:'補薪轉存摺或調降申請金額',bg:'#FFFBEB',border:'#D97706',text:'#92400E',dot:'dot-y'};
  if(s>=40)return{g:'D',label:'高風險，需補強',hint:'遲繳紀錄或資料不一致，先補件',bg:'#FEF3C7',border:'#E97010',text:'#92400E',dot:'dot-y'};
  return{g:'E',label:'不建議送件',hint:'警示戶／多項重大負分，婉拒為主',bg:'#FEF2F2',border:'#DC2626',text:'#991B1B',dot:'dot-r'};
}

// ⑪ 汽機車繳款（時間 + 品質 各自獨立計分）（CCIS已移除，未實際串接）（時間 + 品質 各自獨立計分）
  function timeScore(t){
    if(t==='over1y') return 10;  // 繳款1年以上：穩定加10分
    if(t==='lt6')    return -3;  // 未滿6期：觀察中略扣3分
    return 0;
  }

function qualityScore(q){
    if(q==='normal')     return 8;   // 正常繳款：良好習慣加8分
    if(q==='paid')       return 5;   // 已繳清：還清加5分
    if(q==='late')       return -20; // 偶爾遲繳：明顯扣20分
    if(q==='late_often') return -40; // 常常遲繳：高風險扣40分
    return 0;
  }

function vehicleCalc(veh){
    // 新欄位：car_time + car_quality 或 moto_time + moto_quality
    if(veh.time!==undefined || veh.quality!==undefined){
      return timeScore(veh.time||'') + qualityScore(veh.quality||'');
    }
    // 舊欄位相容：car_ok / moto_ok
    if(veh.ok){
      if(veh.ok==='over1y'||veh.ok==='lt6') return timeScore(veh.ok);
      return qualityScore(veh.ok);
    }
    return 0;
  }

function vehicleDisplay(has, time, quality, ok){
  if(has!=='yes') return '無';
  var parts = [];
  if(time) parts.push(vehicleLabel(time));
  if(quality) parts.push(vehicleLabel(quality));
  if(!parts.length && ok) parts.push(vehicleLabel(ok));
  return parts.length ? '有（'+parts.join(' ／ ')+'）' : '有（未填）';
}

function vehicleLabel(code){
  var map={
    'lt6':'未滿6期','over1y':'繳款1年以上',
    'normal':'正常繳款','late':'偶爾遲繳',
    'late_often':'常常遲繳','paid':'已繳清',
    'ok6':'準時6期以上'
  };
  return map[code] || code || '未填';
}

function calcScore(c){
  var base = 50;

  // ① 薪資發放方式
  if(c.salary_type==='transfer') base+=15;
  else if(c.salary_type==='cash') base-=5;

  // ② 信用卡繳款狀況
  if(c.has_credit_card==='yes'){
    if(c.credit_card_status==='normal')    base+=10;
    if(c.credit_card_status==='minimum')   base-=15;
    if(c.credit_card_status==='suspended') base-=30;
    if(c.credit_card_status==='unused')    base+=2;
  }

  // ③ 年資（工作穩定度）
  var tenure = {
    '≥12月': 20, '6-12月': 12, '3-6月': 5, '<3月': -15
  };
  if(c.sc_tenure && tenure[c.sc_tenure] !== undefined) base += tenure[c.sc_tenure];

  // ② 工作性質
  var jobType = {
    '正職': 10, '兼職/接案': 3, '不穩定': -10
  };
  if(c.sc_job_type && jobType[c.sc_job_type] !== undefined) base += jobType[c.sc_job_type];

  // ③ 公司可查核
  var compCheck = { '是': 5, '否': -5 };
  if(c.sc_company_check && compCheck[c.sc_company_check] !== undefined) base += compCheck[c.sc_company_check];

  // ⑧ 月付比例 - 自動從月收入與貸款負擔計算
  var income = parseInt(c.income) || 0;
  var loanBurdenMap = {'5,000 以下':3000,'5,000–10,000':7500,'10,000–20,000':15000,'20,000 以上':25000};
  var loanBurden = loanBurdenMap[c.loan_burden] || 0;
  var amtMap = {'NT$ 30,000 以下':30000,'NT$ 50,000 左右':50000,'NT$ 100,000 左右':100000,'NT$ 100,000–200,000':150000,'NT$ 300,000 以上':300000};
  var reqAmt = amtMap[c.need_amount] || 0;
  var newPayment = Math.round(reqAmt / 24);
  var totalPayment = loanBurden + newPayment;
  if(income > 0){
    var ratio = totalPayment / income;
    if(ratio < 0.3) base += 15;
    else if(ratio < 0.5) base += 3;
    else base -= 20;
    if(reqAmt <= income * 6) base += 10;
    else if(reqAmt > income * 12) base -= 12;
  }

  // 最近送件次數影響評分
  // 資金需求型（扣更多）：代表資金緊張、高風險
  // 消費分期型（扣較少）：購物行為，風險相對低
  var recentPenalty = 0;
  var recentType = c.recent_apply_type || '';   // 資金需求方面
  var recentCount = c.recent_apply_count || ''; // 消費分期方面
  // 資金詢問：影響較大
  if(recentType.indexOf('3次以上') >= 0) recentPenalty -= 20;
  else if(recentType.indexOf('2次') >= 0) recentPenalty -= 12;
  else if(recentType.indexOf('1次') >= 0) recentPenalty -= 5;
  else if(recentType.indexOf('0次') >= 0) recentPenalty += 3; // 完全沒送過，加分
  // 消費分期：影響較小
  if(recentCount.indexOf('3次以上') >= 0) recentPenalty -= 8;
  else if(recentCount.indexOf('2次') >= 0) recentPenalty -= 4;
  else if(recentCount.indexOf('1次') >= 0) recentPenalty -= 1;
  else if(recentCount.indexOf('0次') >= 0) recentPenalty += 2; // 沒有消費分期紀錄，加分
  base += recentPenalty;

  // ④ 工作職電確認
  var jobTel = { '是': 5, '否': -12 };
  if(c.sc_job_tel && jobTel[c.sc_job_tel] !== undefined) base += jobTel[c.sc_job_tel];

  // ⑤ 薪轉（還款來源最重要）
  var salaryTr = { '有': 22, '無': 0 };
  if(c.sc_salary_transfer && salaryTr[c.sc_salary_transfer] !== undefined) base += salaryTr[c.sc_salary_transfer];

  // ⑥ 存摺收入佐證
  var bankRec = { '有': 10, '無': 0 };
  if(c.sc_bank_record && bankRec[c.sc_bank_record] !== undefined) base += bankRec[c.sc_bank_record];

  // ⑦ 收入佐證文件
  var incProof = { '有': 10, '無': -15 };
  if(c.sc_income_proof && incProof[c.sc_income_proof] !== undefined) base += incProof[c.sc_income_proof];

  // ⑧ 門號本人（聯絡真實性）
  var phoneOwn = { '是': 10, '否': -25 };
  if(c.sc_phone_owner && phoneOwn[c.sc_phone_owner] !== undefined) base += phoneOwn[c.sc_phone_owner];

  // ⑨ 居住穩定（含居住地址＝戶籍判斷）
  var residence = { '是': 5, '否': 0 };
  if(c.sc_residence && residence[c.sc_residence] !== undefined) base += residence[c.sc_residence];
  // 居住地址與戶籍相同：掌握度高，加分；不同：稍扣分
  if(c.same_addr === 'yes') base += 5;
  else if(c.same_addr === 'no') base -= 5;

  // ⑩ 戶政逕遷戶
  var addrTr = { '是': -20, '否': 0 };
  if(c.sc_addr_transfer && addrTr[c.sc_addr_transfer] !== undefined) base += addrTr[c.sc_addr_transfer];

  // ⑪ 汽機車繳款（時間 + 品質 各自獨立計分）（CCIS已移除，未實際串接）（時間 + 品質 各自獨立計分）
  function timeScore(t){
    if(t==='over1y') return 10;  // 繳款1年以上：穩定加10分
    if(t==='lt6')    return -3;  // 未滿6期：觀察中略扣3分
    return 0;
  }
  function qualityScore(q){
    if(q==='normal')     return 8;   // 正常繳款：良好習慣加8分
    if(q==='paid')       return 5;   // 已繳清：還清加5分
    if(q==='late')       return -20; // 偶爾遲繳：明顯扣20分
    if(q==='late_often') return -40; // 常常遲繳：高風險扣40分
    return 0;
  }
  function vehicleCalc(veh){
    // 新欄位：car_time + car_quality 或 moto_time + moto_quality
    if(veh.time!==undefined || veh.quality!==undefined){
      return timeScore(veh.time||'') + qualityScore(veh.quality||'');
    }
    // 舊欄位相容：car_ok / moto_ok
    if(veh.ok){
      if(veh.ok==='over1y'||veh.ok==='lt6') return timeScore(veh.ok);
      return qualityScore(veh.ok);
    }
    return 0;
  }
  if(c.has_car==='yes'){
    base += vehicleCalc({time: c.car_time, quality: c.car_quality, ok: c.car_ok});
  }
  if(c.has_moto==='yes'){
    base += vehicleCalc({time: c.moto_time, quality: c.moto_quality, ok: c.moto_ok});
  }

  // ⑬ 警示戶 → 直接歸 E
  if(c.is_alert === 'yes') return 0;

  return Math.min(100, Math.max(0, base));
}

// ===== 重複申請偵測 =====
function checkDuplicate(phone, idNo){
  var samePhone = cases.filter(function(c){
    return c.phone && phone && c.phone===phone;
  });
  var sameId = cases.filter(function(c){
    return c.id_no && idNo && c.id_no===idNo;
  });
  var warns = [];
  if(samePhone.length > 1) warns.push('⚠️ 此電話已有 '+samePhone.length+' 筆申請記錄');
  if(sameId.length > 1) warns.push('⚠️ 此身分證已有 '+sameId.length+' 筆申請記錄');
  return warns;
}