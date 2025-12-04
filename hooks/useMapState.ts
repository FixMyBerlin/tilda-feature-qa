import { useQueryState } from 'nuqs'
import { type MapState, mapStateParser } from '../lib/mapStateParser'

export function useMapState(defaultValue: MapState) {
  return useQueryState('map', {
    defaultValue,
    parse: mapStateParser.parse,
    serialize: mapStateParser.serialize,
    clearOnDefault: true,
  })
}
