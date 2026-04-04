// FlowHub 📋 案件列表、案件詳情


async function load(append){
  if(!append){
    _caseOffset=0; cases=[];
    document.getElementById('tbody').innerHTML='<div class="empty">載入中...</div>';
  }
  var acc = ACCS[me] || {};
  var base = URL_+'/rest/v1/applications?order=created_at.desc&select=*,id_image,id_image_back';
  // 只有通路帳號（role=channel）才篩選，管理員看全部
  if(!isAdmin && acc.channel && acc.channel!=='null'){
    base += '&channel=eq.'+encodeURIComponent(acc.channel);
    var d60=new Date(); d60.setDate(d60.getDate()-60);
    base += '&created_at=gte.'+d60.toISOString();
  }
  var url = base+'&limit='+PAGE_SIZE+'&offset='+_caseOffset;
  // 取總數
  try {
    var rh = await fetch(base+'&limit=1',{headers:Object.assign({},HDR,{'Prefer':'count=exact'})});
    var ct = rh.headers.get('content-range');
    _caseTotal = ct ? (parseInt(ct.split('/')[1])||0) : 0;
  } catch(e){}
  var r = await fetch(url,{headers:HDR});
  if(!r.ok){document.getElementById('tbody').innerHTML='<div class="empty">載入失敗</div>';return;}
  var newData = await r.json();
  if(append) cases = cases.concat(newData);
  else cases = newData;
  _caseOffset += newData.length;
  renderStats(); filter(); renderLoadMore();
}

function filter(){
  var q=document.getElementById('q').value.toLowerCase();
  var sf=document.getElementById('sf').value;
  var list=cases.filter(function(c){
    var mq=!q||(c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q);
    var ms=!sf||(c.status||'待處理')===sf;
    return mq&&ms;
  });
  if(!list.length){document.getElementById('tbody').innerHTML='<div class="empty">尚無符合條件的案件</div>';return;}
  var rows=list.map(function(c){
    var sc=calcScore(c); var gi=gradeInfo(sc);
    var riskTxt=(c.is_alert==='yes')?'<span class="dot dot-r"></span>警示戶':('<span class="dot '+gi.dot+'"></span>'+gi.g+' '+gi.label);
    return '<tr data-id="'+c.id+'" class="open-panel-row">'+
      '<td>'+
        '<div class="name-bold">'+(c.name||'—')+'</div>'+
        '<div class="date-sub">'+fmtDate(c.created_at)+'</div>'+
        (isAdmin ? '<div style="margin-top:4px"><span style="font-size:10px;font-weight:'+(c.channel&&c.channel!=='FlowPay'?'700':'600')+';padding:2px 8px;border-radius:99px;background:'+(c.channel&&c.channel!=='FlowPay'?'#EFF6FF':'#F3F4F6')+';color:'+(c.channel&&c.channel!=='FlowPay'?'#1E40AF':'#9CA3AF')+'">'+(c.channel? chName(c.channel):'FlowHub')+'</span></div>' : '')+
      '</td>'+
      '<td>'+(c.phone||'—')+'</td>'+
      '<td>'+(c.need_amount||'—')+'</td>'+
      '<td>'+(c.contact_time||'—')+'</td>'+
      '<td>'+riskTxt+'</td>'+
      '<td><span class="badge '+badgeClass(c.status)+'">'+(c.status||'待處理')+'</span></td>'+
      '</tr>';
  }).join('');
  document.getElementById('tbody').innerHTML='<table><thead><tr><th>申請人</th><th>電話</th><th>申請金額</th><th>聯絡時間</th><th>風險評估</th><th>狀態</th></tr></thead><tbody>'+rows+'</tbody></table>';
  setTimeout(function(){
    document.querySelectorAll('#tbody .open-panel-row').forEach(function(tr){
      tr.style.cursor='pointer';
      tr.onclick=function(){ openPanel(tr.getAttribute('data-id')); };
    });
  },50);
}

function renderLoadMore(){
  var el=document.getElementById('load-more-wrap');
  if(!el) return;
  var hasMore = _caseTotal>0 && cases.length<_caseTotal;
  el.style.display = hasMore?'flex':'none';
  var btn=document.getElementById('load-more-btn');
  if(btn) btn.textContent='載入更多（已顯示 '+cases.length+' / '+_caseTotal+' 筆）';
}

function openPanel(id){
  var c=cases.find(function(x){return x.id===id;});
  if(!c)return;
  var sc=calcScore(c); var gi=gradeInfo(sc);
  document.getElementById('ptitle').textContent=(c.name||'—')+' 的申請';
  // Risk alert bar
  // 重複申請偵測
  var dupWarns = checkDuplicate(c.phone, c.id_no);
  var alertBar='';
  dupWarns.forEach(function(w){
    alertBar+='<div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#92400E">'+w+'</div>';
  });
  if(c.is_alert==='yes') alertBar+='<div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#991B1B"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="#DC2626"/></svg>⚠️ 警示戶，請謹慎評估</div>';
  // CCIS 不良警示移除（未實際串接查詢）
  if(sc>=70&&c.is_alert!=='yes') alertBar+='<div style="background:#ECFDF5;border:1.5px solid #A7F3D0;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#065F46"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>初步條件良好，建議優先處理</div>';

  var GROUPS=[
    {title:'工作穩定度',items:[
      {key:'sc_tenure',label:'現職年資',opts:['≥12月','6-12月','3-6月','<3月'],scores:[20,15,10,-10],hint:'年資越短，穩定性越弱'},
      {key:'sc_job_type',label:'工作性質',opts:['正職','兼職/接案','不穩定'],scores:[10,5,-5],hint:'收入型態是否可持續'},
      {key:'sc_company_check',label:'公司可查',opts:['是','否'],scores:[5,-5],hint:'無公司資訊影響真實性'},
      {key:'sc_job_tel',label:'工作職電確認',opts:['是','否'],scores:[5,-10],hint:'可確認在職對初審很重要'},
    ]},
    {title:'還款來源',items:[
      {key:'sc_salary_transfer',label:'薪轉',opts:['有','無'],scores:[20,0],hint:'最強的還款來源證明'},
      {key:'sc_bank_record',label:'存摺收入',opts:['有','無'],scores:[10,0],hint:'固定流入可補強還款來源'},
      {key:'sc_income_proof',label:'收入佐證',opts:['有','無'],scores:[10,-15],hint:'沒有收入證明時風險高'},

    ]},
    {title:'其他查核',items:[
      {key:'sc_phone_owner',label:'門號本人',opts:['是','否'],scores:[10,-20],hint:'聯絡真實性很重要'},
      {key:'sc_residence',label:'居住穩定',opts:['是','否'],scores:[5,0],hint:'非核心但可補強穩定度'},
      {key:'sc_addr_transfer',label:'戶政逕遷戶',opts:['是','否'],scores:[-20,0],hint:'不直接婉拒，但需補居住證明'},
    ]},
  ];

  var scHTML='';
  GROUPS.forEach(function(g){
    scHTML+='<div class="sc-group-title">'+g.title+'</div>';
    g.items.forEach(function(item){
      var cur=c[item.key]||'';
      scHTML+='<div class="sc-item"><div class="sc-item-top"><span class="sc-label">'+item.label+'</span></div>';
      scHTML+='<div class="sc-hint">'+item.hint+'</div><div class="sc-btns">';
      item.opts.forEach(function(opt,i){
        var sel=cur===opt; var sc=item.scores[i];
        var cls=sel?(sc>0?'sel-g':sc<0?'sel-r':sc===0&&i===0?'sel-n':'sel-n'):'';
        if(sel&&sc>0)cls='sel-g'; else if(sel&&sc<0)cls='sel-r'; else if(sel)cls='sel-n';
        scHTML+='<button class="sc-btn '+cls+'" onclick="setSc(\''+id+'\',\''+item.key+'\',\''+opt+'\')">'+opt+'</button>';
      });
      scHTML+='</div></div>';
    });
  });

  document.getElementById('pbody').innerHTML=
    '<div class="score-box" style="background:'+gi.bg+';border:2px solid '+gi.border+'">'+
      '<div><div class="score-num" style="color:'+gi.text+'">'+sc+' 分</div>'+
      '<div class="score-grade" style="color:'+gi.text+'">評等 '+gi.g+'：'+gi.label+'</div></div>'+
      '<div style="font-size:40px;font-weight:900;color:'+gi.border+';opacity:.25">'+gi.g+'</div>'+
    '</div>'+

    '<div class="sec-title">⚡ 初審重點</div>'+
    '<div class="grid2">'+
      '<div class="info"><div class="info-k">申請金額</div><div class="info-v" style="color:#2563EB;font-size:15px;font-weight:800">'+(c.need_amount||'—')+'</div></div>'+
      '<div class="info"><div class="info-k">月收入</div><div class="info-v" style="font-size:15px;font-weight:800">'+(c.income?'NT$ '+parseInt(c.income).toLocaleString():'—')+'</div></div>'+
      '<div class="info"><div class="info-k">薪資方式</div><div class="info-v" style="color:'+(c.salary_type==='transfer'?'#059669':'#D97706')+';font-weight:600">'+(c.salary_type==='transfer'?'💳 薪轉':c.salary_type==='cash'?'💵 領現金':'—')+'</div></div>'+
      '<div class="info"><div class="info-k">信用卡</div><div class="info-v">'+(c.has_credit_card==='yes'?'有（'+(c.credit_card_status==='normal'?'✅ 正常繳清':c.credit_card_status==='minimum'?'⚠️ 繳最低':c.credit_card_status==='unused'?'沒在用':c.credit_card_status==='suspended'?'🔴 被停卡':'—')+(c.credit_card_bank?' · '+c.credit_card_bank:'')+'）':c.has_credit_card==='no'?'未辦過':'—')+'</div></div>'+
      '<div class="info"><div class="info-k">警示戶</div><div class="info-v" style="color:'+(c.is_alert==='yes'?'#DC2626':'#059669')+';font-weight:700">'+(c.is_alert==='yes'?'⚠ 是':'✓ 否')+'</div></div>'+

      '<div class="info"><div class="info-k">現有貸款</div><div class="info-v">'+(c.has_loan==='yes'?'有，每月約 '+(c.loan_burden||'未填'):c.has_loan==='no'?'✓ 無':'—')+'</div></div>'+
      '<div class="info"><div class="info-k">居住＝戶籍</div><div class="info-v" style="color:'+(c.same_addr==='yes'?'#059669':c.same_addr==='no'?'#D97706':'#9CA3AF')+';font-weight:600">'+(c.same_addr==='yes'?'✓ 相同':c.same_addr==='no'?'⚠ 不同':'未填')+'</div></div>'+
      '<div class="info"><div class="info-k">身分證</div><div class="info-v" style="color:'+(c.id_verified?'#059669':'#9CA3AF')+'">'+(c.id_verified?'✓ 已上傳':'未上傳')+'</div></div>'+
    '</div>'+

    '<div class="sec-title">基本資料</div>'+
    '<div class="grid2">'+
      '<div class="info"><div class="info-k">姓名</div><div class="info-v">'+(c.api_name||c.name||'—')+'</div></div>'+
      '<div class="info"><div class="info-k">電話</div><div class="info-v">'+(c.phone||'—')+'</div></div>'+
      '<div class="info"><div class="info-k">身分證</div><div class="info-v">'+(c.id_no||'—')+'</div></div>'+
      '<div class="info"><div class="info-k">出生日期</div><div class="info-v">'+(c.birth_date||'—')+'</div></div>'+
      '<div class="info full"><div class="info-k">戶籍地址</div><div class="info-v">'+(c.reg_addr||'—')+'</div></div>'+
    '</div>'+

    '<div class="sec-title">職業資料</div>'+
    '<div class="grid2">'+
      '<div class="info full"><div class="info-k">公司名稱</div><div class="info-v" style="display:flex;align-items:center;gap:8px">'+(c.company||'—')+
        (c.company?'<a href="https://www.google.com/search?q='+encodeURIComponent(c.company)+'" target="_blank" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none">Google</a>':'')+'</div></div>'+
      '<div class="info"><div class="info-k">公司電話</div><div class="info-v" style="display:flex;align-items:center;gap:8px;color:'+(c.company_tel?'#2563EB':'#9CA3AF')+'">'+(c.company_tel||'未填')+
        (c.company_tel?'<a href="tel:'+c.company_tel+'" style="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none">撥打</a>':'')+'</div></div>'+
      '<div class="info"><div class="info-k">月收入</div><div class="info-v">'+(c.income?'NT$ '+parseInt(c.income).toLocaleString():'—')+'</div></div>'+
      '<div class="info"><div class="info-k">年資</div><div class="info-v">'+(c.tenure||'—')+'</div></div>'+
    '</div>'+

    '<div class="sec-title">信用 & 資產</div>'+
    '<div class="grid2">'+
      '<div class="info"><div class="info-k">薪資方式</div><div class="info-v" style="color:'+(c.salary_type==='transfer'?'#059669':'#D97706')+';font-weight:600">'+(c.salary_type==='transfer'?'💳 薪轉':c.salary_type==='cash'?'💵 領現金':'—')+'</div></div>'+
      '<div class="info"><div class="info-k">信用卡</div><div class="info-v">'+(c.has_credit_card==='yes'?'有（'+(c.credit_card_status==='normal'?'✅ 正常繳清':c.credit_card_status==='minimum'?'⚠️ 繳最低':c.credit_card_status==='unused'?'沒在用':c.credit_card_status==='suspended'?'🔴 被停卡':'—')+(c.credit_card_bank?' · '+c.credit_card_bank:'')+'）':c.has_credit_card==='no'?'未辦過':'—')+'</div></div>'+
      '<div class="info"><div class="info-k">警示戶</div><div class="info-v" style="color:'+(c.is_alert==='yes'?'#DC2626':'#059669')+'">'+(c.is_alert==='yes'?'⚠ 是':'否')+'</div></div>'+

      '<div class="info"><div class="info-k">汽車</div><div class="info-v">'+(c.has_car==='yes'?'有（'+(c.car_ok||'未填')+'）':'無')+'</div></div>'+
      '<div class="info"><div class="info-k">機車</div><div class="info-v">'+(c.has_moto==='yes'?'有（'+(c.moto_ok||'未填')+'）':'無')+'</div></div>'+
      '<div class="info"><div class="info-k">不動產</div><div class="info-v">'+(c.has_property==='yes'?'有':'無')+'</div></div>'+
      '<div class="info"><div class="info-k">現有貸款</div><div class="info-v">'+(c.has_loan==='yes'?'有，每月約 '+(c.loan_burden||'未填'):c.has_loan==='no'?'無':'—')+'</div></div>'+
      '<div class="info full"><div class="info-k">身分證上傳</div>'+buildIdButtons(c)+'</div>'+
    '</div>'+

    '<div class="sec-title">申請資訊</div>'+
    '<div class="grid2">'+
      '<div class="info full"><div class="info-k">申請金額</div><div class="info-v" style="color:#2563EB;font-size:16px">'+(c.need_amount||'—')+'</div></div>'+
      '<div class="info"><div class="info-k">聯絡時間</div><div class="info-v">'+(c.contact_time||'—')+'</div></div>'+
      '<div class="info"><div class="info-k">申請時間</div><div class="info-v">'+fmtDate(c.created_at)+'</div></div>'+
      (isAdmin ? '<div class="info full"><div class="info-k">來源通路</div><div class="info-v" style="color:'+(c.channel&&c.channel!=='FlowPay'?'#1E40AF':'#6B7280')+'">'+(c.channel? chName(c.channel) :'FlowHub')+'</div></div>' : '')+
    '</div>'+

    '<div class="sec-title">初審評分工具</div>'+scHTML+

    '<div class="sec-title">✍️ 審核操作</div>'+
    '<div style="font-size:12px;color:#9CA3AF;margin-bottom:10px">更新審核狀態與備註，點儲存後即時同步</div>'+
    '<select class="status-sel" id="ssel">'+
      ['待處理','已聯繫','審核中','已核准','婉拒'].map(function(s){
        return '<option'+((c.status||'待處理')===s?' selected':'')+'>'+s+'</option>';
      }).join('')+
    '</select>'+
    '<div id="approved-fields" style="'+(c.status==='已核准'?'display:block':'display:none')+'">'+
      '<div style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:10px;padding:14px;margin-bottom:12px">'+
        '<div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:10px">💰 撥款資訊</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'+
          '<div><div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">核准金額</div>'+
            '<input id="s-approved" placeholder="例：50,000" value="'+(c.approved_amount||'')+'" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box"/></div>'+
          '<div><div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:4px">已撥款金額</div>'+
            '<input id="s-disbursed" placeholder="例：30,000" value="'+(c.disbursed_amount||'')+'" style="width:100%;padding:8px 10px;border:1.5px solid #A7F3D0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box"/></div>'+
          '<div><div style="font-size:11px;font-weight:700;color:#D97706;margin-bottom:4px">未撥款金額</div>'+
            '<input id="s-undisbursed" placeholder="例：20,000" value="'+(c.undisbursed_amount||'')+'" style="width:100%;padding:8px 10px;border:1.5px solid #FDE68A;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box"/></div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<textarea class="notes" id="snotes" placeholder="審核備註（僅內部可見）...">'+(c.notes||'')+'</textarea>'+
    '<button class="save" onclick="saveCase(\''+id+'\')">儲存變更</button>';

  // 狀態切換時顯示/隱藏撥款欄位
  setTimeout(function(){
    var sel = document.getElementById('ssel');
    if(sel) sel.addEventListener('change', function(){
      var af = document.getElementById('approved-fields');
      if(af) af.style.display = sel.value==='已核准' ? 'block' : 'none';
    });
  }, 50);

  document.getElementById('panel').classList.add('on');
  document.getElementById('ov').classList.add('on');
  // 身分證查看按鈕事件
  setTimeout(function(){
    document.querySelectorAll('.id-view-btn').forEach(function(btn){
      btn.onclick = function(){ viewIdImage(btn.getAttribute('data-id'), btn.getAttribute('data-side')); };
    });
  }, 50);
}

function closePanel(){
  document.getElementById('panel').classList.remove('on');
  document.getElementById('ov').classList.remove('on');
}

async function saveCase(id){
  var btn=document.querySelector('.save');
  var status=document.getElementById('ssel').value;
  var notes=document.getElementById('snotes').value;
  btn.textContent='儲存中...';btn.disabled=true;
  try {
    var approvedAmt = document.getElementById('s-approved') ? document.getElementById('s-approved').value : null;
    var disbursedAmt = document.getElementById('s-disbursed') ? document.getElementById('s-disbursed').value : null;
    var undisbursedAmt = document.getElementById('s-undisbursed') ? document.getElementById('s-undisbursed').value : null;
    // 備注歷史：加入時間戳記
    var c2 = cases.find(function(x){return x.id===id;});
    var oldNotes = c2 ? (c2.notes||'') : '';
    var finalNotes = notes;
    if(notes && notes !== oldNotes){
      var now = new Date();
      var ts = (now.getMonth()+1)+'/'+now.getDate()+' '+now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
      var stamp = '['+ts+' '+ACCS[me].name+'] '+notes;
      // 保留舊備注在下方
      finalNotes = oldNotes ? stamp + '\n──────\n' + oldNotes : stamp;
    }
    var patchData = {status:status, notes:finalNotes};
    if(approvedAmt !== null) patchData.approved_amount = approvedAmt;
    if(disbursedAmt !== null) patchData.disbursed_amount = disbursedAmt;
    if(undisbursedAmt !== null) patchData.undisbursed_amount = undisbursedAmt;
    var r=await fetch(URL_+'/rest/v1/applications?id=eq.'+id,{
      method:'PATCH',headers:HDR,body:JSON.stringify(patchData)
    });
    if(r.ok){
      var c=cases.find(function(x){return x.id===id;});
      if(c){c.status=status;c.notes=notes;}
      renderStats();filter();
      btn.textContent='✓ 已儲存';btn.style.background='#059669';
      setTimeout(function(){btn.textContent='儲存變更';btn.style.background='';btn.disabled=false;},2000);
    } else {
      var errText = await r.text();
      console.error('Save failed:', r.status, errText);
      btn.textContent='儲存失敗（'+r.status+'）';btn.style.background='#DC2626';
      setTimeout(function(){btn.textContent='儲存變更';btn.style.background='';btn.disabled=false;},3000);
    }
  } catch(e) {
    console.error('Save error:', e);
    btn.textContent='網路錯誤，請重試';btn.style.background='#DC2626';
    setTimeout(function(){btn.textContent='儲存變更';btn.style.background='';btn.disabled=false;},3000);
  }
}

function viewIdImage(id){
  var c = cases.find(function(x){return x.id===id;});
  if(!c || !c.id_image) return;
  var overlay = document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;cursor:pointer';
  overlay.id='id-overlay';
  overlay.onclick=function(){overlay.remove();};
  var box = document.createElement('div');
  box.style.cssText='background:#fff;border-radius:16px;padding:20px;max-width:90vw;max-height:90vh;overflow:auto;cursor:default;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)';
  box.onclick=function(e){e.stopPropagation();};
  box.innerHTML=
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'+
    '<div style="font-size:15px;font-weight:700;color:#111">'+(c.name||'—')+' — 身分證</div>'+
    '<button onclick="document.getElementById(\'id-overlay\').remove()" style="background:#F3F4F6;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;font-weight:600">✕ 關閉</button>'+
    '</div>'+
    '<img src="'+c.id_image+'" style="max-width:100%;max-height:70vh;border-radius:8px;border:1px solid #E5E7EB"/>';
  box.setAttribute('data-idbox','1');
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function buildIdButtons(c){
  var color = c.id_verified ? '#059669' : '#9CA3AF';
  var html = '<div class="info-v" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:'+color+'">';
  html += c.id_verified ? '✓ 已上傳驗證' : '未上傳';
  if(c.id_image){
    html += '<button data-id="'+c.id+'" data-side="front" class="id-view-btn" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">📷 正面</button>';
  }
  if(c.id_image_back){
    html += '<button data-id="'+c.id+'" data-side="back" class="id-view-btn" style="background:#F0FDF4;border:1px solid #A7F3D0;color:#065F46;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">📷 反面</button>';
  }
  if(!c.id_image && !c.id_image_back){
    html += '<span style="font-size:11px;color:#D1D5DB;margin-left:4px">（未上傳圖片）</span>';
  }
  html += '</div>';
  return html;
}

async function setSc(id,field,val){
  var c=cases.find(function(x){return x.id===id;});
  if(c)c[field]=val;
  var sc=calcScore(c||{});
  await fetch(URL_+'/rest/v1/applications?id=eq.'+id,{
    method:'PATCH',headers:HDR,body:JSON.stringify({[field]:val,score_total:sc})
  });
  renderStats();filter();openPanel(id);
}

function copyLink(url){
  navigator.clipboard.writeText(url).then(function(){
    alert('✅ 連結已複製！');
  }).catch(function(){
    prompt('請複製此連結：', url);
  });
}

function startPolling(){
  if(_pollingTimer) clearInterval(_pollingTimer);
  _pollingTimer = setInterval(async function(){
    try {
      var acc = ACCS[me] || {};
      var url = URL_+'/rest/v1/applications?select=id&order=created_at.desc&limit=1';
      if(acc.channel && acc.channel!=='null'){
        url += '&channel=eq.'+encodeURIComponent(acc.channel);
        var d60=new Date(); d60.setDate(d60.getDate()-60);
        url += '&created_at=gte.'+d60.toISOString();
      }
      // 取總數
      var r = await fetch(url.replace('limit=1','limit=200'), {
        headers: Object.assign({}, HDR, {'Prefer':'count=exact'})
      });
      var ct = r.headers.get('content-range');
      var count = ct ? parseInt(ct.split('/')[1])||0 : 0;
      if(lastCaseCount>=0 && count > lastCaseCount){
        // 有新案件！
        var dot = document.getElementById('nav-cases-dot');
        if(!dot){
          var btn = document.getElementById('nav-cases');
          if(btn){
            var d = document.createElement('span');
            d.id='nav-cases-dot';
            d.className='new-dot';
            btn.appendChild(d);
          }
        }
        load(); // 重新載入
      }
      lastCaseCount = count;
    } catch(e){}
  }, 30000); // 每30秒
}