// Adapts a club_tasks row (joined with its club name) into the same shape
// the Tasks card's TaskRow/getTaskDateInfo expect, so club tasks render
// alongside regular tasks instead of only appearing on the Clubs page.
export const CLUB_TASK_PREFIX = 'club-'

export function mapClubTask(row) {
  return {
    id: `${CLUB_TASK_PREFIX}${row.id}`,
    title: row.task_text,
    done: row.done,
    category: 'Club',
    tag: row.clubs?.name || null,
    source: row.clubs?.name || 'Club',
    due_date: row.due_date,
    due_date_calc: row.due_date_calc,
    due_at: row.due_at,
    original_due_text: row.original_due_text,
    created_at: row.created_at,
  }
}
