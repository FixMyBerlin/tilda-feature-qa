import { buildOsmLink, buildTildaLink } from '../lib/urlUtils'
import { Mapillary } from './Mapillary'

type PropertiesPanelProps = {
  feature: GeoJSON.Feature
  children?: (links: { osmLink: string | null; tildaLink: string | null }) => React.ReactNode
}

export function PropertiesPanel({ feature, children }: PropertiesPanelProps) {
  const osmId = feature.properties?.osm_id as string | undefined
  const osmLink = osmId ? buildOsmLink(osmId) : null
  const tildaLink = buildTildaLink(feature.geometry)

  if (children) {
    return <>{children({ osmLink, tildaLink })}</>
  }

  const hasLinks = osmLink || tildaLink

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow">
      {hasLinks && (
        <div className="flex flex-wrap gap-2">
          {osmLink && (
            <a
              href={osmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-blue-50 px-3 py-2 text-blue-700 text-sm transition-colors hover:bg-blue-100"
            >
              OSM Link
            </a>
          )}
          {tildaLink && (
            <a
              href={tildaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-blue-50 px-3 py-2 text-blue-700 text-sm transition-colors hover:bg-blue-100"
            >
              TILDA Link
            </a>
          )}
        </div>
      )}

      <Mapillary
        key={feature.properties?.id}
        mapillaryId={feature.properties?.mapillary_id}
        geometry={feature.geometry}
      />
    </div>
  )
}
