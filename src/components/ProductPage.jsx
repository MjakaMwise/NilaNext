import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, BookOpen, CalendarCheck, ChevronDown, ClipboardList, GraduationCap, Pause, Play, ShieldCheck, Users, Wallet } from 'lucide-react'
import { accentStyle } from '../lib/accents'
import { Brand } from './UI'
import HeroGridTrail from './HeroGridTrail'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader } from './ui/card'

const features = [
 { icon: GraduationCap, tone: 'learners', title: 'Learner records', text: 'Manage admissions, class placement and guardian details from one school workspace.' },
 { icon: CalendarCheck, tone: 'attendance', title: 'Timetables and attendance', text: 'Schedule weekly lessons and record attendance for a school day or a specific lesson.' },
 { icon: ClipboardList, tone: 'assignments', title: 'Assignments', text: 'Post instructions and due dates, then review text responses from learners.' },
 { icon: BookOpen, tone: 'reports', title: 'Academic reports', text: 'Record marks, review term progress and print reports to share with families.' },
 { icon: Wallet, tone: 'fees', title: 'Fees and receipts', text: 'Create term invoices, record payments received and see outstanding balances.' },
 { icon: ShieldCheck, tone: 'access', title: 'School-managed access', text: 'Approve accounts by email and assign access based on each person’s role.' },
]

const roles = [
 { name: 'Administrators', tone: 'access', title: 'Run the school workspace', text: 'Set up classes and terms, approve accounts, and manage learner records, reports and fees.' },
 { name: 'Teachers', tone: 'attendance', title: 'Manage your assigned classes', text: 'Open subject rosters, take attendance, post assignments and enter marks.' },
 { name: 'Families', tone: 'reports', title: 'Follow your learner’s progress', text: 'View linked learners’ reports, attendance, assignments, timetables and fee balances.' },
 { name: 'Learners', tone: 'learners', title: 'Keep up with classwork', text: 'Check your timetable and upcoming assignments, submit responses and review your results.' },
]

const questions = [
 ['How do I join my school?', 'Ask your school administrator to approve your email. Create an account with that address, confirm it, then sign in and choose Join my school.'],
 ['Can I create a new school workspace?', 'Yes. Create and confirm your account, then choose Create a school after signing in. You’ll be the administrator for that workspace.'],
 ['Can families pay fees through Nilatext?', 'Nilatext shows term invoices, balances and recorded receipts. Families pay through the school’s usual channels.'],
]

function AccountLink({ signup = false, children, ...props }) {
 return <Button asChild {...props}><a href={signup ? '/?view=signup' : '/?view=signin'}>{children}</a></Button>
}

function FeatureShowcase() {
 const [turn, setTurn] = useState(0)
 const [animate, setAnimate] = useState(true)
 const active = ((turn % features.length) + features.length) % features.length
 const [playing, setPlaying] = useState(true)
 const [visible, setVisible] = useState(!document.hidden)
 const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

 useEffect(() => {
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  const syncMotion = () => setReducedMotion(preference?.matches ?? false)
  const syncVisibility = () => setVisible(!document.hidden)
  preference?.addEventListener('change', syncMotion)
  document.addEventListener('visibilitychange', syncVisibility)
  return () => {
   preference?.removeEventListener('change', syncMotion)
   document.removeEventListener('visibilitychange', syncVisibility)
  }
 }, [])

 useEffect(() => {
  if (!playing || !visible || reducedMotion) return
  const timer = window.setTimeout(() => {
   setAnimate(true)
   setTurn(value => value + 1)
  }, 4500)
  return () => window.clearTimeout(timer)
 }, [turn, playing, visible, reducedMotion])

 function selectFeature(index, event) {
  setPlaying(false)
  setAnimate(event.detail > 0)
  const forward = (index - active + features.length) % features.length
  setTurn(turn + (forward > features.length / 2 ? forward - features.length : forward))
 }

 return (
  <section aria-label="Feature preview" data-animate={animate} className="product-feature-preview grid min-w-0 justify-items-center gap-3">
   <div className="relative grid aspect-square w-full max-w-[min(76vw,22rem)] place-items-center">
    <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full text-[#a5c5dd]">
     <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity=".38" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
    <div aria-hidden="true" className="grid size-28 place-items-center sm:size-36">
     {features.map(({ icon: Icon, title, tone }, index) => {
      return (
       <div key={title} data-current={active === index} style={accentStyle(tone)} className="accent-item product-feature-scene col-start-1 row-start-1 grid size-full place-items-center rounded-full">
        <Icon strokeWidth={1.45} className="size-14 sm:size-18" />
       </div>
      )
     })}
    </div>
    {features.map(({ icon: Icon, title }, index) => (
     <div key={title} className="product-orbit-item pointer-events-none absolute inset-0" style={{ '--orbit-angle': `${(index - turn) * 360 / features.length}deg` }}>
      <Button type="button" variant="ghost" size="icon" aria-label={title} aria-pressed={active === index} onClick={event => selectFeature(index, event)} className="product-orbit-button pointer-events-auto absolute top-[8%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#244860] text-[#dceaf5] hover:bg-[#365d76] hover:text-white aria-pressed:bg-[#d2e7f8] aria-pressed:text-[#142d40]">
       <Icon aria-hidden="true" size={18} />
      </Button>
     </div>
    ))}
   </div>
   <div className="grid min-h-11 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3">
    <h2 data-active="true" className="col-start-2 row-start-1 text-center text-lg font-semibold tracking-tight sm:text-2xl">{features[active].title}</h2>
    {!reducedMotion && (
     <Button type="button" variant="ghost" size="icon" aria-label={playing ? 'Pause feature rotation' : 'Play feature rotation'} onClick={() => setPlaying(!playing)} className="col-start-3 row-start-1 rounded-full text-[#dceaf5] hover:bg-white/10 hover:text-white">
      {playing ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
     </Button>
    )}
   </div>
  </section>
 )
}

export default function ProductPage() {
 const [role, setRole] = useState(0)

 return (
  <div className="product-page bg-background text-foreground">
   <main>
    <section aria-labelledby="product-heading" className="product-hero grid min-h-svh grid-rows-[auto_1fr_auto] text-[#f2f6fa] [--ring:#d2e7f8]">
     <HeroGridTrail />
     <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-8">
      <a href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 [&_.text-muted-foreground]:text-[#d4e4f0] [&_.text-primary]:text-[#f2f6fa]" aria-label="Nilatext home"><Brand /></a>
      <nav aria-label="Product" className="order-last flex w-full flex-wrap gap-x-5 border-t border-white/20 pt-1 text-sm font-medium sm:order-0 sm:w-auto sm:border-0 sm:pt-0">
       <a className="inline-flex min-h-11 items-center hover:underline" href="#features">Features</a>
       <a className="inline-flex min-h-11 items-center hover:underline" href="#roles">Who it’s for</a>
       <a className="inline-flex min-h-11 items-center hover:underline" href="#faq">FAQ</a>
      </nav>
      <AccountLink variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">Sign in</AccountLink>
     </header>

     <div className="mx-auto grid w-full max-w-7xl items-center gap-7 px-5 py-6 sm:px-8 md:grid-cols-[1fr_1fr] lg:gap-14">
      <div className="grid justify-items-start gap-4">
       <h1 id="product-heading" className="max-w-[16ch] text-[clamp(2.5rem,7vw,6rem)] leading-[1.02] font-semibold tracking-[-0.07em] text-balance">Your school day, in one place.</h1>
       <p className="max-w-xl text-base leading-relaxed text-[#dceaf5] sm:text-lg">Manage classes, attendance, assignments, reports and fees in one portal. Give families a clear view of their learner’s progress.</p>
       <AccountLink signup className="mt-2 rounded-full bg-[#d2e7f8] px-5 text-[#142d40] hover:bg-[#e5f0f9]">Create an account <ArrowRight aria-hidden="true" size={17} /></AccountLink>
      </div>
      <FeatureShowcase />
     </div>

     <div className="flex justify-center px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button asChild variant="ghost" size="icon" className="rounded-full border border-white/45 text-white hover:bg-white/10 hover:text-white">
       <a href="#features" aria-label="Explore features"><ArrowDown aria-hidden="true" size={19} /></a>
      </Button>
     </div>
    </section>

    <div className="mx-auto max-w-7xl space-y-16 px-5 py-16 sm:space-y-24 sm:px-8 sm:py-24">
    <section id="features" aria-labelledby="features-heading" className="scroll-mt-6">
     <h2 id="features-heading" className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl">Tools for everyday school work</h2>
     <div className="divide-y border-y">
      {features.map(({ icon: Icon, title, text, tone }, index) => {
       return (
        <article key={title} className="grid gap-5 py-7 sm:grid-cols-2 sm:items-stretch sm:gap-0 sm:py-0">
         <div style={accentStyle(tone)} className={`accent-item grid min-h-36 place-items-center rounded-xl sm:min-h-60 sm:rounded-none ${index % 2 ? 'sm:col-start-2 sm:row-start-1' : ''}`}>
          <Icon aria-hidden="true" strokeWidth={1.35} className="size-16 sm:size-24" />
         </div>
         <div className={`flex min-w-0 flex-col items-start justify-center gap-2 px-2 text-left sm:px-8 sm:py-8 lg:px-12 ${index % 2 ? 'sm:col-start-1 sm:row-start-1' : ''}`}>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p>
         </div>
        </article>
       )
      })}
     </div>
    </section>

    <section id="roles" aria-labelledby="roles-heading" className="grid scroll-mt-6 gap-6 rounded-[2rem] bg-[#e3eef7] p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
     <div>
      <h2 id="roles-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">A workspace for each role</h2>
      <p className="mt-3 max-w-md text-[#3e596c]">Administrators manage access so staff and families see the school records relevant to them.</p>
      <div role="group" aria-label="School roles" className="mt-5 flex flex-wrap gap-2">
       {roles.map(({ name, tone }, index) => (
        <Button key={name} type="button" variant="outline" className="accent-item accent-control" style={accentStyle(tone)} aria-pressed={role === index} onClick={() => setRole(index)}>{name}</Button>
       ))}
      </div>
     </div>
     <Card aria-live="polite" aria-atomic="true" style={accentStyle(roles[role].tone)} className="accent-item min-h-44 justify-center gap-2 shadow-none">
      <CardHeader className="flex-col">
       <Users aria-hidden="true" size={23} />
       <h3 className="text-xl font-semibold">{roles[role].title}</h3>
      </CardHeader>
      <CardContent><CardDescription className="text-current">{roles[role].text}</CardDescription></CardContent>
     </Card>
    </section>

    <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-3xl scroll-mt-6">
     <h2 id="faq-heading" className="mb-5 text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
     <Card className="py-0 shadow-none">
      <CardContent>
       {questions.map(([question, answer]) => (
        <details key={question} className="group border-b py-2 last:border-b-0">
         <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          {question}
          <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-muted-foreground group-open:rotate-180" />
         </summary>
         <p className="px-2 pb-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
        </details>
       ))}
      </CardContent>
     </Card>
    </section>

    <section className="flex flex-wrap items-center justify-between gap-5 rounded-[2rem] bg-[#244860] p-6 text-white sm:p-10">
     <div>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to open your school portal?</h2>
      <p className="mt-2 text-[#e2edf6]">Create a workspace or sign in to join your school.</p>
     </div>
     <div className="flex flex-wrap gap-2">
      <AccountLink signup className="bg-[#d2e7f8] text-[#142d40] hover:bg-[#e5f0f9]">Create an account</AccountLink>
      <AccountLink variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">Sign in <ArrowRight aria-hidden="true" size={17} /></AccountLink>
     </div>
    </section>
    </div>
   </main>
   <footer className="border-t">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-sm sm:px-8">
     <Brand />
     <span className="text-muted-foreground">© {new Date().getFullYear()} Nilatext</span>
    </div>
   </footer>
  </div>
 )
}
