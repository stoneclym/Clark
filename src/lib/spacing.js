// Shared spacing scale for the desktop dashboard (Batch 10) — one source
// of truth instead of ad hoc per-component gap values scattered across
// the desktop cards. `card` matches mobile's own TodayScreen.jsx
// card-stack gap (14px) exactly, so the two layouts agree on the same
// base rhythm even though desktop is otherwise a separate layout.
export const SPACE = {
  xs: 8,
  sm: 12,
  card: 14,   // every card-to-card gap within a column, including the
              // header-to-first-card gap — nothing special-cased
  column: 24, // gutter between the three desktop columns
  section: 32,
}
