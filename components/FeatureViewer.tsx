import { useEffect, useMemo, useState } from 'react'
import { useFeatureFromUrl } from '../hooks/useFeatureFromUrl'
import {
  clearAllData,
  type EvaluationSource,
  exportEvaluatedFeatures,
  getAllFeatures,
  getEvaluatedCount,
  getEvaluation,
  getUnevaluatedFeatures,
} from '../lib/db'
import { useFeatureStore } from '../store/useFeatureStore'
import { EvaluationButtons } from './EvaluationButtons'
import { MapView } from './MapView'
import { PropertiesPanel } from './PropertiesPanel'

export function FeatureViewer() {
  const [currentFeature, setFeatureId] = useFeatureFromUrl()
  const [currentEvaluation, setCurrentEvaluation] = useState<{
    status: 'good' | 'bad'
    comment?: string
    source?: EvaluationSource
    mapillaryId?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluatedCount, setEvaluatedCount] = useState(0)
  const {
    allFeatures,
    setAllFeatures,
    showOnlyUnevaluated,
    setShowOnlyUnevaluated,
    setSelectedMapillaryId,
    setSource,
  } = useFeatureStore()

  // Initialize: load all features and count on mount, set first feature if none in URL
  useEffect(() => {
    const loadData = async () => {
      const features = await getAllFeatures()
      const count = await getEvaluatedCount()
      setAllFeatures(features)
      setEvaluatedCount(count)
      setLoading(false)

      // If no feature in URL and we have features, set the first one
      if (!currentFeature && features.length > 0) {
        const firstFeature = features[0]
        setSelectedMapillaryId(null)
        const propMapillaryId = firstFeature.properties?.mapillary_id as string | undefined
        setSource(propMapillaryId ? 'mapillary' : 'aerial_imagery')
        setFeatureId(firstFeature)
      }
    }
    loadData()
  }, [currentFeature, setAllFeatures, setFeatureId, setSelectedMapillaryId, setSource])

  const [filteredFeaturesList, setFilteredFeaturesList] = useState<GeoJSON.Feature[]>([])

  // Update filtered list when allFeatures changes (after initial load or data refresh)
  useEffect(() => {
    if (allFeatures.length === 0) return

    if (showOnlyUnevaluated) {
      getUnevaluatedFeatures().then(setFilteredFeaturesList)
    } else {
      setFilteredFeaturesList(allFeatures)
    }
  }, [allFeatures, showOnlyUnevaluated])

  const handleShowOnlyUnevaluatedChange = async (checked: boolean) => {
    setShowOnlyUnevaluated(checked)
    if (checked) {
      const features = await getUnevaluatedFeatures()
      setFilteredFeaturesList(features)
    } else {
      setFilteredFeaturesList(allFeatures)
    }
  }

  // Load evaluation when feature changes (reacts to URL changes via useFeatureFromUrl)
  // Feature lookup is synchronous from store, but evaluation loading is async
  useEffect(() => {
    if (!currentFeature) {
      setCurrentEvaluation(null)
      return
    }

    const featureId = currentFeature.properties?.id as string
    if (!featureId) return

    setSelectedMapillaryId(null)
    getEvaluation(featureId).then((evalData) => {
      if (evalData) {
        setCurrentEvaluation({
          status: evalData.status,
          comment: evalData.comment,
          source: evalData.source,
          mapillaryId: evalData.mapillaryId,
        })
        setSource(evalData.mapillaryId ? 'mapillary' : evalData.source || 'aerial_imagery')
        if (evalData.mapillaryId) {
          setSelectedMapillaryId(evalData.mapillaryId)
        }
      } else {
        setCurrentEvaluation(null)
        const propMapillaryId = currentFeature.properties?.mapillary_id as string | undefined
        setSource(propMapillaryId ? 'mapillary' : 'aerial_imagery')
      }
    })
  }, [currentFeature, setSelectedMapillaryId, setSource])

  const currentIndex = useMemo(() => {
    if (!currentFeature) return -1
    const id = currentFeature.properties?.id as string
    return filteredFeaturesList.findIndex((f) => (f.properties?.id as string) === id)
  }, [currentFeature, filteredFeaturesList])

  const handleEvaluated = async () => {
    if (!currentFeature) return

    const newFiltered = showOnlyUnevaluated ? await getUnevaluatedFeatures() : allFeatures
    const newCount = await getEvaluatedCount()
    setFilteredFeaturesList(newFiltered)
    setEvaluatedCount(newCount)

    // Reload current evaluation after evaluation
    const currentId = currentFeature.properties?.id as string
    const evalData = await getEvaluation(currentId)
    if (evalData) {
      setCurrentEvaluation({
        status: evalData.status,
        comment: evalData.comment,
        source: evalData.source,
        mapillaryId: evalData.mapillaryId,
      })
    }

    const currentPos = newFiltered.findIndex((f) => (f.properties?.id as string) === currentId)

    if (newFiltered.length > 0) {
      const nextIndex = currentPos >= 0 && currentPos < newFiltered.length - 1 ? currentPos + 1 : 0
      const nextFeature = newFiltered[nextIndex]
      setSelectedMapillaryId(null)
      const propMapillaryId = nextFeature.properties?.mapillary_id as string | undefined
      setSource(propMapillaryId ? 'mapillary' : 'aerial_imagery')
      setFeatureId(nextFeature)
    }
  }

  const handlePrev = () => {
    if (filteredFeaturesList.length === 0) return
    const prevIndex = currentIndex <= 0 ? filteredFeaturesList.length - 1 : currentIndex - 1
    const prevFeature = filteredFeaturesList[prevIndex]
    setSelectedMapillaryId(null)
    const propMapillaryId = prevFeature.properties?.mapillary_id as string | undefined
    setSource(propMapillaryId ? 'mapillary' : 'aerial_imagery')
    setFeatureId(prevFeature)
  }

  const handleNext = () => {
    if (filteredFeaturesList.length === 0) return
    const nextIndex = currentIndex >= filteredFeaturesList.length - 1 ? 0 : currentIndex + 1
    const nextFeature = filteredFeaturesList[nextIndex]
    setSelectedMapillaryId(null)
    const propMapillaryId = nextFeature.properties?.mapillary_id as string | undefined
    setSource(propMapillaryId ? 'mapillary' : 'aerial_imagery')
    setFeatureId(nextFeature)
  }

  const handleExport = async () => {
    const geojson = await exportEvaluatedFeatures()
    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'evaluated-features.geojson'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all features and evaluations? This action cannot be undone.',
    )
    if (!confirmed) return

    try {
      await clearAllData()
      // Reload the page to show the file loader
      window.location.reload()
    } catch (err) {
      console.error('Error clearing data:', err)
      alert('Failed to clear data. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading features...</div>
      </div>
    )
  }

  if (!currentFeature) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">No features available</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-xl">Feature Review</h1>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyUnevaluated}
                onChange={(e) => handleShowOnlyUnevaluatedChange(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-700 text-sm">Show only unevaluated</span>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-600 text-sm">
              {evaluatedCount} of {allFeatures.length} done
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Reset All Data
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Export Evaluated
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <EvaluationButtons
            featureId={currentFeature.properties?.id as string}
            featureProperties={currentFeature.properties || undefined}
            initialEvaluation={currentEvaluation}
            onEvaluated={handleEvaluated}
          />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="relative h-96 lg:h-[600px]">
            <MapView feature={currentFeature} />
          </div>
          <div className="space-y-4">
            <PropertiesPanel feature={currentFeature} />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={filteredFeaturesList.length === 0}
            className="rounded bg-gray-200 px-6 py-2 text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={filteredFeaturesList.length === 0}
            className="rounded bg-gray-200 px-6 py-2 text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
