# FRED Economic Atlas

Explore Federal Reserve Economic Data through an interactive US map, regional charts, and plain-English search. The app uses a shared atlas interface across maps, charts, browsing, and settings, with navy, ivory, sage, and gold styling and a matching US-map favicon.

Live app: [fred.mishchenko.us](https://fred.mishchenko.us)

## Explore the atlas

Select any state or Washington, DC on the map or in the state picker. Alaska and Hawaii appear as insets. Four economic layers are available:

| Layer | Regional measure |
| --- | --- |
| Unemployment | Unemployment rate |
| Income | Per-capita personal income in current dollars |
| Housing | House-price index, not a dollar home price |
| Growth | Annual real GDP growth, calculated from consecutive annual observations |

The regional card shows the latest value, observation date, recent trend, and an **Open source chart** action. The reset control clears the selection and restores the map's zoom and position while retaining the active layer. State and layer selections are shareable, for example `/?state=MA&layer=income`.

Map values load progressively, with paced requests and a 30-minute in-memory cache. Switching layers cancels unfinished requests. Each region uses its latest available observation, so dates may differ; uncolored states are still loading or unavailable.

## Research and charts

Opening a chart keeps the atlas header and navigation, with a location minimap and four regional research indicators beside the research panel. Choosing an indicator updates the chart and retains the selected date range. **Back to map** restores the map context. On smaller screens, the layout stacks and the research indicators form a horizontally scrollable rail.

- Interactive charts support 1-year, 5-year, 10-year, and full-history ranges, plus start dates carried from questions such as “unemployment since 2020.” Ranges end at the latest observation.
- Supported regional unemployment, income, housing, and annual GDP growth charts include an optional US benchmark, enabled by default. Frequency, seasonal adjustment, and units must be compatible; GDP comparisons use annual growth on both sides.
- Comparison takeaways use the latest exact observation date shared by both series within the selected range. Missing observations remain gaps. Housing differences are index points, not dollar price differences.
- GDP growth charts link to the original GDP levels. Series details include units, frequency, seasonal adjustment, observation range, and source notes.
- AI explanations are available in expanded charts. The compact map card focuses on the value and trend.

National charts show national context. Unmapped series show clearly labeled US reference indicators rather than inheriting an unrelated state's indicators.

## Search and browse

Search by keyword or ask a plain-English question. When configured, Ollama interprets the question into FRED search terms or series IDs. If AI is unavailable, keyword search remains available with a notice. The header also provides live series suggestions with keyboard navigation.

Browse topics with breadcrumbs, subtopics, and direct series lists; explore data sources and their releases; or browse releases and their series. Lists support filtering or pagination where applicable, with series sorting by popularity or title.

The national overview at `/overview` includes recently viewed series. The last 20 viewed series are stored locally in the browser and can be cleared in Settings. CSV export and observation tables are not part of the interface.

## Run locally

Use Node.js 20.19+ or 22.12+ and a [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html). Ollama is optional and enables plain-English interpretation and chart explanations.

```bash
git clone https://github.com/MrLion/FRED.git
cd FRED
npm install
cp .env.example .env
```

Fill in `.env`, then start the development server:

```bash
npm run dev
```

Open `http://localhost:5173`. The Vite development server handles the API routes locally; users do not enter API keys in the interface.

| Environment variable | Required | Purpose |
| --- | --- | --- |
| `FRED_API_KEY` | Yes | Server-side access to FRED data |
| `OLLAMA_BASE_URL` | For AI | Ollama service base URL, without `/api/chat` |
| `OLLAMA_MODEL` | For AI | Model available on the configured service |
| `OLLAMA_API_KEY` | If the service requires authentication | Bearer token for Ollama, including authenticated cloud services |

Use `.env.example` as the template. Keep credentials server-side; do not prefix them with `VITE_` or commit `.env`. Restart the development server after changing environment variables. AI availability also depends on the configured service's access and usage limits.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the app and development API middleware |
| `npm run build` | Build the frontend into `dist/` |
| `npm run preview` | Preview the built frontend; does not run the development API middleware |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run build:map` | Regenerate bundled state outlines |

## Deploy to Vercel

1. Import the repository and select the **Vite** framework preset.
2. Configure `FRED_API_KEY` and, for AI features, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_API_KEY` if required.
3. Deploy. The `api/` directory supplies serverless endpoints; `vercel.json` routes frontend navigation to the app.

A static frontend host alone does not provide the FRED proxy or AI endpoints. Production needs those server-side routes as well as the frontend build.

## Architecture

| Area | Technology |
| --- | --- |
| UI | React 19, React Router 7, plain CSS |
| Build | Vite 8 |
| Charts | Recharts |
| Map geometry | Bundled SVG paths generated with d3-geo, topojson-client, and us-atlas |
| Data | FRED REST API through a server-side proxy |
| AI | Ollama chat API through server-side endpoints |
| Browser storage | localStorage for recently viewed series |
| Checks | Vitest and ESLint |

```text
api/
  fred-proxy.js              FRED proxy; keeps the API key server-side
  nl-search.js               Plain-English search endpoint
  analyze.js                 Chart explanation endpoint
  shared/                    AI configuration and search interpretation
src/
  App.jsx                    Routes and persistent atlas shell
  api/fred.js                FRED client and endpoint wrappers
  components/                Shared header, chart, AI narrative, and list components
  features/
    atlas/                   Map, navigation context, regional data, and US comparisons
    browse/                  Shared browsing layout and pagination
    search/                  Search interpretation and result helpers
  hooks/                     Data fetching and viewing history
  pages/                     Atlas, overview, charts, search, browsing, and settings
  styles/                    Shared visual design and atlas layouts
public/
  favicon.svg                Navy, ivory, and gold atlas icon
  maps/                      Generated state geometry and upstream license
scripts/
  build-map.mjs              State geometry generator
vite.config.js               Build configuration and development API middleware
vercel.json                  Production frontend routing
```

Tests live beside their corresponding modules in `__tests__/` directories and cover API handling, search interpretation, atlas navigation, regional calculations, benchmarks, and research layouts.

## Map attribution

State boundaries come from Census-derived [us-atlas](https://github.com/topojson/us-atlas) geometry. The map and favicon are bundled locally, so no external map service or map API key is required. The upstream license is included at `public/maps/LICENSE-us-atlas.txt`.

## License

[MIT](LICENSE)
