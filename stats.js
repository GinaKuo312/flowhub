// FlowHub 📊 統計總覽、月目標


function renderStats(){
  var total=cases.length, wait=0, approve=0, high=0;
  cases.forEach(function(c){
    if(!c.status||c.status==='待處理'||c.status==='已聯繫'||c.status==='審核中')wait++;
    if(c.status==='已核准')approve++;
    var s=calcScore(c); if(s<50||c.is_alert==='yes')high++;
  });
  document.getElementById('stats').innerHTML=
    '<div class="stat"><div class="stat-label">總申請數</div><div class="stat-num">'+total+'</div></div>'+
    '<div class="stat"><div class="stat-label">待處理</div><div class="stat-num" style="color:#D97706">'+wait+'</div></div>'+
    '<div class="stat"><div class="stat-label">已核准</div><div class="stat-num" style="color:#059669">'+approve+'</div></div>'+
    '<div class="stat"><div class="stat-label">高風險</div><div class="stat-num" style="color:#DC2626">'+high+'</div></div>';
  var badge = document.getElementById('approved-count');
  if(badge) badge.textContent = approve > 0 ? approve : '';
  // Update channel badges
  if(isAdmin){
    Object.keys(CHANNELS).filter(function(k){return k!=='FlowPay';}).forEach(function(code){
      var b = document.getElementById('ch-badge-'+code);
      if(b){
        var cnt = cases.filter(function(c){return (c.channel||'FlowPay')===code;}).length;
        b.textContent = cnt > 0 ? cnt : '';
      }
    });
  }
}

// ===== 統計圖表 =====
function renderStats2(){
  var timeEl = document.getElementById('stats-update-time');
  if(timeEl){ var now=new Date(); timeEl.textContent=(now.getMonth()+1)+'/'+(now.getDate())+' '+now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0'); }

  var acc = ACCS[me] || {};
  var myChannel = acc.channel && acc.channel!=='null' ? acc.channel : null;
  var list = myChannel ? cases.filter(function(c){ return (c.channel||'FlowPay')===myChannel; }) : cases;

  var total=list.length;
  var statusCount={'待處理':0,'處理中':0,'已核准':0,'已撥款':0,'不予承作':0};
  var gradeCount={A:0,B:0,C:0,D:0,E:0};
  var approveTotal=0, scoreSum=0;

  list.forEach(function(c){
    var s=c.status||'待處理';
    if(statusCount[s]!==undefined) statusCount[s]++; else statusCount['待處理']++;
    var sc=calcScore(c); scoreSum+=sc;
    var gi=gradeInfo(sc); gradeCount[gi.g]=(gradeCount[gi.g]||0)+1;
    if(s==='已核准'||s==='已撥款') approveTotal++;
  });

  var approveRate=total>0?Math.round(approveTotal/total*100):0;
  var avgScore=total>0?Math.round(scoreSum/total):0;
  var highRisk=list.filter(function(c){return calcScore(c)<50||c.is_alert==='yes';}).length;

  // ① 數字卡片
  var cardsEl=document.getElementById('stats2-cards');
  if(cardsEl){
    cardsEl.innerHTML=
      '<div class="stat"><div class="stat-label">總案件數</div><div class="stat-num">'+total+'</div></div>'+
      '<div class="stat"><div class="stat-label">核准件數</div><div class="stat-num" style="color:#059669">'+approveTotal+'</div></div>'+
      '<div class="stat"><div class="stat-label">平均評分</div><div class="stat-num" style="color:#2563EB">'+avgScore+'</div></div>'+
      '<div class="stat"><div class="stat-label">高風險案件</div><div class="stat-num" style="color:#DC2626">'+highRisk+'</div></div>';
  }

  // ② 圓形圖（核准率）
  var canvas=document.getElementById('donut-canvas');
  if(canvas){
    var ctx=canvas.getContext('2d');
    var r=canvas.width/2, ri=r-20;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // 背景
    ctx.beginPath(); ctx.arc(r,r,ri,0,Math.PI*2);
    ctx.strokeStyle='#E5E7EB'; ctx.lineWidth=18; ctx.stroke();
    // 核准弧
    if(approveRate>0){
      ctx.beginPath(); ctx.arc(r,r,ri,-Math.PI/2,-Math.PI/2+approveRate/100*Math.PI*2);
      ctx.strokeStyle='#059669'; ctx.lineWidth=18; ctx.lineCap='round'; ctx.stroke();
    }
    ctx.fillStyle='#111827'; ctx.font='bold 20px -apple-system,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(approveRate+'%',r,r-8);
    ctx.fillStyle='#9CA3AF'; ctx.font='11px -apple-system,sans-serif';
    ctx.fillText(approveTotal+'/'+total+' 件',r,r+12);
  }
  var donutLabel=document.getElementById('donut-label');
  if(donutLabel) donutLabel.textContent=total>0?'共 '+total+' 件，核准 '+approveTotal+' 件':'尚無案件';

  // ③ 案件狀態分布
  var statusEl=document.getElementById('status-dist');
  if(statusEl){
    var statusColors={'待處理':'#6B7280','處理中':'#2563EB','已核准':'#059669','已撥款':'#7C3AED','不予承作':'#DC2626'};
    var statusOrder=['待處理','處理中','已核准','已撥款','不予承作'];
    statusEl.innerHTML=statusOrder.map(function(s){
      var cnt=statusCount[s]||0;
      var pct=total>0?Math.round(cnt/total*100):0;
      var color=statusColors[s]||'#6B7280';
      return '<div>'+
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">'+
          '<span style="color:#374151;font-weight:600">'+s+'</span>'+
          '<span style="color:#6B7280">'+cnt+' 件（'+pct+'%）</span>'+
        '</div>'+
        '<div style="background:#F3F4F6;border-radius:99px;height:7px;overflow:hidden">'+
          '<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:99px;transition:width .5s"></div>'+
        '</div>'+
      '</div>';
    }).join('');
  }

  // ④ 評等分布
  var gradeEl=document.getElementById('grade-dist');
  if(gradeEl){
    var grades=[
      {g:'A',color:'#059669',bg:'#ECFDF5'},
      {g:'B',color:'#2563EB',bg:'#EFF6FF'},
      {g:'C',color:'#D97706',bg:'#FFFBEB'},
      {g:'D',color:'#EA580C',bg:'#FFF7ED'},
      {g:'E',color:'#DC2626',bg:'#FEF2F2'},
    ];
    gradeEl.innerHTML=grades.map(function(gd){
      var cnt=gradeCount[gd.g]||0;
      var pct=total>0?Math.round(cnt/total*100):0;
      return '<div style="flex:1;min-width:52px;background:'+gd.bg+';border-radius:10px;padding:10px 8px;text-align:center">'+
        '<div style="font-size:18px;font-weight:900;color:'+gd.color+'">'+gd.g+'</div>'+
        '<div style="font-size:16px;font-weight:800;color:#111;margin:2px 0">'+cnt+'</div>'+
        '<div style="font-size:10px;color:#9CA3AF">'+pct+'%</div>'+
      '</div>';
    }).join('');
  }

  // ⑤ 月目標進度
  renderTargetBar();
}

function renderTargetBar(){
  var acc = ACCS[me] || {};
  var chKey = acc.channel && acc.channel!=='null' ? acc.channel : 'FlowPay';
  var target = _targets[chKey] || 0;
  var list2 = chKey==='FlowPay' ? cases : cases.filter(function(c){ return (c.channel||'FlowPay')===chKey; });
  var achieved = list2.filter(function(c){ return c.status==='已核准'; })
    .reduce(function(sum,c){ return sum+(parseInt((c.approved_amount||'').replace(/,/g,''))||0); },0);
  var pct = target>0 ? Math.min(100,Math.round(achieved/target*100)) : 0;
  var barEl = document.getElementById('target-bar');
  var barLabelEl = document.getElementById('target-bar-label');
  var targetValEl = document.getElementById('target-val');
  var mottoEl = document.getElementById('target-motto');
  if(barEl){
    barEl.style.width=pct+'%';
    barEl.style.background=pct>=100?'#059669':pct>=70?'#2563EB':'linear-gradient(90deg,#2563EB,#059669)';
  }
  if(barLabelEl) barLabelEl.textContent=pct+'%';
  if(targetValEl) targetValEl.textContent=target?'目標：NT$ '+target.toLocaleString():'尚未設定目標';
  // 加油標語
  if(mottoEl){
    var motto = pct>=100?'🎉 恭喜達標！太棒了！':
                pct>=80?'💪 快到了！衝刺最後一哩路！':
                pct>=60?'🔥 過半了！繼續保持！':
                pct>=40?'🚀 穩定前進，加油！':
                pct>=20?'⚡ 起步良好，繼續衝！':
                pct>0?'🌱 好的開始！每筆都重要！':'💡 設定目標，開始衝吧！';
    mottoEl.textContent = motto;
    mottoEl.style.color = pct>=100?'#059669':pct>=60?'#2563EB':'#D97706';
  }
}

async function loadTargets(){
  var acc = ACCS[me] || {};
  var chKey = acc.channel && acc.channel!=='null' ? acc.channel : 'FlowPay';
  var ym = new Date().getFullYear()+'-'+(new Date().getMonth()+1).toString().padStart(2,'0');
  try {
    var r = await fetch(URL_+'/rest/v1/monthly_targets?channel=eq.'+chKey+'&year_month=eq.'+ym, {headers:HDR});
    var data = await r.json();
    if(data && data[0]) _targets[chKey] = data[0].target_amount;
  } catch(e){}
}

async function saveTargets(){
  var inp = document.getElementById('target-input');
  if(!inp) return;
  var val = parseInt(inp.value.replace(/,/g,''));
  if(!val||val<=0){ alert('請輸入有效金額'); return; }
  var acc = ACCS[me] || {};
  var chKey = acc.channel && acc.channel!=='null' ? acc.channel : 'FlowPay';
  var ym = new Date().getFullYear()+'-'+(new Date().getMonth()+1).toString().padStart(2,'0');
  try {
    await fetch(URL_+'/rest/v1/monthly_targets', {
      method:'POST', headers:Object.assign({},HDR,{'Prefer':'resolution=merge-duplicates'}),
      body:JSON.stringify({channel:chKey, year_month:ym, target_amount:val})
    });
    _targets[chKey]=val;
    closeTargetModal();
    renderStats2();
  } catch(e){ alert('儲存失敗'); }
}

function showTargetModal(){
  var modal = document.getElementById('target-modal');
  if(modal) modal.style.display='flex';
  var acc = ACCS[me] || {};
  var chKey = acc.channel && acc.channel!=='null' ? acc.channel : 'FlowPay';
  var inp = document.getElementById('target-input');
  if(inp && _targets[chKey]) inp.value = _targets[chKey].toLocaleString();
}

function closeTargetModal(){
  var modal = document.getElementById('target-modal');
  if(modal) modal.style.display='none';
}