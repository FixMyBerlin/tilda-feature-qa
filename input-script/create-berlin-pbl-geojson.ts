#!/usr/bin/env bun

/**
 * Script to create a GeoJSON of all bikelanes with category cyclewayOnHighwayProtected in Berlin.
 * Features are grouped by highway name.
 *
 * Usage: bun app/scripts/create-berlin-pbl-geojson.ts
 */

// Use GEO_DATABASE_URL instead of DATABASE_URL to avoid Prisma-specific parameters
// Clean the URL to remove parameters that bun doesn't understand
const cleanDatabaseUrl = (url: string) => {
  return url
    .replace('?schema=prisma', '')
    .replace('?pool_timeout=0', '')
    .replace('&pool_timeout=0', '')
    .replace('&schema=prisma', '')
}

const DATABASE_URL =
  cleanDatabaseUrl(process.env.GEO_DATABASE_URL || '') ||
  cleanDatabaseUrl(process.env.DATABASE_URL || '') ||
  ''

// Set the database URL for bun's sql template literal
if (DATABASE_URL) {
  // @ts-expect-error it seems to work and this script is not that important…
  process.env.DATABASE_URL = DATABASE_URL
}

function buildOsmLink(osmType: string, osmId: string) {
  // Map single-letter OSM types to full words (database stores W/N/R)
  const typeMap: Record<string, string> = {
    W: 'way',
    w: 'way',
    N: 'node',
    n: 'node',
    R: 'relation',
    r: 'relation',
    way: 'way',
    node: 'node',
    relation: 'relation',
  }
  const type = typeMap[osmType] || osmType.toLowerCase()
  return `https://www.openstreetmap.org/${type}/${osmId}`
}

function buildTildaLink(lat: number, lng: number) {
  return `https://tilda-geo.de/regionen/infravelo?map=18.8/${lat}/${lng}&config=l6jzgk.5ount5.4&v=2&bg=areal2025-summer`
}

function buildMapillaryLink(pKey: string, lat: number, lng: number) {
  return `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=18.8&panos=true&pKey=${pKey}`
}

function buildMapillaryFullLink(lat: number, lng: number) {
  return `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=18.8&panos=true`
}

function getFirstPoint(geometry: { type: string; coordinates: number[][] | number[][][] }) {
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

type BikelaneRow = {
  osm_type: string
  osm_id: string
  category: string
  highway_name: string | null
  parent_highway: string | null
  mapillary: string | null
  geometry: {
    type: string
    coordinates: number[][] | number[][][]
  }
}

type GeoJSONFeature = {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[][] | number[][][]
  }
  properties: {
    category: string
    id: string
    osm_link: string
    tilda_link: string
    mapillary_id: string | null
    mapillary_link: string | null
    mapillary_full_link: string | null
    highway_name: string | null
    instruction: string
  }
}

async function main() {
  console.log('Querying bikelanes with category cyclewayOnHighwayProtected in Berlin...')

  const query = `
    SELECT
      b.osm_type,
      b.osm_id,
      b.tags->>'category' as category,
      COALESCE(b.tags->>'name', r.tags->>'name', 'Unnamed') as highway_name,
      b.tags->>'_parent_highway' as parent_highway,
      b.tags->>'mapillary' as mapillary,
      ST_AsGeoJSON(ST_Transform(b.geom, 4326))::json as geometry
    FROM bikelanes b
    LEFT JOIN roads r ON b.tags->>'_parent_highway' = r.id
    WHERE b.tags->>'category' = 'cyclewayOnHighwayProtected'
    AND ST_Intersects(
      b.geom,
      ST_Transform(
        ST_MakeEnvelope(13.2809, 52.46, 13.4929, 52.5528, 4326),
        3857
      )
    )
    ORDER BY highway_name, b.osm_id
  `

  const rows = await Bun.sql.unsafe<BikelaneRow[]>(query)

  console.log(`Found ${rows.length} bikelanes`)

  // Group features by highway name
  const featuresByHighway = new Map<string, GeoJSONFeature[]>()

  for (const row of rows) {
    const highwayName = row.highway_name || 'Unnamed'
    const firstPoint = getFirstPoint(row.geometry)

    if (!firstPoint) {
      console.warn(`Skipping row ${row.osm_id}: could not extract first point from geometry`)
      continue
    }

    const [lat, lng] = firstPoint
    const osmLink = buildOsmLink(row.osm_type, row.osm_id)
    const tildaLink = buildTildaLink(lat, lng)

    // Handle semicolon-separated mapillary IDs
    const mapillaryIds = row.mapillary
      ? row.mapillary
          .split(';')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : []
    const firstMapillaryId = mapillaryIds.length > 0 ? mapillaryIds[0] : null
    const firstMapillaryLink = firstMapillaryId
      ? buildMapillaryLink(firstMapillaryId, lat, lng)
      : null
    const mapillaryFullLink = buildMapillaryFullLink(lat, lng)

    // Build instruction with actual URLs (not mustache tags)
    const instructionParts: string[] = [
      'Prüfen, ob diese PBL wirklich eine ist oder nur falsch kategorisiert wurde.',
      '',
      `* [OSM Link](${osmLink})`,
      `* [TILDA Link](${tildaLink})`,
    ]

    // Add all Mapillary links if there are multiple IDs
    if (mapillaryIds.length > 0) {
      for (const mapillaryId of mapillaryIds) {
        const mapillaryLink = buildMapillaryLink(mapillaryId, lat, lng)
        instructionParts.push(`* [Mapillary Link](${mapillaryLink}) \`${mapillaryId}\``)
      }
    }
    if (mapillaryFullLink) {
      instructionParts.push(`* [Mapillary Link (ohne pKey)](${mapillaryFullLink})`)
    }
    instructionParts.push(`* Straße: ${highwayName}`)

    const instruction = instructionParts.join('\n')

    const feature: GeoJSONFeature = {
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        category: row.category,
        id: osmLink,
        osm_link: osmLink,
        tilda_link: tildaLink,
        mapillary_id: firstMapillaryId,
        mapillary_link: firstMapillaryLink,
        mapillary_full_link: mapillaryFullLink,
        highway_name: highwayName,
        instruction: instruction,
      },
    }

    if (!featuresByHighway.has(highwayName)) {
      featuresByHighway.set(highwayName, [])
    }
    featuresByHighway.get(highwayName)?.push(feature)
  }

  // Create GeoJSON collection with all features
  const allFeatures: GeoJSONFeature[] = []
  for (const features of featuresByHighway.values()) {
    allFeatures.push(...features)
  }

  const geojson = {
    type: 'FeatureCollection',
    features: allFeatures,
  }

  // Write to file in root folder
  const outputPath = './berlin_cyclewayOnHighwayProtected.geojson'
  await Bun.write(outputPath, JSON.stringify(geojson, null, 2))

  console.log(`\n✅ Created GeoJSON file: ${outputPath}`)
  console.log(`   Total features: ${allFeatures.length}`)
  console.log(`   Grouped by ${featuresByHighway.size} highway names`)
  console.log(`\nHighway names with most features:`)

  const sortedHighways = Array.from(featuresByHighway.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)

  for (const [name, features] of sortedHighways) {
    console.log(`   ${name}: ${features.length} features`)
  }
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0)
  })
