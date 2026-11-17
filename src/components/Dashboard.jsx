import React,{useState} from 'react'
import {Users,GraduationCap,CalendarCheck,Wallet,BookOpen,Bell,FileText,ChevronLeft,ChevronRight,ArrowUpRight,School,ClipboardCheck} from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Panel, Stat } from './UI'
import {localDate,ROLES} from '../lib/domain'

function Calendar({selected,onSelect}){
 const [month,setMonth]=useState(()=>{const date=new Date();return new Date(date.getFullYear(),date.getMonth(),1)})
 const year=month.getFullYear(),index=month.getMonth(),days=new Date(year,index+1,0).getDate(),offset=(new Date(year,index,1).getDay()+6)%7
 const label=month.toLocaleDateString('en-KE',{month:'long',year:'numeric'})
 function move(delta){setMonth(new Date(year,index+delta,1))}
 return (
  <Panel title="Calendar" subtitle="Select a day to open its attendance register.">
   <div className="flex items-center justify-between">
    <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={16} /></Button>
    <span className="text-sm font-medium" aria-live="polite">{label}</span>
    <Button variant="outline" size="icon" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={16} /></Button>
   </div>
   <div className="grid grid-cols-6 gap-1">
    {Array.from({length:12}, (_, i) => {
     const date = new Date(year, i)
     return <Button key={i} size="sm" variant={i === index ? 'secondary' : 'ghost'} className="px-0 text-xs" aria-label={date.toLocaleDateString('en-KE',{month:'long',year:'numeric'})} aria-pressed={i === index} onClick={() => setMonth(date)}>{date.toLocaleDateString('en-KE',{month:'short'})}</Button>
    })}
   </div>
   <div className="grid grid-cols-7 gap-1 text-center">
    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d} className="py-1 text-xs text-muted-foreground">{d}</span>)}
    {Array.from({length:offset}, (_, i) => <span key={i}/>)}
    {Array.from({length:days}, (_, i) => {
     const date = [year, String(index+1).padStart(2,'0'), String(i+1).padStart(2,'0')].join('-')
     const today = date === localDate()
     return <Button key={date} variant={date === selected ? 'default' : today ? 'outline' : 'ghost'} className="px-0 tabular-nums" aria-label={`View attendance for ${date}`} aria-current={today ? 'date' : undefined} aria-pressed={date === selected} onClick={() => onSelect(date)}>{i+1}</Button>
    })}
   </div>
   <Button variant="link" size="sm" className="px-0" onClick={() => {const d=new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1))}}>This month</Button>
  </Panel>
 )
}

export default function Dashboard({profile,termLabel,data,mean,attendanceRate,day,needSupport,navigate,setModal,setDay,learnerTable}){
 const admin=profile.role==='admin',staff=admin||profile.role==='teacher'
 const shortcuts=admin?[
  ['Add staff',Users,()=>setModal({type:'invite'})],['Add student',GraduationCap,()=>setModal({type:'student'})],['Take attendance',CalendarCheck,()=>navigate('Attendance')],['Collect fees',Wallet,()=>navigate('Fees')],['Add class',BookOpen,()=>setModal({type:'class'})],['Academic reports',FileText,()=>navigate('Academic reports')]
 ]:staff?[
  ['My learners',GraduationCap,()=>navigate('Students')],['Take attendance',CalendarCheck,()=>navigate('Attendance')],['Enter marks',ClipboardCheck,()=>navigate('Academic reports')],['My classes',BookOpen,()=>navigate('Classes')]
 ]:[['Progress reports',GraduationCap,()=>navigate('Academic reports')],['Attendance',CalendarCheck,()=>navigate('Attendance')],['School fees',Wallet,()=>navigate('Fees')]]
 const pending=data.invites.filter(i=>!i.accepted_at).length,staffCount=data.profiles.filter(p=>['admin','teacher'].includes(p.role)).length
 const classes=admin?data.classes:data.classes.filter(c=>c.teacher_id===profile.user_id)
 return (
  <div className="space-y-6">
   <div>
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, {profile.display_name.split(' ')[0]}.</h1>
    <p className="mt-1 text-sm text-muted-foreground">{ROLES[profile.role]} workspace · {termLabel}</p>
   </div>
   <Panel title="Quick actions">
    <section aria-label="School quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
     {shortcuts.map(([label,Icon,action]) => (
      <Button key={label} variant="outline" className="justify-start px-2 text-left whitespace-normal sm:px-3" onClick={action}>
       <Icon size={17} className="text-primary" />{label}
      </Button>
     ))}
    </section>
   </Panel>
   <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="School totals">
    {staff?<><Stat label="TOTAL CLASSES" value={classes.length} detail={admin?'School classes':'Assigned to you'} icon={School} onClick={()=>navigate('Classes')}/><Stat label="TOTAL STUDENTS" value={data.students.length} detail="Learners you can access" icon={GraduationCap} onClick={()=>navigate('Students')}/>{admin?<><Stat label="TOTAL STAFF" value={staffCount} detail="Registered administrators & teachers" icon={Users} onClick={()=>navigate('People & access')}/><Stat label="PENDING ACCESS" value={pending} detail="Approved invitations awaiting acceptance" icon={ClipboardCheck} onClick={()=>navigate('People & access')}/></>:<><Stat label="LEARNER AVERAGE" value={mean===null?'—':mean+'%'} detail="From recorded subjects" icon={FileText} onClick={()=>navigate('Academic reports')}/><Stat label="NEED A CHECK-IN" value={needSupport} detail="Below 65% average · illustrative" icon={Users} onClick={()=>navigate('Academic reports')}/></>}</>:<><Stat label="LINKED LEARNERS" value={data.students.length} detail="Linked to your account" icon={Users} onClick={()=>navigate('Academic reports')}/><Stat label="ACADEMIC AVERAGE" value={mean===null?'—':mean+'%'} detail="From recorded subjects" icon={GraduationCap} onClick={()=>navigate('Academic reports')}/><Stat label="ATTENDANCE" value={day===localDate()&&attendanceRate!==null?attendanceRate+'%':'—'} detail={day===localDate()?'Today’s saved register':'Open the attendance register'} icon={CalendarCheck} onClick={()=>navigate('Attendance')}/></>}
   </section>
   <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <Calendar selected={day} onSelect={date => {setDay(date);navigate('Attendance')}} />
    {staff ? (
     <Panel title="Notice board" subtitle="Visible to administrators and teachers" action={<Button variant="outline" size="sm" onClick={() => setModal({type:'note'})}><Bell size={15} /> Add notice</Button>}>
      {data.notes.length ? <div className="grid gap-2">
       {data.notes.slice(0,4).map(n => (
        <Card key={n.id} className="gap-1 bg-muted/50 p-3 shadow-none">
         <h3 className="break-words text-sm font-medium">{n.body.split('\n')[0]}</h3>
         {n.body.includes('\n') && <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{n.body.split('\n').slice(1).join('\n')}</p>}
         <time className="text-xs text-muted-foreground" dateTime={n.created_at}>{new Date(n.created_at).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}</time>
        </Card>
       ))}
      </div> : <p className="py-6 text-center text-sm text-muted-foreground">No school notices yet.</p>}
     </Panel>
    ) : (
     <Panel title="Term progress">
      <p className="text-sm text-muted-foreground">Review subject results for the learners linked to your account.</p>
      <Button variant="outline" onClick={() => navigate('Academic reports')}>View progress reports <ArrowUpRight size={15} /></Button>
     </Panel>
    )}
   </div>
   <Panel title="Learner progress" action={<Button variant="ghost" size="sm" onClick={() => navigate('Academic reports')}>View all reports <ArrowUpRight size={16} /></Button>}>
    {learnerTable(data.students.slice(0,5))}
   </Panel>
  </div>
 )
}
