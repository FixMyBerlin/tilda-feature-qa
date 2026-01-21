import { useMemo } from 'react'
import { useMapillaryImageLocations } from '../hooks/useMapillaryImageLocations'
import { useFeatureStore } from '../store/useFeatureStore'
import type { ImageGroup } from './MapillaryImageGrid'
import { MapillaryEmbed } from './MapillaryEmbed'
import { MapillaryImage } from './MapillaryImage'
import { MapillaryMap } from './MapillaryMap'

type MapillaryProps = {
  mapillaryId: string | null | undefined
  geometry: GeoJSON.Geometry
  imageGroups?: ImageGroup[]
}

export function Mapillary({ mapillaryId, geometry, imageGroups = [] }: MapillaryProps) {
  const {
    selectedMapillaryId,
    setSelectedMapillaryId,
    setSource,
    useApiPreview,
    setUseApiPreview,
  } = useFeatureStore()

  // Collect all image IDs from all groups with their cumulative indices and types
  const allImageIds = useMemo(() => {
    let cumulativeIndex = 0
    return imageGroups.flatMap((group) =>
      group.ids.map((id) => {
        const data = { id, index: cumulativeIndex, type: group.type }
        cumulativeIndex++
        return data
      }),
    )
  }, [imageGroups])

  // Memoize the image IDs array to prevent unnecessary API calls
  const imageIdsArray = useMemo(() => allImageIds.map((img) => img.id), [allImageIds])

  // Fetch locations for all images
  const { locations } = useMapillaryImageLocations(imageIdsArray)

  // Add index and type to locations
  const imageLocations = useMemo(() => {
    return locations.map((loc) => {
      const imgData = allImageIds.find((img) => img.id === loc.id)
      return {
        ...loc,
        index: imgData?.index ?? loc.index,
        type: imgData?.type ?? 'general',
      }
    })
  }, [locations, allImageIds])

  const effectiveMapillaryId = selectedMapillaryId || mapillaryId || undefined
  const isLineString = geometry.type === 'LineString'

  if (!effectiveMapillaryId && !isLineString) {
    return null
  }

  const handleImageClick = (imageId: string) => {
    setSelectedMapillaryId(imageId)
    setSource('mapillary')
  }

  return (
    <div className="space-y-4">
      {effectiveMapillaryId && (
        <div>
          <div className="overflow-hidden rounded border bg-gray-100">
            {useApiPreview ? (
              <MapillaryImage imageId={effectiveMapillaryId} className="w-full" />
            ) : (
              <MapillaryEmbed imageId={effectiveMapillaryId} height="400" className="w-full" />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                window.open(
                  `https://www.mapillary.com/app/?pKey=${effectiveMapillaryId}&focus=photo`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }}
              className="rounded bg-blue-50 px-3 py-2 text-blue-700 text-sm transition-colors hover:bg-blue-100"
            >
              Open in Mapillary
            </button>
            <button
              type="button"
              onClick={() => setUseApiPreview(!useApiPreview)}
              className="rounded bg-gray-200 px-3 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-300"
            >
              {useApiPreview ? 'Preview as iframe' : 'Preview as image (API)'}
            </button>
          </div>
        </div>
      )}

      {isLineString && (
        <MapillaryMap
          geometry={geometry}
          onImageClick={handleImageClick}
          selectedImageId={effectiveMapillaryId || null}
          imageLocations={imageLocations}
        />
      )}
    </div>
  )
}
