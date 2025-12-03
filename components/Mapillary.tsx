import { useState } from 'react'
import { MapillaryEmbed } from './MapillaryEmbed'
import { MapillaryMap } from './MapillaryMap'

type MapillaryProps = {
  mapillaryId: string | null | undefined
  geometry: GeoJSON.Geometry
}

export function Mapillary({ mapillaryId, geometry }: MapillaryProps) {
  const [selectedMapillaryId, setSelectedMapillaryId] = useState<string | null>(mapillaryId || null)

  const isLineString = geometry.type === 'LineString'

  if (!selectedMapillaryId && !isLineString) {
    return null
  }

  return (
    <div className="space-y-4">
      {selectedMapillaryId && (
        <div>
          <div className="overflow-hidden rounded border bg-gray-100">
            <MapillaryEmbed imageId={selectedMapillaryId} height="400" className="w-full" />
          </div>
          <a
            href={`https://www.mapillary.com/app/?pKey=${selectedMapillaryId}`}
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
          onImageClick={setSelectedMapillaryId}
          selectedImageId={selectedMapillaryId}
        />
      )}
    </div>
  )
}
