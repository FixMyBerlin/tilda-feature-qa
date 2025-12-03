import { create } from 'zustand'

type FeatureStore = {
  allFeatures: GeoJSON.Feature[]
  showOnlyUnevaluated: boolean
  selectedMapillaryId: string | null
  setAllFeatures: (features: GeoJSON.Feature[]) => void
  setShowOnlyUnevaluated: (show: boolean) => void
  setSelectedMapillaryId: (id: string | null) => void
}

export const useFeatureStore = create<FeatureStore>((set) => ({
  allFeatures: [],
  showOnlyUnevaluated: true,
  selectedMapillaryId: null,
  setAllFeatures: (features: GeoJSON.Feature[]) => set({ allFeatures: features }),
  setShowOnlyUnevaluated: (show: boolean) => set({ showOnlyUnevaluated: show }),
  setSelectedMapillaryId: (id: string | null) => set({ selectedMapillaryId: id }),
}))
