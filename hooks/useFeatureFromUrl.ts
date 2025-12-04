import { useQueryState } from 'nuqs'
import { useFeatureStore } from '../store/useFeatureStore'

export function useFeatureFromUrl() {
  const [feature, setFeatureId] = useQueryState('featureId', {
    defaultValue: null,
    parse: (value) => {
      if (!value) return null
      const { allFeatures } = useFeatureStore.getState()
      if (allFeatures.length === 0) return null
      return allFeatures.find((f) => (f.properties?.id as string) === value) || null
    },
    serialize: (value) => {
      if (!value) return ''
      return (value.properties?.id as string) || ''
    },
  })

  return [feature, setFeatureId] as const
}
