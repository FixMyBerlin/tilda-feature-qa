import { create } from 'zustand'
import type { EvaluationSource } from '../lib/db'

type FeatureStore = {
  allFeatures: GeoJSON.Feature[]
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
  useApiPreview: boolean
  setAllFeatures: (features: GeoJSON.Feature[]) => void
  setSelectedMapillaryId: (id: string | null) => void
  setSource: (source: EvaluationSource) => void
  setMapLoaded: (loaded: boolean) => void
  setMapillaryTimePeriod: (
    period: 'oneYear' | 'twoYears' | 'threeYears' | 'older',
    enabled: boolean,
  ) => void
  setUseApiPreview: (use: boolean) => void
}

export const useFeatureStore = create<FeatureStore>((set) => ({
  allFeatures: [],
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
  useApiPreview: false,
  setAllFeatures: (features: GeoJSON.Feature[]) => set({ allFeatures: features }),
  setSelectedMapillaryId: (id: string | null) => set({ selectedMapillaryId: id }),
  setSource: (source: EvaluationSource) => set({ source }),
  setMapLoaded: (loaded: boolean) => set({ mapLoaded: loaded }),
  setMapillaryTimePeriod: (period, enabled) =>
    set((state) => ({
      mapillaryTimePeriods: { ...state.mapillaryTimePeriods, [period]: enabled },
    })),
  setUseApiPreview: (use: boolean) => set({ useApiPreview: use }),
}))
