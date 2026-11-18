const accents = {
  learners: ['#dcebf9', '#264c6a'],
  attendance: ['#d1e8f1', '#234c60'],
  assignments: ['#dce3f7', '#334974'],
  reports: ['#e3e7fa', '#414e7e'],
  fees: ['#d6e7f8', '#2a537b'],
  access: ['#e6eef6', '#3e5770'],
}

export function accentStyle(tone) {
  const [background, foreground] = accents[tone] ?? accents.learners
  return { '--item-accent': background, '--item-ink': foreground }
}

export const pageAccents = {
  Students: 'learners',
  Classes: 'learners',
  Curriculum: 'assignments',
  'My teaching': 'assignments',
  Assignments: 'assignments',
  Timetable: 'attendance',
  Attendance: 'attendance',
  'Lesson attendance': 'attendance',
  'Academic reports': 'reports',
  Fees: 'fees',
  'People & access': 'access',
  'School settings': 'access',
}
