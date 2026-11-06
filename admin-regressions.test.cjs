const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/js/admin.js','utf8');
function between(start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}

test('order loader reads past 500 and uses stable ordering',async()=>{
  const ranges=[];
  const context={runAdminRead:async fn=>fn(null),sb:{from:()=>({select(){return this},order(){return this},range(a,b){ranges.push([a,b]);this.offset=a;return this},abortSignal(){return Promise.resolve({data:Array.from({length:this.offset===0?500:2},(_,i)=>({id:this.offset+i}))})}})}};
  vm.createContext(context);vm.runInContext(between('async function loadAllOrders','async function loadAll('),context);
  const result=await context.loadAllOrders();
  assert.equal(result.data.length,502);assert.equal(ranges.length,2);
});

test('editing an order does not become its revenue date',()=>{
  const context={};vm.createContext(context);
  vm.runInContext(between('function paymentReceivedAt','function paidOrderDate'),context);
  assert.equal(context.paymentReceivedAt({updated_at:'2026-11-06'}),'');
  assert.equal(context.paymentReceivedAt({paid_at:'2026-10-01',updated_at:'2026-11-06'}),'2026-10-01');
});

test('queued email is not presented as delivered',async()=>{
  const messages=[];const context={adminOrderRequest:async()=>({email:{queued:true,sent:false}}),toast:(...args)=>messages.push(args)};
  vm.createContext(context);vm.runInContext(between('async function sendStatusEmail','function setupPremiumScrollbar'),context);
  assert.equal(await context.sendStatusEmail('TEST'),true);
  assert.equal(messages[0][1],'warning');assert.match(messages[0][0],/черзі/);
});

test('manual submit blocks double clicks and reuses request ID after timeout',async()=>{
  const storage=new Map(),requests=[];let release;
  const fields={customer_name:'Test Customer',customer_phone:'+380951234567',customer_email:'test@example.com',customer_city:'City',delivery_details:'Branch',delivery_method:'nova_poshta_branch'};
  const form={dataset:{manualNpCityManual:'true',manualNpWarehouseManual:'true'},elements:{},querySelectorAll:()=>[]};
  const context={FormData:class {get(k){return fields[k]||null}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},crypto:globalThis.crypto,cfg:{url:'https://example.com',publishableKey:'public'},manualItems:[{id:'signature-relax',quantity:1}],normalizeManualPhone:x=>x,manualEntry:()=>({type:'fragrance'}),$:()=>({textContent:''}),fetchWithTimeout:async(_,options)=>{requests.push(JSON.parse(options.body));await new Promise(resolve=>release=resolve);throw Error('timeout')}};
  vm.createContext(context);vm.runInContext(between('let manualOrderSubmitting','function closeAdmin2Selects'),context);
  const event={preventDefault(){},currentTarget:form};
  const first=context.createManualOrder(event);await context.createManualOrder(event);
  assert.equal(requests.length,1);release();await first;
  const retry=context.createManualOrder(event);assert.equal(requests.length,2);
  assert.equal(requests[0].checkout_request_id,requests[1].checkout_request_id);release();await retry;
});
