import { useCallback, useEffect, useState } from 'react'
import { allRows, addRow, editRow, unwrap } from '../lib/api'
import { friendlyError, localDate } from '../lib/domain'
import { supabase } from '../lib/supabase'
import { Alert, Field, Heading, Modal, Panel, Table } from './UI'
import { Button } from './ui/button'
import { Input, NativeSelect, Textarea } from './ui/form-controls'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const statuses = ['Present', 'Absent', 'Late']
const empty = { departments: [], subjects: [], offerings: [], enrolments: [], lessons: [], assignments: [] }
const fields = event => Object.fromEntries(new FormData(event.currentTarget))
const remove = (table, id) => unwrap(supabase.from(table).delete().eq('id', id))

function Select({ label, options, placeholder = 'Select an option', ...props }) {
  return <Field label={label}><NativeSelect {...props}>
    <option value="">{placeholder}</option>
    {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
  </NativeSelect></Field>
}

const formLayout = 'grid max-w-xl gap-3 justify-items-start [&>label]:w-full'

export default function Academics({ page, profile, termId, data, refreshVersion }) {
  const admin = profile.role === 'admin'
  const staff = admin || profile.role === 'teacher'
  const schoolId = profile.school_id
  const [records, setRecords] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [offeringId, setOfferingId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [day, setDay] = useState(localDate)
  const [dialog, setDialog] = useState(null)
  const [assignmentId, setAssignmentId] = useState('')

  const fetchRecords = useCallback(async () => {
    const [departments, subjects, offerings, enrolments, lessons, assignments] = await Promise.all([
      allRows('nt_departments', schoolId),
      allRows('nt_subjects', schoolId),
      allRows('nt_offerings', schoolId, { term_id: termId }),
      ((admin && page === 'Curriculum') || (!staff && page === 'Assignments')) ? allRows('nt_elective_enrolments', schoolId) : [],
      ['Timetable', 'Lesson attendance'].includes(page) ? allRows('nt_lessons', schoolId) : [],
      page === 'Assignments' ? allRows('nt_assignments', schoolId) : [],
    ])
    return { departments, subjects, offerings, enrolments, lessons, assignments }
  }, [admin, page, schoolId, staff, termId])

  useEffect(() => {
    let current = true
    setLoading(true)
    setLoadError('')
    fetchRecords().then(result => {
      if (current) setRecords(result)
    }).catch(problem => {
      if (current) setLoadError(friendlyError(problem))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [fetchRecords, refreshVersion])

  async function save(action, success, close = false) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await action()
      if (close) setDialog(null)
      setMessage(success)
      try {
        setRecords(await fetchRecords())
      } catch (problem) {
        setLoadError(friendlyError(problem))
      }
    } catch (problem) {
      setError(friendlyError(problem))
    } finally {
      setSaving(false)
    }
  }

  function create(table, value, success) {
    return save(() => addRow(table, { ...value, school_id: schoolId }), success)
  }

  const subject = id => records.subjects.find(row => row.id === id)
  const department = id => records.departments.find(row => row.id === id)
  const className = id => data.classes.find(row => row.id === id)?.name || 'Class'
  const offeringName = row => `${className(row.class_id)} · ${subject(row.subject_id)?.name || 'Subject'}`
  const offeringOptions = records.offerings.map(row => [row.id, offeringName(row)])
  const teachers = data.profiles.filter(row => row.role === 'teacher').map(row => [row.user_id, row.display_name])
  const offering = records.offerings.find(row => row.id === offeringId)
  const currentOfferings = new Map(records.offerings.map(row => [row.id, row]))
  const lessons = records.lessons.filter(row => currentOfferings.has(row.offering_id))
    .sort((a, b) => a.weekday - b.weekday || a.starts_at.localeCompare(b.starts_at))
  const lessonName = row => `${row.starts_at.slice(0, 5)} · ${offeringName(currentOfferings.get(row.offering_id))}`
  const dayNumber = new Date(day + 'T12:00:00').getDay() || 7
  const dayLessons = lessons.filter(row => row.weekday === dayNumber)
  const lesson = dayLessons.find(row => row.id === lessonId)
  const assignments = records.assignments.filter(row => currentOfferings.has(row.offering_id))
    .sort((a, b) => a.due_on.localeCompare(b.due_on))

  return <>
    <Heading title={page} subtitle={{
      Curriculum: 'Set up departments and subjects, then assign teachers and enrol learners for this term.',
      'My teaching': 'See the learners you teach in each class and subject.',
      Timetable: 'Weekly lessons for the selected term.',
      'Lesson attendance': 'Open a scheduled lesson to see its register.',
      Assignments: 'Classwork and homework for the selected term.',
    }[page]} />
    <Alert>{loadError || error}</Alert>
    {message && <p role="status">{message}</p>}
    {loading ? <p role="status">Loading academic records…</p> : !loadError && <>
      {page === 'Curriculum' && admin && <>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Departments">
            <form className={formLayout} onSubmit={event => {
              event.preventDefault()
              create('nt_departments', fields(event), 'Department added')
            }}>
              <Field label="Department name"><Input name="name" required maxLength={100} /></Field>
              <Button disabled={saving}>Add department</Button>
            </form>
            <ul className="grid gap-2">
              {records.departments.map(row => <li className="flex items-center justify-between gap-3" key={row.id}>
                <span>{row.name}</span><Button variant="ghost" onClick={() => setDialog({ type: 'department', row })}>Rename</Button>
              </li>)}
            </ul>
          </Panel>
          <Panel title="Subjects">
            <form className={formLayout} onSubmit={event => {
              event.preventDefault()
              create('nt_subjects', fields(event), 'Subject added')
            }}>
              <Field label="Subject name"><Input name="name" required maxLength={100} /></Field>
              <Select label="Department" name="department_id" options={records.departments.map(row => [row.id, row.name])} required />
              <Button disabled={saving}>Add subject</Button>
            </form>
            <ul className="grid gap-2">
              {records.subjects.map(row => <li className="flex items-center justify-between gap-3" key={row.id}>
                <span>{row.name} · {department(row.department_id)?.name}</span>
                <Button variant="ghost" onClick={() => setDialog({ type: 'subject', row })}>Rename</Button>
              </li>)}
            </ul>
          </Panel>
        </div>
        <Panel title="Class subjects">
          <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5" onSubmit={event => {
            event.preventDefault()
            const value = fields(event)
            create('nt_offerings', { ...value, term_id: termId, elective: value.elective === 'true', teacher_id: value.teacher_id || null }, 'Class subject added')
          }}>
            <Select label="Class" name="class_id" options={data.classes.map(row => [row.id, row.name])} required />
            <Select label="Subject" name="subject_id" options={records.subjects.map(row => [row.id, row.name])} required />
            <Select label="Subject teacher" name="teacher_id" options={teachers} placeholder="Unassigned" />
            <Field label="Enrolment"><NativeSelect name="elective"><option value="false">Whole class</option><option value="true">Elective</option></NativeSelect></Field>
            <Button disabled={saving || !termId}>Add to class</Button>
          </form>
          <Table headers={['Class and subject', 'Enrolment', 'Teacher', 'Roster']} empty={!records.offerings.length}>
            {records.offerings.map(row => <tr key={row.id}>
              <td>{offeringName(row)}</td><td>{row.elective ? 'Elective' : 'Whole class'}</td>
              <td>
                {teachers.find(([id]) => id === row.teacher_id)?.[1] || 'Unassigned'}
                <Button variant="ghost" onClick={() => setDialog({ type: 'teacher', row })}>Change</Button>
              </td>
              <td><Button variant="outline" onClick={() => setOfferingId(row.id)}>Open roster</Button></td>
            </tr>)}
          </Table>
        </Panel>
      </>}
      {page === 'My teaching' && staff && <Panel title="Subject assignments">
        <Select label="Class and subject" value={offeringId} onChange={event => setOfferingId(event.target.value)} options={offeringOptions} />
        {!records.offerings.length && <p>No subject teaching assignments for this term.</p>}
      </Panel>}
      {offering && ['Curriculum', 'My teaching'].includes(page) && <Panel title={offeringName(offering)}
        subtitle={offering.elective ? 'Elective · selected learners' : 'Whole class · all active learners'}>
        {admin && offering.elective && <form className={formLayout} onSubmit={event => {
          event.preventDefault()
          create('nt_elective_enrolments', { ...fields(event), offering_id: offering.id }, 'Learner enrolled')
        }}>
          <Select label="Learner to enrol" name="student_id" required options={data.students.filter(row =>
            row.class_id === offering.class_id && row.active &&
            !records.enrolments.some(entry => entry.offering_id === offering.id && entry.student_id === row.id)
          ).map(row => [row.id, `${row.full_name} (${row.admission_no})`])} />
          <Button disabled={saving}>Enrol learner</Button>
        </form>}
        <Roster key={offering.id} offeringId={offering.id} refreshVersion={records}
          onRemove={admin && page === 'Curriculum' && offering.elective ? learner => {
            const entry = records.enrolments.find(row => row.offering_id === offering.id && row.student_id === learner.id)
            if (entry) setDialog({ type: 'remove learner', row: entry, label: learner.full_name })
          } : undefined} />
      </Panel>}
      {page === 'Timetable' && <Panel title="Weekly timetable" action={admin && <Button disabled={!offeringOptions.length}
        onClick={() => setDialog({ type: 'lesson' })}>Add lesson</Button>}>
        <Table headers={['Day', 'Time', 'Class and subject', 'Room', ...(admin ? ['Actions'] : [])]} empty={!lessons.length}>
          {lessons.map(row => <tr key={row.id}>
            <td>{weekdays[row.weekday - 1]}</td><td>{row.starts_at.slice(0, 5)}–{row.ends_at.slice(0, 5)}</td>
            <td>{offeringName(currentOfferings.get(row.offering_id))}</td><td>{row.room || '—'}</td>
            {admin && <td>
              <Button variant="ghost" onClick={() => setDialog({ type: 'lesson', row })}>Edit</Button>
              <Button variant="ghost" onClick={() => setDialog({ type: 'remove lesson', row, label: lessonName(row) })}>Remove</Button>
            </td>}
          </tr>)}
        </Table>
      </Panel>}
      {page === 'Lesson attendance' && <Panel title="Lesson register">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date"><Input type="date" value={day} onChange={event => {
            if (event.target.value) setDay(event.target.value)
          }} /></Field>
          <Select label="Scheduled lesson" value={lesson?.id || ''} onChange={event => setLessonId(event.target.value)}
            options={dayLessons.map(row => [row.id, lessonName(row)])} />
        </div>
        {!dayLessons.length && <p>No lessons scheduled for this weekday.</p>}
        {lesson && <LessonRegister key={lesson.id + day} lesson={lesson} day={day} staff={staff}
          schoolId={schoolId} students={data.students} />}
      </Panel>}
      {page === 'Assignments' && <Panel title="Assignments" action={staff && <Button disabled={!offeringOptions.length}
        onClick={() => setDialog({ type: 'assignment' })}>New assignment</Button>}>
        {!assignments.length && <p>No assignments for this term.</p>}
        <div className="grid gap-3">
          {assignments.map(row => <article className="grid gap-2 rounded-lg border p-4" key={row.id}>
            <h2 className="font-semibold">{row.title}</h2>
            <p className="text-sm text-muted-foreground">{offeringName(currentOfferings.get(row.offering_id))} · Due {row.due_on}</p>
            <p className="whitespace-pre-wrap break-words">{row.instructions}</p>
            <Button variant="outline" className="w-fit" aria-expanded={assignmentId === row.id}
              onClick={() => setAssignmentId(assignmentId === row.id ? '' : row.id)}>
              {assignmentId === row.id ? 'Hide responses' : 'View responses'}
            </Button>
            {assignmentId === row.id && <AssignmentResponses key={row.id} assignment={row}
              offering={currentOfferings.get(row.offering_id)} profile={profile} students={data.students} enrolments={records.enrolments} staff={staff} />}
            {staff && <div>
              <Button variant="ghost" onClick={() => setDialog({ type: 'assignment', row })}>Edit</Button>
              <Button variant="ghost" onClick={() => setDialog({ type: 'remove assignment', row, label: row.title })}>Delete</Button>
            </div>}
          </article>)}
        </div>
      </Panel>}
    </>}
    {dialog && <AcademicDialog dialog={dialog} close={() => { setDialog(null); setError('') }} error={error} saving={saving}
      save={save} schoolId={schoolId} offeringOptions={offeringOptions} teachers={teachers} />}
  </>
}

function AcademicDialog({ dialog, close, error, saving, save, schoolId, offeringOptions, teachers }) {
  const { type, row } = dialog
  const deletion = {
    'remove learner': 'nt_elective_enrolments',
    'remove lesson': 'nt_lessons',
    'remove assignment': 'nt_assignments',
  }[type]
  const titles = {
    department: 'Rename department', subject: 'Rename subject', teacher: 'Assign subject teacher',
    lesson: row ? 'Edit lesson' : 'Add lesson', assignment: row ? 'Edit assignment' : 'New assignment',
    'remove learner': 'Remove elective enrolment', 'remove lesson': 'Remove lesson', 'remove assignment': 'Delete assignment',
  }
  function submit(event) {
    event.preventDefault()
    const value = fields(event)
    if (deletion) return save(() => remove(deletion, row.id), 'Removed', true)
    if (type === 'teacher') value.teacher_id ||= null
    const table = {
      department: 'nt_departments', subject: 'nt_subjects', teacher: 'nt_offerings',
      lesson: 'nt_lessons', assignment: 'nt_assignments',
    }[type]
    return save(() => row ? editRow(table, row.id, value) : addRow(table, { ...value, school_id: schoolId }), 'Saved', true)
  }
  return <Modal title={titles[type]} onClose={close}>
    <form className={formLayout} onSubmit={submit}>
      <Alert>{error}</Alert>
      {deletion && <p>Remove {dialog.label}?</p>}
      {['department', 'subject'].includes(type) && <Field label="Name"><Input name="name" required maxLength={100} defaultValue={row.name} /></Field>}
      {type === 'teacher' && <Select label="Teacher" name="teacher_id" options={teachers} defaultValue={row.teacher_id || ''} placeholder="Unassigned" />}
      {['lesson', 'assignment'].includes(type) && !row && <Select label="Class and subject" name="offering_id" required options={offeringOptions} />}
      {type === 'lesson' && <>
        <Select label="Weekday" name="weekday" required options={weekdays.map((label, index) => [index + 1, label])} defaultValue={row?.weekday} />
        <Field label="Start time"><Input type="time" name="starts_at" required defaultValue={row?.starts_at} /></Field>
        <Field label="End time"><Input type="time" name="ends_at" required defaultValue={row?.ends_at} /></Field>
        <Field label="Room"><Input name="room" maxLength={100} defaultValue={row?.room} /></Field>
      </>}
      {type === 'assignment' && <>
        <Field label="Title"><Input name="title" required maxLength={150} defaultValue={row?.title} /></Field>
        <Field label="Instructions"><Textarea name="instructions" required maxLength={10000} defaultValue={row?.instructions} /></Field>
        <Field label="Due date"><Input type="date" name="due_on" required defaultValue={row?.due_on} /></Field>
      </>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={saving} onClick={close}>Cancel</Button>
        <Button variant={deletion ? 'destructive' : 'default'} disabled={saving}>{saving ? 'Saving…' : deletion ? 'Remove' : 'Save'}</Button>
      </div>
    </form>
  </Modal>
}

async function readRoster(oid) {
  const roster = []
  for (let offset = 0; ; offset += 1000) {
    const rows = await unwrap(supabase.rpc('nt_offering_roster', { oid }).range(offset, offset + 999))
    roster.push(...rows)
    if (rows.length < 1000) return roster
  }
}

function Roster({ offeringId, refreshVersion, onRemove }) {
  const [students, setStudents] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let current = true
    readRoster(offeringId).then(rows => {
      if (current) { setStudents(rows); setError('') }
    }).catch(problem => { if (current) setError(friendlyError(problem)) })
    return () => { current = false }
  }, [offeringId, refreshVersion])
  if (error) return <Alert>{error}</Alert>
  if (!students) return <p role="status">Loading roster…</p>
  return <Table headers={['Learner', 'Admission number', ...(onRemove ? ['Actions'] : [])]} empty={!students.length}>
    {students.map(row => <tr key={row.id}><td>{row.full_name}</td><td>{row.admission_no}</td>
      {onRemove && <td><Button variant="ghost" onClick={() => onRemove(row)}>Remove</Button></td>}
    </tr>)}
  </Table>
}

function LessonRegister({ lesson, day, staff, schoolId, students }) {
  const [register, setRegister] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    let current = true
    Promise.all([
      allRows('nt_lesson_attendance', schoolId, { lesson_id: lesson.id, day }),
      staff ? readRoster(lesson.offering_id) : [],
    ]).then(([rows, roster]) => {
      if (!current) return
      setRegister(staff ? roster : students.filter(student => rows.some(row => row.student_id === student.id)))
      setDraft(Object.fromEntries(rows.map(row => [row.student_id, row.status])))
    }).catch(problem => { if (current) setError(friendlyError(problem)) })
    return () => { current = false }
  }, [lesson, day, schoolId, staff, students])
  async function save(event) {
    event.preventDefault()
    const rows = register.filter(student => draft[student.id]).map(student => ({
      school_id: schoolId, lesson_id: lesson.id, student_id: student.id, day, status: draft[student.id],
    }))
    if (!rows.length) return
    setSaving(true)
    setError('')
    try {
      await unwrap(supabase.from('nt_lesson_attendance').upsert(rows, { onConflict: 'lesson_id,day,student_id' }))
      setSaved(true)
    } catch (problem) {
      setError(friendlyError(problem))
    } finally {
      setSaving(false)
    }
  }
  return <form className="grid gap-3" onSubmit={save}>
    <Alert>{error}</Alert>
    {saved && <p role="status">Register saved.</p>}
    {!register ? !error && <p role="status">Loading register…</p> : <>
      <Table headers={['Learner', 'Status']} empty={!register.length}>
        {register.map(row => <tr key={row.id}><td>{row.full_name}</td><td>{staff ?
          <NativeSelect aria-label={`Attendance for ${row.full_name}`} value={draft[row.id] || ''} disabled={saving}
            onChange={event => { setSaved(false); setDraft({ ...draft, [row.id]: event.target.value }) }}>
            <option value="" disabled>Unmarked</option>
            {statuses.map(status => <option key={status}>{status}</option>)}
          </NativeSelect> : draft[row.id]}</td></tr>)}
      </Table>
      {staff && <div><Button disabled={saving || !register.some(row => draft[row.id])}>Save register</Button></div>}
    </>}
  </form>
}

function AssignmentResponses({ assignment, offering, profile, students, enrolments, staff }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let current = true
    Promise.all([
      allRows('nt_assignment_submissions', profile.school_id, { assignment_id: assignment.id }),
      staff ? readRoster(offering.id) : [],
    ]).then(([responses, roster]) => {
      if (current) setResult({ responses, roster })
    }).catch(problem => { if (current) setError(friendlyError(problem)) })
    return () => { current = false }
  }, [assignment.id, offering.id, profile.school_id, staff, reload])

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addRow('nt_assignment_submissions', {
        ...fields(event), school_id: profile.school_id, assignment_id: assignment.id,
      })
      setResult(null)
      setReload(value => value + 1)
    } catch (problem) {
      setError(friendlyError(problem))
    } finally {
      setSaving(false)
    }
  }

  const candidates = students.filter(row => row.active && row.class_id === offering.class_id &&
    (!offering.elective || enrolments.some(entry => entry.offering_id === offering.id && entry.student_id === row.id)) &&
    !result?.responses.some(response => response.student_id === row.id))
  const name = id => [...(result?.roster || []), ...students].find(row => row.id === id)?.full_name || 'Former roster member'
  return <div className="grid gap-3 border-t pt-3">
    <Alert>{error}</Alert>
    {!result ? !error && <p role="status">Loading responses…</p> : <>
      {staff && <p>{result.roster.filter(learner => result.responses.some(row => row.student_id === learner.id)).length} of {result.roster.length} current learners submitted</p>}
      {!result.responses.length && <p>No responses yet.</p>}
      {result.responses.map(row => <div key={row.id} className="rounded-lg border p-3">
        <b>{name(row.student_id)}</b>
        <p className="whitespace-pre-wrap break-words">{row.response}</p>
      </div>)}
      {profile.role === 'student' && candidates.length > 0 && <form className={formLayout} onSubmit={submit}>
        <Select label="Learner" name="student_id" options={candidates.map(row => [row.id, row.full_name])}
          defaultValue={candidates.length === 1 ? candidates[0].id : ''} required />
        <Field label="Your response"><Textarea name="response" required maxLength={10000} /></Field>
        <Button disabled={saving}>{saving ? 'Submitting…' : 'Submit response'}</Button>
      </form>}
    </>}
  </div>
}
