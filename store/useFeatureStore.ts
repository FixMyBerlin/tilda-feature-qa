import { create } from 'zustand'

type FeatureStore = {
  allFeatures: GeoJSON.Feature[]
  showOnlyUnevaluated: boolean
  setAllFeatures: (features: GeoJSON.Feature[]) => void
  setShowOnlyUnevaluated: (show: boolean) => void
}

export const useFeatureStore = create<FeatureStore>((set) => ({
  allFeatures: [],
  showOnlyUnevaluated: true,
  setAllFeatures: (features: GeoJSON.Feature[]) => set({ allFeatures: features }),
  setShowOnlyUnevaluated: (show: boolean) => set({ showOnlyUnevaluated: show }),
}))
