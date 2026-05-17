# Coverage Matrix View — Design Spec

**Document type:** Build spec for Claude Code prototype
**Purpose:** Manager demo of QA Command Center coverage view
**Stack assumption:** React (existing dashboard), TanStack Table or AG Grid, Tailwind for styling, FastAPI/Flask backend with Postgres
**Demo posture:** Mocked data only — no live backend required for the demo. Backend endpoint shapes are specified for future wiring.

---

## 1. Goal

Build a single screen that answers three questions for the manager at a glance:

1. **Which JIRA stories have test coverage, which don't?**
2. **For covered stories, what mix of manual / UI automation / API automation backs them?**
3. **Where are coverage gaps colliding with escaped prod bugs?**

The view must render fast for ~50–500 stories, support expand-to-drill-down with a third level of detail, and offer a `+ Add` affordance that converts visible gaps into one-click action.

---

## 2. The Four-Bucket-Plus-Split Model

Every JIRA story key referenced anywhere in the system (test cases, automation, bugs) lands in one of these coverage states. The state is computed, not stored.

| State | Manual | UI Auto | API Auto | Meaning |
|---|---|---|---|---|
| Fully covered | ≥1 pass | ≥1 pass | ≥1 pass | Strongest signal |
| Behaviorally covered | ≥1 pass | ≥1 pass OR ≥1 pass | — | Manual + one automation tier |
| API-only automated | — | none | ≥1 pass | Backend verified, no UI check |
| UI-only automated | — | ≥1 pass | none | UI verified, no API contract test |
| Manual only | ≥1 pass | none | none | Automation candidate |
| Not covered | none | none | none | Gap |
| Gap + escaped bug | (any of the above with a linked prod bug) | | | Highest priority |

The matrix surfaces the counts and a status color; users infer the bucket from the row.

---

## 3. Visual Spec — Top Level (Coverage Matrix)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  Coverage Matrix     [Sprint 42 ▾] [Epic: All ▾] [Filter: Gaps only ☐] [Search…]   │
├────────────────────────────────────────────────────────────────────────────────────┤
│       Story         Title                       Manual    UI Auto   API Auto  Bugs │
├────────────────────────────────────────────────────────────────────────────────────┤
│  ▶  AMZN-1458       Out-of-stock add to cart    0/0       0/0       0/0      2 🔴 │
│  ▶  AMZN-1456       Prime cart persistence      2/2 ✅    0/2 🔴    2/2 ✅   1 🔴 │
│  ▶  AMZN-1382       Cart v2 redesign            8/8 ✅    5/8 ⚠     8/8 ✅   0    │
│  ▶  AMZN-1459       Payment retry on decline    4/4 ✅    0/4 ⚪    4/4 ✅   0    │
│  ▶  AMZN-1457       Guest checkout flow         6/6 ✅    6/6 ✅    6/6 ✅   0    │
│  ▶  AMZN-1461       1-Click ordering            3/3 ✅    3/3 ✅    3/3 ✅   0    │
│  ▶  AMZN-1462       Wishlist add/move to cart   4/4 ✅    2/4 ⚠     4/4 ✅   0    │
│  ▶  AMZN-1463       Promo code application      5/5 ✅    0/5 🔴    5/5 ✅   1    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Column behavior

| Column | Width | Notes |
|---|---|---|
| Expand caret | 32px | `▶` collapsed, `▼` expanded |
| Story | 120px | Monospace; hyperlink to `{JIRA_BASE_URL}/browse/{key}` opening in new tab |
| Title | flex | Truncate with ellipsis on overflow |
| Manual | 100px | `passed/total` + status pill |
| UI Auto | 100px | `passed/total` + status pill |
| API Auto | 100px | `passed/total` + status pill |
| Bugs | 80px | Count, red if any are `found_in='prod'` |

### Status pills

- ✅ green: all tests in column passed in the lookback window
- ⚠ amber: at least one failure or stale (>7 days for auto, >30 days for manual)
- 🔴 red: zero coverage OR all failing
- ⚪ gray: zero coverage but intentionally (`coverage_intent='not_applicable'`)
- (no pill): 0/0 with no intent set — implicit gap

### Default sort

```
ORDER BY
  (bugs_prod > 0 AND no_coverage) DESC,   -- worst: bugs in prod, no tests
  bugs_prod DESC,                         -- then: anything with prod bugs
  manual_passing = 0
    AND ui_auto_passing = 0
    AND api_auto_passing = 0 DESC,        -- then: pure gaps
  story_key ASC
```

The first three rows of any sprint review should be the team's biggest risks.

### Filter toolbar

- **Sprint selector**: dropdown of sprints; default to current. Sprint is a manually-curated text field on the story; user types it once.
- **Epic selector**: dropdown of distinct epic keys mentioned anywhere; default "All."
- **Gaps only**: checkbox; when on, filters to rows where any of Manual/UI/API is 0 or any column is amber/red.
- **Search**: free text against story key + title.

All filters serialize to URL query params so views are bookmarkable.

---

## 4. Level 2 Expansion (Test list for a Story)

Clicking `▶` on a row expands a sub-panel showing the individual tests linked to that story, with the option to drill further into any test. Only one row expanded at a time by default (clicking another row collapses the previous).

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  ▼  AMZN-1456       Prime cart persistence      2/2 ✅    0/2 🔴    2/2 ✅   1 🔴 │
│     ┌──────────────────────────────────────────────────────────────────────────┐   │
│     │  Test                                Type      Last Run   Status         │   │
│     │  Cart survives logout/login          Manual    2d ago     ✅ Pass        │   │
│     │  Cart syncs across devices           Manual    2d ago     ✅ Pass        │   │
│     │  GET /cart returns persisted items   API Auto  4h ago     ✅ Pass        │   │
│     │  POST /cart/sync is idempotent       API Auto  4h ago     ✅ Pass        │   │
│     │  ──────────────────────────────────────────────────────────────────────  │   │
│     │  ⚠ No UI automation                                                      │   │
│     │  [+ Add UI automation]  [+ Add manual case]  [+ Link existing]           │   │
│     │  ──────────────────────────────────────────────────────────────────────  │   │
│     │  Linked bugs:                                                            │   │
│     │  🔴 AMZN-1502  Cart empty after re-login on iOS Safari    (S2, prod)     │   │
│     └──────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Sub-panel contents

1. **Test list** — mixed manual + UI auto + API auto, sorted by Type then most-recent execution. Each test row is itself clickable to expand to Level 3.
2. **Gap callout** — if Manual=0 or UI=0 or API=0, show a one-line callout naming the missing tier with a context-aware `+ Add` button. For PROJ-1456 above, the missing tier is UI.
3. **Linked bugs section** — present only if any bugs reference this story key. Each bug renders as severity + title + env badge.

### + Button context-awareness

The button label adapts to the gap:

| Missing tier | Button label | Pre-fills in the editor |
|---|---|---|
| Manual | `+ Add manual case` | `case_story_link.jira_key = {story_key}` |
| UI Auto | `+ Add UI automation` | Opens automation backlog item: `{story_key}` + `test_type='ui'` |
| API Auto | `+ Add API automation` | Same with `test_type='api'` |
| (any) | `+ Link existing` | Opens picker filtered to unlinked tests |

The `+ Add UI automation` and `+ Add API automation` buttons don't author code (we can't generate Playwright/pytest from this UI). They create a backlog entry in an `automation_backlog` table that the SDET team picks up, OR they open a pre-filled JIRA ticket draft on the clipboard. For the prototype, just open a modal that captures intent and links it to the story.

---

## 5. Level 3 Expansion (Test detail)

Clicking a test row in Level 2 expands inline once more.

```
│     │  ▼ Cart survives logout/login          Manual    2d ago     ✅ Pass    │
│     │     Last 5 runs:  ✅ ✅ ✅ ⚠ ✅                                       │
│     │     Linked stories: AMZN-1456, AMZN-1456-followup                      │
│     │     Steps (3):                                                         │
│     │       1. Log in as Prime user with item in cart                        │
│     │       2. Log out, then log back in                                     │
│     │       3. Verify cart contents persist across session                   │
│     │     Owner: Alice    Last edited: 5d ago                                │
│     │     [Run now]  [Edit]  [View history]                                  │
```

Three levels is the limit. Anything deeper goes to a dedicated test-detail page.

### Level 3 fields by test type

| Field | Manual | UI Auto | API Auto |
|---|---|---|---|
| Last 5 runs sparkline | ✅ | ✅ | ✅ |
| Linked stories | ✅ | ✅ | ✅ |
| Owner | ✅ | ✅ (last committer) | ✅ |
| Last edited | ✅ | ✅ (last commit) | ✅ |
| Steps preview | ✅ (first 3 lines) | — | — |
| Test file path | — | ✅ (`tests/ui/cart.spec.ts:42`) | ✅ |
| Framework | — | ✅ (`Playwright`) | ✅ (`pytest`) |
| CI run URL | — | ✅ link | ✅ link |
| Run now | ✅ (opens runner) | — | — |
| Edit | ✅ (opens case editor) | — (link to repo) | — (link to repo) |

---

## 6. Mocked Demo Data — Amazon Shopping Cart Example

Use this fixture data verbatim. It illustrates every coverage state the manager should see.

### Stories

```json
[
  {
    "story_key": "AMZN-1382",
    "title": "Cart v2 redesign",
    "epic": "AMZN-1300 Checkout UX overhaul",
    "sprint": "S42",
    "status": "Done"
  },
  {
    "story_key": "AMZN-1456",
    "title": "Prime cart persistence",
    "epic": "AMZN-1455 Prime member experience",
    "sprint": "S42",
    "status": "Done"
  },
  {
    "story_key": "AMZN-1457",
    "title": "Guest checkout flow",
    "epic": "AMZN-1300 Checkout UX overhaul",
    "sprint": "S42",
    "status": "Done"
  },
  {
    "story_key": "AMZN-1458",
    "title": "Out-of-stock add to cart handling",
    "epic": "AMZN-1300 Checkout UX overhaul",
    "sprint": "S43",
    "status": "In Progress"
  },
  {
    "story_key": "AMZN-1459",
    "title": "Payment retry on declined card",
    "epic": "AMZN-1300 Checkout UX overhaul",
    "sprint": "S43",
    "status": "In Progress"
  },
  {
    "story_key": "AMZN-1461",
    "title": "1-Click ordering",
    "epic": "AMZN-1460 1-Click feature",
    "sprint": "S41",
    "status": "Done"
  },
  {
    "story_key": "AMZN-1462",
    "title": "Wishlist add and move to cart",
    "epic": "AMZN-1455 Prime member experience",
    "sprint": "S42",
    "status": "Done"
  },
  {
    "story_key": "AMZN-1463",
    "title": "Promo code application",
    "epic": "AMZN-1300 Checkout UX overhaul",
    "sprint": "S42",
    "status": "Done"
  }
]
```

### Test cases — manual

Each story has zero or more manual cases. Use a folder hierarchy like `/Cart/Add`, `/Cart/Edit`, etc.

```json
[
  {
    "id": "tc_001",
    "title": "Add single item to empty cart",
    "folder": "/Cart/Add",
    "tags": ["@smoke", "@regression", "@cart"],
    "story_keys": ["AMZN-1382"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_002",
    "title": "Add item already in cart (quantity increments)",
    "folder": "/Cart/Add",
    "tags": ["@regression", "@cart"],
    "story_keys": ["AMZN-1382"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_003",
    "title": "Add item while not logged in (guest cart)",
    "folder": "/Cart/Add",
    "tags": ["@regression", "@cart", "@guest"],
    "story_keys": ["AMZN-1382", "AMZN-1457"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_004",
    "title": "Remove single item from cart",
    "folder": "/Cart/Remove",
    "tags": ["@regression", "@cart"],
    "story_keys": ["AMZN-1382"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_005",
    "title": "Remove last item, cart shows empty state",
    "folder": "/Cart/Remove",
    "tags": ["@regression", "@cart"],
    "story_keys": ["AMZN-1382"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_006",
    "title": "Increase quantity within stock",
    "folder": "/Cart/Edit",
    "tags": ["@regression", "@cart"],
    "story_keys": ["AMZN-1382"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_007",
    "title": "Decrease quantity to zero (removes item)",
    "folder": "/Cart/Edit",
    "tags": ["@regression", "@cart"],
    "story_keys": ["AMZN-1382"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_008",
    "title": "Edit quantity above stock limit shows error",
    "folder": "/Cart/Edit",
    "tags": ["@regression", "@cart", "@error-handling"],
    "story_keys": ["AMZN-1382"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_009",
    "title": "Cart survives logout/login (Prime user)",
    "folder": "/Cart/Persistence",
    "tags": ["@regression", "@prime", "@persistence"],
    "story_keys": ["AMZN-1456"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_010",
    "title": "Cart syncs across devices (Prime user)",
    "folder": "/Cart/Persistence",
    "tags": ["@regression", "@prime", "@persistence"],
    "story_keys": ["AMZN-1456"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_011",
    "title": "Guest can add items and proceed to checkout",
    "folder": "/Checkout/Guest",
    "tags": ["@smoke", "@regression", "@guest"],
    "story_keys": ["AMZN-1457"],
    "last_run": "1d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_012",
    "title": "Guest checkout collects shipping address",
    "folder": "/Checkout/Guest",
    "tags": ["@regression", "@guest"],
    "story_keys": ["AMZN-1457"],
    "last_run": "1d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_013",
    "title": "Guest checkout collects payment info",
    "folder": "/Checkout/Guest",
    "tags": ["@regression", "@guest"],
    "story_keys": ["AMZN-1457"],
    "last_run": "1d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_014",
    "title": "Guest receives order confirmation email",
    "folder": "/Checkout/Guest",
    "tags": ["@regression", "@guest", "@email"],
    "story_keys": ["AMZN-1457"],
    "last_run": "1d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_015",
    "title": "Guest can convert to registered account at confirmation",
    "folder": "/Checkout/Guest",
    "tags": ["@regression", "@guest"],
    "story_keys": ["AMZN-1457"],
    "last_run": "1d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_016",
    "title": "Guest order is retrievable by email + order number",
    "folder": "/Checkout/Guest",
    "tags": ["@regression", "@guest"],
    "story_keys": ["AMZN-1457"],
    "last_run": "1d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_017",
    "title": "Declined card shows retry option",
    "folder": "/Checkout/Payment",
    "tags": ["@regression", "@payment", "@error-handling"],
    "story_keys": ["AMZN-1459"],
    "last_run": "3d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_018",
    "title": "Successful retry after decline completes order",
    "folder": "/Checkout/Payment",
    "tags": ["@regression", "@payment"],
    "story_keys": ["AMZN-1459"],
    "last_run": "3d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_019",
    "title": "3 declined attempts locks payment for 15 min",
    "folder": "/Checkout/Payment",
    "tags": ["@regression", "@payment", "@security"],
    "story_keys": ["AMZN-1459"],
    "last_run": "3d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_020",
    "title": "Decline reason is shown to user (insufficient funds, etc)",
    "folder": "/Checkout/Payment",
    "tags": ["@regression", "@payment"],
    "story_keys": ["AMZN-1459"],
    "last_run": "3d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_021",
    "title": "1-Click button visible on PDP for opted-in users",
    "folder": "/OneClick",
    "tags": ["@smoke", "@regression", "@one-click"],
    "story_keys": ["AMZN-1461"],
    "last_run": "5d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_022",
    "title": "1-Click order completes without cart step",
    "folder": "/OneClick",
    "tags": ["@regression", "@one-click"],
    "story_keys": ["AMZN-1461"],
    "last_run": "5d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_023",
    "title": "1-Click default address/payment can be changed",
    "folder": "/OneClick",
    "tags": ["@regression", "@one-click"],
    "story_keys": ["AMZN-1461"],
    "last_run": "5d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_024",
    "title": "Add to wishlist from PDP",
    "folder": "/Wishlist",
    "tags": ["@regression", "@wishlist"],
    "story_keys": ["AMZN-1462"],
    "last_run": "4d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_025",
    "title": "Move item from wishlist to cart",
    "folder": "/Wishlist",
    "tags": ["@regression", "@wishlist", "@cart"],
    "story_keys": ["AMZN-1462"],
    "last_run": "4d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_026",
    "title": "Wishlist persists across sessions",
    "folder": "/Wishlist",
    "tags": ["@regression", "@wishlist", "@persistence"],
    "story_keys": ["AMZN-1462"],
    "last_run": "4d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_027",
    "title": "Wishlist can be shared via link",
    "folder": "/Wishlist",
    "tags": ["@regression", "@wishlist"],
    "story_keys": ["AMZN-1462"],
    "last_run": "4d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_028",
    "title": "Valid promo code applies discount",
    "folder": "/Cart/Promo",
    "tags": ["@smoke", "@regression", "@promo"],
    "story_keys": ["AMZN-1463"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_029",
    "title": "Invalid promo code shows error",
    "folder": "/Cart/Promo",
    "tags": ["@regression", "@promo", "@error-handling"],
    "story_keys": ["AMZN-1463"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_030",
    "title": "Expired promo code shows error",
    "folder": "/Cart/Promo",
    "tags": ["@regression", "@promo", "@error-handling"],
    "story_keys": ["AMZN-1463"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_031",
    "title": "Promo code minimum order threshold enforced",
    "folder": "/Cart/Promo",
    "tags": ["@regression", "@promo"],
    "story_keys": ["AMZN-1463"],
    "last_run": "2d ago",
    "last_status": "PASS"
  },
  {
    "id": "tc_032",
    "title": "Only one promo code at a time",
    "folder": "/Cart/Promo",
    "tags": ["@regression", "@promo"],
    "story_keys": ["AMZN-1463"],
    "last_run": "2d ago",
    "last_status": "PASS"
  }
]
```

Note: **AMZN-1458 (Out-of-stock add to cart) has zero manual cases** — this is the deliberate gap row for the demo.

### Automated tests — UI

```json
[
  {
    "id": "at_001",
    "fq_name": "tests.ui.cart.test_add_item",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1382"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_002",
    "fq_name": "tests.ui.cart.test_increment_quantity",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1382"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_003",
    "fq_name": "tests.ui.cart.test_remove_item",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1382"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_004",
    "fq_name": "tests.ui.cart.test_edit_quantity",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1382"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_005",
    "fq_name": "tests.ui.cart.test_stock_limit_error",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1382"],
    "last_run": "4h ago",
    "last_status": "fail"
  },
  {
    "id": "at_006",
    "fq_name": "tests.ui.guest.test_guest_checkout_flow",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1457"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_007",
    "fq_name": "tests.ui.guest.test_guest_shipping",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1457"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_008",
    "fq_name": "tests.ui.guest.test_guest_payment",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1457"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_009",
    "fq_name": "tests.ui.guest.test_guest_confirmation",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1457"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_010",
    "fq_name": "tests.ui.guest.test_guest_convert_account",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1457"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_011",
    "fq_name": "tests.ui.guest.test_order_retrieval",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1457"],
    "last_run": "4h ago",
    "last_status": "pass"
  },
  {
    "id": "at_012",
    "fq_name": "tests.ui.oneclick.test_pdp_button_visible",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1461"],
    "last_run": "8h ago",
    "last_status": "pass"
  },
  {
    "id": "at_013",
    "fq_name": "tests.ui.oneclick.test_one_click_completes",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1461"],
    "last_run": "8h ago",
    "last_status": "pass"
  },
  {
    "id": "at_014",
    "fq_name": "tests.ui.oneclick.test_change_defaults",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1461"],
    "last_run": "8h ago",
    "last_status": "pass"
  },
  {
    "id": "at_015",
    "fq_name": "tests.ui.wishlist.test_add_from_pdp",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1462"],
    "last_run": "6h ago",
    "last_status": "pass"
  },
  {
    "id": "at_016",
    "fq_name": "tests.ui.wishlist.test_move_to_cart",
    "framework": "playwright",
    "test_type": "ui",
    "jira_keys": ["AMZN-1462"],
    "last_run": "6h ago",
    "last_status": "pass"
  }
]
```

Notes:
- AMZN-1456 (Prime persistence): **zero UI auto** — deliberate gap
- AMZN-1459 (Payment retry): **zero UI auto** — gap, intentionally marked
- AMZN-1463 (Promo code): **zero UI auto** — deliberate gap
- AMZN-1462 (Wishlist): only 2/4 UI auto — partial gap

### Automated tests — API

```json
[
  {
    "id": "at_101",
    "fq_name": "tests.api.cart.test_post_cart_add",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_102",
    "fq_name": "tests.api.cart.test_post_cart_add_duplicate",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_103",
    "fq_name": "tests.api.cart.test_post_cart_add_guest",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382", "AMZN-1457"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_104",
    "fq_name": "tests.api.cart.test_delete_cart_item",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_105",
    "fq_name": "tests.api.cart.test_delete_last_item",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_106",
    "fq_name": "tests.api.cart.test_patch_quantity",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_107",
    "fq_name": "tests.api.cart.test_patch_quantity_to_zero",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_108",
    "fq_name": "tests.api.cart.test_patch_quantity_over_stock",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1382"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_109",
    "fq_name": "tests.api.cart.test_get_cart_persisted_prime",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1456"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_110",
    "fq_name": "tests.api.cart.test_post_cart_sync_idempotent",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1456"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_111",
    "fq_name": "tests.api.checkout.test_guest_checkout_endpoint",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1457"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_112",
    "fq_name": "tests.api.checkout.test_guest_shipping_save",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1457"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_113",
    "fq_name": "tests.api.checkout.test_guest_payment_tokenize",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1457"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_114",
    "fq_name": "tests.api.checkout.test_guest_order_confirm",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1457"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_115",
    "fq_name": "tests.api.checkout.test_guest_account_convert",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1457"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_116",
    "fq_name": "tests.api.checkout.test_guest_order_lookup",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1457"],
    "last_run": "1h ago",
    "last_status": "pass"
  },
  {
    "id": "at_117",
    "fq_name": "tests.api.payment.test_card_decline_returns_retry",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1459"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_118",
    "fq_name": "tests.api.payment.test_retry_succeeds",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1459"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_119",
    "fq_name": "tests.api.payment.test_three_strikes_lockout",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1459"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_120",
    "fq_name": "tests.api.payment.test_decline_reason_propagates",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1459"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_121",
    "fq_name": "tests.api.oneclick.test_one_click_eligible",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1461"],
    "last_run": "3h ago",
    "last_status": "pass"
  },
  {
    "id": "at_122",
    "fq_name": "tests.api.oneclick.test_one_click_place_order",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1461"],
    "last_run": "3h ago",
    "last_status": "pass"
  },
  {
    "id": "at_123",
    "fq_name": "tests.api.oneclick.test_one_click_address_update",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1461"],
    "last_run": "3h ago",
    "last_status": "pass"
  },
  {
    "id": "at_124",
    "fq_name": "tests.api.wishlist.test_post_wishlist",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1462"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_125",
    "fq_name": "tests.api.wishlist.test_move_to_cart_endpoint",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1462"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_126",
    "fq_name": "tests.api.wishlist.test_wishlist_persist",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1462"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_127",
    "fq_name": "tests.api.wishlist.test_wishlist_share_link",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1462"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_128",
    "fq_name": "tests.api.promo.test_apply_valid_code",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1463"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_129",
    "fq_name": "tests.api.promo.test_apply_invalid_code",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1463"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_130",
    "fq_name": "tests.api.promo.test_apply_expired_code",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1463"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_131",
    "fq_name": "tests.api.promo.test_minimum_threshold",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1463"],
    "last_run": "2h ago",
    "last_status": "pass"
  },
  {
    "id": "at_132",
    "fq_name": "tests.api.promo.test_one_code_at_a_time",
    "framework": "pytest",
    "test_type": "api",
    "jira_keys": ["AMZN-1463"],
    "last_run": "2h ago",
    "last_status": "pass"
  }
]
```

Note: AMZN-1458 (Out-of-stock) has **zero API auto** — the full gap row.

### Bugs

```json
[
  {
    "jira_key": "AMZN-1502",
    "title": "Cart empty after re-login on iOS Safari",
    "severity": "S2",
    "found_in": "prod",
    "story_keys": ["AMZN-1456"],
    "linked_case_ids": [],
    "linked_automated_test_ids": [],
    "opened_at": "5d ago",
    "closed_at": null
  },
  {
    "jira_key": "AMZN-1510",
    "title": "Adding out-of-stock item silently succeeds, cart shows phantom row",
    "severity": "S1",
    "found_in": "prod",
    "story_keys": ["AMZN-1458"],
    "linked_case_ids": [],
    "linked_automated_test_ids": [],
    "opened_at": "3d ago",
    "closed_at": null
  },
  {
    "jira_key": "AMZN-1511",
    "title": "Out-of-stock badge missing on PDP after sellout during session",
    "severity": "S2",
    "found_in": "prod",
    "story_keys": ["AMZN-1458"],
    "linked_case_ids": [],
    "linked_automated_test_ids": [],
    "opened_at": "2d ago",
    "closed_at": null
  },
  {
    "jira_key": "AMZN-1515",
    "title": "Promo code field accepts leading whitespace, rejects valid codes",
    "severity": "S3",
    "found_in": "prod",
    "story_keys": ["AMZN-1463"],
    "linked_case_ids": ["tc_029"],
    "linked_automated_test_ids": [],
    "opened_at": "1d ago",
    "closed_at": null
  }
]
```

### Expected matrix output from this data

| Story | Manual | UI | API | Bugs | Why |
|---|---|---|---|---|---|
| AMZN-1382 | 8/8 ✅ | 5/8 ⚠ | 8/8 ✅ | 0 | 1 UI test failing (at_005); 3 missing UI tests for remove/edit cases |
| AMZN-1456 | 2/2 ✅ | 0/2 🔴 | 2/2 ✅ | 1 🔴 | UI gap correlates with iOS Safari prod bug |
| AMZN-1457 | 6/6 ✅ | 6/6 ✅ | 6/6 ✅ | 0 | Fully covered exemplar |
| AMZN-1458 | 0/0 | 0/0 | 0/0 | 2 🔴 | Worst row: 2 prod bugs, zero coverage |
| AMZN-1459 | 4/4 ✅ | 0/4 ⚪ | 4/4 ✅ | 0 | API-only by intent (mark as intentional in demo) |
| AMZN-1461 | 3/3 ✅ | 3/3 ✅ | 3/3 ✅ | 0 | Fully covered exemplar |
| AMZN-1462 | 4/4 ✅ | 2/4 ⚠ | 4/4 ✅ | 0 | Partial UI gap |
| AMZN-1463 | 5/5 ✅ | 0/5 🔴 | 5/5 ✅ | 1 | UI gap + recent prod bug; should sort high |

---

## 7. Component Architecture

### File layout

```
src/
├── pages/
│   └── CoverageMatrix.tsx           # top-level page
├── components/
│   ├── CoverageMatrix/
│   │   ├── index.tsx                # main container
│   │   ├── FilterBar.tsx            # sprint/epic/search/gaps toggle
│   │   ├── MatrixTable.tsx          # the table itself (TanStack Table)
│   │   ├── StoryRow.tsx             # row renderer
│   │   ├── ExpandedStoryPanel.tsx   # level 2 expansion
│   │   ├── TestRow.tsx              # individual test in level 2
│   │   ├── ExpandedTestPanel.tsx    # level 3 expansion
│   │   ├── CoveragePill.tsx         # the ✅/⚠/🔴/⚪ pill
│   │   ├── GapCallout.tsx           # "⚠ No UI automation" callout
│   │   └── AddButton.tsx            # context-aware + buttons
│   └── shared/
│       ├── JiraLink.tsx             # renders story key as link to JIRA
│       └── SparklineRuns.tsx        # last-5-runs sparkline
├── data/
│   ├── mockStories.ts
│   ├── mockManualCases.ts
│   ├── mockAutomatedTests.ts
│   └── mockBugs.ts
├── lib/
│   ├── coverage.ts                  # computeCoverage(story, tests, bugs)
│   └── types.ts                     # shared TypeScript types
```

### TypeScript types

```typescript
type CoverageState = 'pass' | 'partial' | 'fail' | 'none' | 'intentional_none';

interface Story {
  story_key: string;        // "AMZN-1382"
  title: string;
  epic?: string;
  sprint?: string;
  status?: string;
}

interface ManualCase {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  story_keys: string[];
  last_run: string | null;     // human-readable for prototype; ISO timestamp in prod
  last_status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';
}

interface AutomatedTest {
  id: string;
  fq_name: string;
  framework: 'pytest' | 'playwright' | 'cypress' | 'postman';
  test_type: 'ui' | 'api' | 'unit' | 'integration';
  jira_keys: string[];
  last_run: string | null;
  last_status: 'pass' | 'fail' | 'skip' | 'error';
  last_5_runs?: ('pass' | 'fail' | 'skip')[];
}

interface Bug {
  jira_key: string;
  title: string;
  severity: 'S1' | 'S2' | 'S3' | 'S4';
  found_in: 'prod' | 'stage' | 'dev';
  story_keys: string[];
  linked_case_ids: string[];
  linked_automated_test_ids: string[];
  opened_at: string;
  closed_at: string | null;
}

interface StoryCoverage {
  story: Story;
  manual: { total: number; passing: number; state: CoverageState };
  ui_auto: { total: number; passing: number; state: CoverageState };
  api_auto: { total: number; passing: number; state: CoverageState };
  bugs: { total: number; prod: number };
  manual_cases: ManualCase[];
  ui_tests: AutomatedTest[];
  api_tests: AutomatedTest[];
  linked_bugs: Bug[];
}
```

### Coverage computation (`lib/coverage.ts`)

```typescript
export function computeStoryCoverage(
  story: Story,
  cases: ManualCase[],
  tests: AutomatedTest[],
  bugs: Bug[]
): StoryCoverage {
  const manual_cases = cases.filter(c => c.story_keys.includes(story.story_key));
  const ui_tests = tests.filter(
    t => t.test_type === 'ui' && t.jira_keys.includes(story.story_key)
  );
  const api_tests = tests.filter(
    t => t.test_type === 'api' && t.jira_keys.includes(story.story_key)
  );
  const linked_bugs = bugs.filter(b => b.story_keys.includes(story.story_key));

  return {
    story,
    manual: tally(manual_cases.length,
                  manual_cases.filter(c => c.last_status === 'PASS').length),
    ui_auto: tally(ui_tests.length,
                   ui_tests.filter(t => t.last_status === 'pass').length),
    api_auto: tally(api_tests.length,
                    api_tests.filter(t => t.last_status === 'pass').length),
    bugs: {
      total: linked_bugs.length,
      prod: linked_bugs.filter(b => b.found_in === 'prod').length,
    },
    manual_cases, ui_tests, api_tests, linked_bugs,
  };
}

function tally(total: number, passing: number) {
  let state: CoverageState;
  if (total === 0) state = 'none';
  else if (passing === total) state = 'pass';
  else if (passing === 0) state = 'fail';
  else state = 'partial';
  return { total, passing, state };
}
```

---

## 8. Styling Guide

Use Tailwind utility classes. The visual language should be sober and dense — this is a working tool, not a marketing page.

| Element | Tailwind classes |
|---|---|
| Page background | `bg-slate-50` |
| Table container | `bg-white border border-slate-200 rounded-lg shadow-sm` |
| Header row | `bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wide` |
| Body row | `border-t border-slate-100 hover:bg-slate-50` |
| Row when expanded | `bg-slate-50` |
| Story key | `font-mono text-sm text-blue-700 hover:underline` |
| Pill — pass ✅ | `bg-green-50 text-green-700 ring-1 ring-green-200` |
| Pill — partial ⚠ | `bg-amber-50 text-amber-700 ring-1 ring-amber-200` |
| Pill — fail/none 🔴 | `bg-red-50 text-red-700 ring-1 ring-red-200` |
| Pill — intentional ⚪ | `bg-slate-100 text-slate-500 ring-1 ring-slate-200` |
| Bug count with prod | `text-red-600 font-semibold` |
| Expanded panel | `bg-slate-50 border-l-2 border-blue-300 ml-8 my-2 p-4 rounded` |
| `+ Add` button | `inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600` |

### Pill format

```jsx
// "5/8 ⚠"
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium [color classes]">
  <span className="font-mono">{passing}/{total}</span>
  <span>{icon}</span>
</span>
```

When total is 0, show just the icon: `<span>—</span>` for `none`, `<span>⚪</span>` for `intentional_none`.

---

## 9. Backend Endpoint Shape (For Future Wiring)

The prototype reads from static mock files. For production, expose these endpoints. Document them so Claude Code can wire the prototype to a real backend later.

```
GET /api/v1/coverage
    ?sprint=S42
    &epic=AMZN-1300
    &gaps_only=true
    &search=cart
    &page=1
    &page_size=50

Response:
{
  "total": 47,
  "page": 1,
  "page_size": 50,
  "rows": [ /* StoryCoverage[] */ ]
}

GET /api/v1/coverage/{story_key}/detail
Response: { /* full StoryCoverage including all linked records */ }

GET /api/v1/tests/{test_id}/runs?limit=5
Response: [{ status, executed_at, duration_ms, ci_url? }]

POST /api/v1/coverage/{story_key}/add-backlog
Body: { test_type: 'ui' | 'api' | 'manual', notes: string }
Response: { backlog_id, story_key }
```

The prototype can stub these with mock JSON files served from `public/mock-api/`.

---

## 10. Build Order for the Prototype

Ship in this sequence so you have something to show at each stage:

1. **Static page with mocked data, no interaction.** Render the matrix table with hardcoded coverage results. Coverage pills correct, sort by worst-first. (≈4 hours)
2. **Filter bar wired.** Sprint, epic, gaps-only, search all work against the mock data. (≈2 hours)
3. **Level 2 expansion.** Click a row, show the test list panel inline. (≈3 hours)
4. **Level 3 expansion.** Click a test, show its details with the last-5-runs sparkline. (≈2 hours)
5. **`+ Add` modals.** Stub modals that capture intent — they don't have to actually create records, just demonstrate the flow. (≈2 hours)
6. **Polish pass.** Empty states, loading skeletons, mobile width handling (single-column stack below 768px), keyboard navigation (arrow keys to move between rows, Enter to expand). (≈3 hours)

Target ~16 hours of focused build time for a manager-ready demo.

---

## 11. Demo Script (Talk Track for the Manager)

Use this when walking the manager through the prototype.

1. **Open at default sort.** "These are the 8 stories in this sprint with their coverage. Notice the top row — AMZN-1458, zero coverage and 2 prod bugs. That's exactly the kind of gap Excel can't surface."
2. **Click AMZN-1456.** "Prime cart persistence has manual coverage and API coverage, but zero UI tests. We have a prod bug on iOS Safari where the cart empties after re-login — the UI gap explains why we missed it."
3. **Click the `+ Add UI automation` button.** "From this view, a tester or SDET can immediately log an automation backlog item linked to this story — no tab switching, no losing context."
4. **Toggle 'Gaps only'.** "When the team does sprint planning, this filter shows everything we shipped without complete coverage. That's the action list."
5. **Click into AMZN-1382 → expand a test → show sparkline.** "Three clicks from the manager's overview to the exact test history. Same data the SDETs use, just at a different zoom level."
6. **Mention what's not in the demo but coming.** Daily execution health tab, prod bug trend tab, AI test ingestion. "This is the coverage view; it's the first of three surfaces. The architecture is the same — story key as the join, your data, your queries, no external API dependency."

---

## 12. Out of Scope For This Prototype

So Claude Code doesn't over-build:

- Authentication / users (mock a single user)
- Database — all data is static JSON
- Real CI integration (no JUnit ingest)
- Test case authoring UI (mention it as a link, don't build it)
- Manual test runner UI (separate spec)
- Prod bug entry form (separate spec)
- Daily execution health view (separate spec)
- Sprint/epic CRUD (these come from static lists)
- Mobile-optimized layout (responsive ok, native mobile no)
- Dark mode

---

## 13. Acceptance Criteria

A successful prototype meets all of:

- [ ] Matrix renders all 8 stories from the mock data with correct counts
- [ ] AMZN-1458 (worst-case) sorts to position 1 by default
- [ ] AMZN-1457 and AMZN-1461 (fully green) show three ✅ pills each
- [ ] AMZN-1456 expanded shows 2 manual cases, 0 UI tests, 2 API tests, and 1 prod bug callout
- [ ] AMZN-1458 expanded shows zero tests of any type and a prominent "no coverage" empty state with `+ Add` for each type
- [ ] Expanding a second row collapses the first
- [ ] Filter "Gaps only" hides AMZN-1457 and AMZN-1461 (both fully green)
- [ ] Search "promo" filters to AMZN-1463 only
- [ ] Clicking any story key opens `https://example.atlassian.net/browse/AMZN-XXXX` in a new tab (URL is configurable via env var)
- [ ] Page renders in under 200ms on the static data
- [ ] No console errors, no failed network calls (everything is local mocks)
