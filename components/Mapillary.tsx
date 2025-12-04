import { MapillaryEmbed } from './MapillaryEmbed'
import { MapillaryMap } from './MapillaryMap'
import { useFeatureStore } from '../store/useFeatureStore'

type MapillaryProps = {
  mapillaryId: string | null | undefined
  geometry: GeoJSON.Geometry
}

export function Mapillary({ mapillaryId, geometry }: MapillaryProps) {
  const { selectedMapillaryId, setSelectedMapillaryId, setSource } = useFeatureStore()

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
            <MapillaryEmbed imageId={effectiveMapillaryId} height="400" className="w-full" />
          </div>
          <a
            href={`https://www.mapillary.com/app/?pKey=${effectiveMapillaryId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-blue-600 text-sm hover:text-blue-800"
          >
            Open in Mapillary →
          </a>
        </div>
      )}

      {isLineString && (
        <MapillaryMap
          geometry={geometry}
          onImageClick={handleImageClick}
          selectedImageId={effectiveMapillaryId || null}
        />
      )}
    </div>
  )
}
