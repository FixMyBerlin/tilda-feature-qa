# Feature Review Tool

A simple web application for reviewing GeoJSON features with map visualization and evaluation capabilities. Features are stored locally in IndexedDB, allowing you to evaluate each feature as "correct" or "wrong" with optional comments.

## URL

https://tilda-feature-qa.netlify.app/

Deployment: https://app.netlify.com/projects/tilda-feature-qa/overview

## Next steps

- Rework the store to allow multiple files ("projects") with name, filename and features
- Rework the tool to handle TILDA data imports via URL and bbox and filter the data by criteria like `category=cyclewayOnHighwayProtected`

FYI: I tried adding a auto-detect for mapillary imagery via https://codepen.io/lewin76/pen/oggmKQW (from https://www.mapillary.com/developer/api-documentation/faq?locale=de_DE) but that did not work so now we click manually which works fine as well.

## Features

- Load GeoJSON files via file picker (stored in IndexedDB)
- View features on an interactive map with configurable background layers
- Evaluate features as "correct" or "wrong" with optional comments
- Filter to show only unevaluated features or all features
- Shareable URLs using feature IDs
- Export evaluated features as GeoJSON with evaluation data

## Setup

```bash
bun install
bun run dev
open http://localhost:4123
```



## Usage

1. Load a GeoJSON file using the file picker
2. Navigate through features using Previous/Next buttons
3. Evaluate each feature using the Correct/Wrong buttons
4. Add optional comments to evaluations
5. Toggle between showing all features or only unevaluated ones
6. Export evaluated features as GeoJSON when done
