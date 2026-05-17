# Coverage Matrix Prototype

QA Command Center — coverage view, built from `coverage-matrix-spec.md`.

Open-source example: an Amazon-style cart/checkout app used as a sample integration of the TCMS framework.

## Run

```
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build

```
npm run build
npm run preview
```

## Config

- `VITE_JIRA_BASE_URL` — base URL for story key links. Defaults to `https://example.atlassian.net`. Set in `.env.local` or via shell env.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS 3 for styling
- All data is static mock data in `src/data/*` — no backend required.

## Files of interest

- `src/pages/CoverageMatrix.tsx` — page container, URL filter sync
- `src/lib/coverage.ts` — `computeStoryCoverage`, `sortByWorstFirst`, `hasAnyGap`
- `src/components/CoverageMatrix/MatrixTable.tsx` — top-level table + keyboard nav
- `src/components/CoverageMatrix/StoryRow.tsx` — row + level-2 expansion trigger
- `src/components/CoverageMatrix/ExpandedStoryPanel.tsx` — level-2 panel with test list, gap callout, linked bugs
- `src/components/CoverageMatrix/ExpandedTestPanel.tsx` — level-3 detail (sparkline, owner, file path, CI link)
