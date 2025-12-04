import type { FilterSpecification } from 'maplibre-gl'
import { useMemo, useState } from 'react'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import MapComponent, { Layer, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useBackgroundLayer } from '../hooks/useBackgroundLayer'
import { useMapState } from '../hooks/useMapState'
import { CURRENT_FEATURE_COLOR, MAPILLARY_ACCESS_TOKEN } from '../lib/constants'
import { createMapStyleFromLayer } from '../lib/createMapStyle'
import { getInitialMapStateFromFeature } from '../lib/mapUtils'
import { useFeatureStore } from '../store/useFeatureStore'

type MapillaryMapProps = {
  geometry: GeoJSON.Geometry
  onImageClick: (imageId: string) => void
  selectedImageId: string | null
}

export function MapillaryMap({ geometry, onImageClick, selectedImageId }: MapillaryMapProps) {
  const { currentLayer } = useBackgroundLayer()
  const mapStyle = useMemo(() => createMapStyleFromLayer(currentLayer), [currentLayer])
  const { mapillaryTimePeriods, setMapillaryTimePeriod } = useFeatureStore()

  const feature = useMemo(
    () => ({ type: 'Feature' as const, geometry, properties: {} }),
    [geometry],
  )
  const initialMapState = useMemo(() => getInitialMapStateFromFeature(feature), [feature])
  const [mapState, setMapState] = useMapState(initialMapState)

  const viewState = mapState || initialMapState

  const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
  const oneYearAgo = Date.now() - 1 * 365 * 24 * 60 * 60 * 1000
  const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
  const threeYearsAgo = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000

  // Show images newer than the oldest selected threshold, or older if enabled
  const buildTimeFilter = useMemo(() => {
    const thresholds = [
      mapillaryTimePeriods.threeYears && threeYearsAgo,
      mapillaryTimePeriods.twoYears && twoYearsAgo,
      mapillaryTimePeriods.oneYear && oneYearAgo,
      mapillaryTimePeriods.sixMonths && sixMonthsAgo,
    ].filter((t): t is number => typeof t === 'number')

    if (thresholds.length === 0 && !mapillaryTimePeriods.older) {
      return ['literal', false] as FilterSpecification
    }

    if (mapillaryTimePeriods.older && thresholds.length === 0) {
      return ['<', ['get', 'captured_at'], threeYearsAgo] as FilterSpecification
    }

    if (mapillaryTimePeriods.older) {
      // Show both newer than threshold AND older than 3 years
      const oldestThreshold = Math.min(...thresholds)
      return [
        'any',
        ['>', ['get', 'captured_at'], oldestThreshold],
        ['<', ['get', 'captured_at'], threeYearsAgo],
      ] as FilterSpecification
    }

    const oldestThreshold = Math.min(...thresholds)
    return ['>', ['get', 'captured_at'], oldestThreshold] as FilterSpecification
  }, [mapillaryTimePeriods, sixMonthsAgo, oneYearAgo, twoYearsAgo, threeYearsAgo])

  const buildColorStep = useMemo(() => {
    const steps: unknown[] = ['step', ['get', 'captured_at']]

    if (mapillaryTimePeriods.older) {
      steps.push('#9ca3af', threeYearsAgo, '#9ca3af') // gray-400 for older data
    } else if (mapillaryTimePeriods.threeYears) {
      steps.push('#3b82f6', threeYearsAgo, '#3b82f6')
    } else {
      steps.push('transparent', threeYearsAgo, 'transparent')
    }

    if (mapillaryTimePeriods.twoYears) {
      steps.push(twoYearsAgo, '#FFC01B')
    } else {
      steps.push(twoYearsAgo, 'transparent')
    }

    if (mapillaryTimePeriods.oneYear) {
      steps.push(oneYearAgo, '#05CB63')
    } else {
      steps.push(oneYearAgo, 'transparent')
    }

    steps.push(sixMonthsAgo, '#15803d')

    return steps as unknown
  }, [mapillaryTimePeriods, sixMonthsAgo, oneYearAgo, twoYearsAgo, threeYearsAgo])

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

  if (geometry.type !== 'LineString') {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="relative h-96 overflow-hidden rounded border bg-gray-100">
        <MapComponent
          id="mapillary-map"
          {...viewState}
          maxZoom={20.5}
          onMove={(evt) => {
            const { longitude, latitude, zoom } = evt.viewState
            setMapState({ longitude, latitude, zoom })
          }}
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
              const imageId = feature?.properties?.id
              if (imageId !== undefined && imageId !== null) {
                onImageClick(String(imageId))
              }
            }
          }}
        >
          {/* Current feature geometry - rendered first so mapillary points appear above */}
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
                'line-color': CURRENT_FEATURE_COLOR,
                'line-width': 4,
                'line-opacity': 0.9,
              }}
              filter={['==', '$type', 'LineString']}
            />
            <Layer
              id="current-feature-fill"
              type="fill"
              paint={{
                'fill-color': CURRENT_FEATURE_COLOR,
                'fill-opacity': 0.3,
              }}
              filter={['==', '$type', 'Polygon']}
            />
            <Layer
              id="current-feature-point"
              type="circle"
              paint={{
                'circle-color': CURRENT_FEATURE_COLOR,
                'circle-radius': 8,
                'circle-opacity': 0.9,
              }}
              filter={['==', '$type', 'Point']}
            />
          </Source>

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
                'line-color': buildColorStep,
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
              filter={buildTimeFilter}
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
                'circle-color': buildColorStep,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
              }}
              filter={
                ['all', buildTimeFilter, ['!=', ['get', 'is_pano'], true]] as FilterSpecification
              }
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
                'circle-color': buildColorStep,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
              }}
              filter={
                ['all', buildTimeFilter, ['==', ['get', 'is_pano'], true]] as FilterSpecification
              }
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
              filter={buildTimeFilter}
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
                'circle-stroke-color': buildColorStep,
                'circle-stroke-opacity': 0.8,
              }}
              filter={
                ['all', buildTimeFilter, ['==', ['get', 'is_pano'], true]] as FilterSpecification
              }
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
        </MapComponent>
      </div>

      {/* Legend */}
      <div className="rounded border bg-white p-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mapillaryTimePeriods.sixMonths}
              disabled
              className="size-3 rounded"
            />
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#15803d' }}
            ></div>
            <span>&lt; 6 months</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mapillaryTimePeriods.oneYear}
              onChange={(e) => setMapillaryTimePeriod('oneYear', e.target.checked)}
              className="size-3 rounded"
            />
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#05CB63' }}
            ></div>
            <span>&lt; 1 year</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mapillaryTimePeriods.twoYears}
              onChange={(e) => setMapillaryTimePeriod('twoYears', e.target.checked)}
              className="size-3 rounded"
            />
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#FFC01B' }}
            ></div>
            <span>1-2 years</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mapillaryTimePeriods.threeYears}
              onChange={(e) => setMapillaryTimePeriod('threeYears', e.target.checked)}
              className="size-3 rounded"
            />
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#3b82f6' }}
            ></div>
            <span>2-3 years</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mapillaryTimePeriods.older}
              onChange={(e) => setMapillaryTimePeriod('older', e.target.checked)}
              className="size-3 rounded"
            />
            <div
              className="size-3 rounded-full border border-white"
              style={{ backgroundColor: '#9ca3af' }}
            ></div>
            <span>Older</span>
          </label>
        </div>
      </div>
    </div>
  )
}
