import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, type MapRef, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { bbox } from '@turf/turf'
import { useBackgroundLayer } from '../hooks/useBackgroundLayer'
import { createMapStyleFromLayer } from '../lib/createMapStyle'
import { getAllFeatures, getEvaluation } from '../lib/db'
import { BackgroundLayerSelector } from './BackgroundLayerSelector'

type MapViewProps = {
  feature: GeoJSON.Feature
  evaluationUpdated?: number
}

type FeatureWithEvaluation = GeoJSON.Feature & {
  evaluation?: 'good' | 'bad' | null
}

export function MapView({ feature, evaluationUpdated }: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const { currentLayer } = useBackgroundLayer()
  const [allFeaturesWithEval, setAllFeaturesWithEval] = useState<FeatureWithEvaluation[]>([])

  const mapStyle = useMemo(() => createMapStyleFromLayer(currentLayer), [currentLayer])
  const currentFeatureId = feature.properties?.id as string

  // Load all features with their evaluation status
  // Reload when feature changes (evaluation might have changed)
  useEffect(() => {
    let cancelled = false
    const loadFeatures = async () => {
      try {
        const allFeatures = await getAllFeatures()
        if (cancelled) return

        const featuresWithEval: FeatureWithEvaluation[] = await Promise.all(
          allFeatures.map(async (f) => {
            const featureId = f.properties?.id as string
            const evaluation = await getEvaluation(featureId)
            return {
              ...f,
              evaluation: evaluation?.status || null,
            }
          }),
        )
        if (!cancelled) {
          setAllFeaturesWithEval(featuresWithEval)
        }
      } catch (err) {
        console.error('Error loading features for map:', err)
        // Don't block map rendering if feature loading fails
      }
    }
    loadFeatures()

    return () => {
      cancelled = true
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: reload when feature or evaluation changes
  }, [feature, evaluationUpdated])

  useEffect(() => {
    if (mapRef.current && feature.geometry) {
      const map = mapRef.current.getMap()
      try {
        const bounds = bbox(feature)
        map.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
          ] as [number, number, number, number],
          {
            padding: { top: 20, bottom: 20, left: 20, right: 20 },
            duration: 0,
          },
        )
      } catch (err) {
        console.error('Error fitting bounds:', err)
        // Fallback: center on first coordinate if available
        if (feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates as [number, number]
          map.setCenter(coords)
          map.setZoom(18)
        } else if (
          feature.geometry.type === 'LineString' &&
          feature.geometry.coordinates.length > 0
        ) {
          const coords = feature.geometry.coordinates[0] as [number, number]
          map.setCenter(coords)
          map.setZoom(18)
        }
      }
    }
  }, [feature])

  // Separate features by evaluation status
  const goodFeatures = allFeaturesWithEval.filter(
    (f) => f.evaluation === 'good' && (f.properties?.id as string) !== currentFeatureId,
  )
  const badFeatures = allFeaturesWithEval.filter(
    (f) => f.evaluation === 'bad' && (f.properties?.id as string) !== currentFeatureId,
  )
  const unverifiedFeatures = allFeaturesWithEval.filter(
    (f) => !f.evaluation && (f.properties?.id as string) !== currentFeatureId,
  )

  const goodGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: goodFeatures,
  }

  const badGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: badFeatures,
  }

  const unverifiedGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: unverifiedFeatures,
  }

  const currentFeatureGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [feature],
  }

  // Get initial view state from feature (will be overridden by fitBounds)
  const getInitialViewState = () => {
    try {
      const bounds = bbox(feature)
      const centerLng = (bounds[0] + bounds[2]) / 2
      const centerLat = (bounds[1] + bounds[3]) / 2
      return {
        longitude: centerLng,
        latitude: centerLat,
        zoom: 16,
      }
    } catch {
      if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates as [number, number]
        return {
          longitude: coords[0],
          latitude: coords[1],
          zoom: 18,
        }
      } else if (
        feature.geometry.type === 'LineString' &&
        feature.geometry.coordinates.length > 0
      ) {
        const coords = feature.geometry.coordinates[0] as [number, number]
        return {
          longitude: coords[0],
          latitude: coords[1],
          zoom: 18,
        }
      }
      return {
        longitude: 13.4,
        latitude: 52.5,
        zoom: 12,
      }
    }
  }

  return (
    <div className="relative h-full w-full" style={{ minHeight: '384px' }}>
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={getInitialViewState()}
        style={{ width: '100%', height: '100%', minHeight: '384px' }}
        attributionControl={true}
        customAttribution={currentLayer.attributionHtml}
      >
        {/* Unverified features - black dashed */}
        <Source
          key={`unverified-${currentFeatureId}`}
          id="unverified"
          type="geojson"
          data={unverifiedGeoJSON}
        >
          <Layer
            id="unverified-line"
            type="line"
            paint={{
              'line-color': '#000000',
              'line-width': 2,
              'line-opacity': 0.6,
              'line-dasharray': [2, 2],
            }}
            filter={['==', '$type', 'LineString']}
          />
          <Layer
            id="unverified-fill"
            type="fill"
            paint={{
              'fill-color': '#000000',
              'fill-opacity': 0.1,
            }}
            filter={['==', '$type', 'Polygon']}
          />
          <Layer
            id="unverified-point"
            type="circle"
            paint={{
              'circle-color': '#000000',
              'circle-radius': 4,
              'circle-opacity': 0.6,
            }}
            filter={['==', '$type', 'Point']}
          />
        </Source>

        {/* Good features - green */}
        <Source key={`good-${currentFeatureId}`} id="good" type="geojson" data={goodGeoJSON}>
          <Layer
            id="good-line"
            type="line"
            paint={{
              'line-color': '#22c55e', // green-500
              'line-width': 3,
              'line-opacity': 0.7,
            }}
            filter={['==', '$type', 'LineString']}
          />
          <Layer
            id="good-fill"
            type="fill"
            paint={{
              'fill-color': '#22c55e',
              'fill-opacity': 0.2,
            }}
            filter={['==', '$type', 'Polygon']}
          />
          <Layer
            id="good-point"
            type="circle"
            paint={{
              'circle-color': '#22c55e',
              'circle-radius': 6,
              'circle-opacity': 0.7,
            }}
            filter={['==', '$type', 'Point']}
          />
        </Source>

        {/* Bad features - red */}
        <Source key={`bad-${currentFeatureId}`} id="bad" type="geojson" data={badGeoJSON}>
          <Layer
            id="bad-line"
            type="line"
            paint={{
              'line-color': '#ef4444', // red-500
              'line-width': 3,
              'line-opacity': 0.7,
            }}
            filter={['==', '$type', 'LineString']}
          />
          <Layer
            id="bad-fill"
            type="fill"
            paint={{
              'fill-color': '#ef4444',
              'fill-opacity': 0.2,
            }}
            filter={['==', '$type', 'Polygon']}
          />
          <Layer
            id="bad-point"
            type="circle"
            paint={{
              'circle-color': '#ef4444',
              'circle-radius': 6,
              'circle-opacity': 0.7,
            }}
            filter={['==', '$type', 'Point']}
          />
        </Source>

        {/* Current feature - pink (on top) */}
        <Source
          key={`current-${currentFeatureId}`}
          id="current"
          type="geojson"
          data={currentFeatureGeoJSON}
        >
          <Layer
            id="current-line"
            type="line"
            paint={{
              'line-color': '#ec4899', // pink-500
              'line-width': 4,
              'line-opacity': 0.9,
            }}
            filter={['==', '$type', 'LineString']}
          />
          <Layer
            id="current-fill"
            type="fill"
            paint={{
              'fill-color': '#ec4899',
              'fill-opacity': 0.3,
            }}
            filter={['==', '$type', 'Polygon']}
          />
          <Layer
            id="current-point"
            type="circle"
            paint={{
              'circle-color': '#ec4899',
              'circle-radius': 8,
              'circle-opacity': 0.9,
            }}
            filter={['==', '$type', 'Point']}
          />
        </Source>
      </Map>
      <BackgroundLayerSelector />
    </div>
  )
}
