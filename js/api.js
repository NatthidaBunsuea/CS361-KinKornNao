/**
 * KinKonNao™ — API layer (mock/localStorage หรือ REST API)
 * บทบาท:
 *  - รวมฟังก์ชันเข้าถึงข้อมูลวัตถุดิบ/ครัวเรือน/สถิติ และแนะนำเมนู
 *  - รองรับ 2 โหมด: 
 *      - mock: เก็บข้อมูลใน localStorage (KEY: 'fs_data_v1')
 *      - api : เรียก REST API โดยดึง token จาก Auth.current()
 *
 * ฟังก์ชันหลัก:
 *  - listIngredients(scope, ownerId, householdId): อ่านวัตถุดิบ (เรียงตามวันหมดอายุ)
 *  - createIngredient(scope, ownerId, householdId, item): เพิ่มวัตถุดิบ
 *  - updateIngredient(scope, ownerId, householdId, id, patch): อัปเดตวัตถุดิบ
 *  - deleteIngredient(scope, ownerId, householdId, id, reason): ลบ/บันทึก usage log (used/waste)
 *  - weeklySummary(ownerId, householdId): รวมสถิติ 7 วันล่าสุด (used/wasted/leftovers)
 *  - expiringSoon(ownerId, householdId, days): วัตถุดิบใกล้หมดอายุภายใน X วัน
 *  - Household: createHousehold, joinHousehold, getHousehold, inviteCode, decodeInvite
 *  - recommendFromPantry(ownerId, householdId): แนะนำเมนูจากรายการวัตถุดิบ (ตรรกะพื้นฐาน)
 *
 * พึ่งพา: ApiConfig (mode, apiBaseUrl), Auth (token), localStorage
 * หมายเหตุ:
 *  - โหมด mock ใช้คีย์ pantry แยกตาม ownerId/householdId
 *  - การลบจะสร้าง usageLogs เพื่อคำนวณ used/waste
 *  - ฟังก์ชัน recipes เป็น rule-based ง่าย ๆ รองรับชื่อไทย/อังกฤษ
 */

const Api = (() => {
    const KEY = 'fs_data_v1';
    const load = () => {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { pantries:{}, usageLogs:[], households:{} };
    };
    const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
    const id = () => Math.random().toString(36).slice(2,10);
  
    // ---------- Graphs ----------
    function listIngredients(scope, ownerId, householdId){
      if(ApiConfig.mode==='api'){
        const token = Auth.current()?.token;
        return fetch(`${ApiConfig.apiBaseUrl}/ingredients?scope=${scope}`, { headers:{Authorization:token} }).then(r=>r.json());
      }
      const db = load();
      const key = scope==='family' ? householdId : ownerId;
      const arr = db.pantries[key] || [];
      return Promise.resolve(arr.sort((a,b)=> new Date(a.expiry) - new Date(b.expiry)));
    }
    function createIngredient(scope, ownerId, householdId, item){
      if(ApiConfig.mode==='api'){
        const token = Auth.current()?.token;
        return fetch(`${ApiConfig.apiBaseUrl}/ingredients`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:token}, body:JSON.stringify({scope,...item}) }).then(r=>r.json());
      }
      const db = load();
      const key = scope==='family' ? householdId : ownerId;
      db.pantries[key] = db.pantries[key] || [];
      const rec = { id:id(), createdAt:Date.now(), ...item };
      db.pantries[key].push(rec);
      save(db);
      return Promise.resolve(rec);
    }
    function updateIngredient(scope, ownerId, householdId, _id, patch){
      if(ApiConfig.mode==='api'){
        const token = Auth.current()?.token;
        return fetch(`${ApiConfig.apiBaseUrl}/ingredients/${_id}`, { method:'PUT', headers:{'Content-Type':'application/json',Authorization:token}, body:JSON.stringify({scope,...patch}) }).then(r=>r.json());
      }
      const db = load();
      const key = scope==='family' ? householdId : ownerId;
      db.pantries[key] = (db.pantries[key]||[]).map(it => it.id===_id ? {...it, ...patch} : it);
      save(db);
      return Promise.resolve(true);
    }
    function deleteIngredient(scope, ownerId, householdId, _id, reason='used'){
      if(ApiConfig.mode==='api'){
        const token = Auth.current()?.token;
        return fetch(`${ApiConfig.apiBaseUrl}/ingredients/${_id}`, { method:'DELETE', headers:{Authorization:token} }).then(r=>r.json());
      }
      const db = load();
      const key = scope==='family' ? householdId : ownerId;
      const item = (db.pantries[key]||[]).find(x=>x.id===_id);
      db.pantries[key] = (db.pantries[key]||[]).filter(it => it.id!==_id);
      if(item){
        db.usageLogs.push({ id:id(), ownerKey:key, itemName:item.name, category:item.category, qty:item.quantity, unit:item.unit, expiry:item.expiry, when:Date.now(), reason });
      }
      save(db);
      return Promise.resolve(true);
    }
    function weeklySummary(ownerId, householdId){
      const db = load();
      const since = Date.now() - 7*86400000;
      const logs = db.usageLogs.filter(l => l.when >= since && (l.ownerKey===ownerId || l.ownerKey===householdId));
      const used={}, wasted={};
      logs.forEach(l=>{ if(l.reason==='waste') wasted[l.itemName]=(wasted[l.itemName]||0)+(Number(l.qty)||1); else used[l.itemName]=(used[l.itemName]||0)+(Number(l.qty)||1); });
      const my = db.pantries[ownerId] || [];
      const fam = db.pantries[householdId] || [];
      return Promise.resolve({ used, wasted, leftovers:[...my,...fam] });
    }
    function expiringSoon(ownerId, householdId, days=3){
      const db = load();
      const cut = Date.now() + days*86400000;
      const filt = list => (list||[]).filter(i => new Date(i.expiry).getTime() <= cut);
      return Promise.resolve({ my: filt(db.pantries[ownerId]), family: filt(db.pantries[householdId]) });
    }
  
    // ---------- Household ----------
    function ensureHousehold(db, hhId){ db.households[hhId] = db.households[hhId] || { id:hhId, name:'My Family', members:[] }; return db.households[hhId]; }
    function createHousehold(hhId, name, user){
      const db = load(); const hh = ensureHousehold(db, hhId);
      hh.name = name || hh.name; if(!hh.members.find(m=>m.id===user.id)) hh.members.push({id:user.id,name:user.name,email:user.email,role:'owner'});
      save(db); return Promise.resolve(hh);
    }
    function joinHousehold(hhId, user){
      const db = load(); const hh = ensureHousehold(db, hhId);
      if(!hh.members.find(m=>m.id===user.id)) hh.members.push({id:user.id,name:user.name,email:user.email,role:'member'});
      save(db); return Promise.resolve(hh);
    }
    function getHousehold(hhId){ const db = load(); return Promise.resolve(db.households[hhId] || null); }
    function inviteCode(hhId){ return btoa(hhId).replace(/=+$/,'').slice(0,8).toUpperCase(); }
    function decodeInvite(code){ try{ const pad = code.length%4===2 ? '==' : code.length%4===3 ? '=' : ''; return atob(code+pad); }catch{return null;} }
  
    // ---------- Recipes ----------
    function recommendFromPantry(ownerId, householdId){
      const db = load();
      const items = [...(db.pantries[ownerId]||[]), ...(db.pantries[householdId]||[])].map(x=>(x.name||'').toLowerCase().trim());
      const hasAny = (...names) => names.some(n=> items.includes(n));
  
      const recs=[];
      if(hasAny('pork','หมู')){
        if(hasAny('garlic','กระเทียม')){
          recs.push({
            id:'pork-garlic', title:'หมูกระเทียม (Garlic Pork)', time:20,
            ingredients:[{name:'หมู (สันนอก/สันคอ)',qty:'300 g'},{name:'กระเทียม',qty:'6-8 กลีบ'},{name:'ซีอิ๊วขาว',qty:'1 ชต.'},{name:'น้ำปลา',qty:'1 ชต.'},{name:'น้ำตาล',qty:'1 ชช.'},{name:'พริกไทย',qty:'1/2 ชช.'},{name:'น้ำมัน',qty:'2 ชต.'},{name:'ข้าวสวย (เสิร์ฟ)',qty:'1 จาน'}],
            steps:['โขลกกระเทียมให้พอแหลก','หมักหมู 10 นาที ด้วยซีอิ๊วขาว น้ำปลา น้ำตาล พริกไทย กระเทียม','ตั้งกระทะใส่น้ำมัน เจียวกระเทียม','ใส่หมูผัดจนสุกหอม ขอบเกรียมเล็กน้อย','เสิร์ฟกับข้าวสวยร้อนๆ']
          });
        }
        recs.push({
          id:'pork-steak', title:'สเต๊กหมู (Pork Steak)', time:25,
          ingredients:[{name:'หมู (สันนอก/สันคอ)',qty:'250-300 g'},{name:'เกลือ & พริกไทย',qty:'เล็กน้อย'},{name:'กระเทียม',qty:'2 กลีบ (สับ)'},{name:'เนย/น้ำมัน',qty:'1 ชต.'},{name:'โรสแมรี่ (ไม่ใส่ก็ได้)',qty:'1 กิ่ง'},{name:'ผักสลัด/มันบด (เสิร์ฟ)',qty:'ตามชอบ'}],
          steps:['ซับเนื้อหมูให้แห้ง โรยเกลือพริกไทย','ตั้งกระทะให้ร้อน ใส่น้ำมัน/เนยและกระเทียม','ย่างหมูด้านละ 3–4 นาที (ตามความหนา)','พักเนื้อ 3 นาที แล้วเสิร์ฟ']
        });
      }
      if(hasAny('beef','เนื้อวัว') && hasAny('vegetable','ผัก','broccoli','บรอกโคลี','carrot','แครอท','bell pepper','พริกหวาน')){
        recs.push({
          id:'beef-veg-stirfry', title:'เนื้อผัดผัก (Beef Stir-fry)', time:18,
          ingredients:[{name:'เนื้อวัวหั่นบาง',qty:'250 g'},{name:'บรอกโคลี/ผักรวม',qty:'2 ถ้วย'},{name:'กระเทียม',qty:'3 กลีบ'},{name:'ซีอิ๊วขาว',qty:'1.5 ชต.'},{name:'น้ำมันหอย',qty:'1 ชต.'},{name:'น้ำตาล',qty:'1 ชช.'},{name:'พริกไทย',qty:'เล็กน้อย'},{name:'น้ำมัน',qty:'1 ชต.'}],
          steps:['ลวกผัก 1 นาที พัก','เจียวกระเทียมหอม ใส่เนื้อ ผัดไฟแรง','ปรุงรส ซีอิ๊ว น้ำมันหอย น้ำตาล พริกไทย','ใส่ผัก ผัดเร็วๆ แล้วเสิร์ฟ']
        });
      }
      if(hasAny('rice','ข้าว') && hasAny('egg','ไข่')){
        recs.push({
          id:'egg-fried-rice', title:'ข้าวผัดไข่ (Egg Fried Rice)', time:12,
          ingredients:[{name:'ข้าวสวย(แช่เย็น)',qty:'2 ถ้วย'},{name:'ไข่ไก่',qty:'2 ฟอง'},{name:'กระเทียม',qty:'2 กลีบ'},{name:'ซีอิ๊วขาว',qty:'1 ชต.'},{name:'ซอสปรุงรส',qty:'1 ชช. (ไม่ใส่ก็ได้)'},{name:'ต้นหอม',qty:'1 ต้น'},{name:'น้ำมัน',qty:'1 ชต.'}],
          steps:['เจียวกระเทียม','ใส่ไข่ คนให้ร่วน ใส่ข้าวผัดไฟแรง','ปรุงรส ใส่ต้นหอม ผัดเร็วแล้วปิดไฟ']
        });
      }
      if(hasAny('basil','โหระพา','กะเพรา','holy basil') && hasAny('pork','หมู','chicken','ไก่')){
        recs.push({
          id:'kra-pao', title:'ผัดกะเพรา (Basil Stir-fry)', time:15,
          ingredients:[{name:'หมู/ไก่ สับ',qty:'250 g'},{name:'กะเพรา',qty:'1 ถ้วย'},{name:'กระเทียม',qty:'5 กลีบ'},{name:'พริกแดง',qty:'3-5 เม็ด'},{name:'น้ำปลา',qty:'1 ชต.'},{name:'ซีอิ๊วขาว',qty:'1 ชต.'},{name:'น้ำตาล',qty:'1/2 ชช.'},{name:'น้ำมัน',qty:'1 ชต.'}],
          steps:['โขลกกระเทียมพริก','เจียวให้หอม ใส่หมู/ไก่ ผัดจนสุก','ปรุงรส','ใส่ใบกะเพรา ผัดพอสลด เสิร์ฟกับไข่ดาว']
        });
      }
      if(hasAny('pasta','สปาเก็ตตี้') && hasAny('tomato','มะเขือเทศ')){
        recs.push({
          id:'tomato-pasta', title:'สปาเก็ตตี้ซอสมะเขือ (Tomato Pasta)', time:20,
          ingredients:[{name:'เส้นพาสต้า',qty:'180 g'},{name:'มะเขือเทศ/ซอส',qty:'1–1.5 ถ้วย'},{name:'กระเทียม',qty:'3 กลีบ'},{name:'เกลือ/น้ำตาล',qty:'เล็กน้อย'},{name:'น้ำมันมะกอก',qty:'1 ชต.'},{name:'ชีส',qty:'ตามชอบ'}],
          steps:['ต้มเส้น al dente','ผัดกระเทียม ใส่มะเขือเทศ ปรุงรส','คลุกเส้นกับซอส เติมน้ำต้มเส้นเล็กน้อย โรยชีส']
        });
      }
      if(recs.length===0 && hasAny('egg','ไข่')){
        recs.push({ id:'omelette', title:'ไข่เจียวฟู (Omelette)', time:8,
          ingredients:[{name:'ไข่ไก่',qty:'2–3 ฟอง'},{name:'น้ำปลา/ซีอิ๊ว',qty:'1 ชช.'},{name:'น้ำมัน',qty:'สำหรับทอด'}],
          steps:['ตีไข่ ปรุงรส','ทอดไฟกลางให้อูมฟู']});
      }
      return Promise.resolve(recs);
    }
  
    return { listIngredients, createIngredient, updateIngredient, deleteIngredient, weeklySummary, expiringSoon, recommendFromPantry,
             createHousehold, joinHousehold, getHousehold, inviteCode, decodeInvite };
  })();