/**
 * KinKonNao™ — Suggested Recipes (จากวัตถุดิบในตู้)
 * บทบาท:
 *  - requireLogin + mountHeader
 *  - โหลดรายการแนะนำจาก Api.recommendFromPantry()
 *  - เรนเดอร์การ์ดเมนู; คลิกเปิด modal แสดงรายละเอียด (เวลาทำ, ส่วนผสม, ขั้นตอน)
 *  - ถ้าไม่มีคำแนะนำ → แจ้งให้เพิ่มวัตถุดิบก่อน
 *
 * พึ่งพา: api.js, auth.js, nav.js
 * DOM targets: #recipes, #recipeModal, #mTitle, #mTime, #mIng, #mSteps, #mClose
 */

document.addEventListener('DOMContentLoaded', async ()=>{
    const me = Auth.requireLogin(); if(!me) return;
    UI.mountHeader();
  
    const wrap = document.getElementById('recipes');
    const recs = await Api.recommendFromPantry(me.id, me.householdId);
  
    if(recs.length===0){
      const d=document.createElement('div'); d.className='card'; d.textContent='ยังไม่มีเมนูที่แนะนำได้ ลองเพิ่มวัตถุดิบก่อนนะ'; wrap.appendChild(d); return;
    }
  
    function recipeCard(r){
      const card=document.createElement('div'); card.className='card recipe'; card.style.cursor='pointer';
      card.innerHTML = `
        <h3>${r.title}</h3>
        <div class="small">เวลาโดยประมาณ: ${r.time} นาที</div>
        <div class="badge">คลิกเพื่อดูสูตรเมนู</div>`;
      card.addEventListener('click', ()=> openModal(r));
      return card;
    }
    recs.forEach(r=> wrap.appendChild(recipeCard(r)));
  
    const modal = document.getElementById('recipeModal');
    const mTitle = document.getElementById('mTitle');
    const mTime  = document.getElementById('mTime');
    const mIng   = document.getElementById('mIng');
    const mSteps = document.getElementById('mSteps');
    const mClose = document.getElementById('mClose');
  
    function openModal(r){
      mTitle.textContent = r.title;
      mTime.textContent = `~${r.time} นาที`;
      mIng.innerHTML = r.ingredients.map(i=>`<li>${i.name} — <span class="small">${i.qty||''}</span></li>`).join('');
      mSteps.innerHTML = r.steps.map(s=>`<li>${s}</li>`).join('');
      modal.style.display='block';
    }
    function closeModal(){ modal.style.display='none'; }
    mClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });
  });