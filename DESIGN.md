# Economic Atlas design

Current approved direction, November 26, 2026. This document replaces the earlier dashboard and sidebar specifications.

## Product direction

An accessible economic research tool built around a Civilization-inspired US map. The map provides geographic context throughout the experience, while charts and plain-language findings make the data understandable. Use original cartographic decoration and real economic observations.

## Shared experience

- One atlas header, prominent search, and navigation across every route.
- Home: full state map, four economic layers, state picker, legend, and a compact regional card.
- Expanded research: location-only minimap, four dated research indicator cards, and a parchment research panel. Indicator cards update the main chart. Back to map restores the regional context.
- Charts, search, topics, sources, releases, national overview, settings, and error pages use this same shell.
- Desktop places geographic context beside research. Small screens stack the map and panel, with horizontal navigation and an indicator rail. Avoid horizontal page overflow.

## Visual language

Warm ivory panels over blue water and muted sage terrain. Subtle hex grids, forest patterns, and mountains establish the atlas character; decoration conveys no economic meaning. Use thin borders, restrained shadows, and rounded controls. Keep chart and research content clear and readable.

Current atlas colors are defined in `src/styles/atlas.css` and `src/styles/atlas-workspace.css`:

| Role | Color |
| --- | --- |
| Main text / atlas ink | `#203752` |
| Header paper | `#FAF7EF` |
| Research canvas | `#F3F0E5` |
| Research surfaces | `#FFFDF7` |
| Primary actions | `#3264C8` |
| Primary selection tint | `#EAF0F9` |
| Secondary text | `#64736D` |
| Research border | `#DEDED0` |
| AI accent / surface | `#7357BD` / `#F1ECF8` |
| Water base | `#B6D0D2` |

The map's sequential data palette runs from `#D9E4CF` through `#ADC9BD`, `#7FB4B8`, and `#508EAA` to `#356382`. Selected states use a distinct blue highlight. Legends explain the active measurement and varying observation dates.

Use Plus Jakarta Sans for headings, body, and values, with tabular numerals for data. Geist Mono supports compact identifiers. Ocean labels use italic Georgia for cartographic character. Keep essential text readable; do not place long explanations in the small map card.

Use Lucide React for interface icons. The favicon is a simplified ivory contiguous-US silhouette on a rounded navy `#17324D` tile with a gold `#D7AE62` dot. It has no lettering or state borders, so it remains recognizable at small sizes.

## Map behavior

- Accurate Census-derived boundaries, including DC and Alaska/Hawaii insets.
- Mouse and keyboard state selection, plus a state picker for small regions and touch use.
- Pan and zoom on the full map. Reset clears selection and restores zoom/pan while keeping the economic layer.
- Compact card: regional name, latest value and units, observation date, short trend, and Open source chart.
- Ocean labels remain fully visible beside the land geometry.
- Minimap in expanded research is geographic context; do not repeat full-map layer controls or silently recolor the background.

## Charts and data meaning

Show the series identity, latest value, measurement units, date, range controls, chart, explanation action, and metadata in a clear reading order. Use a blue primary series and a dashed contrasting US benchmark with named legend and tooltip entries.

- US comparisons are optional and enabled by default for supported regional indicators.
- Use compatible measurements and exact shared dates. Missing observations remain gaps.
- Housing differences are index points, not dollar prices. GDP comparisons use calculated annual growth; original levels remain accessible.
- Range controls and explicit start dates are shareable and retain map context.
- AI explanations belong in expanded charts, where there is space to read them. They remain distinct from deterministic comparison takeaways.

## Search, browsing, and feedback

Keep plain-English search automatic. Distinguish AI-suggested matches from keyword results, show interpreted terms, and preserve keyword search with a notice when AI is unavailable. Header suggestions support keyboard navigation.

Browsing uses shared navigation, topic breadcrumbs, readable directory rows, source publication accordions, filters, and counted pagination. National overview and recently viewed history remain available at `/overview`.

Load content independently so a failed benchmark or AI request does not hide the primary chart. Provide meaningful empty states, readable error messages, and retry controls where applicable. Keep observation dates visible and distinguish unavailable data from a measured zero.

Maintain visible keyboard focus, accessible control names, and reduced-motion support. Use concise, plain-language labels and findings. Do not imply that an economic increase or decrease is inherently good or bad.

## Scope and maintenance

CSV export, observation tables, the separate sidebar/bottom navigation, and AI text in the compact map card were removed by request. Do not reintroduce them. Saved series, arbitrary multi-series comparison, and dark mode are not implemented; do not show nonfunctional controls for them. Supported regional US benchmarks are already implemented.

The stylesheets remain layered: `src/App.css` and `src/styles/modern.css` support shared components; the atlas styles apply the current material palette and layouts. Remove legacy CSS only after checking component usage and responsive behavior, rather than deleting an entire active stylesheet.
