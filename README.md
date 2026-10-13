# Deal Pipeline

Kanban-style CRM for vehicle transport sales, from first quote to delivery. Built with React and TypeScript.

**Live demo:** (https://teodor-ninkov.github.io/deal-pipeline/)

![Screenshot](screenshot.png)

## Features

- Board with six stages (New, Quoted, Negotiating, Booked, Delivered, Lost) and drag and drop between them
- Deal panel: customer, vehicle, route, price, score, agent, pickup and follow-up dates
- Activity log per deal: notes, calls, emails, with stage changes logged automatically
- Summary strip: open pipeline value, won value, win rate, hot open deals, overdue follow-ups
- Search and filters by agent, score and overdue status
- CSV import that understands the output of [AI Lead Qualifier](https://github.com/teodor-ninkov/ai-lead-qualifier): imported leads land in New with a follow-up date based on their AI score
- CSV export of the whole pipeline
- Data is kept in the browser (localStorage), with sample data to start from
- Keyboard accessible, light and dark mode, responsive down to mobile

## Tech stack

- React 18, TypeScript, Vite
- Plain CSS with custom properties, no UI library
- Vitest and Testing Library for unit and component tests

## Project structure

```
src/
  App.tsx                  State, filtering, import/export
  components/
    Board.tsx              Columns and drag and drop
    DealCard.tsx           Card on the board
    DealDrawer.tsx         Edit panel with activity log
    FilterBar.tsx          Search and filters
    ImportDialog.tsx       CSV import with preview
    Metrics.tsx            Summary strip
  lib/
    csv.ts                 CSV parser, import mapping, export
    metrics.ts             Pipeline calculations
    storage.ts             localStorage persistence
    ids.ts                 Ids, dates, money formatting
  data/sample.ts           Sample deals
  __tests__/               Tests
docs/                      Production build, served by GitHub Pages
```

## Run locally

```bash
git clone https://github.com/teodor-ninkov/deal-pipeline.git
cd deal-pipeline
npm install
npm run dev
```

`npm test` runs the tests, `npm run build` type-checks and builds into `docs/`.
