import { z } from 'zod'

// Zod schema for GeoJSON validation
const PointSchema = z.tuple([z.number(), z.number()])

const LineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(PointSchema).min(2),
})

const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(PointSchema).min(4)),
})

const MultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(PointSchema).min(2)),
})

const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(PointSchema).min(4))),
})

const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: PointSchema,
})

const GeometrySchema = z.discriminatedUnion('type', [
  PointGeometrySchema,
  LineStringSchema,
  PolygonSchema,
  MultiLineStringSchema,
  MultiPolygonSchema,
])

const FeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeometrySchema,
  properties: z.record(z.unknown()).nullable().optional(),
  id: z.union([z.string(), z.number()]).optional(),
})

const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema),
})

// Export types
export type ValidatedFeatureCollection = z.infer<typeof FeatureCollectionSchema>
export type ValidatedFeature = z.infer<typeof FeatureSchema>

// Validation function
export function validateGeoJSON(data: unknown): ValidatedFeatureCollection {
  return FeatureCollectionSchema.parse(data)
}
