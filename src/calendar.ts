
export const monthName = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleString('en-US', { month: 'long' })
export const daysInMonth = (y: number, m: number) =>
  new Date(y, m + 1, 0).getDate()
export const firstWeekday = (y: number, m: number) =>
  new Date(y, m, 1).getDay()
