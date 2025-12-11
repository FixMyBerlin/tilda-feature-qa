import { useFeatureStore } from '../store/useFeatureStore'
import { MapillaryEmbed } from './MapillaryEmbed'
import { MapillaryImage } from './MapillaryImage'
import { MapillaryMap } from './MapillaryMap'

type MapillaryProps = {
  mapillaryId: string | null | undefined
  geometry: GeoJSON.Geometry
}

export function Mapillary({ mapillaryId, geometry }: MapillaryProps) {
  const {
    selectedMapillaryId,
    setSelectedMapillaryId,
    setSource,
    useApiPreview,
    setUseApiPreview,
  } = useFeatureStore()

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
        />
      )}
    </div>
  )
}
