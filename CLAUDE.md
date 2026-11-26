# Repository guidance

## Commands

```bash
npm run dev        # Frontend and development API middleware at localhost:5173
npm run build      # Production frontend in dist/
npm run lint       # ESLint
npm test           # Vitest
npm run build:map  # Regenerate bundled state outlines
npm run preview    # Built frontend only; no development API middleware
```

## Architecture

React 19 SPA using React Router, custom hooks, and React context. `src/App.jsx` mounts `AtlasProvider` and the persistent `src/pages/Atlas.jsx` shell around every route. `/` is the full map; `/overview` is the national dashboard. Charts, search, browsing, settings, and unknown routes open in the atlas research panel.

- `src/features/atlas/`: state geometry rendering, region/layer context, regional data hooks, research indicators, and US comparisons.
- `src/features/search/`: question detection, interpretation requests, deduplicated suggestions, and explicit start-year extraction.
- `src/features/browse/`: shared browsing layouts and pagination.
- `src/components/`: reusable header, charts, narrative, loading, and series components.
- `src/api/fred.js`: FRED client, endpoint wrappers, and observation fetching.
- `src/hooks/`: shared fetching and recently viewed history. History stores at most 20 entries in localStorage.

Use `AtlasNavigation.jsx` link and navigation helpers for internal navigation so region/layer context survives browsing, chart controls, and Back to map. Do not introduce a separate page shell or revive the removed sidebar.

## Server-side APIs and credentials

All browser FRED requests go through `/api/fred-proxy`. The server injects `FRED_API_KEY`; never put this credential in browser code or browser storage.

- Development: `vite.config.js` provides FRED and chart-analysis middleware. Its search adapter invokes the production `api/nl-search.js` handler.
- Production: Vercel runs `api/fred-proxy.js`, `api/analyze.js`, and `api/nl-search.js`.
- `api/shared/ai-config.js` defines shared AI prompts and reads model/service configuration. Keep prompts shared rather than duplicating them.
- `api/shared/search-interpretation.js` handles provider requests, output parsing, and validation. Structured output is requested only for supported services; cloud responses are prompted and validated.

Environment variables: `FRED_API_KEY`; for AI, `OLLAMA_BASE_URL` and `OLLAMA_MODEL`; and `OLLAMA_API_KEY` when the service requires authentication. Keep these server-side, without `VITE_` prefixes. Do not commit `.env`. Restart development after changing environment variables.

AI chart analysis receives a client-computed statistical summary. Plain-English search uses `isQuestion()` in `src/features/search/search.js`, then interprets questions into up to three terms. Suggestions are queried in parallel, deduplicated, and separated from keyword results. Keep cancellation signals connected through requests and retain keyword fallback when AI is unavailable. Explicit since/from years are carried into chart links.

## Economic data rules

- Map values load progressively, are paced, and use a 30-minute in-memory cache. Unfinished requests are cancelled when changing layers. Expanded research does not fetch all states in the background.
- Show observation dates and units; latest dates may differ between regions. Unavailable data must not become invented values or zeros.
- Income is current-dollar per-capita income. Housing is an index. Annual real GDP growth requires consecutive annual observations.
- Regional US benchmarks must match frequency, seasonality, and units; GDP comparisons use annual growth. Compute takeaways from an exact shared observation date within the selected range.
- Preserve missing observations as chart gaps. Range controls end at the latest valid observation, rather than today's date.
- National charts use national context. Unmapped series use labeled US references rather than inheriting an unrelated state.

## Design and checks

Read `DESIGN.md` before visual changes. Preserve the approved map-based experience unless the user requests a new direction. CSS is layered: `src/App.css` and `src/styles/modern.css` provide shared component styles; `src/styles/atlas.css` and `src/styles/atlas-workspace.css` apply the atlas treatment. These files remain active even where they contain legacy rules.

Tests are colocated in `__tests__/` directories. Run meaningful checks for the change; verify visual changes at desktop and mobile sizes. Keep geometry and its upstream license together in `public/maps/`. No external map service is required.
