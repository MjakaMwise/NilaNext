import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './App'
import {Button} from './components/ui/button'
import './styles.css'
class ErrorBoundary extends React.Component{state={error:false};static getDerivedStateFromError(){return {error:true}}render(){return this.state.error?<main className="mx-auto grid min-h-svh max-w-md content-center gap-4 p-6"><h1>Let’s try that again.</h1><p>The screen could not load. Your saved school data is still in Supabase.</p><Button onClick={()=>location.reload()}>Reload portal</Button></main>:this.props.children}}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>)
