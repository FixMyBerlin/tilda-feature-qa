import type { GeoJSON } from 'geojson'
import type { EvaluationRecord } from './db'
import { buildMapillaryLink, buildOsmLink, buildTildaLink } from './urlUtils'

function extractBaseName(key: string) {
  if (key.endsWith('_OLD')) {
    return key.slice(0, -4)
  }
  if (key.endsWith('_NEW')) {
    return key.slice(0, -4)
  }
  return null
}

export async function buildMapRouletteDescription(
  feature: GeoJSON.Feature,
  evaluation: EvaluationRecord,
) {
  const props = feature.properties || {}
  const parts: string[] = []

  // Intro line
  parts.push('Prüfen, ob diese Änderungen korrekt sind.')
  parts.push('')

  // Collect evaluated properties
  const evaluatedBaseNames = new Set<string>()
  const wrongProperties: Array<{
    baseName: string
    oldValue: string | number | null
    newValue: string | number | null
  }> = []
  const correctProperties: Array<{
    baseName: string
    oldValue: string | number | null
    newValue: string | number | null
  }> = []

  for (const [baseName, evalData] of Object.entries(evaluation.propertyEvaluations)) {
    evaluatedBaseNames.add(baseName)
    const oldKey = `${baseName}_OLD`
    const newKey = `${baseName}_NEW`
    const oldValue = props[oldKey] !== undefined ? props[oldKey] : null
    const newValue = props[newKey] !== undefined ? props[newKey] : null

    if (evalData.status === 'wrong') {
      wrongProperties.push({ baseName, oldValue, newValue })
    } else {
      correctProperties.push({ baseName, oldValue, newValue })
    }
  }

  // **Korrigiere diese Eigenschaften:** block (WRONG status only)
  if (wrongProperties.length > 0) {
    parts.push('**Korrigiere diese Eigenschaften:**')
    parts.push('')
    for (const prop of wrongProperties) {
      parts.push(`**${prop.baseName}** – WRONG`)
      parts.push(`* OLD: \`${prop.oldValue !== null ? String(prop.oldValue) : ''}\``)
      parts.push(`* NEW: \`${prop.newValue !== null ? String(prop.newValue) : ''}\``)
      parts.push('')
    }
  }

  // **Links:** section
  parts.push('**Links:**')

  // OSM link (if osm_id present)
  const osmId = props.osm_id as string | undefined
  if (osmId) {
    const osmLink = buildOsmLink(osmId)
    if (osmLink) {
      parts.push(`* [OSM Link](${osmLink})`)
    }
  }

  // TILDA link
  const tildaLink = buildTildaLink(feature.geometry)
  if (tildaLink) {
    parts.push(`* [TILDA Link](${tildaLink})`)
  }

  // Mapillary from evaluation
  if (evaluation.mapillaryId) {
    const mapillaryLink = buildMapillaryLink(evaluation.mapillaryId, feature.geometry)
    if (mapillaryLink) {
      parts.push(
        `* [Mapillary Link (aus Evaluation)](${mapillaryLink}) \`${evaluation.mapillaryId}\``,
      )
    }
  }

  // Mapillary from feature properties
  const propMapillaryId = props.mapillary_id as string | undefined
  if (propMapillaryId && propMapillaryId !== evaluation.mapillaryId) {
    const mapillaryLink = buildMapillaryLink(propMapillaryId, feature.geometry)
    if (mapillaryLink) {
      parts.push(`* [Mapillary Link (aus TILDA)](${mapillaryLink}) \`${propMapillaryId}\``)
    }
  }
  parts.push('')

  // "Diese Eigenschaften wurden außerdem geprüft..." list (CORRECT status)
  if (correctProperties.length > 0) {
    parts.push('Diese Eigenschaften wurden außerdem geprüft und als richtig markiert:')
    for (const prop of correctProperties) {
      const oldStr = prop.oldValue !== null ? `\`${String(prop.oldValue)}\`` : `\`-\``
      const newStr = prop.newValue !== null ? `\`${String(prop.newValue)}\`` : `\`-\``
      parts.push(`* \`${prop.baseName}\`: ${oldStr} -> ${newStr}`)
    }
    parts.push('')
  }

  // **Weitere Eigenschaften:** list (non-evaluated properties)
  const otherProps: Array<[string, unknown]> = []
  const evaluatedKeys = new Set<string>()
  for (const baseName of evaluatedBaseNames) {
    evaluatedKeys.add(`${baseName}_OLD`)
    evaluatedKeys.add(`${baseName}_NEW`)
  }
  // Also exclude special keys
  evaluatedKeys.add('id')
  evaluatedKeys.add('osm_id')
  evaluatedKeys.add('mapillary_id')

  for (const [key, value] of Object.entries(props)) {
    if (!evaluatedKeys.has(key) && !extractBaseName(key)) {
      otherProps.push([key, value])
    }
  }

  if (otherProps.length > 0) {
    parts.push('**Weitere Eigenschaften:**')
    for (const [key, value] of otherProps) {
      const valueStr =
        typeof value === 'string' || typeof value === 'number'
          ? String(value)
          : JSON.stringify(value)
      parts.push(`* \`${key}\`: \`${valueStr}\``)
    }
  }

  return parts.join('\n')
}
