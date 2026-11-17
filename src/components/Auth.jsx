import React,{useState} from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader } from './ui/card'
import { AlertBox } from './ui/feedback'
import {supabase,configured} from '../lib/supabase'
import {friendlyError} from '../lib/domain'
import {Brand,Field,Alert} from './UI'
const introSlides = [
 { title: 'Your school in one place', description: 'Manage learners, classes, and school records from one workspace.' },
 { title: 'Keep track of learning', description: 'Record attendance and marks, then review each learner’s progress for the term.' },
 { title: 'Keep families informed', description: 'Parents can check attendance, academic reports, and fee balances for their linked learners.' },
]

function SchoolIntro() {
 const [step, setStep] = useState(0)
 const slide = introSlides[step]

 return (
  <section id="school-intro" aria-label="About Nilatext" className="relative isolate flex min-h-96 flex-col justify-end overflow-hidden rounded-[1.5rem] bg-[#183522] text-white md:col-start-1 md:row-start-1 md:min-h-[40rem]">
   <img src="/images/nilatext-classroom.webp" alt="" width="1100" height="1375" className="absolute inset-0 -z-20 size-full object-cover object-[center_38%]" />
   <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-[#10291b] via-[#10291b]/85 via-24% to-transparent to-70%" />
   <div className="mt-48 grid gap-4 p-5 sm:p-7 lg:p-9">
    <div aria-live="polite" aria-atomic="true" className="grid gap-1.5">
     <h2 className="max-w-sm text-2xl leading-tight font-semibold tracking-tight lg:text-3xl">{slide.title}</h2>
     <p className="min-h-[3em] max-w-sm text-sm leading-relaxed text-[#e9f3df] sm:text-base">{slide.description}</p>
    </div>
    <div className="flex items-center justify-between gap-4">
     <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${introSlides.length}`} role="img">
      {introSlides.map(({title}, index) => (
       <span key={title} aria-hidden="true" className={index === step ? 'h-1.5 w-6 rounded-full bg-[#d5eea9]' : 'size-1.5 rounded-full bg-white/50'} />
      ))}
     </div>
     <div className="flex items-center gap-2">
      {step > 0 && (
       <Button type="button" size="icon" variant="outline" aria-label="Previous introduction step" className="rounded-full border-white/50 bg-[#193723] text-white hover:bg-[#31543a] hover:text-white" onClick={() => setStep(step - 1)}>
        <ArrowLeft aria-hidden="true" size={17} />
       </Button>
      )}
      <Button type="button" className="rounded-full bg-[#d5eea9] text-[#173322] hover:bg-[#e7f5cf]" onClick={() => setStep((step + 1) % introSlides.length)}>
       {step === introSlides.length - 1 ? 'Start over' : 'Next'} <ArrowRight aria-hidden="true" size={17} />
      </Button>
     </div>
    </div>
   </div>
  </section>
 )
}

export default function Auth({recovery,onRecoveryDone}){const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
async function submit(e){e.preventDefault();setBusy(true);setError('');setNotice('');const f=new FormData(e.currentTarget);try{if(recovery){const {error}=await supabase.auth.updateUser({password:f.get('password')});if(error)throw error;onRecoveryDone();return}if(mode==='login'){const {error}=await supabase.auth.signInWithPassword({email:f.get('email').trim(),password:f.get('password')});if(error)throw error}else if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email:f.get('email').trim(),password:f.get('password'),options:{emailRedirectTo:location.origin}});if(error)throw error;if(!data.session)setNotice('Check your inbox to confirm your email, then return here and sign in.')}else{const {error}=await supabase.auth.resetPasswordForEmail(f.get('email').trim(),{redirectTo:location.origin});if(error)throw error;setNotice('If an account exists, a password reset link has been sent.')}}catch(err){setError(friendlyError(err))}finally{setBusy(false)}}
 const title = recovery ? 'Choose a new password.' : {
  login: 'Welcome to your school.',
  signup: 'Create an account',
  reset: 'Reset your password',
 }[mode]
 const action = recovery ? 'Update password' : {
  login: 'Sign in to portal',
  signup: 'Create account',
  reset: 'Send reset link',
 }[mode]
 function changeMode(next) {
  setMode(next)
  setNotice('')
  setError('')
 }

 return (
  <main className="grid min-h-svh place-items-center bg-[#ebf1e5] p-3 sm:p-6">
   <div className="grid w-full max-w-6xl gap-3 rounded-[2rem] bg-[#dce8d4] p-2.5 sm:p-3 md:grid-cols-[1.08fr_1fr]">
    <Card className="grid min-w-0 content-center gap-6 rounded-[1.5rem] border-0 bg-[#fffefa] py-9 shadow-none [--accent:#e8f0e0] [--input:#bac9b6] [--primary:#275538] [--ring:#47734f] sm:py-12 md:col-start-2 md:row-start-1">
     <div className="mx-auto w-full max-w-sm px-5 sm:px-7">
      <Brand />
     </div>
     <CardHeader className="mx-auto w-full max-w-sm flex-col gap-2 sm:px-7">
      <h1 className="text-3xl leading-tight font-semibold tracking-tight text-[#1c3022] lg:text-4xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{recovery ? 'Enter a new password for your account.' : {
       login: 'Sign in with your school portal account.',
       signup: 'Use the email address your school approved if you’re joining an existing school.',
       reset: 'Enter your email to request a reset link.',
      }[mode]}</p>
     </CardHeader>
     <CardContent className="mx-auto w-full max-w-sm space-y-4 sm:px-7">
      {!configured && <Alert>Add your Supabase project URL and publishable key to .env.local, then restart Vite.</Alert>}
      <form className="space-y-4" onSubmit={submit}>
       <Alert>{error}</Alert>
       {notice && <AlertBox role="status">{notice}</AlertBox>}
       {!recovery && <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@school.ac.ke" required />}
       {(recovery || mode !== 'reset') && <Field key={recovery ? 'recovery' : mode} label={recovery ? 'New password' : 'Password'} name="password" type="password" minLength={!recovery && mode === 'login' ? 1 : 8} autoComplete={!recovery && mode === 'login' ? 'current-password' : 'new-password'} required />}
       <Button className="w-full rounded-lg" disabled={busy || !configured}>{busy ? 'Please wait…' : action}</Button>
      </form>
      {!recovery && (
       <div className="flex flex-wrap items-center justify-between gap-x-2 border-t pt-2">
        <Button variant="link" className="px-0" disabled={busy} onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')}>
         {mode === 'login' ? 'New here? Create an account' : 'Back to sign in'}
        </Button>
        {mode === 'login' && <Button variant="link" className="px-0" disabled={busy} onClick={() => changeMode('reset')}>Forgot password?</Button>}
       </div>
      )}
     </CardContent>
    </Card>
    <SchoolIntro />
   </div>
  </main>
 )
}
export function Onboarding({refresh,signOut}){const [mode,setMode]=useState('join'),[busy,setBusy]=useState(false),[error,setError]=useState('');async function submit(e){e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const {error}=await supabase.rpc(mode==='join'?'nt_accept_invite':'nt_create_school',mode==='join'?{person_name:f.get('name').trim()}:{person_name:f.get('name').trim(),school_name:f.get('school').trim()});if(error)throw error;await refresh()}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}return (
 <main className="mx-auto grid min-h-svh max-w-lg content-center gap-6 p-4">
  <Brand />
  <Card>
   <CardHeader className="flex-col gap-1">
    <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
    <p className="text-sm text-muted-foreground">Join your school or create a workspace you’ll administer.</p>
   </CardHeader>
   <CardContent className="space-y-4">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Workspace setup">
     <Button variant={mode === 'join' ? 'default' : 'outline'} aria-pressed={mode === 'join'} disabled={busy} onClick={() => {setMode('join');setError('')}}>Join my school</Button>
     <Button variant={mode === 'create' ? 'default' : 'outline'} aria-pressed={mode === 'create'} disabled={busy} onClick={() => {setMode('create');setError('')}}>Create a school</Button>
    </div>
    <form className="space-y-4" onSubmit={submit}>
     <Alert>{error}</Alert>
     <Field label="Your full name" name="name" maxLength={100} required />
     {mode === 'create'
      ? <Field label="School name" name="school" minLength={2} maxLength={120} required />
      : <p className="text-sm text-muted-foreground">Use the same email address your administrator approved in People &amp; access.</p>}
     <Button disabled={busy}>{busy ? 'Connecting…' : mode === 'join' ? 'Accept access invitation' : 'Create school workspace'}</Button>
    </form>
    <Button variant="ghost" onClick={signOut}>Sign out</Button>
   </CardContent>
  </Card>
 </main>
)
}
