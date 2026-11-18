import { SUBJECTS, balance, validPayment } from './domain.js'

export const recordImports = {
  students: {
    title: 'Upload students',
    table: 'nt_students',
    headers: ['Admission no', 'Full name', 'Class'],
    help: 'Use the school’s existing admission numbers, including any leading zeros, letters or separators. Create your classes first and use their names in the file. Uploading learners does not grant access.',
  },
  teachers: {
    title: 'Upload teachers',
    table: 'nt_teacher_roster',
    headers: ['TSC Number', 'Name'],
    help: 'Import teachers by their school-verified TSC number and name. Add a verified email separately when you approve portal access.',
  },
  results: {
    title: 'Upload results',
    table: 'nt_marks',
    conflict: 'student_id,term_id,subject',
    headers: ['Admission no', 'Subject', 'Score'],
    help: 'Use one row per learner and subject. Scores run from 0 to 100. Existing marks for the selected term will be updated.',
  },
  invoices: {
    title: 'Upload invoices',
    table: 'nt_invoices',
    headers: ['Admission no', 'Description', 'Amount KES'],
    help: 'Use one row per learner for the selected term. Existing invoices stay as posted.',
  },
  payments: {
    title: 'Upload receipts',
    table: 'nt_payments',
    headers: ['Admission no', 'Reference', 'Amount KES'],
    help: 'Enter a unique reference for each payment already received. The learner needs an invoice for the selected term. Receipts use the import date.',
  },
}

export function parseCSV(text) {
  const input = text.replace(/^\uFEFF/, '')
  const field = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))([,\r\n]|$)/y
  const records = []
  let row = []
  let cursor = 0

  while (cursor < input.length || row.length) {
    field.lastIndex = cursor
    const match = field.exec(input)
    if (!match) throw new Error(`CSV record ${records.length + 1} has an invalid quoted value.`)
    row.push((match[1]?.replaceAll('""', '"') ?? match[2]).trim())
    cursor = field.lastIndex
    if (match[3] === ',') continue
    if (match[3] === '\r' && input[cursor] === '\n') cursor++
    if (row.some(Boolean)) records.push(row)
    row = []
  }
  return records
}

export function prepareImport(kind, text, { schoolId, termId, students = [], invoices = [], payments = [], classes = [], teachers = [] }) {
  const spec = recordImports[kind]
  const [headers = [], ...records] = parseCSV(text)
  if (headers.length !== spec.headers.length || headers.some((header, index) => header.toLowerCase() !== spec.headers[index].toLowerCase())) {
    throw new Error(`Use these columns in order: ${spec.headers.join(', ')}.`)
  }
  if (!records.length) throw new Error('Add at least one record below the column headings.')
  if (kind === 'students' || kind === 'teachers') {
    const existing = new Set(kind === 'students' ? students.map(student => student.admission_no) : teachers.map(teacher => teacher.tsc_no))
    const classIds = new Map(classes.map(group => [group.name, group.id]))
    return records.map((row, index) => {
      const fail = message => { throw new Error(`CSV record ${index + 2}: ${message}`) }
      if (row.length !== spec.headers.length || row.some(value => !value)) fail('Fill every column.')
      if (kind === 'teachers') {
        const [tsc_no, full_name] = row
        if (full_name.length > 120) fail('Keep the name to 120 characters.')
        if (tsc_no.length > 40) fail('Keep the TSC number to 40 characters.')
        if (existing.has(tsc_no)) fail('This TSC number already exists or appears twice in the file.')
        existing.add(tsc_no)
        return { school_id: schoolId, full_name, tsc_no }
      }
      const [admission_no, full_name, className] = row
      const class_id = classIds.get(className)
      if (admission_no.length > 30) fail('Keep the admission number to 30 characters or fewer.')
      if (full_name.length > 120) fail('Keep the name to 120 characters.')
      if (!class_id) fail(`Create the class “${className}” first or check its spelling.`)
      if (existing.has(admission_no)) fail('This admission number is already in use or appears twice in the file.')
      existing.add(admission_no)
      return { school_id: schoolId, admission_no, full_name, class_id }
    })
  }

  const learners = new Map(students.map(student => [student.admission_no, student]))
  const termInvoices = new Map(invoices.filter(invoice => invoice.term_id === termId).map(invoice => [invoice.student_id, invoice]))
  const references = new Set(payments.map(payment => payment.reference))
  const batch = new Set()
  const balances = new Map()

  return records.map(([admission, description, value, ...extra], index) => {
    const fail = message => { throw new Error(`CSV record ${index + 2}: ${message}`) }
    if (extra.length || !admission || !description || !value) fail('Fill all three columns.')
    const learner = learners.get(admission)
    if (!learner) fail(`No accessible learner has admission number “${admission}”.`)
    const common = { school_id: schoolId, student_id: learner.id, term_id: termId }

    if (kind === 'results') {
      const subject = SUBJECTS.find(name => name.toLowerCase() === description.toLowerCase())
      const score = Number(value)
      if (!subject) fail(`Choose one of: ${SUBJECTS.join(', ')}.`)
      if (!/^\d+(?:\.\d{1,2})?$/.test(value) || score > 100) fail('Enter a score from 0 to 100 with up to two decimal places.')
      const key = `${learner.id}:${subject}`
      if (batch.has(key)) fail('This learner and subject appear more than once.')
      batch.add(key)
      return { ...common, subject, score, updated_at: new Date().toISOString() }
    }

    const amount = Number(value)
    if (!/^\d+(?:\.\d{1,2})?$/.test(value) || !validPayment(amount, 9999999999.99)) {
      fail('Enter a positive KES amount with up to two decimal places and no currency symbol or thousands separators.')
    }
    const invoice = termInvoices.get(learner.id)
    if (kind === 'invoices') {
      if (!learner.active) fail('Choose an active learner.')
      if (invoice || batch.has(learner.id)) fail('This learner already has an invoice for the selected term or appears twice in this file.')
      if (description.length > 120) fail('Keep the description to 120 characters.')
      batch.add(learner.id)
      return { ...common, description, amount }
    }

    if (!invoice) fail('Create this learner’s invoice for the selected term first.')
    if (description.length > 100) fail('Keep the reference to 100 characters.')
    if (references.has(description)) fail('This receipt reference already exists or appears twice in the file.')
    const remaining = balances.get(invoice.id) ?? Math.round(balance(invoice, payments) * 100)
    const cents = Math.round(amount * 100)
    if (cents > remaining) fail('This payment exceeds the remaining invoice balance.')
    balances.set(invoice.id, remaining - cents)
    references.add(description)
    return { school_id: schoolId, invoice_id: invoice.id, reference: description, amount, request_id: crypto.randomUUID() }
  })
}
