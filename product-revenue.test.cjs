const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/js/admin.js','utf8');
function reporting(orders=[]){
  const context={orders,fullSizeProducts:()=>[{id:'a'},{id:'b'}],effectiveOrderStatus:order=>order.status};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function isTestOrder('),source.indexOf('function paidRevenueOrders(')),context);
  vm.runInContext(source.slice(source.indexOf('function allocatedOrderItems('),source.indexOf('function renderAdmin2(')),context);
  return context;
}
const paid=(overrides={})=>({status:'completed',payment_status:'paid',total_amount:1,items:[{id:'a',quantity:1,line_total:999}],...overrides});

test('one-hryvnia purchase contributes one hryvnia rather than catalogue price',()=>{
  const rows=reporting([paid()]).productSales();assert.equal(rows[0].revenue,1);assert.equal(rows[0].qty,1);
});
test('order discount is allocated across fragrance, Discovery and addons',()=>{
  const context=reporting();const rows=context.allocatedOrderItems(paid({total_amount:10,items:[{id:'a',quantity:1,line_total:800},{id:'discovery-6',quantity:1,line_total:150},{id:'reeds',quantity:1,line_total:50}]}));
  assert.deepEqual(Array.from(rows,row=>row.netMinor),[800,150,50]);
});
test('rounding conserves the paid total to the kopiyka',()=>{
  const rows=reporting().allocatedOrderItems(paid({total_amount:0.1,items:[{id:'a',quantity:1,line_total:1},{id:'b',quantity:1,line_total:1},{id:'discovery',quantity:1,line_total:1}]}));
  assert.deepEqual(Array.from(rows,row=>row.netMinor),[4,3,3]);
  assert.equal(rows.reduce((sum,row)=>sum+row.netMinor,0),10);
});
test('unpaid, refunded, cancelled and explicitly test orders do not add sales',()=>{
  const context=reporting([paid({payment_status:'unpaid'}),paid({payment_status:'refunded'}),paid({status:'cancelled'}),paid({source:'test'}),paid()]);
  assert.equal(context.productSales()[0].revenue,1);assert.equal(context.productSales()[0].qty,1);
});
test('duplicate product lines count as one order',()=>{
  const rows=reporting([paid({total_amount:2,items:[{id:'a',quantity:1,line_total:999},{id:'a',quantity:1,line_total:999}]})]).productSales();
  assert.equal(rows[0].orders,1);assert.equal(rows[0].revenue,2);assert.equal(rows[0].qty,2);
});
test('products with no paid sales are absent from top products',()=>{
  assert.equal(reporting().productSales().length,0);
});
