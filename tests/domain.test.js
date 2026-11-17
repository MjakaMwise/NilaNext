import test from 'node:test'
import assert from 'node:assert/strict'
import {average,balance,validPayment,toCSV,progress,permittedPages} from '../src/lib/domain.js'
test('incomplete reports average only recorded marks, including zero',()=>{assert.equal(average([]),null);assert.equal(average([{score:0},{score:'100'}]),50);assert.equal(average([{score:74},{score:75},{score:76}]),75);assert.equal(progress(null),'Not assessed');assert.equal(progress(0),'Needs support')})
test('invoice balances do not include receipts from other invoices',()=>{assert.equal(balance({id:'a',amount:'25000.50'},[{invoice_id:'a',amount:'5000.25'},{invoice_id:'b',amount:20000}]),20000.25)})
test('payment rejects overpayment, zero, negative, nonfinite and fractional cents',()=>{for(const n of [0,-1,'bad',Infinity,100.001,101])assert.equal(validPayment(n,100),false);assert.equal(validPayment('100',100),true);assert.equal(validPayment('0.01',100),true)})
test('CSV escapes formula injection, quotes, newlines and leading whitespace',()=>{const csv=toCSV([['=SUM(A1:A2)','  +cmd','a"b','hello\nworld']]);assert.ok(csv.includes('"\'=SUM(A1:A2)"'));assert.ok(csv.includes('"\'  +cmd"'));assert.ok(csv.includes('"a""b"'));assert.ok(csv.includes('"hello\nworld"'))})
test('navigation keeps access management with admin and fees away from teachers',()=>{assert.ok(permittedPages('admin').includes('People & access'));assert.ok(!permittedPages('teacher').includes('Fees'));assert.ok(!permittedPages('parent').includes('Students'));assert.ok(permittedPages('student').includes('Academic reports'))})
