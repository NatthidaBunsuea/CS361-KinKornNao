/**
 * KinKonNao™ — Profile & Household Management
 * บทบาท:
 *  - requireLogin + mountHeader
 *  - แสดงข้อมูลผู้ใช้ (name/email/household) และแก้ไข displayName, avatar
 *  - Household:
 *      - renderMembers(): อ่าน Api.getHousehold() แล้วแสดงรายชื่อ/บทบาท
 *      - createHousehold(): สร้าง/อัปเดต household (owner)
 *      - showInvite(): แสดง/คัดลอก invite code (Api.inviteCode)
 *      - join via code: decode → Api.joinHousehold() → อัปเดต user.householdId และ refresh
 *  - ปุ่ม logout → Auth.logout()
 *
 * พึ่งพา: api.js, auth.js, nav.js, UI.toast(), navigator.clipboard
 * DOM targets: #name, #email, #household, #displayName, #avatarInput, #memberList, #inviteDisplay, #joinCode
 */

document.addEventListener('DOMContentLoaded', async ()=>{
  const me = Auth.requireLogin(); 
  if(!me) return;
  
  UI.mountHeader();
  
  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const householdEl = document.getElementById('household');
  const avatarInput = document.getElementById('avatarInput');
  const displayName = document.getElementById('displayName');
  const inviteDisplay = document.getElementById('inviteDisplay');
  const members = document.getElementById('memberList');
  
  // แสดงข้อมูลโปรไฟล์พื้นฐาน
  nameEl.textContent = me.name;
  emailEl.textContent = me.email;
  householdEl.textContent = me.householdId;
  displayName.value = me.name || '';
  
  // ฟังก์ชันแสดงสมาชิกใน household
  async function renderMembers(){
    members.innerHTML = '';
    const hh = await Api.getHousehold(me.householdId);
    if(!hh){ 
      members.textContent = 'No household yet'; 
      return; 
    }
    hh.members.forEach(m => { 
      const chip = document.createElement('div'); 
      chip.className = 'badge'; 
      chip.textContent = `${m.name} • ${m.role}`; 
      members.appendChild(chip); 
    });
  }
  renderMembers();
  
  // ปุ่มออกจากระบบ
  document.getElementById('logout').addEventListener('click', (e)=>{
    e.preventDefault(); 
    Auth.logout(); 
  });
  
  // เปลี่ยน Avatar
  avatarInput.addEventListener('change', (e)=>{
    const file = e.target.files?.[0]; 
    if(!file) return;
    const reader = new FileReader(); 
    reader.onload = ()=>{
      const user = Auth.current(); 
      user.avatar = reader.result; 
      localStorage.setItem('fs_auth', JSON.stringify(user)); 
      UI.toast('Avatar updated'); 
      location.reload(); 
    }; 
    reader.readAsDataURL(file);
  });
  
  // เปลี่ยนชื่อแสดงผล
  displayName.addEventListener('change', ()=>{
    const user = Auth.current(); 
    user.name = displayName.value.trim() || user.name; 
    localStorage.setItem('fs_auth', JSON.stringify(user));
    nameEl.textContent = user.name; 
    UI.toast('Display name updated');
  });
  
  // สร้างหรืออัปเดต Household
  document.getElementById('createHousehold').addEventListener('click', async ()=>{
    const name = prompt('Household name?', 'My Family'); 
    if(!name) return;
    await Api.createHousehold(me.householdId, name, me); 
    await renderMembers(); 
    UI.toast('Household created/updated');
  });
  
  // ปุ่ม Get Invite Code
  document.getElementById('showInvite').addEventListener('click', ()=>{
    const code = Api.inviteCode(me.householdId); 
    inviteDisplay.textContent = 'Invite Code: ' + code; 
    navigator.clipboard?.writeText(code); 
    UI.toast('Invite code copied');
  });
  
  // ปุ่ม Join Household ด้วยโค้ด
  document.getElementById('joinBtn').addEventListener('click', async ()=>{
    const code = document.getElementById('joinCode').value.trim(); 
    if(!code) return UI.toast('Enter invite code');
    const hhId = Api.decodeInvite(code); 
    if(!hhId) return UI.toast('Invalid code');
    await Api.joinHousehold(hhId, me);
    const user = Auth.current(); 
    user.householdId = hhId; 
    localStorage.setItem('fs_auth', JSON.stringify(user));
    householdEl.textContent = user.householdId; 
    await renderMembers(); 
    UI.toast('Joined household');
  });
});
