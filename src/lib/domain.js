export const SUBJECTS=['Mathematics','English','Integrated Science','Kiswahili','Humanities']
export const ROLES={admin:'Administrator',teacher:'Teacher',parent:'Parent / Guardian',student:'Student'}
export const money=n=>new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:2}).format(Number(n)||0)
export function localDate(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
export function average(marks){return marks.length?Math.round(marks.reduce((a,m)=>a+Number(m.score),0)/marks.length*10)/10:null}
export function progress(n){return n===null?'Not assessed':n>=80?'On track':n>=65?'Building':'Needs support'}
export function balance(invoice,payments){return Math.round((Number(invoice.amount)-payments.filter(p=>p.invoice_id===invoice.id).reduce((a,p)=>a+Number(p.amount),0))*100)/100}
export function validPayment(amount,outstanding){const n=Number(amount);return Number.isFinite(n)&&n>0&&n<=outstanding&&Math.abs(n*100-Math.round(n*100))<1e-6}
export function csvCell(value){let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export function toCSV(rows){return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')}
export function downloadCSV(name,rows){const url=URL.createObjectURL(new Blob([toCSV(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function permittedPages(role){return role==='admin'?['Overview','Students','Classes','Academic reports','Attendance','Fees','People & access','School settings']:role==='teacher'?['Overview','Students','Classes','Academic reports','Attendance']:['Overview','Academic reports','Attendance','Fees']}
export function friendlyError(error){if(error?.code==='23505')return 'That record already exists. Check admission numbers, class names, or payment references.';if(error?.code==='42501')return 'Your account does not have permission for this action.';if(error?.message?.includes('Failed to fetch'))return 'Could not reach the school database. Check your connection and try again.';return error?.message||'Something went wrong. Please try again.'}
