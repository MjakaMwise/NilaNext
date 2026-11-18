import {supabase} from './supabase'
export async function unwrap(query){const {data,error}=await query;if(error)throw error;return data}
export async function allRows(table,schoolId,filters={}){
 const ordering=table==='nt_profiles'?['user_id']:table==='nt_marks'?['student_id','term_id','subject']:table==='nt_attendance'?['student_id','day']:table==='nt_student_links'?['student_id','user_id']:['id']
 let rows=[]
 for(let offset=0;;offset+=1000){
  let q=supabase.from(table).select('*').eq('school_id',schoolId)
  for(const key of ordering)q=q.order(key)
  for(const [key,value]of Object.entries(filters))q=q.eq(key,value)
  const chunk=await unwrap(q.range(offset,offset+999));rows.push(...chunk)
  if(chunk.length<1000)return rows
 }
}
export const addRow=(table,value)=>unwrap(supabase.from(table).insert(value).select().single())
export const editRow=(table,id,value)=>unwrap(supabase.from(table).update(value).eq('id',id).select().single())

export async function readRoster(oid) {
  const roster = []
  for (let offset = 0; ; offset += 1000) {
    const rows = await unwrap(supabase.rpc('nt_offering_roster', { oid }).range(offset, offset + 999))
    roster.push(...rows)
    if (rows.length < 1000) return roster
  }
}
