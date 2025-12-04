import { useEffect, useMemo, useRef, useState } from 'react'
import MapComponent, { Layer, type MapRef, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { bbox } from '@turf/turf'
import { useBackgroundLayer } from '../hooks/useBackgroundLayer'
import { useMapState } from '../hooks/useMapState'
import { CURRENT_FEATURE_COLOR } from '../lib/constants'
import { createMapStyleFromLayer } from '../lib/createMapStyle'
import { getAllFeatures, getEvaluation } from '../lib/db'
import { getInitialMapStateFromFeature } from '../lib/mapUtils'
import { useFeatureStore } from '../store/useFeatureStore'
import { BackgroundLayerSelector } from './BackgroundLayerSelector'

type MapViewProps = {
  feature: GeoJSON.Feature
}

type FeatureWithEvaluation = GeoJSON.Feature & {
  evaluation?: 'good' | 'bad' | null
}

export function MapView({ feature }: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const { currentLayer } = useBackgroundLayer()
  const [allFeaturesWithEval, setAllFeaturesWithEval] = useState<FeatureWithEvaluation[]>([])
  const { mapLoaded, setMapLoaded } = useFeatureStore()

  const mapStyle = useMemo(() => createMapStyleFromLayer(currentLayer), [currentLayer])
  const featureId = feature.properties?.id as string

  const initialMapState = useMemo(() => getInitialMapStateFromFeature(feature), [feature])
  const [mapState, setMapState] = useMapState(initialMapState)

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
      }
    }
    loadFeatures()

    return () => {
      cancelled = true
    }
  }, [])

  const prevFeatureIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!mapRef.current || !feature.geometry) return
    if (prevFeatureIdRef.current === featureId) return

    prevFeatureIdRef.current = featureId
    const map = mapRef.current.getMap()
    try {
      const bounds = bbox(feature)
      if (
        bounds.length >= 4 &&
        bounds[0] != null &&
        bounds[1] != null &&
        bounds[2] != null &&
        bounds[3] != null
      ) {
        map.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
          ] as unknown as [number, number, number, number],
          {
            padding: { top: 20, bottom: 20, left: 20, right: 20 },
            duration: 0,
          },
        )
      }
      const newCenter = map.getCenter()
      const newZoom = map.getZoom()
      setMapState({
        longitude: newCenter.lng,
        latitude: newCenter.lat,
        zoom: newZoom,
      })
    } catch (err) {
      console.error('Error fitting bounds:', err)
      setMapState(initialMapState)
    }
  }, [feature, featureId, setMapState, initialMapState])

  const goodFeatures = allFeaturesWithEval.filter(
    (f) => f.evaluation === 'good' && (f.properties?.id as string) !== featureId,
  )
  const badFeatures = allFeaturesWithEval.filter(
    (f) => f.evaluation === 'bad' && (f.properties?.id as string) !== featureId,
  )
  const unverifiedFeatures = allFeaturesWithEval.filter(
    (f) => !f.evaluation && (f.properties?.id as string) !== featureId,
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

  const viewState = mapState || initialMapState

  return (
    <div className="relative h-full w-full" style={{ minHeight: '384px' }}>
      <MapComponent
        ref={mapRef}
        mapStyle={mapStyle}
        {...viewState}
        maxZoom={20.5}
        onLoad={() => {
          setMapLoaded(true)
        }}
        onMove={(evt) => {
          const { longitude, latitude, zoom } = evt.viewState
          setMapState({ longitude, latitude, zoom })
        }}
        style={{ width: '100%', height: '100%', minHeight: '384px' }}
        attributionControl={true}
        customAttribution={currentLayer.attributionHtml}
      >
        {mapLoaded && (
          <>
            {/* Unverified features - black dashed */}
            <Source
              key={`unverified-${featureId}`}
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
        <Source key={`good-${featureId}`} id="good" type="geojson" data={goodGeoJSON}>
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
        <Source key={`bad-${featureId}`} id="bad" type="geojson" data={badGeoJSON}>
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
          key={`current-${featureId}`}
          id="current"
          type="geojson"
          data={currentFeatureGeoJSON}
        >
          <Layer
            id="current-line"
            type="line"
            paint={{
              'line-color': CURRENT_FEATURE_COLOR,
              'line-width': 4,
              'line-opacity': 0.9,
            }}
            filter={['==', '$type', 'LineString']}
          />
          <Layer
            id="current-fill"
            type="fill"
            paint={{
              'fill-color': CURRENT_FEATURE_COLOR,
              'fill-opacity': 0.3,
            }}
            filter={['==', '$type', 'Polygon']}
          />
          <Layer
            id="current-point"
            type="circle"
            paint={{
              'circle-color': CURRENT_FEATURE_COLOR,
              'circle-radius': 8,
              'circle-opacity': 0.9,
            }}
            filter={['==', '$type', 'Point']}
          />
        </Source>
          </>
        )}
      </MapComponent>
      <BackgroundLayerSelector />
    </div>
  )
}
