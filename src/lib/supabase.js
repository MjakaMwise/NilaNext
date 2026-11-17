import { GoTrueClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'

const url=import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/,'')
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const configured=Boolean(url&&key&&!url.includes('YOUR_PROJECT'))

// Use only Supabase's official Auth and Data API modules. Storage and Realtime
// are not needed by this application. No privileged secret is used in the browser.
function createSchoolClient(){
 const auth=new GoTrueClient({
  url:`${url}/auth/v1`,headers:{apikey:key},
  storageKey:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
  persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'
 })
 const rest=new PostgrestClient(`${url}/rest/v1`,{
  headers:{apikey:key},
  fetch:async(input,init={})=>{
   const {data,error}=await auth.getSession()
   if(error)throw error
   const headers=new Headers(init.headers)
   headers.set('apikey',key)
   if(data.session?.access_token)headers.set('Authorization',`Bearer ${data.session.access_token}`)
   return fetch(input,{...init,headers})
  }
 })
 return {auth,from:table=>rest.from(table),rpc:(name,args)=>rest.rpc(name,args)}
}
export const supabase=configured?createSchoolClient():null
