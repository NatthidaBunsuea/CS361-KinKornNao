/**
 * KinKonNao™ — Ingredient Form (เพิ่ม/แก้ไขวัตถุดิบ)
 * บทบาท:
 *  - requireLogin + mountHeader
 *  - อ่าน query params: scope (mine/family), id (กรณีแก้ไข)
 *  - ถ้าแก้ไข: preload ค่าลงฟอร์มจาก Api.listIngredients()
 *  - submit: validate/normalize (ชื่อเป็น lower-case), แปลง quantity เป็น Number
 *      - create → Api.createIngredient()
 *      - update → Api.updateIngredient()
 *    แล้ว toast + redirect ไป fridge-list.html
 *
 * พึ่งพา: api.js, auth.js, nav.js, UI.toast()
 * DOM targets: #form (input: name, quantity, unit, category, expiry)
 */

document.addEventListener('DOMContentLoaded', async ()=>{
    const me = Auth.requireLogin(); if(!me) return;
    UI.mountHeader();
  
    const params = new URLSearchParams(location.search);
    const scope = params.get('scope') || 'mine';
    const editId = params.get('id');
  
    const form = document.getElementById('form');
    if(editId){
      const items = await Api.listIngredients(scope, me.id, me.householdId);
      const it = items.find(x=>x.id===editId);
      if(it){
        form.name.value = it.name;
        form.quantity.value = it.quantity;
        form.unit.value = it.unit||'';
        form.category.value = it.category||'';
        form.expiry.value = it.expiry?.slice(0,10) || '';
      }
    }
  
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const item = {
        name: form.name.value.trim().toLowerCase(),
        quantity: Number(form.quantity.value||0),
        unit: form.unit.value.trim(),
        category: form.category.value.trim(),
        expiry: form.expiry.value
      };
      if(!item.name) return UI.toast('ใส่ชื่อวัตถุดิบก่อน');
      if(editId){ await Api.updateIngredient(scope, me.id, me.householdId, editId, item); UI.toast('Updated'); }
      else{ await Api.createIngredient(scope, me.id, me.householdId, item); UI.toast('Added'); }
      setTimeout(()=>location.href='./fridge-list.html', 300);
    });
  });