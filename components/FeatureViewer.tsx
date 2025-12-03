import { useQueryState } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
import {
  clearAllData,
  exportEvaluatedFeatures,
  getAllFeatures,
  getFeatureById,
  getUnevaluatedFeatures,
} from '../lib/db'
import { useFeatureStore } from '../store/useFeatureStore'
import { EvaluationButtons } from './EvaluationButtons'
import { MapView } from './MapView'
import { PropertiesPanel } from './PropertiesPanel'

export function FeatureViewer() {
  const [featureId, setFeatureId] = useQueryState('featureId', {
    defaultValue: null,
    parse: (value) => value,
    serialize: (value) => value || '',
  })
  const [currentFeature, setCurrentFeature] = useState<GeoJSON.Feature | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluationUpdateCounter, setEvaluationUpdateCounter] = useState(0)
  const { allFeatures, setAllFeatures, showOnlyUnevaluated, setShowOnlyUnevaluated } =
    useFeatureStore()

  // Load all features on mount
  useEffect(() => {
    getAllFeatures().then((features) => {
      setAllFeatures(features)
      setLoading(false)
    })
    // biome-ignore lint/correctness/useExhaustiveDependencies: setAllFeatures is stable from zustand
  }, [])

  const [filteredFeaturesList, setFilteredFeaturesList] = useState<GeoJSON.Feature[]>([])

  // Get filtered features based on showOnlyUnevaluated
  useEffect(() => {
    if (allFeatures.length === 0) return

    const loadFiltered = async () => {
      if (showOnlyUnevaluated) {
        const features = await getUnevaluatedFeatures()
        setFilteredFeaturesList(features)
      } else {
        setFilteredFeaturesList(allFeatures)
      }
    }
    loadFiltered()
  }, [allFeatures, showOnlyUnevaluated])

  // Load current feature
  useEffect(() => {
    if (featureId) {
      // If featureId in URL, load that feature regardless of filter
      const currentId = currentFeature?.properties?.id as string
      if (currentId === featureId) {
        // Already have the right feature loaded
        return
      }
      getFeatureById(featureId).then((feature) => {
        if (feature) {
          setCurrentFeature(feature)
        }
      })
    } else if (filteredFeaturesList.length > 0 && !currentFeature) {
      // If no featureId and no current feature, show first from filtered list
      const firstFeature = filteredFeaturesList[0]
      const firstId = firstFeature.properties?.id as string
      if (firstId) {
        setCurrentFeature(firstFeature)
        setFeatureId(firstId)
      }
    }
  }, [
    featureId,
    filteredFeaturesList,
    currentFeature,
    setFeatureId,
    // biome-ignore lint/correctness/useExhaustiveDependencies: complex dependencies, manually managed
  ])

  const currentIndex = useMemo(() => {
    if (!currentFeature) return -1
    const id = currentFeature.properties?.id as string
    return filteredFeaturesList.findIndex((f) => (f.properties?.id as string) === id)
  }, [currentFeature, filteredFeaturesList])

  const handleEvaluated = async () => {
    if (!currentFeature) return

    // Trigger map update
    setEvaluationUpdateCounter((prev) => prev + 1)

    // Refresh filtered features
    const newFiltered = showOnlyUnevaluated ? await getUnevaluatedFeatures() : allFeatures
    setFilteredFeaturesList(newFiltered)

    // Find current feature's position in new filtered list
    const currentId = currentFeature.properties?.id as string
    const currentPos = newFiltered.findIndex((f) => (f.properties?.id as string) === currentId)

    // Advance to next feature
    if (newFiltered.length > 0) {
      const nextIndex = currentPos >= 0 && currentPos < newFiltered.length - 1 ? currentPos + 1 : 0 // Wrap around or go to first if current not found
      const nextFeature = newFiltered[nextIndex]
      const nextId = nextFeature.properties?.id as string
      setFeatureId(nextId)
    }
  }

  const handlePrev = () => {
    if (filteredFeaturesList.length === 0) return
    const prevIndex = currentIndex <= 0 ? filteredFeaturesList.length - 1 : currentIndex - 1
    const prevFeature = filteredFeaturesList[prevIndex]
    const prevId = prevFeature.properties?.id as string
    setFeatureId(prevId)
  }

  const handleNext = () => {
    if (filteredFeaturesList.length === 0) return
    const nextIndex = currentIndex >= filteredFeaturesList.length - 1 ? 0 : currentIndex + 1
    const nextFeature = filteredFeaturesList[nextIndex]
    const nextId = nextFeature.properties?.id as string
    setFeatureId(nextId)
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
      <div className="border-b bg-white p-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-xl">Feature Review</h1>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyUnevaluated}
                onChange={(e) => setShowOnlyUnevaluated(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-700 text-sm">Show only unevaluated</span>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-600 text-sm">
              {currentIndex + 1} of {filteredFeaturesList.length}
            </div>
            <button
              onClick={handleReset}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Reset All Data
            </button>
            <button
              onClick={handleExport}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Export Evaluated
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-4">
        <div className="mb-4">
          <EvaluationButtons
            featureId={currentFeature.properties?.id as string}
            featureProperties={currentFeature.properties}
            onEvaluated={handleEvaluated}
          />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="relative h-96 lg:h-[600px]">
            <MapView feature={currentFeature} evaluationUpdated={evaluationUpdateCounter} />
          </div>
          <div className="space-y-4">
            <PropertiesPanel feature={currentFeature} />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handlePrev}
            disabled={filteredFeaturesList.length === 0}
            className="rounded bg-gray-200 px-6 py-2 text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Previous
          </button>
          <button
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
