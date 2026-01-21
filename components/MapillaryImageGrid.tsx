import { useEffect, useMemo } from 'react'

type MapillaryImageGridProps = {
  properties?: Record<string, unknown>
  onImageGroupsChange?: (groups: ImageGroup[]) => void
}

export type ImageGroup = {
  title: string
  ids: string[]
  source: string
  icon: string
  colorClass: string
  type: 'general' | 'traffic_sign'
}

export function MapillaryImageGrid({ properties, onImageGroupsChange }: MapillaryImageGridProps) {
  // Parse tilda_mapillary IDs from properties
  const imageGroups = useMemo(() => {
    if (!properties) return []

    const groups: ImageGroup[] = []

    // General view images
    const generalMapillary =
      properties.tilda_mapillary_NEW || properties.tilda_mapillary_OLD || properties.tilda_mapillary
    const generalSource = properties.tilda_mapillary_NEW
      ? 'NEW'
      : properties.tilda_mapillary_OLD
        ? 'OLD'
        : ''

    if (generalMapillary && typeof generalMapillary === 'string') {
      const ids = generalMapillary
        .split(';')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
      if (ids.length > 0) {
        groups.push({
          title: 'Allgemeine Ansichten zum Weg',
          ids,
          source: generalSource,
          icon: '🚴',
          colorClass: 'bg-blue-100 text-blue-800',
          type: 'general',
        })
      }
    }

    // Traffic sign images
    const trafficSignMapillary =
      properties.tilda_mapillary_traffic_sign_NEW ||
      properties.tilda_mapillary_traffic_sign_OLD ||
      properties.tilda_mapillary_traffic_sign
    const trafficSignSource = properties.tilda_mapillary_traffic_sign_NEW
      ? 'NEW'
      : properties.tilda_mapillary_traffic_sign_OLD
        ? 'OLD'
        : ''

    if (trafficSignMapillary && typeof trafficSignMapillary === 'string') {
      const ids = trafficSignMapillary
        .split(';')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
      if (ids.length > 0) {
        groups.push({
          title: 'Verkehrszeichen',
          ids,
          source: trafficSignSource,
          icon: '🚦',
          colorClass: 'bg-amber-100 text-amber-800',
          type: 'traffic_sign',
        })
      }
    }

    return groups
  }, [properties])

  // Notify parent component of image groups
  useEffect(() => {
    if (onImageGroupsChange) {
      onImageGroupsChange(imageGroups)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageGroups])

  if (imageGroups.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {imageGroups.map((group, groupIndex) => {
        // Calculate cumulative index offset for this group
        const indexOffset = imageGroups
          .slice(0, groupIndex)
          .reduce((sum, g) => sum + g.ids.length, 0)

        return (
          <div key={group.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span>{group.icon}</span>
                <span>
                  {group.title} ({group.ids.length})
                </span>
              </h3>
              {group.source && (
                <span className={`rounded px-2 py-1 text-xs font-medium ${group.colorClass}`}>
                  {group.source}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {group.ids.map((imageId, index) => {
                const displayNumber = indexOffset + index + 1
                return (
                  <div
                    key={imageId}
                    className="overflow-hidden rounded-lg border bg-white shadow-sm"
                  >
                    <div className="relative h-[512px]">
                      {/* Image number badge */}
                      <div className="absolute left-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white font-bold text-gray-900 shadow-lg">
                        {displayNumber}
                      </div>
                      <iframe
                        src={`https://www.mapillary.com/embed?image_key=${imageId}&style=photo`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        allowFullScreen
                        title={`Mapillary image ${imageId}`}
                        className="absolute inset-0"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                      <span className="text-xs text-gray-600">
                        Bild {displayNumber} / {imageGroups.reduce((sum, g) => sum + g.ids.length, 0)}
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-700">
                          {imageId}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(
                              `https://www.mapillary.com/app/?pKey=${imageId}&focus=photo`,
                              '_blank',
                              'noopener,noreferrer',
                            )
                          }}
                          className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          In Mapillary öffnen
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
