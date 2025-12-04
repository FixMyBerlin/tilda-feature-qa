import { z } from 'zod'

const MapStateSchema = z.object({
  zoom: z.coerce.number().min(0).max(22),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

export type MapState = z.infer<typeof MapStateSchema>

export const mapStateParser = {
  parse: (value: string) => {
    const parts = value.split('/')
    if (parts.length !== 3) return null

    const result = MapStateSchema.safeParse({
      zoom: parts[0],
      latitude: parts[1],
      longitude: parts[2],
    })
    return result.success ? result.data : null
  },
  serialize: (value: MapState | null) => {
    if (!value) return ''
    // Round to fewer decimal places: zoom to 1 decimal, lat/lng to 5 decimals
    const zoom = Math.round(value.zoom * 10) / 10
    const lat = Math.round(value.latitude * 100000) / 100000
    const lng = Math.round(value.longitude * 100000) / 100000
    return `${zoom}/${lat}/${lng}`
  },
}
