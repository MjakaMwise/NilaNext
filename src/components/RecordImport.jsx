import { useState } from 'react'
import { downloadCSV, friendlyError } from '../lib/domain'
import { prepareImport, recordImports } from '../lib/record-import'
import { Alert, Field, Modal, Table } from './UI'
import { Button } from './ui/button'

export default function RecordImport({ kind, termLabel, context, onClose, onSave, saving }) {
  const spec = recordImports[kind]
  const [preview, setPreview] = useState(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const busy = reading || saving

  async function selectFile(event) {
    const [file] = event.target.files
    setPreview(null)
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a CSV file. In Excel, save the Data sheet as CSV UTF-8 first.')
      return
    }
    setReading(true)
    try {
      const rows = prepareImport(kind, await file.text(), context)
      const admissions = new Map(context.students.map(student => [student.id, student.admission_no]))
      const invoiceLearners = new Map(context.invoices.map(invoice => [invoice.id, invoice.student_id]))
      const classNames = new Map(context.classes.map(group => [group.id, group.name]))
      const sample = rows.slice(0, 5).map(row => {
        if (kind === 'teachers') return [row.tsc_no, row.full_name]
        if (kind === 'students') return [row.admission_no, row.full_name, classNames.get(row.class_id)]
        return [
          admissions.get(row.student_id ?? invoiceLearners.get(row.invoice_id)),
          row.subject ?? row.description ?? row.reference,
          row.score ?? row.amount,
        ]
      })
      setPreview({ rows, sample })
    } catch (error) {
      setError(friendlyError(error))
    } finally {
      setReading(false)
    }
  }

  return (
    <Modal title={spec.title} onClose={() => { if (!saving) onClose() }} wide>
      <div className="space-y-4">
        {termLabel && <p className="text-sm font-medium">Selected term · {termLabel}</p>}
        <p className="text-sm text-muted-foreground">{spec.help}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => downloadCSV(`nilatext-${kind}-template.csv`, [spec.headers])}>Download CSV template</Button>
          <Button variant="outline" asChild><a href={`/templates/nilatext-${kind}-template.xlsx`} download>Download Excel template</a></Button>
        </div>
        <p className="text-sm text-muted-foreground">If you fill in the Excel template, save the data sheet as CSV UTF-8 before uploading.</p>
        <Field label="CSV file" type="file" accept=".csv,text/csv" disabled={busy} onChange={selectFile} />
        {!preview && <Alert>{error}</Alert>}
        {reading && <p role="status">Checking CSV…</p>}
        {preview && (
          <>
            <p role="status" className="text-sm">{preview.rows.length} validated {preview.rows.length === 1 ? 'record' : 'records'}. {preview.rows.length > 5 && 'Showing the first 5.'}</p>
            <Table headers={spec.headers}>
              {preview.sample.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column} className="wrap-anywhere">{value}</td>)}</tr>)}
            </Table>
            <Alert>{error}</Alert>
            <Button disabled={busy} onClick={() => {
              setError('')
              onSave(spec, preview.rows, cause => setError(friendlyError(cause)))
            }}>{saving ? 'Importing…' : `Import ${preview.rows.length} ${preview.rows.length === 1 ? 'record' : 'records'}`}</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
