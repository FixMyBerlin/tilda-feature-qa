import Dexie, { type Table } from 'dexie'

export interface FeatureRecord {
  id: string // properties.id
  feature: GeoJSON.Feature
  sortOrder: number // Order for fast retrieval
}

export type EvaluationSource = 'aerial_imagery' | 'mapillary' | 'other'

export interface EvaluationRecord {
  featureId: string
  status: 'good' | 'bad'
  comment?: string
  source: EvaluationSource
  mapillaryId?: string
  timestamp: number
}

class FeatureReviewDB extends Dexie {
  features!: Table<FeatureRecord, string>
  evaluations!: Table<EvaluationRecord, string>

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
          }),
        )
      })
  }
}

export const db = new FeatureReviewDB()

export async function loadFeatures(geojson: GeoJSON.FeatureCollection) {
  // First, filter out features without IDs
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

  // Sort features by spatial connectivity (only once during import)
  console.log(`Sorting ${validFeatures.length} features by spatial connectivity...`)
  const { sortFeaturesBySpatialConnectivity } = await import('./geojson')
  const sortedFeatures = sortFeaturesBySpatialConnectivity(validFeatures)

  // Create records with sort order
  const featureRecords: FeatureRecord[] = sortedFeatures.map((feature, index) => ({
    id: feature.properties?.id as string,
    feature,
    sortOrder: index,
  }))

  console.log(`Storing ${featureRecords.length} features in IndexedDB...`)
  await db.features.bulkPut(featureRecords)
  console.log('Features stored successfully')
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

export async function evaluateFeature(
  featureId: string,
  status: 'good' | 'bad',
  comment?: string,
  source: EvaluationSource = 'aerial_imagery',
  mapillaryId?: string,
) {
  await db.evaluations.put({
    featureId,
    status,
    comment,
    source,
    mapillaryId,
    timestamp: Date.now(),
  })
}

export async function exportEvaluatedFeatures() {
  const allFeatures = await getAllFeatures()
  const evaluations = await db.evaluations.toArray()
  const evaluationMap = new Map(evaluations.map((e: EvaluationRecord) => [e.featureId, e]))

  const featuresWithEvaluations = allFeatures
    .filter((feature: GeoJSON.Feature) => {
      const featureId = feature.properties?.id as string
      return evaluationMap.has(featureId)
    })
    .map((feature: GeoJSON.Feature) => {
      const featureId = feature.properties?.id as string
      const evaluation = evaluationMap.get(featureId)!
      if (!evaluation) return feature
      return {
        ...feature,
        properties: {
          ...feature.properties,
          evaluation_status: evaluation.status,
          evaluation_comment: evaluation.comment,
          evaluation_source: evaluation.source,
          evaluation_mapillary_id: evaluation.mapillaryId,
          evaluation_timestamp: evaluation.timestamp,
        },
      }
    })

  return {
    type: 'FeatureCollection',
    features: featuresWithEvaluations,
  }
}

export async function clearAllData() {
  await db.features.clear()
  await db.evaluations.clear()
}
