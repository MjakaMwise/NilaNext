import { downloadCSV, validPayment, balance } from './domain.js'
import { parseCSV } from './record-import.js'

export const identityHeaders = ['Name', 'Admission Number', 'Class', 'Stream']
export const schoolTermHeaders = [...identityHeaders, 'Year', 'Term']
export const resultHeaders = [...schoolTermHeaders, 'Assessment', 'Subject', 'Score']
export const paymentHeaders = [...schoolTermHeaders, 'Receipt Reference', 'Amount Paid']

export function classIdentity(group) {
  return [group?.level ?? group?.name ?? '', group?.stream ?? '']
}

export function schoolRows(headers, csv) {
  const [actual = [], ...rows] = parseCSV(csv)
  if (actual.length !== headers.length || actual.some((value, index) => value.toLowerCase() !== headers[index].toLowerCase())) {
    throw new Error('The columns do not match this template. Download a fresh template and keep the headings in order.')
  }
  if (!rows.length) throw new Error('Enter at least one record before uploading.')
  return rows
}

export function prepareSchoolRows(kind, csv, selection) {
  const { schoolId, term, group, roster, assessment, subject, offering, students, invoices, payments } = selection
  const headers = kind === 'class-roster' ? identityHeaders : kind === 'assessment-results' ? resultHeaders : paymentHeaders
  const rows = schoolRows(headers, csv)
  const used = new Set()
  const classById = new Map(selection.classes.map(item => [item.id, item]))
  const learnerByAdmission = new Map(roster.map(learner => [learner.admission_no, learner]))
  const invoiceByStudent = new Map(invoices.filter(invoice => invoice.term_id === term?.id).map(invoice => [invoice.student_id, invoice]))
  const balances = new Map()
  const references = new Set(payments.map(payment => payment.reference))
  const existingAdmissions = new Set(students.map(learner => learner.admission_no))
  const items = []

  rows.forEach((cells, index) => {
    const fail = message => { throw new Error(`CSV record ${index + 2}: ${message}`) }
    if (cells.length !== headers.length) fail('Keep all template columns in place.')
    const [name, admission, level, stream, year, termNumber, first, second, score] = cells

    if (kind === 'class-roster') {
      if (!name && !admission) return
      const [expectedLevel, expectedStream] = classIdentity(group)
      if (level !== expectedLevel || stream !== expectedStream) fail('Class and Stream must match the selected class template.')
      if (!name || name.length > 120 || !admission || admission.length > 30) fail('Enter the learner’s name and school admission number.')
      if (existingAdmissions.has(admission) || used.has(admission)) fail('This admission number already exists or is repeated in the file.')
      used.add(admission)
      items.push({ data: { school_id: schoolId, class_id: group.id, full_name: name, admission_no: admission }, cells })
      return
    }

    if (kind === 'assessment-results' && score === '') return
    if (kind === 'term-payments' && first === '' && second === '') return
    const learner = learnerByAdmission.get(admission)
    if (!learner) fail('This admission number is outside the selected roster.')
    const [expectedLevel, expectedStream] = classIdentity(group ?? classById.get(learner.class_id))
    if (level !== expectedLevel || stream !== expectedStream || year !== String(term.year) || termNumber !== String(term.number)) {
      fail('Class, stream, year and term must match the selected template.')
    }

    if (kind === 'assessment-results') {
      if (first !== assessment.name || second !== subject.name) fail('Assessment and subject must match your selection.')
      if (used.has(learner.id)) fail('This learner already has a row in the file.')
      if (!/^\d+(?:\.\d{1,2})?$/.test(score) || Number(score) > 100) fail('Enter a score from 0 to 100, with up to two decimal places.')
      used.add(learner.id)
      items.push({ data: { school_id: schoolId, term_id: term.id, assessment_id: assessment.id, offering_id: offering.id, student_id: learner.id, score: Number(score) }, cells })
      return
    }

    const invoice = invoiceByStudent.get(learner.id)
    if (!invoice) fail('This learner does not have an invoice for the selected year and term.')
    if (!first || first.length > 100 || references.has(first)) fail('Enter a unique receipt reference of up to 100 characters.')
    const remaining = balances.get(invoice.id) ?? Math.round(balance(invoice, payments) * 100)
    if (!/^\d+(?:\.\d{1,2})?$/.test(second) || !validPayment(second, remaining / 100)) fail('Enter a positive amount within the remaining invoice balance.')
    balances.set(invoice.id, remaining - Math.round(Number(second) * 100))
    references.add(first)
    items.push({ data: { school_id: schoolId, invoice_id: invoice.id, reference: first, amount: Number(second), request_id: crypto.randomUUID() }, cells })
  })

  if (!items.length) throw new Error('Fill in at least one learner, result or payment.')
  return items
}

// Excel opens this zipped SpreadsheetML as an .xlsx workbook. Inline strings
// keep school identifiers intact, including IDs with leading zeros.
function xml(value) {
  return String(value ?? '').replace(/[&<>"'\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[character] ?? ''))
}

function storedZip(files) {
  const encoder = new TextEncoder()
  const local = [], central = []
  let offset = 0, directorySize = 0
  for (const [filename, value] of Object.entries(files)) {
    const name = encoder.encode(filename)
    const data = encoder.encode(value)
    let checksum = -1
    for (const byte of data) {
      checksum ^= byte
      for (let bit = 0; bit < 8; bit++) checksum = (checksum >>> 1) ^ ((checksum & 1) ? 0xedb88320 : 0)
    }
    checksum = ~checksum
    const header = new Uint8Array(30 + name.length)
    const h = new DataView(header.buffer)
    h.setUint32(0, 0x04034b50, true)
    h.setUint16(4, 20, true)
    h.setUint32(14, checksum, true)
    h.setUint32(18, data.length, true)
    h.setUint32(22, data.length, true)
    h.setUint16(26, name.length, true)
    header.set(name, 30)
    local.push(header, data)

    const record = new Uint8Array(46 + name.length)
    const d = new DataView(record.buffer)
    d.setUint32(0, 0x02014b50, true)
    record.set(header.subarray(4, 30), 6)
    d.setUint16(4, 20, true)
    d.setUint32(42, offset, true)
    record.set(name, 46)
    central.push(record)
    directorySize += record.length
    offset += header.length + data.length
  }
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, central.length, true)
  view.setUint16(10, central.length, true)
  view.setUint32(12, directorySize, true)
  view.setUint32(16, offset, true)
  return new Blob([...local, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function makeWorkbook(rows, textColumns = []) {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const rels = 'http://schemas.openxmlformats.org/package/2006/relationships'
  const sheetRows = rows.map((row, index) => `<row r="${index + 1}">${row.map((cell, column) => `<c r="${String.fromCharCode(65 + column)}${index + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`).join('')}</row>`).join('')
  return storedZip({
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': `<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<styleSheet xmlns="${ns}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${ns}"><cols>${rows[0].map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 30 : 21}" customWidth="1"${textColumns.includes(index) ? ' style="1"' : ''}/>`).join('')}</cols><sheetData>${sheetRows}</sheetData></worksheet>`,
  })
}

export function downloadSchoolTemplate(format, filename, rows, textColumns) {
  if (format === 'csv') {
    downloadCSV(`${filename}.csv`, rows)
    return
  }
  const url = URL.createObjectURL(makeWorkbook(rows, textColumns))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
