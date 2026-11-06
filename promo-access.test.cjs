const {test}=require('node:test');
const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const fs=require('node:fs');
const vm=require('node:vm');
async function promos(user,token){
  let handler;
  const builder={select(){return this},eq(){return this},order(){return this},limit:async()=>({data:[
    {code:'PUBLIC',active:true,show_in_checkout:true,applies_to:'all',discount_type:'fixed',discount_value:10},
    {code:'PERSONAL',active:true,customer_email:'owner@example.com',applies_to:'all',discount_type:'fixed',discount_value:20}
  ]})};
  const context={Response,createClient:()=>({auth:{getUser:async()=>({data:{user},error:null})},from:()=>builder}),Deno:{env:{get:()=> 'mock'},serve:fn=>handler=fn},console};
  const source=fs.readFileSync(__dirname+'/supabase/functions/available-promos/index.ts','utf8').replace(/^import .*;\n/gm,'');
  vm.runInNewContext(stripTypeScriptTypes(source),context);
  const response=await handler(new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({customer_email:'owner@example.com',subtotal:799,items:[{id:'signature-relax',quantity:1}]})}));
  return (await response.json()).promos.map(p=>p.code);
}
test('guest receives public promos without JWT',async()=>assert.deepEqual(await promos(null,null),['PUBLIC']));
test('another user cannot obtain personal promo by entering owner email',async()=>assert.deepEqual(await promos({email:'other@example.com',email_confirmed_at:'2026-01-01'},'valid'),['PUBLIC']));
test('verified owner receives personal and public promos',async()=>assert.deepEqual(await promos({email:'owner@example.com',email_confirmed_at:'2026-01-01'},'valid'),['PERSONAL','PUBLIC']));
