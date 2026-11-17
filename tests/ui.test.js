import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {JSDOM} from 'jsdom'
import React,{act} from 'react'

const directory=dirname(fileURLToPath(import.meta.url))
const folder=await mkdtemp(join(directory,'.generated-'))
const output=join(folder,'App.mjs')
await build({entryPoints:[join(directory,'../src/App.jsx')],outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{name:'mock-school-client',setup(b){b.onResolve({filter:/\/supabase$/},()=>({path:'school-client',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const configured=true; export const supabase=globalThis.__schoolClient;',loader:'js'}))}}]})
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost:5173'})
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,location:dom.window.location,IS_REACT_ACT_ENVIRONMENT:true})
for (const key of ['CustomEvent','MutationObserver','Node','NodeFilter','HTMLInputElement']) globalThis[key]=dom.window[key]
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window)
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true})
let prints=0;dom.window.print=()=>prints++
const {createRoot}=await import('react-dom/client')
let fixture,identity,authListener,root,serial=0
function reset(role='admin'){
 identity={user:{id:role,email:role+'@example.invalid'}}
 fixture={nt_schools:[{id:'school',name:'Test School'}],nt_profiles:[{user_id:role,school_id:'school',role,display_name:'Test '+role,email:role+'@example.invalid'}],nt_terms:[{id:'term',school_id:'school',year:2026,number:1}],nt_classes:[{id:'class',school_id:'school',name:'Grade 8A',teacher_id:'teacher'}],nt_students:[{id:'learner',school_id:'school',class_id:'class',admission_no:'ADM001',full_name:'Amina Hassan',active:true,guardian_name:'Test Guardian',guardian_phone:'0700000000'}],nt_marks:['Mathematics','English','Integrated Science','Kiswahili','Humanities'].map(subject=>({school_id:'school',student_id:'learner',term_id:'term',subject,score:80})),nt_attendance:[],nt_invoices:[{id:'invoice',school_id:'school',student_id:'learner',term_id:'term',amount:25000,description:'Term tuition'}],nt_payments:[],nt_invites:[],nt_student_links:[],nt_notes:[],nt_departments:[],nt_subjects:[],nt_offerings:[],nt_lessons:[],nt_elective_enrolments:[],nt_assignments:[],nt_assignment_submissions:[],nt_lesson_attendance:[]}
}
class Query{
 constructor(table){this.table=table;this.filters=[];this.operation='read';this.value=null;this.start=0;this.end=999}
 select(){return this}eq(k,v){this.filters.push([k,v]);return this}order(){return this}range(a,b){this.start=a;this.end=b;return this}limit(n){this.end=n-1;return this}
 insert(v){this.operation='insert';this.value=v;return this}update(v){this.operation='update';this.value=v;return this}upsert(v){this.operation='upsert';this.value=v;return this}delete(){this.operation='delete';return this}
 single(){this.one=true;return this}maybeSingle(){this.one=true;return this}
 then(resolve,reject){try{let rows=fixture[this.table],matches=r=>this.filters.every(([k,v])=>r[k]===v),result;if(this.operation==='read')result=rows.filter(matches).slice(this.start,this.end+1);if(this.operation==='insert'){result=(Array.isArray(this.value)?this.value:[this.value]).map(v=>({id:'new'+(++serial),created_at:new Date().toISOString(),...v}));rows.push(...result)}if(this.operation==='update'){result=rows.filter(matches);result.forEach(r=>Object.assign(r,this.value))}if(this.operation==='delete'){result=rows.filter(matches);fixture[this.table]=rows.filter(r=>!matches(r))}if(this.operation==='upsert'){result=[];for(const v of this.value){const keys=this.table==='nt_marks'?['student_id','term_id','subject']:this.table==='nt_lesson_attendance'?['lesson_id','student_id','day']:['student_id','day'];let r=rows.find(r=>keys.every(k=>r[k]===v[k]));if(r)Object.assign(r,v);else{r={...v};rows.push(r)}result.push(r)}}return Promise.resolve({data:structuredClone(this.one?result[0]??null:result),error:null}).then(resolve,reject)}catch(e){return Promise.reject(e).then(resolve,reject)}}
}
globalThis.__schoolClient={from:t=>new Query(t),rpc:(name,args)=>{
 if(name==='nt_offering_roster'){
  const offering=fixture.nt_offerings.find(row=>row.id===args.oid)
  const roster=fixture.nt_students.filter(row=>row.active&&row.class_id===offering.class_id&&
   (!offering.elective||fixture.nt_elective_enrolments.some(entry=>entry.offering_id===offering.id&&entry.student_id===row.id)))
  return {range:async(start,end)=>({data:roster.slice(start,end+1),error:null})}
 }
 if(name==='nt_revoke_member')fixture.nt_profiles=fixture.nt_profiles.filter(p=>p.user_id!==args.member_id);return {data:null,error:null}},auth:{onAuthStateChange(callback){authListener=callback;queueMicrotask(()=>callback('INITIAL_SESSION',identity));return {data:{subscription:{unsubscribe(){}}}}},async signOut(){identity=null;authListener('SIGNED_OUT',null);return {error:null}},async signInWithPassword(){identity={user:{id:'admin',email:'admin@example.invalid'}};authListener('SIGNED_IN',identity);return {error:null}}}}
const {default:App}=await import(pathToFileURL(output).href)
const text=()=>document.body.textContent
const button=label=>[...document.querySelectorAll('button')].find(b=>{const copy=b.cloneNode(true);copy.querySelectorAll('.nav-count').forEach(n=>n.remove());return copy.textContent.trim()===label})
async function flush(){await act(async()=>{for(let i=0;i<20;i++)await Promise.resolve()})}
async function click(label){let el=typeof label==='string'?button(label):label;assert.ok(el,'Missing button: '+label);await act(async()=>{el.click()});await flush()}
async function fill(selector,value){let el=document.querySelector(selector);assert.ok(el,'Missing field '+selector);await act(async()=>{const proto=el.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?dom.window.HTMLTextAreaElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new dom.window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}))});await flush()}
async function submit(){await act(async()=>document.querySelector('[role="dialog"] form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));await flush()}
async function mount(role='admin'){if(root)await unmount();reset(role);root=createRoot(document.querySelector('#root'));await act(async()=>root.render(React.createElement(App)));await flush()}
async function unmount(){await act(async()=>root.unmount());document.querySelector('#root').innerHTML='';root=null}

test('administrator workflow persists learner enrolment, marks, attendance, payment and invitations',async()=>{
 await mount();assert.ok(text().includes('Welcome, Test.'));assert.ok(text().includes('80%'))
 assert.ok(document.querySelector('[aria-label="School quick actions"]'));assert.ok(button('Collect fees'));assert.ok(text().includes('TOTAL CLASSES'));
 await click(document.querySelector('[aria-label="Next month"]'));const next=new Date();next.setMonth(next.getMonth()+1,1);const nextDate=[next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),'01'].join('-');await click(document.querySelector('[aria-label="View attendance for '+nextDate+'"]'));assert.equal(document.querySelector('[aria-label="Register date"]').value,nextDate);await click('Overview');
 await click('Students');await click('Add student');await fill('[name="full_name"]','Brian Otieno');await fill('[name="admission_no"]','ADM002');await fill('[name="class_id"]','class');await submit();assert.equal(fixture.nt_students.length,2);assert.ok(text().includes('Brian Otieno'))
 await fill('input[aria-label="Search learners"]','Amina');assert.ok(text().includes('Amina Hassan'));assert.ok(!document.querySelector('tbody').textContent.includes('Brian Otieno'))
 await click('Academic reports');await click([...document.querySelectorAll('tbody button')].find(b=>b.textContent.includes('Preview')));assert.ok(document.querySelector('[role="dialog"]').textContent.includes('ACADEMIC PROGRESS REPORT'));await click('Print report');assert.equal(prints,1)
 await click('Edit marks');for(let i=0;i<5;i++)await fill('[name="s'+i+'"]',String(90-i*5));await submit();assert.equal(fixture.nt_marks.find(m=>m.subject==='Mathematics').score,90)
 await click('Attendance');await click('Mark all present');await click('Save register');assert.equal(fixture.nt_attendance.length,2);assert.ok(fixture.nt_attendance.every(r=>r.status==='Present'))
 await click('Fees');await click('Record payment');await fill('[name="amount"]','5000');await fill('[name="reference"]','RCPT-TEST-01');await submit();assert.equal(fixture.nt_payments[0].amount,5000);assert.equal(fixture.nt_payments[0].reference,'RCPT-TEST-01')
 await click('People & access');await click('Approve access');await fill('[name="email"]','parent@example.invalid');await fill('[name="role"]','parent');await fill('[name="student_id"]','learner');await submit();assert.equal(fixture.nt_invites[0].role,'parent');assert.ok(text().includes('Pending'))
 await click('Cancel approval');await click('Confirm removal');assert.equal(fixture.nt_invites.length,0)
 await click(document.querySelector('[aria-label="Sign out"]'));assert.ok(text().includes('Welcome to your school.'));assert.ok(!text().includes('Amina Hassan'))
 await unmount()
})
test('teacher and parent views expose only their relevant actions',async()=>{
 await mount('teacher');assert.ok(!button('Fees'));assert.ok(!button('People & access'));await click('Students');assert.ok(!button('Add student'));await click('Attendance');assert.ok(button('Save register'));await unmount()
 await mount('parent');assert.ok(!button('Students'));assert.ok(!button('Classes'));await click('Academic reports');await click([...document.querySelectorAll('tbody button')].find(b=>b.textContent.includes('Preview')));assert.ok(!button('Edit marks'));await click(document.querySelector('[aria-label="Close dialog"]'));await click('Attendance');assert.ok(!button('Save register'));assert.ok(text().includes('Not marked'));await click('Fees');assert.ok(!button('Create invoice'));assert.ok(!button('Record payment'));await unmount()
})


test('teacher opens an elective roster, posts work and saves its scheduled register',async()=>{
 await mount('teacher')
 fixture.nt_subjects.push({ id:'french', school_id:'school', name:'French' })
 fixture.nt_offerings.push({ id:'elective', school_id:'school', term_id:'term', class_id:'class', subject_id:'french', teacher_id:'teacher', elective:true })
 fixture.nt_subjects.push({ id:'english', school_id:'school', name:'English' })
 fixture.nt_offerings.push({ id:'core', school_id:'school', term_id:'term', class_id:'class', subject_id:'english', teacher_id:'teacher', elective:false })
 fixture.nt_students.push({ id:'other', school_id:'school', class_id:'class', admission_no:'ADM002', full_name:'Brian Otieno', active:true })
 fixture.nt_elective_enrolments.push({ offering_id:'elective', student_id:'learner', school_id:'school' })
 fixture.nt_lessons.push({ id:'lesson', school_id:'school', offering_id:'elective', weekday:1, starts_at:'09:00', ends_at:'10:00' })
 await click('My teaching')
 await fill('main select:not([aria-label="Academic term"])','elective')
 assert.match(text(),/Elective · selected learners/)
 assert.match(text(),/Amina Hassan/)
 assert.doesNotMatch(text(),/Brian Otieno/)
 await fill('main select:not([aria-label="Academic term"])','core')
 assert.match(text(),/Whole class · all active learners/)
 assert.match(text(),/Brian Otieno/)
 await click('Assignments')
 await click('New assignment')
 await fill('[name="offering_id"]','elective')
 await fill('[name="title"]','French introduction')
 await fill('[name="instructions"]','Write a paragraph.')
 await fill('[name="due_on"]','2026-11-30')
 await submit()
 assert.equal(fixture.nt_assignments[0].title,'French introduction')
 await click('Lesson attendance')
 await fill('main input[type="date"]','2026-11-16')
 await fill('main select:not([aria-label="Academic term"])','lesson')
 await fill('[aria-label="Attendance for Amina Hassan"]','Present')
 await click('Save register')
 assert.deepEqual(fixture.nt_lesson_attendance.map(row=>[row.lesson_id,row.student_id,row.status]),[['lesson','learner','Present']])
 await unmount()
})

test.after(async()=>{await rm(folder,{recursive:true,force:true});dom.window.close()})
