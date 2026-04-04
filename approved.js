

// ===== 核准案件匯出 Excel =====
function exportApprovedCSV(){
  var acc = ACCS[me] || {};
  var myChannel = acc.channel && acc.channel!=='null' ? acc.channel : null;
  var list = cases.filter(function(c){
    if(c.status!=='已核准') return false;
    if(myChannel) return (c.channel||'FlowPay')===myChannel;
    return true;
  });
  if(!list.length){ alert('目前沒有核准案件可匯出'); return; }

  var headers = ['姓名','電話','申請金額','核准金額','已撥款','未撥款','公司','月收入','薪資方式','通路','核准時間'];
  var salaryMap = {transfer:'薪轉', cash:'領現金'};
  var rows = list.map(function(c){
    return [
      c.name||'',
      c.phone||'',
      c.need_amount||'',
      c.approved_amount||'',
      c.disbursed_amount||'',
      c.undisbursed_amount||'',
      c.company||'',
      c.income?'NT$ '+parseInt(c.income).toLocaleString():'',
      salaryMap[c.salary_type]||c.salary_type||'',
      c.channel? chName(c.channel):'FlowHub',
      c.updated_at?new Date(c.updated_at).toLocaleDateString('zh-TW'):''
    ].map(function(v){ return '"'+String(v||'').replace(/"/g,'""')+'"'; }).join(',');
  });

  // 用 BOM 讓 Excel 正確顯示中文
  var bom = new Uint8Array([0xEF,0xBB,0xBF]);
  var csvContent = headers.map(function(h){return '"'+h+'"';}).join(',') + '\n' + rows.join('\n');
' + rows.join('
  var blob = new Blob([bom, csvContent], {type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'FlowHub核准案件_'+new Date().toLocaleDateString('zh-TW').replace(/\//g,'')+'.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}