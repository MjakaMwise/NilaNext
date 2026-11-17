import { useState } from 'react'
import { ArrowRight, BookOpen, CalendarCheck, ChevronDown, ClipboardList, GraduationCap, ShieldCheck, Users, Wallet } from 'lucide-react'
import { Brand } from './UI'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

const features = [
 { icon: GraduationCap, title: 'Learner records', text: 'Manage admissions, class placement and guardian details from one school workspace.' },
 { icon: CalendarCheck, title: 'Timetables and attendance', text: 'Schedule weekly lessons and record attendance for a school day or a specific lesson.' },
 { icon: ClipboardList, title: 'Assignments', text: 'Post instructions and due dates, then review text responses from learners.' },
 { icon: BookOpen, title: 'Academic reports', text: 'Record marks, review term progress and print reports to share with families.' },
 { icon: Wallet, title: 'Fees and receipts', text: 'Create term invoices, record payments received and see outstanding balances.' },
 { icon: ShieldCheck, title: 'School-managed access', text: 'Approve accounts by email and assign access based on each person’s role.' },
]

const roles = [
 { name: 'Administrators', title: 'Run the school workspace', text: 'Set up classes and terms, approve accounts, and manage learner records, reports and fees.' },
 { name: 'Teachers', title: 'Manage your assigned classes', text: 'Open subject rosters, take attendance, post assignments and enter marks.' },
 { name: 'Families', title: 'Follow your learner’s progress', text: 'View linked learners’ reports, attendance, assignments, timetables and fee balances.' },
 { name: 'Learners', title: 'Keep up with classwork', text: 'Check your timetable and upcoming assignments, submit responses and review your results.' },
]

const questions = [
 ['How do I join my school?', 'Ask your school administrator to approve your email. Create an account with that address, confirm it, then sign in and choose Join my school.'],
 ['Can I create a new school workspace?', 'Yes. Create and confirm your account, then choose Create a school after signing in. You’ll be the administrator for that workspace.'],
 ['Can families pay fees through Nilatext?', 'Nilatext shows term invoices, balances and recorded receipts. Families pay through the school’s usual channels.'],
]

function AccountLink({ signup = false, children, ...props }) {
 return <Button asChild {...props}><a href={signup ? '/?view=signup' : '/?view=signin'}>{children}</a></Button>
}

export default function ProductPage() {
 const [role, setRole] = useState(0)

 return (
  <div className="product-page bg-[#f6f7ef] text-[#203425] [--accent:#e4edda] [--border:#dce5d5] [--card:#fffefa] [--primary:#285436] [--ring:#47734f]">
   <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
    <a href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4" aria-label="Nilatext home"><Brand /></a>
    <nav aria-label="Product" className="order-last flex w-full flex-wrap gap-x-5 gap-y-1 border-t pt-2 text-sm font-medium sm:order-0 sm:w-auto sm:border-0 sm:pt-0">
     <a className="py-2 hover:underline" href="#features">Features</a>
     <a className="py-2 hover:underline" href="#roles">Who it’s for</a>
     <a className="py-2 hover:underline" href="#faq">FAQ</a>
    </nav>
    <AccountLink variant="outline">Sign in</AccountLink>
   </header>

   <main className="mx-auto max-w-7xl space-y-16 px-5 pb-16 sm:space-y-24 sm:px-8">
    <section aria-labelledby="product-heading" className="grid overflow-hidden rounded-[2rem] bg-[#e5edd9] md:grid-cols-[1.05fr_1fr]">
     <div className="flex flex-col justify-center px-6 py-11 sm:px-10 lg:px-14 lg:py-16">
      <h1 id="product-heading" className="max-w-xl text-[clamp(2.75rem,5.5vw,5.25rem)] leading-[1.02] font-semibold tracking-[-0.07em]">Your school day, in one place.</h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-[#3e5644] sm:text-lg">Manage classes, attendance, assignments, reports and fees in one portal. Give families a clear view of their learner’s progress.</p>
      <div className="mt-7 flex flex-wrap gap-3">
       <AccountLink signup>Create an account <ArrowRight aria-hidden="true" size={17} /></AccountLink>
       <Button asChild variant="outline"><a href="#features">Explore features</a></Button>
      </div>
     </div>
     <img src="/images/nilatext-classroom.webp" width="1100" height="1375" alt="Illustration of a teacher at a laptop in a classroom" fetchPriority="high" className="aspect-[5/4] w-full object-cover object-[center_35%] md:aspect-auto md:h-full md:min-h-[31rem]" />
    </section>

    <section id="features" aria-labelledby="features-heading" className="scroll-mt-6">
     <h2 id="features-heading" className="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl">Tools for everyday school work</h2>
     <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {features.map(({ icon: Icon, title, text }) => (
       <Card key={title} className="gap-3 shadow-none">
        <CardHeader className="flex-col">
         <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><Icon aria-hidden="true" size={20} /></span>
         <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent><CardDescription>{text}</CardDescription></CardContent>
       </Card>
      ))}
     </div>
    </section>

    <section id="roles" aria-labelledby="roles-heading" className="grid scroll-mt-6 gap-6 rounded-[2rem] bg-[#e5edd9] p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
     <div>
      <h2 id="roles-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">A workspace for each role</h2>
      <p className="mt-3 max-w-md text-[#3e5644]">Administrators manage access so staff and families see the school records relevant to them.</p>
      <div role="group" aria-label="School roles" className="mt-5 flex flex-wrap gap-2">
       {roles.map(({ name }, index) => (
        <Button key={name} type="button" variant={role === index ? 'default' : 'outline'} aria-pressed={role === index} onClick={() => setRole(index)}>{name}</Button>
       ))}
      </div>
     </div>
     <Card aria-live="polite" aria-atomic="true" className="min-h-44 justify-center gap-2 shadow-none">
      <CardHeader className="flex-col">
       <Users aria-hidden="true" size={23} className="text-primary" />
       <h3 className="text-xl font-semibold">{roles[role].title}</h3>
      </CardHeader>
      <CardContent><CardDescription>{roles[role].text}</CardDescription></CardContent>
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

    <section className="flex flex-wrap items-center justify-between gap-5 rounded-[2rem] bg-[#244631] p-6 text-white sm:p-10">
     <div>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to open your school portal?</h2>
      <p className="mt-2 text-[#e2efdd]">Create a workspace or sign in to join your school.</p>
     </div>
     <div className="flex flex-wrap gap-2">
      <AccountLink signup className="bg-[#d9edb9] text-[#193923] hover:bg-[#e6f2d2]">Create an account</AccountLink>
      <AccountLink variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">Sign in <ArrowRight aria-hidden="true" size={17} /></AccountLink>
     </div>
    </section>
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
