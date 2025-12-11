import { z } from 'zod'

// Zod schema for GeoJSON validation
const PointSchema = z.tuple([z.number(), z.number()])

const LineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(PointSchema).min(2),
})

const MultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(PointSchema).min(2)),
})

// Only allow LineString and MultiLineString geometries
const GeometrySchema = z.discriminatedUnion('type', [LineStringSchema, MultiLineStringSchema])

// OSM ID format validation schema
const OsmIdSchema = z.string().regex(/^(way|node|relation)\/\d+$/, {
  message: 'osm_id must be in format "way/123", "node/456", or "relation/789"',
})

// Properties schema - allows string:string|number pairs and *_OLD/*_NEW patterns
// Uses Zod 4's .catchall() to allow additional properties beyond id and osm_id
// Allows objects for metadata properties like _geometry_OLD
const PropertiesSchema = z
  .object({
    id: z
      .union([z.string(), z.number()])
      .describe('Each feature must have an "id" property (string or number)'),
    osm_id: OsmIdSchema.optional(),
  })
  .catchall(z.unknown())

const FeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeometrySchema,
  properties: PropertiesSchema,
  id: z.union([z.string(), z.number()]).optional(),
})

const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema).min(1),
})

// Export types
export type ValidatedFeatureCollection = z.infer<typeof FeatureCollectionSchema>
export type ValidatedFeature = z.infer<typeof FeatureSchema>

// Validation function with better error messages
export function validateGeoJSON(data: unknown) {
  try {
    return FeatureCollectionSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`GeoJSON validation failed:\n${z.prettifyError(error)}`)
    }
    throw error
  }
}
