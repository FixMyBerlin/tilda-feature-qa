import { useCallback, useEffect, useMemo, useState } from 'react'
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
    setSelectedMapillaryId,
    setSource,
  } = useFeatureStore()

  // Helper function to navigate to a feature
  const navigateToFeature = useCallback(
    (feature: GeoJSON.Feature) => {
      setSelectedMapillaryId(null)
      const propMapillaryId = feature.properties?.mapillary_id as string | undefined
      setSource(propMapillaryId ? 'mapillary' : 'aerial_imagery')
      setFeatureId(feature)
    },
    [setSelectedMapillaryId, setSource, setFeatureId],
  )

  // Initialize: load all features and count on mount, set first unevaluated feature if none in URL
  useEffect(() => {
    const loadData = async () => {
      const features = await getAllFeatures()
      const count = await getEvaluatedCount()
      setAllFeatures(features)
      setEvaluatedCount(count)
      setLoading(false)

      // If no feature in URL and we have features, prefer an unevaluated one
      if (!currentFeature && features.length > 0) {
        const unevaluatedFeatures = await getUnevaluatedFeatures()
        const featureToUse = unevaluatedFeatures.length > 0 ? unevaluatedFeatures[0] : features[0]
        navigateToFeature(featureToUse)
      }
    }
    loadData()
  }, [currentFeature, setAllFeatures, navigateToFeature])

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
        // Note: Don't navigate here, just update source
      }
    })
  }, [currentFeature, setSelectedMapillaryId, setSource])

  // Find current index in allFeatures (for prev navigation)
  const currentIndexInAll = useMemo(() => {
    if (!currentFeature) return -1
    const id = currentFeature.properties?.id as string
    return allFeatures.findIndex((f) => (f.properties?.id as string) === id)
  }, [currentFeature, allFeatures])

  const handleEvaluated = async () => {
    if (!currentFeature) return

    const newCount = await getEvaluatedCount()
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

    // After evaluation, automatically go to next nearest unevaluated feature in allFeatures
    const unevaluatedFeatures = await getUnevaluatedFeatures()
    if (unevaluatedFeatures.length === 0) return

    // Find current position in allFeatures
    const currentPos = currentIndexInAll
    if (currentPos === -1) return

    // Find next unevaluated feature starting from current position + 1, wrapping around
    const unevaluatedIds = new Set(unevaluatedFeatures.map((f) => f.properties?.id as string))

    // Search forward from current position
    for (let i = currentPos + 1; i < allFeatures.length; i++) {
      const featureId = allFeatures[i].properties?.id as string
      if (unevaluatedIds.has(featureId)) {
        navigateToFeature(allFeatures[i])
        return
      }
    }

    // If not found forward, search from beginning (wrap around)
    for (let i = 0; i < currentPos; i++) {
      const featureId = allFeatures[i].properties?.id as string
      if (unevaluatedIds.has(featureId)) {
        navigateToFeature(allFeatures[i])
        return
      }
    }
  }

  // Prev: Always go to previous feature in full list (regardless of evaluation status)
  const handlePrev = () => {
    if (allFeatures.length === 0) return
    const prevIndex = currentIndexInAll <= 0 ? allFeatures.length - 1 : currentIndexInAll - 1
    navigateToFeature(allFeatures[prevIndex])
  }

  // Next: Always go to next feature in full list (regardless of evaluation status)
  const handleNext = () => {
    if (allFeatures.length === 0) return
    const nextIndex = currentIndexInAll >= allFeatures.length - 1 ? 0 : currentIndexInAll + 1
    navigateToFeature(allFeatures[nextIndex])
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
        <div className="mx-auto flex max-w-app items-center justify-between py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-xl">Feature Review</h1>
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

      <div className="mx-auto max-w-app py-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <EvaluationButtons
            featureId={currentFeature.properties?.id as string}
            featureProperties={currentFeature.properties || undefined}
            initialEvaluation={currentEvaluation}
            onEvaluated={handleEvaluated}
            onPrev={handlePrev}
            onNext={handleNext}
            canNavigate={allFeatures.length > 0}
            isEvaluated={!!currentEvaluation}
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

      </div>
    </div>
  )
}
