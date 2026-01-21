import { useEffect, useState } from 'react'
import { MAPILLARY_ACCESS_TOKEN } from '../lib/constants'

export type MapillaryImageLocation = {
  id: string
  lng: number
  lat: number
  index: number
  groupType: 'general' | 'traffic_sign'
}

type MapillaryApiResponse = {
  computed_geometry?: {
    type: string
    coordinates: [number, number]
  }
  geometry?: {
    type: string
    coordinates: [number, number]
  }
}

export function useMapillaryImageLocations(imageIds: string[]) {
  const [locations, setLocations] = useState<MapillaryImageLocation[]>([])
  const [loading, setLoading] = useState(false)

  // Serialize imageIds to string for stable comparison
  const imageIdsKey = imageIds.join(',')

  useEffect(() => {
    if (imageIds.length === 0) {
      setLocations([])
      return
    }

    let cancelled = false
    setLoading(true)

    const fetchLocations = async () => {
      try {
        const results = await Promise.all(
          imageIds.map(async (id, index) => {
            try {
              const response = await fetch(
                `https://graph.mapillary.com/${id}?access_token=${MAPILLARY_ACCESS_TOKEN}&fields=id,computed_geometry,geometry`,
              )

              if (!response.ok) {
                console.warn(`Failed to fetch location for image ${id}`)
                return null
              }

              const data: MapillaryApiResponse = await response.json()
              const coords =
                data.computed_geometry?.coordinates || data.geometry?.coordinates

              if (!coords) {
                console.warn(`No coordinates found for image ${id}`)
                return null
              }

              return {
                id,
                lng: coords[0],
                lat: coords[1],
                index,
                groupType: 'general' as const,
              }
            } catch (err) {
              console.error(`Error fetching location for image ${id}:`, err)
              return null
            }
          }),
        )

        if (!cancelled) {
          const validLocations = results.filter((r) => r !== null)
          setLocations(validLocations)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching image locations:', err)
          setLoading(false)
        }
      }
    }

    fetchLocations()

    return () => {
      cancelled = true
    }
  }, [imageIdsKey, imageIds])

  return { locations, loading }
}
