import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App'
import { NilatextMark } from './components/NilatextMark'
import {Button} from './components/ui/button'
import './styles.css'
class ErrorBoundary extends React.Component{state={error:false};static getDerivedStateFromError(){return {error:true}}render(){return this.state.error?<main className="mx-auto grid min-h-svh max-w-md content-center gap-4 p-6"><h1>Let’s try that again.</h1><p>The screen could not load. Your saved school data is still in Supabase.</p><Button onClick={()=>location.reload()}>Reload portal</Button></main>:this.props.children}}
const drawingDuration = 5000
const revealDuration = 650

function Startup() {
 const [phase, setPhase] = useState('drawing')
 const starting = phase !== 'ready'

 useEffect(() => {
  let revealTimer
  const drawingTimer = window.setTimeout(() => {
   if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setPhase('ready')
    return
   }
   setPhase('revealing')
   revealTimer = window.setTimeout(() => setPhase('ready'), revealDuration)
  }, drawingDuration)

  return () => {
   window.clearTimeout(drawingTimer)
   window.clearTimeout(revealTimer)
  }
 }, [])

 return (
  <>
   <div inert={starting}><App /></div>
   {starting && (
    <div role="status" data-phase={phase} style={{ '--startup-reveal-duration': `${revealDuration}ms` }}
     className="startup-screen fixed inset-0 z-[100] grid place-items-center bg-background">
     {phase === 'drawing' && <NilatextMark draw="startup" className="size-24 text-primary sm:size-28" />}
     <span className="sr-only">Starting Nilatext</span>
    </div>
   )}
  </>
 )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><Startup /></ErrorBoundary></React.StrictMode>)
