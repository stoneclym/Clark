// Tiny pub-sub so the (always-mounted) glass tab bar can fade to
// near-invisible whenever any Sheet is open, rather than stacking two
// glass surfaces (bar + sheet) with real depth on top of each other.
let count = 0
const listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(count > 0))
}

export function sheetOpened() {
  count += 1
  notify()
}

export function sheetClosed() {
  count = Math.max(0, count - 1)
  notify()
}

export function subscribeSheetOpen(fn) {
  listeners.add(fn)
  fn(count > 0)
  return () => listeners.delete(fn)
}
