/**
 * KinKonNao™ — Authentication (local mock)
 * บทบาท:
 *  - login(email, password): สร้างผู้ใช้จำลอง + token + expiresAt (8 ชม.) แล้วบันทึกที่ localStorage ('fs_auth')
 *  - logout(): เคลียร์ fs_auth และ redirect ไป Login.html
 *  - current(): ดึงผู้ใช้ปัจจุบัน (ตรวจหมดอายุอัตโนมัติ)
 *  - requireLogin(): ถ้าไม่ล็อกอินให้ redirect ไป Login.html
 *
 * พึ่งพา: ApiConfig.householdId สำหรับผูกผู้ใช้เข้ากับ household เริ่มต้น
 * หมายเหตุ:
 *  - ใช้ base64 token จำลอง (genToken) พอสำหรับโหมด mock
 *  - หน้าเว็บส่วนใหญ่เรียก requireLogin() ที่ DOMContentLoaded
 */

const Auth = (() => {
    const KEY = 'fs_auth';
    const now = () => Date.now();
    const genToken = () => btoa(String(Math.random()).slice(2)+'.'+now());
  
    function login(email, password){
      if(!email || !password) throw new Error('Email and password required');
      const user = {
        id: 'U-' + Math.random().toString(36).slice(2,8),
        name: email.split('@')[0],
        email,
        householdId: ApiConfig.householdId,
        token: genToken(),
        expiresAt: now() + 1000*60*60*8
      };
      localStorage.setItem(KEY, JSON.stringify(user));
      return user;
    }
    function logout(){ localStorage.removeItem(KEY); location.href = '../Login.html'; }
    function current(){
      const raw = localStorage.getItem(KEY); if(!raw) return null;
      try{
        const u = JSON.parse(raw);
        if(u.expiresAt < now()){ localStorage.removeItem(KEY); return null; }
        return u;
      }catch{return null;}
    }
    function requireLogin(){ const u = current(); if(!u){ location.href = '../Login.html'; return null; } return u; }
  
    return { login, logout, current, requireLogin };
  })();