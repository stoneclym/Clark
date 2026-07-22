export function timeOfDayLabel(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'This Morning'
  if (hour < 18) return 'This Afternoon'
  return 'This Evening'
}

export function timeOfDayGreeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
