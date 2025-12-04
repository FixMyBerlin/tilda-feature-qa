import { create } from 'zustand'
import type { EvaluationSource } from '../lib/db'

type FeatureStore = {
  allFeatures: GeoJSON.Feature[]
  showOnlyUnevaluated: boolean
  selectedMapillaryId: string | null
  source: EvaluationSource
  mapLoaded: boolean
  mapillaryTimePeriods: {
    sixMonths: boolean // Always true, can't be disabled
    oneYear: boolean
    twoYears: boolean
    threeYears: boolean
    older: boolean // 3+ years
  }
  setAllFeatures: (features: GeoJSON.Feature[]) => void
  setShowOnlyUnevaluated: (show: boolean) => void
  setSelectedMapillaryId: (id: string | null) => void
  setSource: (source: EvaluationSource) => void
  setMapLoaded: (loaded: boolean) => void
  setMapillaryTimePeriod: (
    period: 'oneYear' | 'twoYears' | 'threeYears' | 'older',
    enabled: boolean,
  ) => void
}

export const useFeatureStore = create<FeatureStore>((set) => ({
  allFeatures: [],
  showOnlyUnevaluated: true,
  selectedMapillaryId: null,
  source: 'aerial_imagery',
  mapLoaded: false,
  mapillaryTimePeriods: {
    sixMonths: true, // Always on
    oneYear: true, // Default selected
    twoYears: false,
    threeYears: false,
    older: false, // 3+ years, disabled by default
  },
  setAllFeatures: (features: GeoJSON.Feature[]) => set({ allFeatures: features }),
  setShowOnlyUnevaluated: (show: boolean) => set({ showOnlyUnevaluated: show }),
  setSelectedMapillaryId: (id: string | null) => set({ selectedMapillaryId: id }),
  setSource: (source: EvaluationSource) => set({ source }),
  setMapLoaded: (loaded: boolean) => set({ mapLoaded: loaded }),
  setMapillaryTimePeriod: (period, enabled) =>
    set((state) => ({
      mapillaryTimePeriods: { ...state.mapillaryTimePeriods, [period]: enabled },
    })),
}))
