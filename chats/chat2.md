# Clark Chat Interface

_Started 2026-06-26 00:08 UTC_

---

## User

Clark — Supplemental Design Prompt

Two additional screens for Clark, an existing personal school dashboard app. Match the established design exactly — same typefaces, same card treatment, same #568db3 accent blue, same light and dark mode, same overall aesthetic.

Screen 1 — Ask Clark
A chat interface that opens when the blue circle button in the center of the tab bar is tapped. Opens as a full screen modal or bottom sheet. Conversation between the user and Clark, Sonnet-powered. Clark has full context of the user’s schedule, tasks, grades, clubs, and inbox. The input at the bottom supports both typing and a mic button for voice — tap to start, tap to stop. The interface handles both questions and task creation in the same conversation thread.

Screen 2 — Quick Links Dropdown
The header is sticky and contains the Clark wordmark with the date below it. On the right side is a small icon button. When tapped it reveals a slim strip directly below the header showing three labeled icon buttons: Outlook, Canvas, Infinite Campus. Tapping anywhere else collapses it. Show both the collapsed and expanded state.
Make only these two changes.
Here's the old PRD for some context

## Assistant

Let me look at the existing design first.

_[tool: read_file]_

Now I'll make the two additions. First the logic — new state, data for the chat and quick links, and exposed values.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the HTML — the header with quick-links button + strip, the close-on-tap, the Ask Clark screen, and the three-item tab bar.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Let me check the new screens render correctly.

_[tool: show_html]_

Let me quickly verify the two new states render before handing off.

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

Ask Clark renders well. Now the quick-links expanded state on Today.

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: save_screenshot]_

Both new screens work as specified. The Ask Clark chat (full-screen modal with thread, list + task-creation card, and a typing/mic input bar) and the Quick Links dropdown (sticky-header grid button revealing the Outlook / Canvas / Infinite Campus strip, button highlighting when active). Both inherit the existing card treatment, fonts, #568DB3 accent, and dark/light theming. The center blue Ask Clark button now sits in the tab bar as described.

_[tool: ready_for_verification]_

Both screens are in. Two notes:
- The grid icon in the header toggles the Quick Links strip; tapping anywhere in the content collapses it (matching "tap elsewhere to collapse").
- The Ask Clark screen is reachable via the new center blue button in the tab bar, or the "Ask" pill in the top preview switcher. Everything follows dark mode and your accent color.

