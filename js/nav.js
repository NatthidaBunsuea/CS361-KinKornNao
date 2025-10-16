/**
 * KinKonNao™ — ส่วนหัวและระบบนำทาง (UI Header/Nav)
 * บทบาท:
 *  - mountHeader(): สร้าง header ที่มี brand, ลิงก์เมนูหลัก, badge household, avatar ไปหน้าโปรไฟล์
 *  - ไฮไลต์เมนูตามหน้า (เพิ่ม class 'active')
 *  - toast(msg): แสดงข้อความแจ้งเตือนชั่วคราว
 *  - ฟังก์ชันช่วยแปลงวันที่/คำนวณวันหมดอายุ: fmtDate(), daysUntil()
 *
 * พึ่งพา: Auth.current() (ดึง avatar/householdId)
 * ใช้ในหน้า: dashboard, form, fridge-list, profile, recipes
 */

//DESCRIBTION : main navigation bar , every HTML linked with this navigation bar
const UI = (() => {
    function mountHeader(){
      const user = Auth.current();
      const avatarSrc = user?.avatar || '../assets/avatar.svg';
      const header = document.createElement('div');
      header.innerHTML = `<header class="header">
    <div class="brand">
      <a style="text-decoration:none; color: #1f1f1fff;">
        <h1>KinKonNao™</h1>
        <div class="small">Foodie is goodie, Family loves food.</div>
      </a>
    </div>

    <nav class="nav-links">
      <a href="../pages/ingredient-form.html">เพิ่มวัตถุดิบ</a>
      <a href="../pages/fridge-list.html">รายการในตู้เย็น</a>
      <a href="../pages/recipes.html">แนะนำเมนู</a>
      <a href="../pages/dashboard.html">Weekly Dashboard</a>
    </nav>

    <div class="nav-user-area">
      <span class="badge house" title="Household">${user?.householdId || '—'}</span>
      <div class="nav-user">
          <a href="../pages/profile.html" title="Profile">
            <img class="avatar" alt="avatar" src="${avatarSrc}" style="width:36px;height:36px;border-radius:50%; display: block;"/>
          </a>
      </div>
    </div>
  </header>`;
      document.body.prepend(header.firstElementChild);
      // Updated selector to find links within the new .nav-links container
      document.querySelectorAll('.nav-links a').forEach(a=>{
        if(location.pathname.endsWith(a.getAttribute('href').split('/').pop())) a.classList.add('active');
      });
    }
    function toast(msg){
      let t = document.querySelector('.toast');
      if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
      t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800);
    }
    const fmtDate = d => d ? new Date(d).toLocaleDateString() : '';
    function daysUntil(d){ const t=new Date(d).setHours(0,0,0,0), now=new Date().setHours(0,0,0,0); return Math.round((t-now)/86400000); }
    return { mountHeader, toast, fmtDate, daysUntil };
  })();