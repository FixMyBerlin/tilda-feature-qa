import { useQueryState } from 'nuqs'
import { mapStateParser, type MapState } from '../lib/mapStateParser'

export function useMapState(defaultValue: MapState) {
  return useQueryState('map', {
    defaultValue,
    parse: mapStateParser.parse,
    serialize: mapStateParser.serialize,
    clearOnDefault: true,
  })
}
