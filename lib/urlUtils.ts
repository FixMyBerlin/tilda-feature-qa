import type { GeoJSON } from 'geojson'
import { useFeatureStore } from '../store/useFeatureStore'

function getFirstPoint(geometry: GeoJSON.Geometry) {
  if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
    const firstCoord = geometry.coordinates[0]
    if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
      return [firstCoord[1], firstCoord[0]] // [lat, lng] from [lng, lat]
    }
  } else if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    const firstLine = geometry.coordinates[0]
    if (Array.isArray(firstLine) && firstLine.length > 0) {
      const firstCoord = firstLine[0]
      if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
        return [firstCoord[1], firstCoord[0]] // [lat, lng] from [lng, lat]
      }
    }
  }
  return null
}

export function buildOsmLink(osmId: string) {
  // Parse format: way/123, node/456, relation/789
  const match = osmId.match(/^(way|node|relation)\/(\d+)$/)
  if (!match) {
    return null
  }
  const [, type, id] = match
  return `https://www.openstreetmap.org/${type}/${id}`
}

export function buildTildaLink(geometry: GeoJSON.Geometry) {
  const regionSlug = useFeatureStore.getState().regionSlug
  const firstPoint = getFirstPoint(geometry)
  if (!firstPoint || !regionSlug) {
    return null
  }
  const [lat, lng] = firstPoint
  return `https://tilda-geo.de/regionen/${regionSlug}?map=18.8/${lat}/${lng}&config=l6jzgk.5ount5.4&v=2&bg=areal2025-summer`
}

export function buildMapillaryLink(pKey: string, geometry: GeoJSON.Geometry) {
  const firstPoint = getFirstPoint(geometry)
  if (!firstPoint) {
    return null
  }
  const [lat, lng] = firstPoint
  return `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=18.8&panos=true&focus=photo&pKey=${pKey}`
}

export function buildMapillaryFullLink(geometry: GeoJSON.Geometry) {
  const firstPoint = getFirstPoint(geometry)
  if (!firstPoint) {
    return null
  }
  const [lat, lng] = firstPoint
  return `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=18.8&panos=true&focus=photo`
}
