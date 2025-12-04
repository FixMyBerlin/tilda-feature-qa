import { bbox } from '@turf/turf'

export function getInitialMapStateFromFeature(feature: GeoJSON.Feature) {
  try {
    const bounds = bbox(feature)
    const centerLng = (bounds[0] + bounds[2]) / 2
    const centerLat = (bounds[1] + bounds[3]) / 2

    // Calculate appropriate zoom based on feature size
    const width = bounds[2] - bounds[0]
    const height = bounds[3] - bounds[1]
    const maxDimension = Math.max(width, height)

    let zoom = 16
    if (maxDimension > 0.1) zoom = 10
    else if (maxDimension > 0.05) zoom = 12
    else if (maxDimension > 0.01) zoom = 14
    else if (maxDimension > 0.001) zoom = 16
    else zoom = 18

    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom,
    }
  } catch {
    if (feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates as [number, number]
      return {
        longitude: coords[0],
        latitude: coords[1],
        zoom: 18,
      }
    }
    if (feature.geometry.type === 'LineString' && feature.geometry.coordinates.length > 0) {
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
