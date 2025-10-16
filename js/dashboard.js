/**
 * KinKonNao™ — Dashboard (Weekly Summary & Charts)
 * บทบาท:
 *  - เรียก Auth.requireLogin(), UI.mountHeader()
 *  - โหลดข้อมูล 7 วันล่าสุดจาก Api.weeklySummary() → สร้างกราฟด้วย Chart.js:
 *      - Bar: Most Used
 *      - Doughnut: Wasted
 *      - Stacked Bar: Used vs Waste (แนวนอน)
 *      - Line: 7-day Activity (จำลองการกระจายต่อวัน)
 *  - แสดง Leftovers พร้อม Badge (Fresh/Soon/Expired) จาก daysUntil()
 *  - ถ้าไม่มีข้อมูลจริง ใช้ mock data เติมให้เห็นกราฟ
 *
 * พึ่งพา: api.js, auth.js, nav.js, Chart.js, UI.daysUntil(), UI.fmtDate()
 * DOM targets: #usedChart, #wasteChart, #stackedChart, #trendChart, #leftovers, #empty
 */

document.addEventListener('DOMContentLoaded', async ()=>{
    const me = Auth.requireLogin(); if(!me) return;
    UI.mountHeader();
  
    let data = await Api.weeklySummary(me.id, me.householdId);
    const isEmpty = Object.keys(data.used).length===0 && Object.keys(data.wasted).length===0;
    if(isEmpty){
      data.used = { Egg: 8, Rice: 5, Tomato: 4, Milk: 3, Chicken: 6, Pasta: 4 };
      data.wasted = { Tomato: 1, Milk: 1, Lettuce: 2 };
      data.leftovers = [
        {name:'pasta', quantity:1, unit:'pack', category:'grain', expiry:new Date(Date.now()+5*86400000).toISOString()},
        {name:'pork', quantity:10, unit:'pcs', category:'protein', expiry:new Date(Date.now()+8*86400000).toISOString()},
        {name:'milk', quantity:1, unit:'L', category:'dairy', expiry:new Date(Date.now()+8*86400000).toISOString()},
      ];
    }
  
    const usedLabels = Object.keys(data.used);
    const usedVals   = usedLabels.map(k=>data.used[k]);
    const wasteLabels= Object.keys(data.wasted);
    const wasteVals  = wasteLabels.map(k=>data.wasted[k]);
  
    if(usedLabels.length===0 && wasteLabels.length===0){
      document.getElementById('empty').style.display='block';
      document.getElementById('charts').style.display='none';
      return;
    } else { document.getElementById('empty').style.display='none'; }
  
    const usedCtx = document.getElementById('usedChart').getContext('2d');
    new Chart(usedCtx,{type:'bar',data:{labels:usedLabels,datasets:[{label:'Used (qty)',data:usedVals,borderRadius:12}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  
    const wasteCtx = document.getElementById('wasteChart').getContext('2d');
    new Chart(wasteCtx,{type:'doughnut',data:{labels:wasteLabels,datasets:[{data:wasteVals} ]},options:{responsive:true,cutout:'55%',plugins:{legend:{position:'bottom'}}}});
  
    const left = document.getElementById('leftovers'); left.innerHTML='';
    (data.leftovers||[]).forEach(it=>{
      const div=document.createElement('div'); div.style.display='grid'; div.style.gridTemplateColumns='1.2fr .6fr .6fr .6fr'; div.style.gap='10px';
      const d=UI.daysUntil(it.expiry);
      const badge = d<0 ? `<span class="badge" style="background:#fee2e2;color:#b91c1c">Expired</span>` : d<=3 ? `<span class="badge" style="background:#fff7ed;color:#b45309">Soon</span>` : `<span class="badge" style="background:#dcfce7;color:#065f46">Fresh</span>`;
      div.innerHTML=`<div><strong>${it.name}</strong><div class="small">${it.category||'-'}</div></div><div>${it.quantity} ${it.unit||''}</div><div>${UI.fmtDate(it.expiry)}</div><div>${badge}</div>`;
      left.appendChild(div);
    });
  
    const allKeys = Array.from(new Set([...usedLabels, ...wasteLabels]));
    const usedAll = allKeys.map(k=>data.used[k]||0);
    const wasteAll= allKeys.map(k=>data.wasted[k]||0);
    const stackedCtx = document.getElementById('stackedChart').getContext('2d');
    new Chart(stackedCtx,{type:'bar',data:{labels:allKeys,datasets:[{label:'Used',data:usedAll},{label:'Waste',data:wasteAll}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{position:'bottom'}},scales:{x:{beginAtZero:true},y:{stacked:true}}}});
  
    const days=[6,5,4,3,2,1,0].map(d=>{ const dt=new Date(Date.now()-d*86400000); return dt.toLocaleDateString();});
    const totalUsed=usedVals.reduce((a,b)=>a+b,0), totalWaste=wasteVals.reduce((a,b)=>a+b,0);
    const spread = (t)=>{ const a=Array(7).fill(0); for(let i=0;i<t;i++) a[Math.floor(Math.random()*7)]++; return a; };
    const trendCtx=document.getElementById('trendChart').getContext('2d');
    new Chart(trendCtx,{type:'line',data:{labels:days,datasets:[{label:'Used',data:spread(totalUsed),tension:.35,fill:false},{label:'Waste',data:spread(totalWaste),tension:.35,fill:false}]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});
  });