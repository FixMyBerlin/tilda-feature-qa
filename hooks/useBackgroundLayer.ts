import { useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { backgroundLayers } from '../lib/backgroundLayers'

export function useBackgroundLayer() {
  const [backgroundLayerId, setBackgroundLayerId] = useQueryState('bg', {
    defaultValue: 'areal2025-summer',
    parse: (value) => value || 'areal2025-summer',
    serialize: (value) => value || '',
  })

  const currentLayer = useMemo(
    () => backgroundLayers.find((l) => l.id === backgroundLayerId) || backgroundLayers[0],
    [backgroundLayerId],
  )

  return {
    backgroundLayerId,
    setBackgroundLayerId,
    currentLayer,
  }
}
