import React,{useState} from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader } from './ui/card'
import { AlertBox } from './ui/feedback'
import {supabase,configured} from '../lib/supabase'
import {friendlyError} from '../lib/domain'
import {Brand,Field,Alert} from './UI'
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
  <main className="grid min-h-svh place-items-center px-4 py-10">
   <div className="grid w-full max-w-md gap-6">
    <Brand />
    <Card>
     <CardHeader className="flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{recovery ? 'Enter a new password for your account.' : {
       login: 'Sign in with your school portal account.',
       signup: 'Use the email address your school approved if you’re joining an existing school.',
       reset: 'Enter your email to request a reset link.',
      }[mode]}</p>
     </CardHeader>
     <CardContent className="space-y-4">
      {!configured && <Alert>Add your Supabase project URL and publishable key to .env.local, then restart Vite.</Alert>}
      <form className="space-y-4" onSubmit={submit}>
       <Alert>{error}</Alert>
       {notice && <AlertBox role="status">{notice}</AlertBox>}
       {!recovery && <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@school.ac.ke" required />}
       {(recovery || mode !== 'reset') && <Field key={recovery ? 'recovery' : mode} label={recovery ? 'New password' : 'Password'} name="password" type="password" minLength={!recovery && mode === 'login' ? 1 : 8} autoComplete={!recovery && mode === 'login' ? 'current-password' : 'new-password'} required />}
       <Button className="w-full" disabled={busy || !configured}>{busy ? 'Please wait…' : action}</Button>
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
