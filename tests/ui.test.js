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
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost:5173/?view=signin'})
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,location:dom.window.location,IS_REACT_ACT_ENVIRONMENT:true})
for (const key of ['CustomEvent','MutationObserver','Node','NodeFilter','HTMLInputElement']) globalThis[key]=dom.window[key]
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window)
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true})
let prints=0;dom.window.print=()=>prints++
const {createRoot}=await import('react-dom/client')
let fixture,identity,authListener,root,serial=0
function reset(role='admin'){
 identity={user:{id:role,email:role+'@example.invalid'}}
 fixture={nt_assessments:[],nt_assessment_results:[],nt_teacher_roster:[],nt_schools:[{id:'school',name:'Test School'}],nt_profiles:[{user_id:role,school_id:'school',role,display_name:'Test '+role,email:role+'@example.invalid'}],nt_terms:[{id:'term',school_id:'school',year:2026,number:1}],nt_classes:[{id:'class',school_id:'school',name:'Grade 8A',teacher_id:'teacher'}],nt_students:[{id:'learner',school_id:'school',class_id:'class',admission_no:'ADM001',full_name:'Amina Hassan',active:true,guardian_name:'Test Guardian',guardian_phone:'0700000000'}],nt_marks:['Mathematics','English','Integrated Science','Kiswahili','Humanities'].map(subject=>({school_id:'school',student_id:'learner',term_id:'term',subject,score:80})),nt_attendance:[],nt_invoices:[{id:'invoice',school_id:'school',student_id:'learner',term_id:'term',amount:25000,description:'Term tuition'}],nt_payments:[],nt_invites:[],nt_student_links:[],nt_notes:[],nt_departments:[],nt_subjects:[],nt_offerings:[],nt_lessons:[],nt_elective_enrolments:[],nt_assignments:[],nt_assignment_submissions:[],nt_lesson_attendance:[]}
}
class Query{
 constructor(table){this.table=table;this.filters=[];this.operation='read';this.value=null;this.start=0;this.end=999}
 select(){return this}eq(k,v){this.filters.push([k,v]);return this}order(){return this}range(a,b){this.start=a;this.end=b;return this}limit(n){this.end=n-1;return this}
 insert(v){this.operation='insert';this.value=v;return this}update(v){this.operation='update';this.value=v;return this}upsert(v){this.operation='upsert';this.value=v;return this}delete(){this.operation='delete';return this}
 single(){this.one=true;return this}maybeSingle(){this.one=true;return this}
 then(resolve,reject){try{let rows=fixture[this.table],matches=r=>this.filters.every(([k,v])=>r[k]===v),result;if(this.operation==='read')result=rows.filter(matches).slice(this.start,this.end+1);if(this.operation==='insert'){result=(Array.isArray(this.value)?this.value:[this.value]).map(v=>({id:'new'+(++serial),created_at:new Date().toISOString(),...v}));rows.push(...result)}if(this.operation==='update'){result=rows.filter(matches);result.forEach(r=>Object.assign(r,this.value))}if(this.operation==='delete'){result=rows.filter(matches);fixture[this.table]=rows.filter(r=>!matches(r))}if(this.operation==='upsert'){result=[];for(const v of this.value){const keys=this.table==='nt_marks'?['student_id','term_id','subject']:this.table==='nt_assessment_results'?['student_id','assessment_id','offering_id']:this.table==='nt_lesson_attendance'?['lesson_id','student_id','day']:['student_id','day'];let r=rows.find(r=>keys.every(k=>r[k]===v[k]));if(r)Object.assign(r,v);else{r={...v};rows.push(r)}result.push(r)}}return Promise.resolve({data:structuredClone(this.one?result[0]??null:result),error:null}).then(resolve,reject)}catch(e){return Promise.reject(e).then(resolve,reject)}}
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
test('staff can preview and import CSV results for the selected term', async () => {
 await mount()
 try {
  await click('Students')
  assert.ok(button('Export students CSV'))
  await click('People & access')
  assert.ok(button('Export staff CSV'))
  await click('Academic reports')
  await click('Upload report card marks CSV')
  const input = document.querySelector('input[type="file"]')
  Object.defineProperty(input, 'files', { value: [{ name: 'results.csv', text: async () => 'Admission no,Subject,Score\nADM001,Mathematics,95' }] })
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })))
  await flush()
  assert.ok(button('Import 1 record'))
  await click('Import 1 record')
  assert.equal(fixture.nt_marks.find(mark => mark.subject === 'Mathematics').score, 95)
  await click('Fees')
  assert.ok(button('Upload invoices CSV'))
  assert.ok(button('Upload payments CSV'))
 } finally {
  await unmount()
 }
})
test('roster uploads keep school IDs and require a separate teacher approval', async () => {
 await mount()
 async function upload(name, csv) {
  const modal = document.querySelector('[role="dialog"]')
  assert.ok([...modal.querySelectorAll('button, a')].some(node => node.textContent.trim() === 'Download Excel template'))
  const input = modal.querySelector('input[type="file"]')
  Object.defineProperty(input, 'files', { value: [{ name, text: async () => csv }] })
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })))
  await flush()
  await click('Import 1 record')
 }
 try {
  await click('Students')
  await click('Upload students CSV')
  await fill('[role="dialog"] select','class')
  await upload('students.csv', 'Name,Admission Number,Class,Stream\nImported Learner,007/A-2,Grade 8A,')
  assert.ok(fixture.nt_students.some(student => student.admission_no === '007/A-2'))
  await click('People & access')
  await click('Upload teachers CSV')
  await upload('teachers.csv', 'TSC Number,Name\n007521,Imported Teacher')
  assert.equal(fixture.nt_teacher_roster[0].tsc_no, '007521')
  assert.equal(fixture.nt_invites.length, 0)
  await click('Review access')
  await fill('[role="dialog"] [name="email"]','teacher-import@example.invalid')
  await submit()
  assert.equal(fixture.nt_invites[0].role, 'teacher')
  assert.equal(fixture.nt_invites[0].email, 'teacher-import@example.invalid')
 } finally {
  await unmount()
 }
})
test('year and term templates import one assessment subject and one term payment', async () => {
 await mount()
 fixture.nt_classes[0].level = 'Grade 8'
 fixture.nt_classes[0].stream = 'G'
 await click(document.querySelector('[aria-label="Refresh school data"]'))
 fixture.nt_assessments.push({ id:'cat', school_id:'school', term_id:'term', name:'CAT 2', sort_order:2 })
 fixture.nt_subjects.push({ id:'math', school_id:'school', name:'Mathematics' })
 fixture.nt_offerings.push({ id:'offering', school_id:'school', term_id:'term', subject_id:'math', class_id:'class', teacher_id:'teacher', elective:false })
 async function upload(name, csv) {
  const input = document.querySelector('[role="dialog"] input[type="file"]')
  assert.ok(input)
  Object.defineProperty(input, 'files', { value: [{ name, text: async () => csv }] })
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })))
  await flush()
  await click('Import 1 record')
 }
 try {
  await click('Academic reports')
  await click('Upload results CSV')
  await fill('[role="dialog"] fieldset label:nth-child(3) select', 'cat')
  await fill('[role="dialog"] fieldset label:nth-child(4) select', 'class')
  await fill('[role="dialog"] fieldset label:nth-child(5) select', 'offering')
  await upload('scores.csv', 'Name,Admission Number,Class,Stream,Year,Term,Assessment,Subject,Score\nAmina Hassan,ADM001,Grade 8,G,2026,1,CAT 2,Mathematics,92')
  assert.equal(fixture.nt_assessment_results[0].score, 92)
  assert.equal(fixture.nt_assessment_results[0].term_id, 'term')
  await click('Fees')
  await click('Upload payments CSV')
  await upload('payments.csv', 'Name,Admission Number,Class,Stream,Year,Term,Receipt Reference,Amount Paid\nAmina Hassan,ADM001,Grade 8,G,2026,1,PAID-1,250')
  assert.equal(fixture.nt_payments[0].amount, 250)
  assert.equal(fixture.nt_payments[0].invoice_id, 'invoice')
 } finally {
  await unmount()
 }
})
test('the welcome tour leaves sign-in and account actions available', async () => {
 await mount()
 await click(document.querySelector('[aria-label="Sign out"]'))
 const intro = document.querySelector('#school-intro')
 assert.match(intro.textContent, /Your school in one place/)
 assert.ok(button('Sign in to portal'))
 await click('Next')
 assert.match(intro.textContent, /Keep track of learning/)
 await click('Next')
 assert.match(intro.textContent, /Keep families informed/)
 await click(document.querySelector('[aria-label="Previous introduction step"]'))
 assert.match(intro.textContent, /Keep track of learning/)
 await click('New here? Create an account')
 assert.ok(button('Create account'))
 await click('Back to sign in')
 await click('Forgot password?')
 assert.ok(button('Send reset link'))
 await click('Back to sign in')
 await fill('[name="email"]', 'admin@example.invalid')
 await fill('[name="password"]', 'test-password')
 await click('Sign in to portal')
 assert.match(text(), /Welcome, Test/)
 await unmount()
})
test('phone welcome advances to sign-in and signup explains duplicate accounts', async () => {
 await mount()
 await click(document.querySelector('[aria-label="Sign out"]'))
 const intro = document.querySelector('#school-intro')
 const title = document.querySelector('h1')
 const card = title.closest('[data-slot="card"]')
 assert.ok(card.classList.contains('hidden'))
 await click(document.querySelector('[aria-label="Next: continue to sign in"]'))
 assert.ok(!card.classList.contains('hidden'))
 assert.ok(intro.classList.contains('hidden'))
 assert.equal(document.activeElement, title)

 const auth = globalThis.__schoolClient.auth
 try {
  await click('New here? Create an account')
  await fill('[name="email"]', 'admin@example.invalid')
  await fill('[name="password"]', 'test-password')
  auth.signUp = async () => ({ error: { code: 'user_already_exists' } })
  await click('Create account')
  assert.match(document.querySelector('[role="alert"]').textContent, /An account already exists/)
  assert.ok(button('Forgot password?'))

  auth.signUp = async () => ({ data: { session: null, user: { identities: [] } }, error: null })
  await click('Create account')
  assert.match(document.querySelector('[role="status"]').textContent, /If this is a new account/)
  assert.match(document.querySelector('[role="status"]').textContent, /Already registered/)
 } finally {
  delete auth.signUp
  await unmount()
 }
})
test('the home page introduces Nilatext and links to sign-in and signup', async () => {
 await mount()
 dom.window.history.replaceState(null, '', '/')
 try {
  await click(document.querySelector('[aria-label="Sign out"]'))
  assert.match(document.querySelector('h1').textContent, /Your school day, in one place/)
  assert.ok(document.querySelector('a[href="/?view=signin"]'))
  assert.ok(document.querySelector('a[href="/?view=signup"]'))
  const preview = document.querySelector('[aria-label="Feature preview"]')
  await click(preview.querySelector('[aria-label="Academic reports"]'))
  assert.match(preview.querySelector('[data-active="true"]').textContent, /Academic reports/)
  assert.equal(preview.querySelector('[aria-label="Academic reports"]').getAttribute('aria-pressed'), 'true')
  assert.ok(preview.querySelector('[aria-label="Play feature rotation"]'))
  await click('Families')
  assert.match(document.querySelector('[aria-live="polite"]').textContent, /Follow your learner/)
 } finally {
  dom.window.history.replaceState(null, '', '/?view=signin')
  await unmount()
 }
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

test('mobile menu closes when navigating or pressing Escape', async () => {
 await mount('teacher')
 const menu = button('Menu')
 assert.equal(menu.getAttribute('aria-expanded'), 'false')
 await click(menu)
 assert.equal(menu.getAttribute('aria-expanded'), 'true')
 await click('Classes')
 assert.equal(menu.getAttribute('aria-expanded'), 'false')
 assert.equal(document.activeElement.tagName, 'MAIN')
 await click(menu)
 await act(async () => {
  button('Classes').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key:'Escape', bubbles:true }))
 })
 assert.equal(menu.getAttribute('aria-expanded'), 'false')
 assert.equal(document.activeElement, menu)
 await unmount()
})

test('sidebar collapses to a rail and keeps the full navigation', async () => {
 await mount()
 const sidebar = document.querySelector('#pane-navigation')
 assert.match(sidebar.textContent, /School settings/)
 assert.ok(!document.querySelector('#pane-workspace nav'))
 await click(sidebar.querySelector('[aria-label="Minimize sidebar"]'))
 assert.equal(sidebar.closest('.portal-workspace').style.getPropertyValue('--navigation-width'), '72px')
 assert.ok(!document.querySelector('[aria-label="Resize navigation pane"]'))
 await click(sidebar.querySelector('[aria-label="Expand sidebar"]'))
 assert.equal(sidebar.closest('.portal-workspace').style.getPropertyValue('--navigation-width'), '240px')
 await click('School settings')
 assert.equal(document.querySelector('main').getAttribute('aria-label'), 'School settings')
 await unmount()
})

test('a report opens in the right pane on wide screens and returns focus when closed', async () => {
 const previous = dom.window.matchMedia
 dom.window.matchMedia = query => ({ matches: query === '(min-width: 80rem)', addEventListener() {}, removeEventListener() {} })
 try {
  await mount()
  await click('Academic reports')
  const preview = [...document.querySelectorAll('tbody button')].find(button => button.textContent.includes('Preview'))
  preview.focus()
  await click(preview)
  const pane = document.querySelector('#pane-workspace')
  assert.match(pane.textContent, /Learner progress report/)
  assert.equal(document.activeElement.id, 'workspace-detail-title')
  assert.ok(!document.querySelector('[role="dialog"]'))
  await click(pane.querySelector('[aria-label="Close details"]'))
  assert.ok(!pane.querySelector('.portal-detail'))
  assert.equal(document.activeElement, preview)
 } finally {
  dom.window.matchMedia = previous
  await unmount()
 }
})

test('workspace separators resize with the keyboard and enforce pane limits', async () => {
 await mount('teacher')
 const navigation = document.querySelector('[aria-label="Resize navigation pane"]')
 const controls = document.querySelector('[aria-label="Resize term controls pane"]')
 async function press(separator, key) {
  await act(async () => {
   separator.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles:true, cancelable:true }))
  })
 }
 await press(navigation,'ArrowRight')
 assert.equal(navigation.getAttribute('aria-valuenow'),'248')
 await press(controls,'ArrowLeft')
 assert.equal(controls.getAttribute('aria-valuenow'),'256')
 await press(controls,'Home')
 await press(controls,'ArrowRight')
 assert.equal(controls.getAttribute('aria-valuenow'),'208')
 await unmount()
})

test.after(async()=>{await rm(folder,{recursive:true,force:true});dom.window.close()})
