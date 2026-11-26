# FRED Economic Data

A web application for browsing and visualizing economic data from the Federal Reserve Bank of St. Louis (FRED). Built as a web-based alternative to the official FRED mobile app, with full support for smartphones, tablets, and desktops.

## Economic Atlas

The home page is an interactive United States economic atlas. Select a state (or DC) on the map or in the state picker, then switch between unemployment, per-capita income, house-price indexes, and annual real GDP growth. The floating regional panel shows the observation date, a recent trend, and a link to the source chart. AI explanations are available in the expanded chart, not the compact map card. The map reset button clears the selected region and resets zoom/pan while keeping the active economic layer.

The national dashboard remains at `/overview`. Charts, Search, Topics, Sources, Releases, Settings, and errors all open in a parchment research panel over the same persistent map, with one shared header/navigation and a Back to map action. State and layer context is retained across navigation and shareable links. Map selection and layer are shareable URL parameters, such as `/?state=MA&layer=income`.

Map data loads progressively and is cached in memory for 30 minutes. Requests are paced; switching layers cancels unfinished requests. The map uses the latest available observation for each region, so dates can differ. Uncolored regions are still loading or unavailable. Income is in current dollars; housing is an index, not a dollar price; GDP growth is calculated only between consecutive annual observations.

State outlines are generated from Census-derived [us-atlas](https://github.com/topojson/us-atlas) geometry, with Alaska and Hawaii insets. Geometry is bundled locally; no third-party map service or map key is needed. To regenerate it: `npm run build:map`. The upstream license is included in `public/maps/LICENSE-us-atlas.txt`.

## Expanded research view

Expanded pages use a location-only minimap and four live research indicators. Choosing an indicator updates the main chart and retains the date range. The full map keeps its economic layer controls; expanded research no longer recolors or fetches all states in the background.

Supported regional unemployment, per-capita income, housing indexes, and annual GDP growth include an optional US benchmark, enabled by default. Benchmarks must match frequency, seasonal adjustment, and units (or use calculated annual GDP growth on both sides). Takeaways use the most recent exact observation date shared by both series within the selected range. Missing dates remain gaps. Housing comparisons describe index points, not dollar home prices. GDP source levels remain accessible through “View original GDP levels.”

National indicators show national research context. Charts without a registered regional mapping use clearly labeled US reference indicators rather than inheriting an unrelated state. Original map selection is retained for Back to map.

## Design refresh

The Economic Atlas palette and shared map shell cover all pages, including charts, search results, national indicators, browsing, and settings. Plain-English search still uses the configured Ollama service. If AI is unavailable, keyword search remains available and a clear notice appears.

Explicit “since 2020” / “from 2020” questions carry that start year into result chart links. Charts retain missing observations, fetch complete histories, and provide shareable range controls. Saved series and comparison are future phases.

Browsing includes topic breadcrumbs, direct category series alongside subtopics, source and release name filters, expandable source publications, and paginated series sorted by popularity or title.

## Features

### Data Browsing
- **Category Navigation** -- Browse the full FRED category hierarchy starting from top-level categories (Money & Banking, Employment, Prices, International Data, etc.) and drill down into subcategories
- **Data Sources** -- View all 58+ data sources (Bureau of Labor Statistics, Census Bureau, Federal Reserve, IMF, World Bank, etc.) with expandable release lists
- **Releases** -- Browse economic data releases and the series they contain

### Series Visualization
- **Interactive Charts** -- Line charts powered by Recharts with automatic data point reduction for large datasets
- **Time Range Selection** -- Toggle between 1-year, 5-year, 10-year, and full history views
- **Latest Value Display** -- Prominent display of the most recent observation
- **Metadata Panel** -- Units, frequency, seasonal adjustment, date range, and source notes
- **AI Chart Analysis** -- Click "Explain this chart" to get an AI-generated narrative explaining trends, patterns, and economic significance (powered by Ollama)

### Search
- **Full-Text Search** -- Search across all FRED series by keyword (GDP, unemployment, inflation, etc.)
- **Natural Language Search** -- Ask questions like "Housing data in MA" and AI extracts the optimal FRED search terms (powered by Ollama)
- **Real-Time Suggestions** -- Live dropdown with top 6 matching series as you type, with keyboard navigation
- **Clear Button** -- One-tap button to reset the search input
- **Paginated Results** -- Load more results incrementally with series count display

### History
- **Recently Viewed** -- Automatically tracks the last 20 series you've viewed, displayed on the home screen for quick access
- **Persistent Storage** -- History survives page refreshes via localStorage

### Settings
- **Clear History** -- Remove all recently viewed entries

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite |
| Routing | React Router v7 |
| Charts | Recharts |
| AI Analysis | Ollama API via Vercel serverless functions |
| API | FRED REST API via server-side proxy |
| Storage | localStorage (history only) |
| Styling | Plain CSS with CSS custom properties |
| Testing | Vitest |

## Getting Started

### Prerequisites

1. **Node.js** (20.19+ or 22.12+)
2. **FRED API Key** -- Register for a free key at [fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)
3. **Ollama** -- For AI chart analysis, ensure an Ollama instance is accessible (configure `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in `.env`)

### Installation

```bash
git clone https://github.com/MrLion/FRED-economic-data.git
cd FRED-economic-data
npm install
cp .env.example .env   # Then fill in your API keys
npm run dev
```

Open `http://localhost:5173` in your browser. The app loads directly -- no API key entry needed. AI features require `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in your `.env` file.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FRED_API_KEY` | Yes | FRED API key for data access |
| `OLLAMA_BASE_URL` | For AI | Ollama API endpoint URL |
| `OLLAMA_MODEL` | For AI | Model name to use (e.g., `gemma4:31b-cloud`) |

### Deploying to Vercel

1. Import the project and select **Vite** as the framework preset
2. Set `FRED_API_KEY`, `OLLAMA_BASE_URL`, and `OLLAMA_MODEL` in Vercel environment variables
3. Deploy

## Project Structure

```
api/
  shared/
    ai-config.js           # Shared AI prompts + model config
  analyze.js               # Vercel serverless -- chart analysis
  nl-search.js             # Vercel serverless -- NL search
  fred-proxy.js            # Vercel serverless -- FRED API proxy
src/
  api/
    fred.js                # FRED API client -- all endpoint wrappers
  components/
    AiNarrator.jsx         # AI-powered chart analysis with Ollama
    Chart.jsx              # Recharts line chart with tooltips
    Header.jsx             # Shared Economic Atlas header with search and settings
    Loading.jsx            # Loading spinner and error display
    SeriesCard.jsx         # Card component for series lists
  hooks/
    useFred.js             # Generic async data fetching hook
    useHistory.js          # Recently viewed localStorage hook
  pages/
    Home.jsx               # Category grid + recently viewed
    Categories.jsx         # Hierarchical category browser
    Search.jsx             # Search results with pagination + NL search
    SeriesDetail.jsx       # Chart, metadata, and notes for a series
    Sources.jsx            # Data sources with expandable releases
    Releases.jsx           # Release list and release detail
    Settings.jsx           # History management
```

## Responsive Design

The layout adapts across three breakpoints:

- **Mobile** -- Compact map above stacked research panels; horizontally scrollable atlas navigation
- **Tablet** (640px -- 1023px) -- 3-column grids, larger typography
- **Desktop** -- Persistent map context beside a scrollable research panel; shared atlas navigation

## License

MIT
