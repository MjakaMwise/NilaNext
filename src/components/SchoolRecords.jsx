import { useEffect, useState } from 'react'
import { allRows, addRow, readRoster } from '../lib/api'
import { friendlyError } from '../lib/domain'
import {
  classIdentity, downloadSchoolTemplate, identityHeaders, paymentHeaders, prepareSchoolRows, resultHeaders,
} from '../lib/roster-template'
import { Alert, Field, Modal, Panel, Table } from './UI'
import { Button } from './ui/button'
import { NativeSelect } from './ui/form-controls'

function Choice({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <NativeSelect value={value} onChange={event => onChange(event.target.value)}>
        <option value="">Choose {label.toLowerCase()}</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </NativeSelect>
    </Field>
  )
}

function TermChoices({ terms, year, termId, setYear, setTermId }) {
  const years = [...new Set(terms.map(term => term.year))]
  return (
    <>
      <Choice label="Academic year" value={year} onChange={setYear} options={years.map(value => [String(value), value])} />
      <Choice label="Term" value={termId} onChange={setTermId} options={terms.filter(term => String(term.year) === year).map(term => [term.id, `Term ${term.number}`])} />
    </>
  )
}

export function AssessmentSetup({ schoolId, terms, currentTerm }) {
  const [year, setYear] = useState(String(currentTerm?.year ?? ''))
  const [termId, setTermId] = useState(currentTerm?.id ?? '')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!termId) return
    let active = true
    allRows('nt_assessments', schoolId, { term_id: termId }).then(
      result => { if (active) setRows(result.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))) },
      cause => { if (active) setError(friendlyError(cause)) },
    )
    return () => { active = false }
  }, [schoolId, termId])

  function selectTerm(value) {
    setRows(null)
    setError('')
    setTermId(value)
  }

  async function addAssessment(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setError('')
    setSaving(true)
    try {
      const created = await addRow('nt_assessments', {
        school_id: schoolId, term_id: termId, name: values.get('name').trim(), sort_order: Number(values.get('order')),
      })
      setRows(previous => [...previous, created].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)))
      form.reset()
    } catch (cause) {
      setError(friendlyError(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="Assessments by year and term" subtitle="Add your school’s CATs and final exams in the order teachers should see them.">
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
        <TermChoices terms={terms} year={year} termId={termId} setYear={value => { setYear(value); selectTerm('') }} setTermId={selectTerm} />
      </fieldset>
      <Alert>{error}</Alert>
      {termId && (rows ? (
        <>
          <Table headers={['Order', 'Assessment']} empty={!rows.length}>
            {rows.map(row => <tr key={row.id}><td>{row.sort_order}</td><td>{row.name}</td></tr>)}
          </Table>
          <form className="grid items-end gap-2 sm:grid-cols-[1fr_7rem_auto]" onSubmit={addAssessment}>
            <Field label="Assessment name" name="name" placeholder="CAT 1" maxLength={60} required />
            <Field label="Order" name="order" type="number" min={1} defaultValue={(rows.at(-1)?.sort_order ?? 0) + 1} required />
            <Button disabled={saving}>Add assessment</Button>
          </form>
        </>
      ) : !error && <p role="status">Loading assessments…</p>)}
    </Panel>
  )
}

export function AssessmentReport({ schoolId, termId, studentId }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      setRows([])
      setError('')
      try {
        const results = await allRows('nt_assessment_results', schoolId, { term_id: termId, student_id: studentId })
        if (!active || !results.length) return
        const [assessments, offerings, subjects] = await Promise.all([
          allRows('nt_assessments', schoolId, { term_id: termId }),
          allRows('nt_offerings', schoolId, { term_id: termId }),
          allRows('nt_subjects', schoolId),
        ])
        const assessmentById = new Map(assessments.map(item => [item.id, item]))
        const subjectById = new Map(subjects.map(item => [item.id, item.name]))
        const subjectByOffering = new Map(offerings.map(item => [item.id, subjectById.get(item.subject_id)]))
        if (active) setRows(results.map(item => ({
          ...item,
          assessment: assessmentById.get(item.assessment_id),
          subject: subjectByOffering.get(item.offering_id) ?? 'Subject unavailable',
        })).sort((a, b) => (a.assessment?.sort_order ?? 0) - (b.assessment?.sort_order ?? 0) || a.subject.localeCompare(b.subject)))
      } catch (cause) {
        if (active) setError(friendlyError(cause))
      }
    }
    load()
    return () => { active = false }
  }, [schoolId, termId, studentId])
  if (error) return <Alert>Assessment breakdown could not be loaded. {error}</Alert>
  if (!rows.length) return null
  return (
    <section aria-label="Assessment breakdown" className="space-y-2">
      <h3 className="font-semibold">Assessment breakdown</h3>
      <Table headers={['Assessment', 'Subject', 'Score']}>
        {rows.map(row => <tr key={row.id}><td>{row.assessment?.name ?? 'Assessment'}</td><td>{row.subject}</td><td>{row.score}%</td></tr>)}
      </Table>
    </section>
  )
}

const typeInfo = {
  'class-roster': ['Upload class roster', identityHeaders, 'Fill in names and school admission numbers. Class and stream are prefilled.'],
  'assessment-results': ['Upload assessment results', resultHeaders, 'Fill in the scores for this assessment and subject. Leave scores blank for learners you are not updating.'],
  'term-payments': ['Upload payments', paymentHeaders, 'Fill in receipt references and amounts for payments already received. Leave unused rows blank.'],
}

export default function SchoolRecords({ kind, initialGroup, schoolId, terms, currentTerm, data, onClose, onSave, saving }) {
  const [title, headers, help] = typeInfo[kind]
  const [year, setYear] = useState(String(currentTerm?.year ?? ''))
  const [termId, setTermId] = useState(currentTerm?.id ?? '')
  const [classId, setClassId] = useState(initialGroup?.id ?? '')
  const [assessmentId, setAssessmentId] = useState('')
  const [offeringId, setOfferingId] = useState('')
  const [termRecords, setTermRecords] = useState(null)
  const [offeringRoster, setOfferingRoster] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [fileError, setFileError] = useState('')
  const [preview, setPreview] = useState(null)
  const [reading, setReading] = useState(false)
  const results = kind === 'assessment-results'
  const fees = kind === 'term-payments'
  const term = terms.find(item => item.id === termId)
  const group = data.classes.find(item => item.id === classId)
  const assessment = termRecords?.assessments?.find(item => item.id === assessmentId)
  const offering = termRecords?.offerings?.find(item => item.id === offeringId)
  const subject = termRecords?.subjects?.find(item => item.id === offering?.subject_id)
  const invoices = termRecords?.invoices ?? []
  const roster = results ? offeringRoster?.people ?? [] : data.students.filter(student => invoices.some(invoice => invoice.student_id === student.id))

  useEffect(() => {
    if (!termId || !(results || fees)) return
    let active = true
    const request = results
      ? Promise.all([
        allRows('nt_assessments', schoolId, { term_id: termId }),
        allRows('nt_offerings', schoolId, { term_id: termId }),
        allRows('nt_subjects', schoolId),
      ]).then(([assessments, offerings, subjects]) => ({
        assessments: assessments.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)), offerings, subjects,
      }))
      : allRows('nt_invoices', schoolId, { term_id: termId }).then(invoices => ({ invoices }))
    request.then(
      records => { if (active) setTermRecords(records) },
      error => { if (active) setLoadError(friendlyError(error)) },
    )
    return () => { active = false }
  }, [fees, results, schoolId, termId])

  useEffect(() => {
    if (!offeringId || !assessmentId) return
    let active = true
    Promise.all([
      readRoster(offeringId),
      allRows('nt_assessment_results', schoolId, { assessment_id: assessmentId, offering_id: offeringId }),
    ]).then(
      ([people, scores]) => { if (active) setOfferingRoster({ people, scores }) },
      error => { if (active) setLoadError(friendlyError(error)) },
    )
    return () => { active = false }
  }, [offeringId, assessmentId, schoolId])

  function resetPreview() {
    setPreview(null)
    setFileError('')
  }

  function changeTerm(value) {
    setTermId(value)
    setAssessmentId('')
    setOfferingId('')
    setTermRecords(null)
    setOfferingRoster(null)
    setLoadError('')
    resetPreview()
  }

  function chooseOffering(value) {
    setOfferingId(value)
    setOfferingRoster(null)
    setLoadError('')
    resetPreview()
  }

  const ready = results ? Boolean(term && assessment && subject && group && offeringRoster && roster.length) :
    fees ? Boolean(term && termRecords && roster.length) : Boolean(group)
  const busy = reading || saving

  function templateRows(existing = false) {
    if (!results && !fees) {
      const classFields = classIdentity(group)
      return existing
        ? data.students.filter(learner => learner.class_id === group.id).map(learner => [learner.full_name, learner.admission_no, ...classFields])
        : Array.from({ length: 25 }, () => ['', '', ...classFields])
    }
    return roster.map(learner => [
      learner.full_name, learner.admission_no,
      ...classIdentity(group && results ? group : data.classes.find(item => item.id === learner.class_id)),
      term.year, term.number, ...(results ? [assessment.name, subject.name] : []), '', ...(fees ? [''] : []),
    ])
  }

  async function selectFile(event) {
    const [file] = event.target.files
    resetPreview()
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Choose a CSV file. In Excel, save the Data sheet as CSV UTF-8 first.')
      return
    }
    setReading(true)
    try {
      setPreview(prepareSchoolRows(kind, await file.text(), { schoolId, term, group, roster, assessment, subject, offering, students: data.students, classes: data.classes, invoices, payments: data.payments }))
    } catch (error) {
      setFileError(friendlyError(error))
    } finally {
      setReading(false)
    }
  }

  const choices = data.classes.map(item => [item.id, item.name])
  const offeringChoices = (termRecords?.offerings ?? []).filter(item => item.class_id === classId)
    .map(item => [item.id, termRecords.subjects.find(candidate => candidate.id === item.subject_id)?.name ?? 'Subject'])
  const scoreByLearner = new Map(offeringRoster?.scores.map(item => [item.student_id, item.score]))
  const selectionKey = [year, termId, classId, assessmentId, offeringId].join(':')
  return (
    <Modal title={title} onClose={() => { if (!saving) onClose() }} wide>
      <div className="space-y-4">
        <fieldset disabled={busy} className="grid gap-2 sm:grid-cols-2">
          {(results || fees) && <TermChoices terms={terms} year={year} termId={termId} setYear={value => { setYear(value); changeTerm('') }} setTermId={changeTerm} />}
          {results && termRecords && <Choice label="Assessment" value={assessmentId} onChange={value => { setAssessmentId(value); chooseOffering(''); setClassId('') }} options={termRecords.assessments.map(item => [item.id, item.name])} />}
          {(!results && !fees || results && assessment) && <Choice label="Class and stream" value={classId} onChange={value => { setClassId(value); chooseOffering('') }} options={choices} />}
          {results && group && assessment && <Choice label="Subject" value={offeringId} onChange={chooseOffering} options={offeringChoices} />}
        </fieldset>
        <Alert>{loadError}</Alert>
        {termId && (results || fees) && !termRecords && !loadError && <p role="status">Loading term records…</p>}
        {results && termRecords && !termRecords.assessments.length && <p>Add assessments for this year and term in School settings first.</p>}
        {results && group && assessment && !offeringChoices.length && <p>Add a subject for this class and term under Curriculum. Teachers can enter results for subjects they’re assigned to.</p>}
        {results && offeringId && !offeringRoster && !loadError && <p role="status">Loading the subject roster…</p>}
        {results && offeringRoster && !roster.length && <p>No active learners are enrolled in this subject.</p>}
        {fees && termRecords && !roster.length && <p>Create invoices for this year and term before uploading payments.</p>}
        {ready && (
          <>
            <p className="text-sm text-muted-foreground">{help} Save the Excel Data sheet as CSV UTF-8 before uploading.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => downloadSchoolTemplate('csv', `nilatext-${kind}`, [headers, ...templateRows()])}>Download CSV template</Button>
              <Button variant="outline" onClick={() => downloadSchoolTemplate('xlsx', `nilatext-${kind}`, [headers, ...templateRows()], [1, ...(fees ? [6] : [])])}>Download Excel template</Button>
              {kind === 'class-roster' && <Button variant="outline" onClick={() => downloadSchoolTemplate('csv', 'nilatext-class-export', [headers, ...templateRows(true)])}>Export class roster CSV</Button>}
            </div>
            {results && scoreByLearner.size > 0 && <Table headers={['Learner', 'Admission Number', 'Saved score']}>
              {roster.filter(learner => scoreByLearner.has(learner.id)).map(learner => <tr key={learner.id}><td>{learner.full_name}</td><td>{learner.admission_no}</td><td>{scoreByLearner.get(learner.id)}</td></tr>)}
            </Table>}
            <Field key={selectionKey} label="CSV file" type="file" accept=".csv,text/csv" disabled={busy} onChange={selectFile} />
          </>
        )}
        <Alert>{fileError}</Alert>
        {reading && <p role="status">Checking CSV…</p>}
        {preview && (
          <>
            <p role="status">{preview.length} validated {preview.length === 1 ? 'record' : 'records'}. {preview.length > 5 && 'Showing the first 5.'}</p>
            <Table headers={headers}>{preview.slice(0, 5).map((item, row) => <tr key={row}>{item.cells.map((cell, column) => <td key={column} className="wrap-anywhere">{cell}</td>)}</tr>)}</Table>
            <Button disabled={busy} onClick={() => onSave(preview.map(item => item.data), error => setFileError(friendlyError(error)))}>{saving ? 'Importing…' : `Import ${preview.length} ${preview.length === 1 ? 'record' : 'records'}`}</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
