import { useEffect, useMemo, useState } from 'react'
import type { MapLayerMouseEvent, ViewState } from 'react-map-gl/maplibre'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { bbox } from '@turf/turf'
import { useBackgroundLayer } from '../hooks/useBackgroundLayer'
import { MAPILLARY_ACCESS_TOKEN } from '../lib/constants'
import { createMapStyleFromLayer } from '../lib/createMapStyle'

type MapillaryMapProps = {
  geometry: GeoJSON.Geometry
  onImageClick: (imageId: string) => void
  selectedImageId: string | null
}

export function MapillaryMap({ geometry, onImageClick, selectedImageId }: MapillaryMapProps) {
  const { currentLayer } = useBackgroundLayer()
  const mapStyle = useMemo(() => createMapStyleFromLayer(currentLayer), [currentLayer])

  if (geometry.type !== 'LineString') {
    return null
  }

  const initialViewState = useMemo(() => {
    try {
      const bounds = bbox({ type: 'Feature', geometry, properties: {} })
      const centerLng = (bounds[0]! + bounds[2]!) / 2
      const centerLat = (bounds[1]! + bounds[3]!) / 2

      const width = bounds[2]! - bounds[0]!
      const height = bounds[3]! - bounds[1]!
      const maxDimension = Math.max(width, height)

      // Approximate zoom level (rough calculation)
      let zoom = 14
      if (maxDimension > 0.1) zoom = 10
      else if (maxDimension > 0.05) zoom = 12
      else if (maxDimension > 0.01) zoom = 14
      else zoom = 16

      return {
        longitude: centerLng,
        latitude: centerLat,
        zoom,
        pitch: 0,
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      } as ViewState
    } catch {
      return {
        longitude: 13.4,
        latitude: 52.5,
        zoom: 14,
        pitch: 0,
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      } as ViewState
    }
  }, [geometry])

  const [viewState, setViewState] = useState<ViewState>(initialViewState)

  // Update viewState when geometry changes (new feature)
  useEffect(() => {
    setViewState(initialViewState)
  }, [initialViewState])

  const oneYearAgo = Date.now() - 1 * 365 * 24 * 60 * 60 * 1000
  const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
  const threeYearsAgo = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000

  const [cursorStyle, setCursorStyle] = useState('grab')

  const handleMouseEnter = (e: MapLayerMouseEvent) => {
    if (!e.features || !e.features.length) {
      setCursorStyle('grab')
      return
    }
    setCursorStyle('pointer')
  }

  const handleMouseLeave = (_e: MapLayerMouseEvent) => {
    setCursorStyle('grab')
  }

  return (
    <div className="space-y-2">
      <div className="relative h-96 overflow-hidden rounded border bg-gray-100">
        <Map
          id="mapillary-map"
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          attributionControl={true}
          customAttribution={currentLayer.attributionHtml}
          interactiveLayerIds={['mapillary-click-target']}
          cursor={cursorStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0]
              const imageId = feature?.properties?.id as string | undefined
              if (imageId) {
                onImageClick(String(imageId))
              }
            }
          }}
        >
          {/* Mapillary coverage tiles - https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}
            Tiles are only available at zoom 14, so we use overzooming for higher zooms.
            Contains: image layer (points) and sequence layer (lines)
            Sequences available at lower zooms, images only at zoom 14+ */}
          <Source
            id="mapillary-coverage"
            type="vector"
            tiles={[
              `https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${MAPILLARY_ACCESS_TOKEN}`,
            ]}
            minzoom={0}
            maxzoom={14}
          >
            {/* Sequence lines - sorted by captured_at (newest on top) */}
            <Layer
              id="mapillary-sequences"
              type="line"
              source-layer="sequence"
              layout={{
                'line-sort-key': ['get', 'captured_at'],
              }}
              paint={{
                'line-color': [
                  'step',
                  ['get', 'captured_at'],
                  '#3b82f6', // 2-3 years: blue (default for oldest)
                  threeYearsAgo,
                  '#3b82f6', // 2-3 years: blue
                  twoYearsAgo,
                  '#FFC01B', // 1-2 years: yellow
                  oneYearAgo,
                  '#05CB63', // <1 year: green
                ],
                'line-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  0.7,
                  14,
                  ['case', ['>', ['get', 'captured_at'], oneYearAgo], 0.9, 0.4],
                ],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  8,
                  1.5,
                  10,
                  1.5,
                  14,
                  2,
                  14.6,
                  1.3,
                ],
              }}
              filter={['case', ['<', ['get', 'captured_at'], threeYearsAgo], false, true]}
              minzoom={10}
            />

            {/* Image points - sorted by captured_at (newest on top) */}
            <Layer
              id="mapillary-images"
              type="circle"
              source-layer="image"
              layout={{
                'circle-sort-key': ['get', 'captured_at'],
              }}
              minzoom={14}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  0.1,
                  14.5,
                  3,
                  15,
                  3,
                  17,
                  5,
                ],
                'circle-blur': 0.5,
                'circle-color': [
                  'step',
                  ['get', 'captured_at'],
                  '#3b82f6', // 2-3 years: blue (default for oldest)
                  threeYearsAgo,
                  '#3b82f6', // 2-3 years: blue
                  twoYearsAgo,
                  '#FFC01B', // 1-2 years: yellow
                  oneYearAgo,
                  '#05CB63', // <1 year: green
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
              }}
              filter={[
                'all',
                ['case', ['<', ['get', 'captured_at'], threeYearsAgo], false, true],
                ['!=', ['get', 'is_pano'], true],
              ]}
            />

            {/* Panorama images - sorted by captured_at (newest on top) */}
            <Layer
              id="mapillary-images-pano"
              type="circle"
              source-layer="image"
              layout={{
                'circle-sort-key': ['get', 'captured_at'],
              }}
              minzoom={14}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  0.1,
                  14.5,
                  3,
                  15,
                  3,
                  17,
                  5,
                ],
                'circle-blur': 0.5,
                'circle-color': [
                  'step',
                  ['get', 'captured_at'],
                  '#3b82f6', // 2-3 years: blue (default for oldest)
                  threeYearsAgo,
                  '#3b82f6', // 2-3 years: blue
                  twoYearsAgo,
                  '#FFC01B', // 1-2 years: yellow
                  oneYearAgo,
                  '#05CB63', // <1 year: green
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
              }}
              filter={[
                'all',
                ['case', ['<', ['get', 'captured_at'], threeYearsAgo], false, true],
                ['==', ['get', 'is_pano'], true],
              ]}
            />

            {/* Click target layer (transparent, larger for easier clicking) - sorted by captured_at (newest on top) */}
            <Layer
              id="mapillary-click-target"
              type="circle"
              source-layer="image"
              layout={{
                'circle-sort-key': ['get', 'captured_at'],
              }}
              minzoom={14}
              paint={{
                'circle-radius': 10,
                'circle-color': 'transparent',
              }}
              filter={['case', ['<', ['get', 'captured_at'], threeYearsAgo], false, true]}
            />

            {/* Panorama rings - sorted by captured_at (newest on top) */}
            <Layer
              id="mapillary-images-pano-ring"
              type="circle"
              source-layer="image"
              layout={{
                'circle-sort-key': ['get', 'captured_at'],
              }}
              minzoom={14}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  0.1,
                  14.5,
                  6,
                  15,
                  6,
                  17,
                  8,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 2,
                'circle-stroke-color': [
                  'step',
                  ['get', 'captured_at'],
                  '#3b82f6', // 2-3 years: blue (default for oldest)
                  threeYearsAgo,
                  '#3b82f6', // 2-3 years: blue
                  twoYearsAgo,
                  '#FFC01B', // 1-2 years: yellow
                  oneYearAgo,
                  '#05CB63', // <1 year: green
                ],
                'circle-stroke-opacity': 0.8,
              }}
              filter={[
                'all',
                ['case', ['<', ['get', 'captured_at'], threeYearsAgo], false, true],
                ['==', ['get', 'is_pano'], true],
              ]}
            />

            {/* Highlight layer for selected image - renders on top */}
            <Layer
              id="mapillary-selected-highlight"
              type="circle"
              source-layer="image"
              minzoom={14}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  6,
                  14.5,
                  8,
                  15,
                  8,
                  17,
                  12,
                ],
                'circle-color': '#ff0000',
                'circle-opacity': 0.9,
                'circle-stroke-width': 4,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-opacity': 1,
              }}
              filter={
                selectedImageId
                  ? [
                      'any',
                      ['==', ['get', 'id'], selectedImageId],
                      ['==', ['to-string', ['get', 'id']], selectedImageId],
                    ]
                  : ['literal', false]
              }
            />
            <Layer
              id="mapillary-selected-ring"
              type="circle"
              source-layer="image"
              minzoom={14}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  12,
                  14.5,
                  16,
                  15,
                  16,
                  17,
                  20,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ff0000',
                'circle-stroke-opacity': 0.8,
              }}
              filter={
                selectedImageId
                  ? [
                      'any',
                      ['==', ['get', 'id'], selectedImageId],
                      ['==', ['to-string', ['get', 'id']], selectedImageId],
                    ]
                  : ['literal', false]
              }
            />
          </Source>

          {/* Current feature geometry - transparent thick line/area (below mapillary layers) */}
          <Source
            id="current-feature"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry,
                  properties: {},
                },
              ],
            }}
          >
            <Layer
              id="current-feature-line"
              type="line"
              paint={{
                'line-color': '#ec4899', // pink-500 to match main map
                'line-width': 8,
                'line-opacity': 0.15,
              }}
              filter={['==', '$type', 'LineString']}
            />
            <Layer
              id="current-feature-fill"
              type="fill"
              paint={{
                'fill-color': '#ec4899',
                'fill-opacity': 0.08,
              }}
              filter={['==', '$type', 'Polygon']}
            />
            <Layer
              id="current-feature-point"
              type="circle"
              paint={{
                'circle-color': '#ec4899',
                'circle-radius': 12,
                'circle-opacity': 0.2,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ec4899',
                'circle-stroke-opacity': 0.3,
              }}
              filter={['==', '$type', 'Point']}
            />
          </Source>
        </Map>
      </div>

      {/* Legend */}
      <div className="rounded border bg-white p-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#05CB63' }}
            ></div>
            <span>&lt; 1 year</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#FFC01B' }}
            ></div>
            <span>1-2 years</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#3b82f6' }}
            ></div>
            <span>2-3 years</span>
          </div>
        </div>
      </div>
    </div>
  )
}
