import InboxSheetContent from './inboxShared.jsx'

/** The Inbox tab — same content/logic as the near-fullscreen sheet from
    Batch 2, now a standalone page instead of something opened from Today.
    `focusEmail` (from Today's preview row taps) scrolls to and expands a
    specific email once this tab is visible. */
export default function InboxScreen({ focusEmail }) {
  return <InboxSheetContent focusEmail={focusEmail} />
}
