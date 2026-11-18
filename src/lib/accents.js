const accents = {
  learners: ['#dcebc9', '#2f513a'],
  attendance: ['#d4e8ec', '#264d5a'],
  assignments: ['#f0dfbe', '#674726'],
  reports: ['#e6ddf1', '#59436e'],
  fees: ['#d6e8dd', '#335a52'],
  access: ['#f2ded6', '#6c443a'],
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
