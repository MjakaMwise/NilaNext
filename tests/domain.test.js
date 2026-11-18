import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareImport } from "../src/lib/record-import.js"
import {average,balance,validPayment,toCSV,progress,permittedPages} from '../src/lib/domain.js'
test('incomplete reports average only recorded marks, including zero',()=>{assert.equal(average([]),null);assert.equal(average([{score:0},{score:'100'}]),50);assert.equal(average([{score:74},{score:75},{score:76}]),75);assert.equal(progress(null),'Not assessed');assert.equal(progress(0),'Needs support')})
test('invoice balances do not include receipts from other invoices',()=>{assert.equal(balance({id:'a',amount:'25000.50'},[{invoice_id:'a',amount:'5000.25'},{invoice_id:'b',amount:20000}]),20000.25)})
test('payment rejects overpayment, zero, negative, nonfinite and fractional cents',()=>{for(const n of [0,-1,'bad',Infinity,100.001,101])assert.equal(validPayment(n,100),false);assert.equal(validPayment('100',100),true);assert.equal(validPayment('0.01',100),true)})
test('CSV escapes formula injection, quotes, newlines and leading whitespace',()=>{const csv=toCSV([['=SUM(A1:A2)','  +cmd','a"b','hello\nworld']]);assert.ok(csv.includes('"\'=SUM(A1:A2)"'));assert.ok(csv.includes('"\'  +cmd"'));assert.ok(csv.includes('"a""b"'));assert.ok(csv.includes('"hello\nworld"'))})
test('navigation keeps access management with admin and fees away from teachers',()=>{assert.ok(permittedPages('admin').includes('People & access'));assert.ok(!permittedPages('teacher').includes('Fees'));assert.ok(!permittedPages('parent').includes('Students'));assert.ok(permittedPages('student').includes('Academic reports'))})

const importContext = {
 schoolId: 'school',
 termId: 'term',
 students: [{ id: 'learner', admission_no: '001', active: true }],
 invoices: [],
 payments: [],
}

test('CSV imports accept quoted records, preserve admission numbers and reject repeated marks', () => {
 const results = 'Admission no,Subject,Score\r\n001,Mathematics,0'
 const [mark] = prepareImport('results', results, importContext)
 assert.equal(mark.student_id, 'learner')
 assert.equal(mark.score, 0)
 assert.throws(() => prepareImport('results', results + '\r\n001,mathematics,40', importContext), /record 3/)
 const [invoice] = prepareImport('invoices', '\uFEFFAdmission no,Description,Amount KES\r\n001,"Tuition, ""Term 1""",250.50', importContext)
 assert.equal(invoice.description, 'Tuition, "Term 1"')
 assert.equal(invoice.amount, 250.5)
})

test('receipt imports validate the combined balance and references in the selected term', () => {
 const context = {
  ...importContext,
  invoices: [{ id: 'invoice', student_id: 'learner', term_id: 'term', amount: 100 }],
  payments: [{ invoice_id: 'invoice', amount: 10, reference: 'EXISTING' }],
 }
 const headers = 'Admission no,Reference,Amount KES\n'
 assert.throws(() => prepareImport('payments', headers + '001,R1,50\n001,R2,50', context), /remaining invoice balance/)
 assert.throws(() => prepareImport('payments', headers + '001,EXISTING,30', context), /reference already exists/)
 const rows = prepareImport('payments', headers + '001,R1,50\n001,R2,40', context)
 assert.equal(rows.length, 2)
 assert.equal(rows[1].invoice_id, 'invoice')
 assert.notEqual(rows[0].request_id, rows[1].request_id)
})
