import Dexie, { type Table } from 'dexie'
import { useFeatureStore } from '../store/useFeatureStore'
import { buildMapRouletteDescription } from './mapRoulette'

export type FeatureRecord = {
  id: string // properties.id
  feature: GeoJSON.Feature
  sortOrder: number // Order for fast retrieval
}

export type EvaluationSource = 'aerial_imagery' | 'mapillary' | 'other'

export type MetadataRecord = {
  key: string
  value: string
}

export type PropertyEvaluation = {
  status: 'ok' | 'wrong'
  comment?: string
}

export type EvaluationRecord = {
  featureId: string
  source: EvaluationSource
  mapillaryId?: string
  propertyEvaluations: Record<string, PropertyEvaluation>
  timestamp: number
}

class FeatureReviewDB extends Dexie {
  features!: Table<FeatureRecord, string>
  evaluations!: Table<EvaluationRecord, string>
  metadata!: Table<MetadataRecord, string>

  constructor() {
    super('FeatureReviewDB')
    this.version(1).stores({
      features: 'id, sortOrder',
      evaluations: 'featureId',
    })
    this.version(2).stores({
      features: 'id, sortOrder',
      evaluations: 'featureId',
    })
    this.version(3)
      .stores({
        features: 'id, sortOrder',
        evaluations: 'featureId',
      })
      .upgrade(async (tx) => {
        // Migrate existing evaluations to include source field
        const evaluations = await tx.table('evaluations').toArray()
        await Promise.all(
          evaluations.map((evaluation) => {
            if (!evaluation.source) {
              return tx.table('evaluations').update(evaluation.featureId, {
                ...evaluation,
                source: 'aerial_imagery' as EvaluationSource,
              })
            }
            return Promise.resolve()
          }),
        )
      })
    this.version(4)
      .stores({
        features: 'id, sortOrder',
        evaluations: 'featureId',
        metadata: 'key',
      })
      .upgrade(async (tx) => {
        // Clear existing data as it doesn't conform to new schema
        await tx.table('features').clear()
        await tx.table('evaluations').clear()
      })
  }
}

export const db = new FeatureReviewDB()

export async function loadFeatures(geojson: GeoJSON.FeatureCollection, regionSlug: string) {
  const validFeatures = geojson.features.filter((feature) => {
    const id = feature.properties?.id as string
    if (!id) {
      console.warn('Feature missing id in properties, skipping:', feature)
      return false
    }
    return true
  })

  if (validFeatures.length === 0) {
    throw new Error('No features with valid id property found in GeoJSON')
  }

  // Store region slug in metadata
  await db.metadata.put({
    key: 'tilda_region_slug',
    value: regionSlug,
  })

  // Sort features by spatial connectivity (only once during import)
  console.log(`Sorting ${validFeatures.length} features by spatial connectivity...`)
  const { sortFeaturesBySpatialConnectivity } = await import('./geojson')
  const sortedFeatures = sortFeaturesBySpatialConnectivity(validFeatures)

  const featureRecords: FeatureRecord[] = sortedFeatures.map((feature, index) => ({
    id: feature.properties?.id as string,
    feature,
    sortOrder: index,
  }))

  console.log(`Storing ${featureRecords.length} features in IndexedDB...`)
  await db.features.bulkPut(featureRecords)
  console.log('Features stored successfully')
}

export async function getRegionSlug() {
  const record = await db.metadata.get('tilda_region_slug')
  const slug = record?.value || null
  // Store in Zustand for synchronous access
  if (slug) {
    useFeatureStore.getState().setRegionSlug(slug)
  }
  return slug
}

export async function getAllFeatures() {
  // Get features sorted by sortOrder (fast, no computation needed)
  const records = await db.features.orderBy('sortOrder').toArray()
  return records.map((r: FeatureRecord) => r.feature)
}

export async function getUnevaluatedFeatures() {
  const allFeatures = await getAllFeatures()
  const evaluatedFeatureIds = new Set(
    (await db.evaluations.toArray()).map((e: EvaluationRecord) => e.featureId),
  )

  return allFeatures.filter((feature) => !evaluatedFeatureIds.has(feature.properties?.id as string))
}

export async function hasWrongStatus(featureId: string) {
  const evaluation = await db.evaluations.get(featureId)
  if (!evaluation) return false
  return Object.values(evaluation.propertyEvaluations).some(
    (evalData) => evalData.status === 'wrong',
  )
}

export async function getEvaluatedCount() {
  return await db.evaluations.count()
}

export async function getFeatureById(featureId: string) {
  const record = await db.features.get(featureId)
  return record?.feature
}

export async function getEvaluation(featureId: string) {
  return await db.evaluations.get(featureId)
}

export async function getPropertyEvaluations(featureId: string) {
  const evaluation = await db.evaluations.get(featureId)
  return evaluation?.propertyEvaluations || {}
}

export async function evaluateFeature(
  featureId: string,
  source: EvaluationSource,
  propertyEvaluations: Record<string, PropertyEvaluation>,
  mapillaryId?: string,
) {
  await db.evaluations.put({
    featureId,
    source,
    mapillaryId,
    propertyEvaluations,
    timestamp: Date.now(),
  })
}

export async function updatePropertyEvaluation(
  featureId: string,
  propertyName: string,
  status: 'ok' | 'wrong',
  comment?: string,
) {
  const existing = await db.evaluations.get(featureId)
  const propertyEvaluations = existing?.propertyEvaluations || {}
  propertyEvaluations[propertyName] = { status, comment }
  await db.evaluations.put({
    featureId,
    source: existing?.source || 'aerial_imagery',
    mapillaryId: existing?.mapillaryId,
    propertyEvaluations,
    timestamp: existing?.timestamp || Date.now(),
  })
}

function addEvaluationProperties(
  feature: GeoJSON.Feature,
  evaluation: EvaluationRecord,
): GeoJSON.Feature {
  const newProperties: Record<string, unknown> = { ...feature.properties }
  for (const [baseName, evalData] of Object.entries(evaluation.propertyEvaluations)) {
    newProperties[`${baseName}_STATUS`] = evalData.status
    if (evalData.comment) {
      newProperties[`${baseName}_STATUS_DESC`] = evalData.comment
    }
  }
  newProperties.STATUS_SOURCE = evaluation.source
  if (evaluation.mapillaryId) {
    newProperties.STATUS_MAPILLARY_ID = evaluation.mapillaryId
  }

  return {
    ...feature,
    properties: newProperties,
  }
}

export async function exportAllFeatures() {
  const allFeatures = await getAllFeatures()
  const evaluations = await db.evaluations.toArray()
  const evaluationMap = new Map(evaluations.map((e: EvaluationRecord) => [e.featureId, e]))

  const featuresWithEvaluations = allFeatures
    .map((feature: GeoJSON.Feature) => {
      const featureId = feature.properties?.id as string
      const evaluation = evaluationMap.get(featureId)
      return evaluation ? addEvaluationProperties(feature, evaluation) : null
    })
    .filter((feature): feature is GeoJSON.Feature => feature !== null)

  return {
    type: 'FeatureCollection' as const,
    features: featuresWithEvaluations,
  }
}

export async function exportMapRouletteFeatures() {
  const allFeatures = await getAllFeatures()
  const evaluations = await db.evaluations.toArray()
  const evaluationMap = new Map(evaluations.map((e: EvaluationRecord) => [e.featureId, e]))

  // Filter features with at least one wrong status
  const featuresWithWrongStatus = allFeatures
    .map((feature: GeoJSON.Feature) => {
      const featureId = feature.properties?.id as string
      const evaluation = evaluationMap.get(featureId)
      if (!evaluation) return null
      const hasWrongStatus = Object.values(evaluation.propertyEvaluations).some(
        (evalData) => evalData.status === 'wrong',
      )
      return hasWrongStatus ? { feature, evaluation } : null
    })
    .filter(
      (item): item is { feature: GeoJSON.Feature; evaluation: EvaluationRecord } => item !== null,
    )

  const featuresWithDescriptions = await Promise.all(
    featuresWithWrongStatus.map(async ({ feature, evaluation }) => {
      const description = await buildMapRouletteDescription(feature, evaluation)
      const featureWithProps = addEvaluationProperties(feature, evaluation)
      return {
        ...featureWithProps,
        properties: {
          ...featureWithProps.properties,
          maproulette_task_description: description,
        },
      }
    }),
  )

  return {
    type: 'FeatureCollection' as const,
    features: featuresWithDescriptions,
  }
}

// Keep old function for backwards compatibility (deprecated)
export async function exportEvaluatedFeatures() {
  return exportAllFeatures()
}

export async function clearAllData() {
  await db.features.clear()
  await db.evaluations.clear()
  await db.metadata.clear()
}
